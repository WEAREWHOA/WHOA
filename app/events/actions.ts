"use server";

import { randomUUID } from "crypto";
import QRCode from "qrcode";
import { getSquare, getSquareLocationId } from "@/lib/square";
import { resolveAccount } from "@/lib/accountAuth";
import { setSquareCustomerId } from "@/lib/store";
import { findOrCreateSquareCustomerId } from "@/lib/squareCustomers";
import { countGuestsForEvent, createRsvpRecord } from "@/lib/eventRsvps";
import { sendEventConfirmationEmail, sendTicketRecordFailureAlert } from "@/lib/email";
import {
  clampTicketQuantity,
  getCurrentPriceCents,
  isTicketingOpen,
  requiresDamageWaiver,
} from "@/lib/events";
import { getEventById } from "@/lib/eventsStore";
import { SITE_URL } from "@/lib/site";
import { eventTag, recordContactInBackground, subscribe, TAG } from "@/lib/newsletter";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface EventRsvpResult {
  ok: boolean;
  error?: string;
  accountCreated?: boolean;
  signedIn?: boolean;
  // A data: URL PNG — the presentable "ticket". Omitted (not a failure) if
  // the RSVP itself couldn't be saved, or if QR generation hiccups.
  qrDataUrl?: string;
  // How many people that one QR admits, after the server's own clamp — so
  // the confirmation screen states what was actually sold rather than what
  // the form asked for.
  quantity?: number;
}

export async function eventRsvpAction(input: {
  eventId: string;
  name: string;
  email: string;
  phone?: string;
  // Only sent when the buyer isn't already signed in. Blank/omitted means
  // "just RSVP/buy as a guest."
  password?: string;
  // Square card token from the Web Payments SDK — required only for a
  // paid event (event.priceCents > 0), same flow as shop checkout.
  token?: string;
  // Which event.lineup artist the guest is there for — optional, shown only
  // when the event has a lineup. Validated against the event's own lineup
  // so a tampered request can't inject an arbitrary string into reports.
  selectedArtist?: string;
  // How many tickets on this one booking, 1..MAX_TICKETS_PER_ORDER. Clamped
  // rather than rejected — a request carrying 0, 99 or "three" is a broken
  // client, not a reason to lose the sale. Free RSVPs are always 1.
  quantity?: number;
  // Whether the guest clicked "Agree" on the damage-responsibility waiver.
  // Required (and re-checked here, never trusted from the client alone)
  // for any event at the WHOAdega/SH!FT Gallery — see requiresDamageWaiver.
  waiverAgreed?: boolean;
  // Whether they left the "email me about WHOA events" box ticked. Ticked
  // puts them on the newsletter properly, with a welcome email. Unticked
  // still records them as a contact, tagged with this event and marked
  // not-mailable, because the Rolodex needs to know a guest exists
  // without that being permission to market to them.
  joinList?: boolean;
}): Promise<EventRsvpResult> {
  const event = await getEventById(input.eventId);
  if (!event) {
    return { ok: false, error: "That event couldn't be found." };
  }
  // The UI already hides the button once an event has ended (see
  // isTicketingOpen in lib/events.ts) — re-checked here since that's only
  // ever a client-side courtesy, not enforcement.
  if (!isTicketingOpen(event)) {
    return { ok: false, error: "RSVPs/tickets for this event have closed." };
  }
  // Same never-trust-the-client posture as the ticketing-closed check above
  // — the waiver modal gates the checkout form client-side, but this is
  // what actually stops a bypassed request from creating an RSVP without it.
  if (requiresDamageWaiver(event) && !input.waiverAgreed) {
    return { ok: false, error: "You must agree to the damage responsibility waiver to continue." };
  }

  const name = input.name.trim();
  if (!name) {
    return { ok: false, error: "Name is required." };
  }
  const email = input.email.trim();
  if (!email || !email.includes("@")) {
    return { ok: false, error: "A valid email is required." };
  }

  // Computed server-side, from today's real date, at the moment of charge —
  // never trusted from the client. This is what makes the early-bird
  // discount actually enforce its cutoff instead of being a display-only
  // label a client could ignore.
  const priceCents = getCurrentPriceCents(event);
  // A free RSVP is one person. Batching only makes sense for something
  // being paid for.
  const quantity = priceCents > 0 ? clampTicketQuantity(input.quantity ?? 1) : 1;

  // Capacity, checked before anything is charged.
  //
  // Only created events carry one; the hand-written list has no such
  // column, and `capacity in event` is how an EventInfo that happens to
  // be a CustomEventRecord is told apart without importing the admin
  // type into the public path.
  //
  // This is a check, not a lock. Two people buying the last two tickets
  // in the same instant can both pass it, because holding a row lock
  // across a Square charge is a worse failure than occasionally being
  // one over: the alternative blocks a till on a payment provider's
  // latency. A room that cannot absorb one extra guest should set the
  // capacity one lower.
  const capacity = (event as { capacity?: number | null }).capacity ?? null;
  if (capacity != null) {
    let alreadyBooked: number;
    try {
      alreadyBooked = await countGuestsForEvent(event.id);
    } catch (err) {
      console.error("Couldn't check capacity, refusing the booking:", err);
      return { ok: false, error: "We couldn't check availability just now. Please try again." };
    }

    const remaining = capacity - alreadyBooked;
    if (remaining <= 0) {
      return { ok: false, error: "This event is sold out." };
    }
    if (quantity > remaining) {
      return {
        ok: false,
        error: `Only ${remaining} ${remaining === 1 ? "spot is" : "spots are"} left.`,
      };
    }
  }
  if (priceCents > 0 && !input.token) {
    return { ok: false, error: "Card details are required for a paid ticket." };
  }

  const selectedArtist =
    input.selectedArtist && event.lineup?.includes(input.selectedArtist) ? input.selectedArtist : null;

  // Sign the buyer in or create their account before charging anything —
  // same posture as checkout: a wrong password should stop this cold
  // rather than surfacing after a card's been charged.
  const account = await resolveAccount({ name, email, password: input.password });
  if (account.error) {
    return { ok: false, error: account.error };
  }

  let squareOrderId: string | null = null;
  let squarePaymentId: string | null = null;

  if (priceCents > 0) {
    const locationId = getSquareLocationId();
    const square = getSquare();

    // Same linking as shop checkout — Square's own docs warn that skipping
    // customer_id risks the order landing as a disconnected "instant
    // profile" instead of the buyer's real Customer record.
    const squareCustomerId = await findOrCreateSquareCustomerId(email, name).catch((err) => {
      console.error("Failed to find/create Square customer for event ticket:", err);
      return undefined;
    });

    try {
      const orderResponse = await square.orders.create({
        idempotencyKey: randomUUID(),
        order: {
          locationId,
          customerId: squareCustomerId,
          // Events aren't Square catalog items, so this is an ad-hoc line
          // item (a name + price) rather than a catalogObjectId reference.
          lineItems: [
            {
              name: `Ticket — ${event.title}`,
              quantity: String(quantity),
              basePriceMoney: { amount: BigInt(priceCents), currency: "USD" },
            },
          ],
        },
      });

      if (!orderResponse.order?.id || orderResponse.order.totalMoney?.amount == null) {
        return { ok: false, error: "Couldn't create the ticket order. Please try again." };
      }
      squareOrderId = orderResponse.order.id;

      const paymentResponse = await square.payments.create({
        sourceId: input.token as string,
        idempotencyKey: randomUUID(),
        amountMoney: orderResponse.order.totalMoney,
        locationId,
        orderId: squareOrderId,
        customerId: squareCustomerId,
        buyerEmailAddress: email,
      });

      if (!paymentResponse.payment) {
        return { ok: false, error: "Payment did not complete. Please try again." };
      }
      squarePaymentId = paymentResponse.payment.id ?? null;
    } catch (err) {
      console.error("Square ticket purchase failed:", err);
      return { ok: false, error: "Payment did not go through. Please check your card details." };
    }

    if (account.code && squareCustomerId) {
      await setSquareCustomerId(account.code, squareCustomerId).catch((err) => {
        console.error("Failed to cache Square customer id on account:", err);
      });
    }
  }

  let rsvpId: string | undefined;
  try {
    rsvpId = await createRsvpRecord({
      eventId: event.id,
      accountCode: account.code,
      name,
      email,
      phone: input.phone?.trim() || null,
      priceCents,
      quantity,
      squareOrderId,
      squarePaymentId,
      selectedArtist,
      waiverAgreedAt: input.waiverAgreed ? new Date().toISOString() : null,
    });
  } catch (err) {
    console.error("Failed to save RSVP/ticket record:", err);

    // A server log is not an alert. When this fires on a paid ticket the
    // buyer has been charged and has nothing to show for it, and the flow
    // below deliberately carries on rather than failing in front of them
    // — so without this email the first anyone hears of it is someone
    // being turned away at the door.
    //
    // Best-effort and awaited: if Resend is also down there is nothing
    // further to try, but the alert must not itself throw and take out
    // the rest of a flow whose payment already succeeded.
    try {
      await sendTicketRecordFailureAlert({
        eventId: event.id,
        eventName: event.title,
        name,
        email,
        phone: input.phone?.trim() || null,
        quantity,
        priceCents,
        squarePaymentId,
        squareOrderId,
        error: err instanceof Error ? err.message : String(err),
      });
    } catch (alertErr) {
      console.error("Failed to alert staff about the lost ticket record:", alertErr);
    }

    // A paid ticket's payment already succeeded — don't fail the flow over
    // a bookkeeping error the buyer can't do anything about. A free RSVP
    // has nothing else to fall back on, so that one does fail here.
    if (priceCents === 0) {
      return { ok: false, error: "Couldn't save your RSVP. Please try again." };
    }
  }

  // The QR is just a shortcut to /checkin/[rsvpId] — generated server-side
  // (same approach as the scavenger hunt's print sheet) so the client needs
  // no QR library of its own. Best-effort: a generation hiccup shouldn't
  // undo an RSVP/ticket that already saved successfully.
  //
  // Generated *before* the email, not after, so the email can carry it.
  // Without that, the only copies of a guest's ticket were the confirmation
  // screen and the portal — no use to someone who checked out as a guest
  // and closed the tab.
  const ticketUrl = rsvpId ? `${SITE_URL}/checkin/${rsvpId}` : undefined;
  const qrDataUrl = ticketUrl
    ? await QRCode.toDataURL(ticketUrl, { margin: 1, width: 320 }).catch((err) => {
        console.error("Failed to generate ticket QR code:", err);
        return undefined;
      })
    : undefined;

  await sendEventConfirmationEmail({
    to: email,
    name,
    eventTitle: event.title,
    eventDateLabel: `${event.dateLabel} · ${event.timeLabel}`,
    eventVenue: event.venue,
    priceCents,
    quantity,
    ticketUrl,
    ticketQrDataUrl: qrDataUrl,
  }).catch((err) => {
    console.error("Failed to send event confirmation email:", err);
  });

  // The list, after the ticket rather than before it: a card that
  // declines must not leave somebody subscribed, and a free RSVP that
  // failed to save should not either.
  //
  // Both branches tag with the event, which is the thing that makes a
  // send to one show's guests possible later. The difference between them
  // is only whether we are allowed to mail them at all.
  const rsvpTags = [
    TAG.events,
    eventTag(event.title),
    ...(priceCents > 0 ? [TAG.ticketBuyers] : []),
  ];
  const [firstName, ...restOfName] = name.split(/\s+/);
  if (input.joinList) {
    // Fire-and-forget, like the confirmation email above: the ticket is
    // paid for, and a newsletter hiccup is not worth an error in front of
    // somebody who has already bought.
    void subscribe({
      email,
      firstName: firstName || undefined,
      lastName: restOfName.join(" ") || undefined,
      phone: input.phone?.trim() || undefined,
      source: "rsvp",
      tags: rsvpTags,
      accountCode: account.code ?? undefined,
    }).catch((err) => console.error("Couldn't subscribe an event guest:", err));
  } else {
    recordContactInBackground({
      email,
      firstName: firstName || undefined,
      lastName: restOfName.join(" ") || undefined,
      phone: input.phone?.trim() || undefined,
      source: "rsvp",
      tags: rsvpTags,
      accountCode: account.code ?? undefined,
    });
  }

  return {
    ok: true,
    accountCreated: account.accountCreated || undefined,
    signedIn: account.signedIn || undefined,
    qrDataUrl,
    quantity,
  };
}

// Powers the /events page's newsletter banner. Public-facing, so this
// fails soft (returns an error string) rather than throwing — same
// posture as lib/contact.ts's submitContactMessage.
export async function subscribeEventsNewsletterAction(input: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const firstName = input.firstName.trim().slice(0, 100);
  const lastName = input.lastName.trim().slice(0, 100);
  const email = input.email.trim().slice(0, 200);
  const phone = input.phone?.trim().slice(0, 30) || undefined;

  if (!firstName) return { ok: false, error: "First name is required." };
  if (!lastName) return { ok: false, error: "Last name is required." };
  if (!EMAIL_PATTERN.test(email)) return { ok: false, error: "Enter a valid email." };

  try {
    // The number the form asks for IS stored now, on the mirror row that
    // the EMAIL/TEXT migration gave a phone column. Resend's contact
    // record still has nowhere to put it, which is why it lives on our
    // side. It is not consent to text anybody: sms_consent stays false
    // until there is a record saying otherwise.
    const result = await subscribe({
      email,
      firstName,
      lastName,
      phone,
      source: "events",
      tags: [TAG.events, TAG.eventNewsletter],
    });
    // Someone already on the list is thanked, not told they're already on
    // it: whether a given address is subscribed isn't a fact a public form
    // should hand out.
    return { ok: result.ok, error: result.error };
  } catch (err) {
    console.error("subscribeEventsNewsletterAction failed:", err);
    return { ok: false, error: "Newsletter signup isn't set up yet. Try again later." };
  }
}
