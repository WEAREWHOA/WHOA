import { Resend } from "resend";
import { formatCents } from "./money";
import { createApprovalLinks, type ApprovalKind } from "./approvalTokens";
import { SITE_URL } from "./siteUrl";

let client: Resend | null = null;

// Lazily created for the same reason as lib/square.ts's getSquare() and
// lib/supabase.ts's getSupabase() — importing this module happens at build
// time for every route, so RESEND_API_KEY must not be required until a
// request actually sends an email.
function getResend(): Resend {
  if (client) return client;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("Missing Resend env var: RESEND_API_KEY is required.");
  }
  client = new Resend(apiKey);
  return client;
}

// The verified sending domain (see the DNS setup on wearewhoa.art). Replies
// go to the real inbox the rest of the site already points customers at
// (see app/contact/page.tsx, the FAQ, and the policy pages) — a customer
// who hits "reply" on their receipt should land somewhere staff read.
const FROM_ADDRESS = "WHOA <orders@wearewhoa.art>";
const REPLY_TO = "info@wearewhoa.com";

// Every form on the site (ambassador application, contact, custom design)
// notifies this same inbox on submit, reply-to'd to the submitter so staff
// can just hit reply.
const ADMIN_NOTIFY_ADDRESS = "info@wearewhoa.com";

export interface OrderConfirmationLine {
  name: string;
  quantity: number;
  totalCents: number;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}

// Shared card shell every transactional email uses — order confirmations
// and event RSVP/ticket confirmations alike.
function wrapEmail(bodyHtml: string): string {
  return `
    <div style="background:#0a0806;padding:32px 16px;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;">
      <div style="max-width:480px;margin:0 auto;background:#14100c;border:1px solid #2a231b;border-radius:16px;padding:32px;">
        ${bodyHtml}
      </div>
    </div>`;
}

function buildOrderHtml(input: {
  customerName: string;
  orderId: string;
  lines: OrderConfirmationLine[];
  shippingCents?: number;
  shipTo?: string;
  totalCents: number;
}): string {
  const rows = input.lines
    .map(
      (line) => `
        <tr>
          <td style="padding:8px 0;color:#f7f0e6;font-size:14px;">${escapeHtml(line.name)} &times; ${line.quantity}</td>
          <td style="padding:8px 0;color:#f7f0e6;font-size:14px;text-align:right;">${formatCents(line.totalCents)}</td>
        </tr>`,
    )
    .join("");

  // The line items and the total have to reconcile. Once postage is part
  // of the total, a receipt that lists only the goods reads as an
  // overcharge — so the row is shown whenever there was a shipment,
  // including when it came to nothing.
  const shippingRow =
    input.shippingCents === undefined
      ? ""
      : `
          <tr>
            <td style="padding:12px 0 0;color:#b8ada0;font-size:14px;">Shipping</td>
            <td style="padding:12px 0 0;color:#b8ada0;font-size:14px;text-align:right;">${
              input.shippingCents > 0 ? formatCents(input.shippingCents) : "Free"
            }</td>
          </tr>`;

  const shipToBlock = input.shipTo
    ? `
        <p style="margin:20px 0 0;color:#6b6157;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;">Shipping to</p>
        <p style="margin:4px 0 0;color:#b8ada0;font-size:13px;line-height:1.5;">${escapeHtml(
          input.shipTo,
        ).replace(/\n/g, "<br/>")}</p>`
    : "";

  return wrapEmail(`
        <p style="margin:0;color:#ff7a00;font-size:12px;letter-spacing:0.2em;text-transform:uppercase;font-weight:600;">Order confirmed</p>
        <h1 style="margin:8px 0 0;color:#f7f0e6;font-size:28px;">Thanks, ${escapeHtml(input.customerName)}</h1>
        <p style="margin:12px 0 24px;color:#b8ada0;font-size:14px;line-height:1.5;">
          Your payment went through and your order is in. Here's what you got:
        </p>
        <table style="width:100%;border-collapse:collapse;border-top:1px solid #2a231b;">
          ${rows}
        </table>
        <table style="width:100%;border-collapse:collapse;border-top:1px solid #2a231b;margin-top:8px;">
          ${shippingRow}
          <tr>
            <td style="padding:12px 0 0;color:#f7f0e6;font-size:15px;font-weight:600;">Total</td>
            <td style="padding:12px 0 0;color:#f7f0e6;font-size:15px;font-weight:600;text-align:right;">${formatCents(input.totalCents)}</td>
          </tr>
        </table>
        ${shipToBlock}
        <p style="margin:24px 0 0;color:#6b6157;font-size:12px;font-family:monospace;">Order ${escapeHtml(input.orderId)}</p>
        <p style="margin:24px 0 0;color:#b8ada0;font-size:13px;line-height:1.5;">
          Questions about your order? Just reply to this email.
        </p>`);
}

function buildEventHtml(input: {
  name: string;
  eventTitle: string;
  eventDateLabel: string;
  eventVenue: string;
  priceCents: number;
  quantity?: number;
  ticketUrl?: string;
}): string {
  const isTicket = input.priceCents > 0;
  const quantity = input.quantity && input.quantity > 1 ? input.quantity : 1;
  return wrapEmail(`
        <p style="margin:0;color:#ff7a00;font-size:12px;letter-spacing:0.2em;text-transform:uppercase;font-weight:600;">${isTicket ? "Ticket confirmed" : "RSVP confirmed"}</p>
        <h1 style="margin:8px 0 0;color:#f7f0e6;font-size:28px;">You&#39;re in, ${escapeHtml(input.name)}</h1>
        <p style="margin:12px 0 24px;color:#b8ada0;font-size:14px;line-height:1.5;">
          ${isTicket ? "Your ticket is confirmed for" : "You're RSVP'd for"}:
        </p>
        <h2 style="margin:0;color:#f7f0e6;font-size:20px;">${escapeHtml(input.eventTitle)}</h2>
        <p style="margin:6px 0 0;color:#b8ada0;font-size:14px;">${escapeHtml(input.eventDateLabel)}</p>
        <p style="margin:2px 0 0;color:#b8ada0;font-size:14px;">${escapeHtml(input.eventVenue)}</p>
        ${
          isTicket
            ? `<table style="width:100%;border-collapse:collapse;border-top:1px solid #2a231b;margin-top:20px;">
                ${
                  quantity > 1
                    ? `<tr>
                        <td style="padding:12px 0 0;color:#b8ada0;font-size:14px;">Tickets</td>
                        <td style="padding:12px 0 0;color:#b8ada0;font-size:14px;text-align:right;">${quantity} × ${formatCents(input.priceCents)}</td>
                      </tr>`
                    : ""
                }
                <tr>
                  <td style="padding:12px 0 0;color:#f7f0e6;font-size:15px;font-weight:600;">Total paid</td>
                  <td style="padding:12px 0 0;color:#f7f0e6;font-size:15px;font-weight:600;text-align:right;">${formatCents(input.priceCents * quantity)}</td>
                </tr>
              </table>`
            : ""
        }
        ${
          input.ticketUrl
            ? `<table style="width:100%;border-collapse:collapse;border-top:1px solid #2a231b;margin-top:20px;">
                <tr>
                  <td style="padding:20px 0 0;text-align:center;">
                    <p style="margin:0 0 12px;color:#ff7a00;font-size:12px;letter-spacing:0.2em;text-transform:uppercase;font-weight:600;">${quantity > 1 ? `Your tickets — admits ${quantity}` : "Your ticket"}</p>
                    <!-- cid: — the image travels with the email as an
                         attachment. A data: URI here would be stripped by
                         Gmail and most clients, leaving a broken box where
                         the thing they need at the door should be. -->
                    <img src="cid:ticket-qr" alt="Ticket QR code" width="220" height="220" style="display:block;margin:0 auto;border-radius:12px;background:#ffffff;padding:10px;" />
                    <p style="margin:12px 0 0;color:#b8ada0;font-size:13px;line-height:1.5;">
                      Show this at the door. It only works once, so don't share it.
                    </p>
                    <p style="margin:8px 0 0;font-size:12px;">
                      <a href="${input.ticketUrl}" style="color:#ff7a00;">Open your ticket</a>
                    </p>
                  </td>
                </tr>
              </table>`
            : ""
        }
        <p style="margin:24px 0 0;color:#b8ada0;font-size:13px;line-height:1.5;">
          See you there — questions? Just reply to this email.
        </p>`);
}

// Best-effort by design — callers should catch and log rather than let an
// email hiccup fail an already-successful payment. Throws instead of
// swallowing internally so a caller who *does* want to know (e.g. to log
// with context) still can.
export async function sendOrderConfirmationEmail(input: {
  to: string;
  customerName: string;
  orderId: string;
  lines: OrderConfirmationLine[];
  /** Omitted for the POS register, where there's no shipment at all. */
  shippingCents?: number;
  /** Where it's going, already formatted for display. */
  shipTo?: string;
  totalCents: number;
}): Promise<void> {
  const resend = getResend();

  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: input.to,
    replyTo: REPLY_TO,
    subject: `Your WHOA order is confirmed`,
    html: buildOrderHtml(input),
  });

  if (error) {
    throw new Error(`Resend failed to send order confirmation: ${error.message}`);
  }
}

// Same best-effort posture as sendOrderConfirmationEmail — callers catch
// and log rather than let an email hiccup fail an already-successful
// RSVP or ticket purchase.
export async function sendEventConfirmationEmail(input: {
  to: string;
  name: string;
  eventTitle: string;
  eventDateLabel: string;
  eventVenue: string;
  priceCents: number;
  /** How many people the one QR admits. Omitted or 1 reads as a single ticket. */
  quantity?: number;
  /** The /checkin/<id> link the QR encodes. Omitted, no ticket block. */
  ticketUrl?: string;
  /** The QR as a data: URL, converted to a real attachment below. */
  ticketQrDataUrl?: string;
}): Promise<void> {
  const resend = getResend();
  const isTicket = input.priceCents > 0;

  // Until this existed, the QR only lived on the confirmation screen and
  // in the portal — so a guest who checked out without an account and
  // closed the tab had no ticket at all. Attached rather than inlined as a
  // data: URI because Gmail and most clients strip those.
  const base64 = input.ticketQrDataUrl?.split(",")[1];
  const attachments = base64
    ? [{ filename: "whoa-ticket.png", content: base64, contentId: "ticket-qr" }]
    : undefined;

  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: input.to,
    replyTo: REPLY_TO,
    subject: isTicket
      ? input.quantity && input.quantity > 1
        ? `Your ${input.quantity} tickets for ${input.eventTitle} are confirmed`
        : `Your ticket for ${input.eventTitle} is confirmed`
      : `You're RSVP'd for ${input.eventTitle}`,
    html: buildEventHtml(input),
    attachments,
  });

  if (error) {
    throw new Error(`Resend failed to send event confirmation: ${error.message}`);
  }
}

function buildAdminNotificationHtml(input: {
  heading: string;
  rows: { label: string; value: string }[];
  actions?: { approveUrl: string; declineUrl: string; approveLabel: string; declineLabel: string };
}): string {
  const rows = input.rows
    .map(
      (row) => `
        <tr>
          <td style="padding:6px 12px 6px 0;color:#6b6157;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;vertical-align:top;white-space:nowrap;">${escapeHtml(row.label)}</td>
          <td style="padding:6px 0;color:#f7f0e6;font-size:14px;">${escapeHtml(row.value).replace(/\n/g, "<br/>")}</td>
        </tr>`,
    )
    .join("");

  const actionsHtml = input.actions
    ? `<table style="width:100%;border-collapse:collapse;margin-top:24px;">
        <tr>
          <td style="padding:0 8px 0 0;">
            <a href="${input.actions.approveUrl}" style="display:block;text-align:center;background:#ff7a00;color:#14100c;font-weight:600;font-size:13px;letter-spacing:0.05em;text-transform:uppercase;text-decoration:none;border-radius:999px;padding:12px 0;">${escapeHtml(input.actions.approveLabel)}</a>
          </td>
          <td style="padding:0 0 0 8px;">
            <a href="${input.actions.declineUrl}" style="display:block;text-align:center;background:transparent;border:1px solid #4a3f33;color:#b8ada0;font-weight:600;font-size:13px;letter-spacing:0.05em;text-transform:uppercase;text-decoration:none;border-radius:999px;padding:11px 0;">${escapeHtml(input.actions.declineLabel)}</a>
          </td>
        </tr>
      </table>
      <p style="margin:12px 0 0;color:#6b6157;font-size:11px;line-height:1.5;">
        One click, no login needed — the buttons expire in 30 days and each can only be used once.
      </p>`
    : "";

  return wrapEmail(`
        <p style="margin:0;color:#ff7a00;font-size:12px;letter-spacing:0.2em;text-transform:uppercase;font-weight:600;">New submission</p>
        <h1 style="margin:8px 0 20px;color:#f7f0e6;font-size:24px;">${escapeHtml(input.heading)}</h1>
        <table style="width:100%;border-collapse:collapse;">
          ${rows}
        </table>
        ${actionsHtml}`);
}

// Internal staff notification, not a customer-facing email — reply-to'd to
// the submitter so a reply from info@wearewhoa.com goes straight back to
// them. Same best-effort posture as the rest of this module: callers catch
// and log rather than let a Resend hiccup fail an already-successful
// submission.
async function sendAdminNotification(input: {
  subject: string;
  heading: string;
  rows: { label: string; value: string }[];
  replyTo?: string;
  actions?: { approveUrl: string; declineUrl: string; approveLabel: string; declineLabel: string };
}): Promise<void> {
  const resend = getResend();

  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: ADMIN_NOTIFY_ADDRESS,
    replyTo: input.replyTo || REPLY_TO,
    subject: input.subject,
    html: buildAdminNotificationHtml({ heading: input.heading, rows: input.rows, actions: input.actions }),
  });

  if (error) {
    throw new Error(`Resend failed to send admin notification: ${error.message}`);
  }
}

/**
 * The generic admin notification, for a sender that doesn't warrant its own
 * typed helper below. Goes to info@wearewhoa.com like all the rest.
 */
export async function sendAdminNotificationRows(input: {
  subject: string;
  heading: string;
  rows: { label: string; value: string }[];
  replyTo?: string;
}): Promise<void> {
  await sendAdminNotification(input);
}

// Shared by every notification below that offers one-click Approve/Decline
// buttons — builds the magic-link pair for a given approval_tokens row.
async function buildApprovalActions(
  kind: ApprovalKind,
  subject: { code?: string; id?: string },
  labels: { approveLabel: string; declineLabel: string },
): Promise<{ approveUrl: string; declineUrl: string; approveLabel: string; declineLabel: string }> {
  const { approveUrl, declineUrl } = await createApprovalLinks(kind, subject);
  return { approveUrl, declineUrl, ...labels };
}

export async function sendAmbassadorApplicationNotification(input: {
  name: string;
  email: string;
  instagram?: string;
  code: string;
}): Promise<void> {
  // Ambassador access is held until staff approve — Approve grants it
  // (and creates their referral link), Decline leaves it off.
  const actions = await buildApprovalActions(
    "ambassador_application",
    { code: input.code },
    { approveLabel: "Approve", declineLabel: "Decline" },
  );

  await sendAdminNotification({
    subject: `New Brand Ambassador application: ${input.name}`,
    heading: "New Brand Ambassador application",
    rows: [
      { label: "Name", value: input.name },
      { label: "Email", value: input.email },
      { label: "Instagram", value: input.instagram || "—" },
      { label: "Assigned code", value: input.code },
      { label: "Status", value: "Pending — no ambassador access until approved." },
    ],
    replyTo: input.email,
    actions,
  });
}

/**
 * Tells an applicant their Brand Ambassador application was approved.
 *
 * Sent whenever ambassador access goes from off to on — the Approve link
 * in the staff email, or a Super Admin switching it on by hand. Their
 * account code doubles as the default link slug (see ensureDefaultLink),
 * so the link is known without a lookup.
 */
export async function sendAmbassadorApprovedEmail(input: {
  name: string;
  email: string;
  code: string;
}): Promise<void> {
  const linkUrl = `${SITE_URL}/r/${input.code}`;
  const portalUrl = `${SITE_URL}/portal/ambassador`;

  const html = wrapEmail(`
        <p style="margin:0;color:#ff7a00;font-size:12px;letter-spacing:0.2em;text-transform:uppercase;font-weight:600;">
          Approved
        </p>
        <h1 style="margin:8px 0 0;color:#f7f0e6;font-size:26px;">You&rsquo;re a WHOA Brand Ambassador</h1>
        <p style="margin:12px 0 0;color:#b8ada0;font-size:14px;line-height:1.6;">
          Hi ${escapeHtml(input.name)} &mdash; your application is approved. Your code and link are live now:
        </p>
        <p style="margin:16px 0 0;color:#f7f0e6;font-size:14px;line-height:1.8;">
          Code: <strong>${escapeHtml(input.code)}</strong><br />
          Link: <a href="${linkUrl}" style="color:#ff7a00;">${escapeHtml(linkUrl)}</a>
        </p>
        <p style="margin:12px 0 0;color:#b8ada0;font-size:14px;line-height:1.6;">
          Share either one. Your stats, commission, and payout details are in your dashboard.
        </p>
        <p style="margin:24px 0 0;">
          <a href="${portalUrl}" style="display:inline-block;background:#ff7a00;color:#0a0806;font-size:14px;font-weight:600;text-decoration:none;padding:12px 22px;border-radius:999px;">
            Open your dashboard
          </a>
        </p>
        <p style="margin:20px 0 0;color:#6b6157;font-size:11px;line-height:1.5;">
          Sent to ${escapeHtml(input.name)} because you applied to be a WHOA Brand Ambassador.
        </p>`);

  const { error } = await getResend().emails.send({
    from: FROM_ADDRESS,
    to: input.email,
    replyTo: REPLY_TO,
    subject: "You're approved — welcome to WHOA Brand Ambassadors",
    html,
  });

  if (error) {
    throw new Error(`Resend failed to send ambassador approval email: ${error.message}`);
  }
}

/**
 * Tells a Music Collective applicant what was decided.
 *
 * Both outcomes get an email. The MUSIC tab promises "we'll follow up by
 * email once it's reviewed", and silence after a decline reads as a
 * decision that was never made -- which is how an applicant ends up
 * writing in a third time.
 */
export async function sendMusicDecisionEmail(input: {
  name: string;
  email: string;
  artistName: string;
  approved: boolean;
}): Promise<void> {
  const portalUrl = `${SITE_URL}/portal/music`;

  const html = input.approved
    ? wrapEmail(`
        <p style="margin:0;color:#ff7a00;font-size:12px;letter-spacing:0.2em;text-transform:uppercase;font-weight:600;">
          Approved
        </p>
        <h1 style="margin:8px 0 0;color:#f7f0e6;font-size:26px;">Welcome to the WHOA Music Collective</h1>
        <p style="margin:12px 0 0;color:#b8ada0;font-size:14px;line-height:1.6;">
          Hi ${escapeHtml(input.name)} &mdash; ${escapeHtml(input.artistName)} is in. Your MUSIC tab is
          unlocked, so your bio, genre and links are yours to edit any time, and you can submit vinyl,
          tapes or merch to the shop from the same place.
        </p>
        <p style="margin:24px 0 0;">
          <a href="${portalUrl}" style="display:inline-block;background:#ff7a00;color:#0a0806;font-size:14px;font-weight:600;text-decoration:none;padding:12px 22px;border-radius:999px;">
            Open your Music tab
          </a>
        </p>
        <p style="margin:20px 0 0;color:#6b6157;font-size:11px;line-height:1.5;">
          Sent to ${escapeHtml(input.name)} because you applied to the WHOA Music Collective.
        </p>`)
    : wrapEmail(`
        <h1 style="margin:0;color:#f7f0e6;font-size:26px;">About your Music Collective application</h1>
        <p style="margin:12px 0 0;color:#b8ada0;font-size:14px;line-height:1.6;">
          Hi ${escapeHtml(input.name)} &mdash; thanks for sending ${escapeHtml(input.artistName)} over. We
          listened, and we are not able to add you to the collective right now.
        </p>
        <p style="margin:12px 0 0;color:#b8ada0;font-size:14px;line-height:1.6;">
          This is about what we can book and release this season, not a verdict on the music. Send new
          work whenever you have it and we will listen again.
        </p>
        <p style="margin:20px 0 0;color:#6b6157;font-size:11px;line-height:1.5;">
          Sent to ${escapeHtml(input.name)} because you applied to the WHOA Music Collective.
        </p>`);

  const { error } = await getResend().emails.send({
    from: FROM_ADDRESS,
    to: input.email,
    replyTo: REPLY_TO,
    subject: input.approved
      ? "You're in — welcome to the WHOA Music Collective"
      : "Your WHOA Music Collective application",
    html,
  });

  if (error) {
    throw new Error(`Resend failed to send music decision email: ${error.message}`);
  }
}

export async function sendContactMessageNotification(input: {
  name: string;
  email: string;
  topic: string;
  message: string;
}): Promise<void> {
  await sendAdminNotification({
    subject: `New contact message: ${input.topic}`,
    heading: "New contact form message",
    rows: [
      { label: "Name", value: input.name },
      { label: "Email", value: input.email },
      { label: "Topic", value: input.topic },
      { label: "Message", value: input.message },
    ],
    replyTo: input.email,
  });
}

export async function sendCustomDesignNotification(input: {
  name: string;
  email: string;
  phone: string;
  templateLabel: string;
}): Promise<void> {
  await sendAdminNotification({
    subject: `New custom design submission: ${input.name}`,
    heading: "New custom design submission",
    rows: [
      { label: "Name", value: input.name },
      { label: "Email", value: input.email },
      { label: "Phone", value: input.phone },
      { label: "Garment", value: input.templateLabel },
    ],
    replyTo: input.email,
  });
}

export async function sendEventSalesApplicationNotification(input: {
  name: string;
  email: string;
  phone: string;
  instagram?: string;
  message?: string;
  code: string;
}): Promise<void> {
  const actions = await buildApprovalActions(
    "event_sales_application",
    { code: input.code },
    { approveLabel: "Approve", declineLabel: "Decline" },
  );

  await sendAdminNotification({
    subject: `New Sell For Us application: ${input.name}`,
    heading: "New Sell For Us application",
    rows: [
      { label: "Name", value: input.name },
      { label: "Email", value: input.email },
      { label: "Phone", value: input.phone },
      { label: "Instagram", value: input.instagram || "—" },
      { label: "Message", value: input.message || "—" },
      { label: "Account", value: input.code },
    ],
    replyTo: input.email,
    actions,
  });
}

export async function sendEventWorkSignupNotification(input: {
  name: string;
  email: string;
  eventTitle: string;
  eventDateLabel: string;
  signupId: string;
}): Promise<void> {
  const actions = await buildApprovalActions(
    "event_sales_signup",
    { id: input.signupId },
    { approveLabel: "Approve", declineLabel: "Decline" },
  );

  await sendAdminNotification({
    subject: `${input.name} wants to work ${input.eventTitle}`,
    heading: "New event work signup",
    rows: [
      { label: "Name", value: input.name },
      { label: "Email", value: input.email },
      { label: "Event", value: input.eventTitle },
      { label: "Date", value: input.eventDateLabel },
    ],
    replyTo: input.email,
    actions,
  });
}

export async function sendMusicApplicationNotification(input: {
  name: string;
  email: string;
  artistName: string;
  subgenre?: string;
  bio?: string;
  code: string;
}): Promise<void> {
  const actions = await buildApprovalActions(
    "music_application",
    { code: input.code },
    { approveLabel: "Approve", declineLabel: "Decline" },
  );

  await sendAdminNotification({
    subject: `New Music Collective application: ${input.artistName}`,
    heading: "New Music Collective application",
    rows: [
      { label: "Contact name", value: input.name },
      { label: "Email", value: input.email },
      { label: "Artist name", value: input.artistName },
      { label: "Genre", value: input.subgenre || "—" },
      { label: "Bio", value: input.bio || "—" },
      { label: "Account", value: input.code },
    ],
    replyTo: input.email,
    actions,
  });
}

export async function sendArtApplicationNotification(input: {
  name: string;
  email: string;
  artistName: string;
  medium?: string;
  bio?: string;
  code: string;
}): Promise<void> {
  const actions = await buildApprovalActions(
    "art_application",
    { code: input.code },
    { approveLabel: "Approve", declineLabel: "Decline" },
  );

  await sendAdminNotification({
    subject: `New Art Collective application: ${input.artistName}`,
    heading: "New Art Collective application",
    rows: [
      { label: "Contact name", value: input.name },
      { label: "Email", value: input.email },
      { label: "Artist name", value: input.artistName },
      { label: "Medium", value: input.medium || "—" },
      { label: "Bio", value: input.bio || "—" },
      { label: "Account", value: input.code },
    ],
    replyTo: input.email,
    actions,
  });
}

// One email per submitted product (not per batch) — each gets its own
// Approve/Decline buttons so a batch of up to 5 can be handled individually
// right from the inbox; "approve all" for the whole batch at once is a
// button in the ART ADMIN tab instead, since a single magic link approving
// N products at once doesn't fit this module's one-token-one-decision model.
export async function sendArtProductSubmissionNotification(input: {
  artistName: string;
  email: string;
  productName: string;
  priceCents: number;
  alsoRetailEvents: boolean;
  productId: string;
}): Promise<void> {
  const actions = await buildApprovalActions(
    "art_product",
    { id: input.productId },
    { approveLabel: "Approve", declineLabel: "Decline" },
  );

  await sendAdminNotification({
    subject: `New product from ${input.artistName}: ${input.productName}`,
    heading: "New Art Collective product submission",
    rows: [
      { label: "Artist", value: input.artistName },
      { label: "Product", value: input.productName },
      { label: "Price", value: formatCents(input.priceCents) },
      { label: "Also wants", value: input.alsoRetailEvents ? "Retail store & events" : "Online store only" },
    ],
    replyTo: input.email,
    actions,
  });
}

/**
 * Tells a seller what happened to something they submitted.
 *
 * The counterpart to sendArtProductSubmissionNotification, which notifies
 * staff. The portal already promises "we'll email you once it's reviewed",
 * and until now nothing did — a decision only showed up if the seller
 * happened to open their dashboard again. This is the email that makes
 * that promise true, for both kinds of decision: the original submission,
 * and a later request to edit or pull a listing.
 *
 * Reply-to is the staff inbox rather than the seller's own address: this
 * one goes outward, so a reply should reach a human at WHOA, not bounce
 * back to the person who received it.
 */
export async function sendProductDecisionNotification(input: {
  /** The seller's own address — where this is going. */
  email: string;
  sellerName: string;
  productName: string;
  decision: "approved" | "declined";
  /** Which of their asks this answers. */
  request: "submission" | "edit" | "removal";
  /** Their own words on the request, echoed back so the email makes sense on its own. */
  note?: string | null;
  portalUrl: string;
}): Promise<void> {
  const approved = input.decision === "approved";

  const HEADLINES: Record<typeof input.request, { approved: string; declined: string }> = {
    submission: {
      approved: "Your product is live",
      declined: "Your product wasn't approved",
    },
    edit: {
      approved: "Your changes are live",
      declined: "Your change request wasn't approved",
    },
    removal: {
      approved: "Your product has been taken down",
      declined: "Your removal request wasn't approved",
    },
  };

  const BODIES: Record<typeof input.request, { approved: string; declined: string }> = {
    submission: {
      approved:
        "It's approved and in the shop now — online, and on the register at the WHOADEGA. Sales show up on your dashboard as they come in.",
      declined:
        "We didn't approve this one. It's not a dead end — reply to this email and we'll tell you what would get it over the line.",
    },
    edit: {
      approved: "We've applied your changes, and the listing in the shop is up to date.",
      declined:
        "We've left the listing as it was. Reply to this email if you'd like to talk it through.",
    },
    removal: {
      approved:
        "It's out of the shop. Your sales history for it stays on your dashboard — nothing you've already earned goes anywhere.",
      declined:
        "The listing is still up. Reply to this email if you need it down and we'll sort it out.",
    },
  };

  const accent = approved ? "#ff7a00" : "#b8ada0";
  const noteHtml = input.note
    ? `<p style="margin:16px 0 0;padding:12px 14px;border-left:2px solid #2a231b;color:#b8ada0;font-size:13px;line-height:1.5;">
         You told us: &ldquo;${escapeHtml(input.note)}&rdquo;
       </p>`
    : "";

  const html = wrapEmail(`
        <p style="margin:0;color:${accent};font-size:12px;letter-spacing:0.2em;text-transform:uppercase;font-weight:600;">
          ${approved ? "Approved" : "Not approved"}
        </p>
        <h1 style="margin:8px 0 0;color:#f7f0e6;font-size:26px;">${escapeHtml(HEADLINES[input.request][input.decision])}</h1>
        <p style="margin:12px 0 0;color:#f7f0e6;font-size:15px;font-weight:600;">${escapeHtml(input.productName)}</p>
        <p style="margin:12px 0 0;color:#b8ada0;font-size:14px;line-height:1.6;">
          ${escapeHtml(BODIES[input.request][input.decision])}
        </p>
        ${noteHtml}
        <p style="margin:24px 0 0;">
          <a href="${input.portalUrl}" style="display:inline-block;background:#ff7a00;color:#0a0806;font-size:14px;font-weight:600;text-decoration:none;padding:12px 22px;border-radius:999px;">
            Open your dashboard
          </a>
        </p>
        <p style="margin:20px 0 0;color:#6b6157;font-size:11px;line-height:1.5;">
          Sent to ${escapeHtml(input.sellerName)} because you submitted this through your WHOA dashboard.
        </p>`);

  const { error } = await getResend().emails.send({
    from: FROM_ADDRESS,
    to: input.email,
    replyTo: REPLY_TO,
    subject: `${HEADLINES[input.request][input.decision]}: ${input.productName}`,
    html,
  });

  if (error) {
    throw new Error(`Resend failed to send decision notification: ${error.message}`);
  }
}

/**
 * A ticket that was paid for but didn't save.
 *
 * This is an incident, not a submission. The payment has already gone
 * through at Square, so the buyer is out of pocket with no RSVP row, no
 * QR and no confirmation — and the checkout deliberately doesn't fail in
 * front of them, because failing wouldn't give them their money back
 * either. Without this email the only trace is a server log, and the
 * first anyone would hear of it is someone turned away at the door.
 *
 * Everything needed to reconstruct the ticket by hand is in the rows,
 * and the reply-to is the buyer, so staff can answer them directly.
 */
export async function sendTicketRecordFailureAlert(input: {
  eventId: string;
  eventName?: string;
  name: string;
  email: string;
  phone?: string | null;
  quantity: number;
  priceCents: number;
  squarePaymentId?: string | null;
  squareOrderId?: string | null;
  error: string;
}): Promise<void> {
  const paid = input.priceCents > 0;

  await sendAdminNotification({
    subject: paid
      ? `PAID TICKET NOT SAVED — ${input.eventName ?? input.eventId}`
      : `RSVP not saved — ${input.eventName ?? input.eventId}`,
    heading: paid
      ? "A ticket was paid for but did not save"
      : "A free RSVP failed to save",
    rows: [
      ...(paid
        ? [
            {
              label: "Action needed",
              value:
                "Square has taken this payment. There is no ticket record and no QR was sent. Issue the ticket manually or refund.",
            },
          ]
        : []),
      { label: "Event", value: input.eventName ?? input.eventId },
      { label: "Name", value: input.name },
      { label: "Email", value: input.email },
      ...(input.phone ? [{ label: "Phone", value: input.phone }] : []),
      { label: "Tickets", value: String(input.quantity) },
      {
        label: "Paid",
        value: paid ? formatCents(input.priceCents * input.quantity) : "Free RSVP",
      },
      { label: "Square payment ID", value: input.squarePaymentId || "—" },
      { label: "Square order ID", value: input.squareOrderId || "—" },
      { label: "When", value: new Date().toISOString() },
      { label: "Error", value: input.error },
    ],
    replyTo: input.email,
  });
}

export interface ReviewRequestItem {
  productName: string;
  productUrl: string;
  imageUrl: string | null;
}

/**
 * The ask, after the thing has arrived.
 *
 * One button per product rather than one for the order: a review belongs
 * to a piece, and a single "leave a review" link would land somebody on
 * a page and leave them to work out which of three things it meant.
 *
 * The token rides in the link. Whoever is holding it bought the order it
 * was issued for, so the form can fill in their email and mark the
 * review verified without asking them to prove anything.
 */
function buildReviewRequestHtml(input: {
  customerName: string | null;
  items: ReviewRequestItem[];
  token: string;
}): string {
  const greeting = input.customerName ? `Hi ${escapeHtml(input.customerName.split(" ")[0])},` : "Hi,";

  const blocks = input.items
    .map((item) => {
      const href = `${SITE_URL}${item.productUrl}?review=${encodeURIComponent(input.token)}#reviews`;
      const image = item.imageUrl
        ? `<img src="${escapeHtml(item.imageUrl)}" alt="" width="56" height="56" style="border-radius:8px;object-fit:cover;vertical-align:middle;margin-right:12px;" />`
        : "";
      return `
        <tr>
          <td style="padding:12px 0;border-top:1px solid #2a231b;">
            ${image}
            <span style="color:#f5efe6;font-size:15px;vertical-align:middle;">${escapeHtml(item.productName)}</span>
            <div style="margin-top:10px;">
              <a href="${href}" style="display:inline-block;background:#ff7a00;color:#14100c;font-weight:700;font-size:13px;letter-spacing:0.04em;text-transform:uppercase;text-decoration:none;padding:10px 18px;border-radius:999px;">Review this piece</a>
            </div>
          </td>
        </tr>`;
    })
    .join("");

  return wrapEmail(`
    <h1 style="margin:0 0 16px;color:#f5efe6;font-size:22px;">How is it?</h1>
    <p style="margin:0 0 8px;color:#b9ad9d;font-size:15px;line-height:1.6;">${greeting}</p>
    <p style="margin:0 0 20px;color:#b9ad9d;font-size:15px;line-height:1.6;">
      Your order should be with you by now. Every piece is hand finished and one of one, so what
      you think of yours is genuinely useful to the next person deciding.
    </p>
    <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">${blocks}</table>
    <p style="margin:20px 0 0;color:#6f6558;font-size:12px;line-height:1.6;">
      Something wrong with the order instead? Just reply to this email and a person will read it.
    </p>
  `);
}

/**
 * Hands the email to Resend with a send time in the future.
 *
 * Resend holds it and sends it then, which is why none of this needs a
 * cron or a queue. Returns the id so the row can record what was
 * scheduled, which is also how it could be cancelled later.
 */
export async function sendReviewRequestEmail(input: {
  to: string;
  customerName: string | null;
  items: ReviewRequestItem[];
  token: string;
  /** ISO 8601. Omitted sends immediately, which is only useful in a test. */
  scheduledAt?: string;
}): Promise<string | null> {
  const resend = getResend();

  const { data, error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: input.to,
    replyTo: REPLY_TO,
    subject: "How is your WHOA order?",
    html: buildReviewRequestHtml(input),
    scheduledAt: input.scheduledAt,
  });

  if (error) {
    throw new Error(`Resend failed to schedule a review request: ${error.message}`);
  }
  return data?.id ?? null;
}

/** Call off a scheduled send. Throws if Resend refuses. */
export async function cancelScheduledEmail(emailId: string): Promise<void> {
  const { error } = await getResend().emails.cancel(emailId);
  if (error) throw new Error(`Resend couldn't cancel ${emailId}: ${error.message}`);
}

/**
 * Move a scheduled send later.
 *
 * Used while somebody is still filling a form in: every save pushes the
 * reminder back rather than queueing a second one.
 */
export async function rescheduleEmail(emailId: string, scheduledAt: string): Promise<void> {
  const { error } = await getResend().emails.update({ id: emailId, scheduledAt });
  if (error) throw new Error(`Resend couldn't reschedule ${emailId}: ${error.message}`);
}

/* ------------------------------------------------------------------ */
/* Abandoned checkout                                                  */
/* ------------------------------------------------------------------ */

export interface AbandonedLine {
  productName: string;
  variationName: string;
  variationId: string;
  priceCents: number;
  quantity: number;
}

/**
 * One reminder about a basket, with a link that rebuilds it.
 *
 * The link is the /cart?products= one, so pressing it puts the exact
 * basket back rather than dropping somebody on the shop to find three
 * things again. No discount in it on purpose: teaching people that
 * walking away produces a coupon is a lesson they only need once.
 */
function buildAbandonedHtml(input: {
  customerName: string | null;
  lines: AbandonedLine[];
  subtotalCents: number;
}): string {
  const greeting = input.customerName
    ? `Hi ${escapeHtml(input.customerName.split(" ")[0])},`
    : "Hi,";

  const products = input.lines
    .map((l) => `${encodeURIComponent(l.variationId)}%3A${l.quantity}`)
    .join("%2C");
  const href = `${SITE_URL}/cart?products=${products}`;

  const rows = input.lines
    .map(
      (l) => `
      <tr>
        <td style="padding:8px 0;color:#b9ad9d;font-size:14px;">
          ${escapeHtml(l.productName)} <span style="color:#6f6558;">(${escapeHtml(l.variationName)})</span>
          ${l.quantity > 1 ? ` &times;${l.quantity}` : ""}
        </td>
        <td style="padding:8px 0;color:#f5efe6;font-size:14px;text-align:right;">${formatCents(l.priceCents * l.quantity)}</td>
      </tr>`,
    )
    .join("");

  return wrapEmail(`
    <h1 style="margin:0 0 16px;color:#f5efe6;font-size:22px;">You left something</h1>
    <p style="margin:0 0 20px;color:#b9ad9d;font-size:15px;line-height:1.6;">
      ${greeting} your basket is still here. Everything we make is one of one, so when a piece
      goes it is actually gone.
    </p>
    <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border-top:1px solid #2a231b;border-bottom:1px solid #2a231b;margin-bottom:20px;">
      ${rows}
      <tr>
        <td style="padding:12px 0 0;color:#6f6558;font-size:13px;">Subtotal</td>
        <td style="padding:12px 0 0;color:#f5efe6;font-size:15px;font-weight:700;text-align:right;">${formatCents(input.subtotalCents)}</td>
      </tr>
    </table>
    <a href="${href}" style="display:inline-block;background:#ff7a00;color:#14100c;font-weight:700;font-size:14px;letter-spacing:0.04em;text-transform:uppercase;text-decoration:none;padding:14px 28px;border-radius:999px;">Pick up where you left off</a>
    <p style="margin:20px 0 0;color:#6f6558;font-size:12px;line-height:1.6;">
      Changed your mind? Nothing else is coming. This is the only reminder we send.
    </p>
  `);
}

export async function sendAbandonedCheckoutEmail(input: {
  to: string;
  customerName: string | null;
  lines: AbandonedLine[];
  subtotalCents: number;
  scheduledAt?: string;
}): Promise<string | null> {
  const { data, error } = await getResend().emails.send({
    from: FROM_ADDRESS,
    to: input.to,
    replyTo: REPLY_TO,
    subject: "Your WHOA basket is still here",
    html: buildAbandonedHtml(input),
    scheduledAt: input.scheduledAt,
  });
  if (error) throw new Error(`Resend failed to schedule a cart reminder: ${error.message}`);
  return data?.id ?? null;
}

/* ------------------------------------------------------------------ */
/* Welcome                                                             */
/* ------------------------------------------------------------------ */

/**
 * The first email somebody gets after signing up.
 *
 * Sent immediately, because the one moment somebody definitely wants to
 * hear from WHOA is the moment they asked to. It promises only what the
 * signup form promised, and it carries the unsubscribe link in plain
 * sight rather than in six point grey: a list people can leave easily is
 * a list that keeps delivering.
 */
function buildWelcomeHtml(firstName: string | null): string {
  const greeting = firstName ? `Hi ${escapeHtml(firstName)},` : "Hi,";
  return wrapEmail(`
    <h1 style="margin:0 0 16px;color:#f5efe6;font-size:22px;">You're on the list</h1>
    <p style="margin:0 0 16px;color:#b9ad9d;font-size:15px;line-height:1.6;">
      ${greeting} thanks for signing up. Here is what that actually means: you will hear from us
      when there is a drop, when there is an event, and not otherwise.
    </p>
    <p style="margin:0 0 20px;color:#b9ad9d;font-size:15px;line-height:1.6;">
      Everything is hand finished in San Diego and most of it is one of one, so the drops are the
      only way to catch a piece before it is gone.
    </p>
    <a href="${SITE_URL}/shop" style="display:inline-block;background:#ff7a00;color:#14100c;font-weight:700;font-size:14px;letter-spacing:0.04em;text-transform:uppercase;text-decoration:none;padding:14px 28px;border-radius:999px;">See what's in the shop</a>
    <p style="margin:24px 0 0;color:#6f6558;font-size:12px;line-height:1.6;">
      Find us in person at the WHOADEGA on Newport Ave in Ocean Beach, and inside Pangaea Outpost
      in Pacific Beach. <a href="${SITE_URL}/stores" style="color:#ff7a00;">Where to find us</a>.
    </p>
  `);
}

export async function sendWelcomeEmail(input: {
  to: string;
  firstName?: string | null;
}): Promise<void> {
  const { error } = await getResend().emails.send({
    from: FROM_ADDRESS,
    to: input.to,
    replyTo: REPLY_TO,
    subject: "Welcome to WHOA",
    html: buildWelcomeHtml(input.firstName ?? null),
  });
  if (error) throw new Error(`Resend failed to send a welcome email: ${error.message}`);
}

/* ------------------------------------------------------------------ */
/* Event reminder                                                      */
/* ------------------------------------------------------------------ */

/**
 * The nudge the day before an event.
 *
 * Scheduled at the moment somebody RSVPs, which is often weeks out, so
 * the send time is the event's own date rather than a delay from now.
 * Returns the id so it can be called off if they cancel.
 */
function buildEventReminderHtml(input: {
  name: string | null;
  eventTitle: string;
  eventDateLabel: string;
  eventTimeLabel: string;
  eventVenue: string;
  eventLocation: string;
}): string {
  const greeting = input.name ? `Hi ${escapeHtml(input.name.split(" ")[0])},` : "Hi,";
  return wrapEmail(`
    <h1 style="margin:0 0 16px;color:#f5efe6;font-size:22px;">Tomorrow: ${escapeHtml(input.eventTitle)}</h1>
    <p style="margin:0 0 16px;color:#b9ad9d;font-size:15px;line-height:1.6;">${greeting} just so it is in front of you.</p>
    <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border-top:1px solid #2a231b;border-bottom:1px solid #2a231b;margin-bottom:20px;">
      <tr><td style="padding:10px 0;color:#6f6558;font-size:13px;">When</td><td style="padding:10px 0;color:#f5efe6;font-size:14px;text-align:right;">${escapeHtml(input.eventDateLabel)}, ${escapeHtml(input.eventTimeLabel)}</td></tr>
      <tr><td style="padding:10px 0;color:#6f6558;font-size:13px;">Where</td><td style="padding:10px 0;color:#f5efe6;font-size:14px;text-align:right;">${escapeHtml(input.eventVenue)}</td></tr>
      <tr><td style="padding:10px 0;color:#6f6558;font-size:13px;"></td><td style="padding:10px 0;color:#b9ad9d;font-size:13px;text-align:right;">${escapeHtml(input.eventLocation)}</td></tr>
    </table>
    <a href="${SITE_URL}/events" style="display:inline-block;background:#ff7a00;color:#14100c;font-weight:700;font-size:14px;letter-spacing:0.04em;text-transform:uppercase;text-decoration:none;padding:14px 28px;border-radius:999px;">Event details</a>
    <p style="margin:20px 0 0;color:#6f6558;font-size:12px;line-height:1.6;">
      Can't make it? Just reply and let us know, so we are not holding a spot.
    </p>
  `);
}

export async function sendEventReminderEmail(input: {
  to: string;
  name: string | null;
  eventTitle: string;
  eventDateLabel: string;
  eventTimeLabel: string;
  eventVenue: string;
  eventLocation: string;
  /** ISO 8601. The day before the event, worked out by the caller. */
  scheduledAt: string;
}): Promise<string | null> {
  const { data, error } = await getResend().emails.send({
    from: FROM_ADDRESS,
    to: input.to,
    replyTo: REPLY_TO,
    subject: `Tomorrow: ${input.eventTitle}`,
    html: buildEventReminderHtml(input),
    scheduledAt: input.scheduledAt,
  });
  if (error) throw new Error(`Resend failed to schedule an event reminder: ${error.message}`);
  return data?.id ?? null;
}
