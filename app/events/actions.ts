"use server";

import { randomUUID } from "crypto";
import QRCode from "qrcode";
import { getSquare, getSquareLocationId } from "@/lib/square";
import { resolveAccount } from "@/lib/accountAuth";
import { setSquareCustomerId } from "@/lib/store";
import { findOrCreateSquareCustomerId } from "@/lib/squareCustomers";
import { createRsvpRecord } from "@/lib/eventRsvps";
import { sendEventConfirmationEmail } from "@/lib/email";
import { EVENTS } from "@/lib/events";
import { SITE_URL } from "@/lib/site";

export interface EventRsvpResult {
  ok: boolean;
  error?: string;
  accountCreated?: boolean;
  signedIn?: boolean;
  // A data: URL PNG — the presentable "ticket". Omitted (not a failure) if
  // the RSVP itself couldn't be saved, or if QR generation hiccups.
  qrDataUrl?: string;
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
}): Promise<EventRsvpResult> {
  const event = EVENTS.find((e) => e.id === input.eventId);
  if (!event) {
    return { ok: false, error: "That event couldn't be found." };
  }

  const name = input.name.trim();
  if (!name) {
    return { ok: false, error: "Name is required." };
  }
  const email = input.email.trim();
  if (!email || !email.includes("@")) {
    return { ok: false, error: "A valid email is required." };
  }

  const priceCents = event.priceCents ?? 0;
  if (priceCents > 0 && !input.token) {
    return { ok: false, error: "Card details are required for a paid ticket." };
  }

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
              quantity: "1",
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
      squareOrderId,
      squarePaymentId,
    });
  } catch (err) {
    console.error("Failed to save RSVP/ticket record:", err);
    // A paid ticket's payment already succeeded — don't fail the flow over
    // a bookkeeping error the buyer can't do anything about. A free RSVP
    // has nothing else to fall back on, so that one does fail here.
    if (priceCents === 0) {
      return { ok: false, error: "Couldn't save your RSVP. Please try again." };
    }
  }

  await sendEventConfirmationEmail({
    to: email,
    name,
    eventTitle: event.title,
    eventDateLabel: `${event.dateLabel} · ${event.timeLabel}`,
    eventVenue: event.venue,
    priceCents,
  }).catch((err) => {
    console.error("Failed to send event confirmation email:", err);
  });

  // The QR is just a shortcut to /checkin/[rsvpId] — generated server-side
  // (same approach as the scavenger hunt's print sheet) so the client needs
  // no QR library of its own. Best-effort: a generation hiccup shouldn't
  // undo an RSVP/ticket that already saved successfully.
  const qrDataUrl = rsvpId
    ? await QRCode.toDataURL(`${SITE_URL}/checkin/${rsvpId}`, { margin: 1, width: 320 }).catch((err) => {
        console.error("Failed to generate ticket QR code:", err);
        return undefined;
      })
    : undefined;

  return {
    ok: true,
    accountCreated: account.accountCreated || undefined,
    signedIn: account.signedIn || undefined,
    qrDataUrl,
  };
}
