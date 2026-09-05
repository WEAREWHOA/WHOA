import { Resend } from "resend";
import { formatCents } from "./money";

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
          <tr>
            <td style="padding:12px 0 0;color:#f7f0e6;font-size:15px;font-weight:600;">Total</td>
            <td style="padding:12px 0 0;color:#f7f0e6;font-size:15px;font-weight:600;text-align:right;">${formatCents(input.totalCents)}</td>
          </tr>
        </table>
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
}): string {
  const isTicket = input.priceCents > 0;
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
                <tr>
                  <td style="padding:12px 0 0;color:#f7f0e6;font-size:15px;font-weight:600;">Total paid</td>
                  <td style="padding:12px 0 0;color:#f7f0e6;font-size:15px;font-weight:600;text-align:right;">${formatCents(input.priceCents)}</td>
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
}): Promise<void> {
  const resend = getResend();
  const isTicket = input.priceCents > 0;

  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: input.to,
    replyTo: REPLY_TO,
    subject: isTicket ? `Your ticket for ${input.eventTitle} is confirmed` : `You're RSVP'd for ${input.eventTitle}`,
    html: buildEventHtml(input),
  });

  if (error) {
    throw new Error(`Resend failed to send event confirmation: ${error.message}`);
  }
}

function buildAdminNotificationHtml(input: { heading: string; rows: { label: string; value: string }[] }): string {
  const rows = input.rows
    .map(
      (row) => `
        <tr>
          <td style="padding:6px 12px 6px 0;color:#6b6157;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;vertical-align:top;white-space:nowrap;">${escapeHtml(row.label)}</td>
          <td style="padding:6px 0;color:#f7f0e6;font-size:14px;">${escapeHtml(row.value).replace(/\n/g, "<br/>")}</td>
        </tr>`,
    )
    .join("");

  return wrapEmail(`
        <p style="margin:0;color:#ff7a00;font-size:12px;letter-spacing:0.2em;text-transform:uppercase;font-weight:600;">New submission</p>
        <h1 style="margin:8px 0 20px;color:#f7f0e6;font-size:24px;">${escapeHtml(input.heading)}</h1>
        <table style="width:100%;border-collapse:collapse;">
          ${rows}
        </table>`);
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
}): Promise<void> {
  const resend = getResend();

  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: ADMIN_NOTIFY_ADDRESS,
    replyTo: input.replyTo || REPLY_TO,
    subject: input.subject,
    html: buildAdminNotificationHtml({ heading: input.heading, rows: input.rows }),
  });

  if (error) {
    throw new Error(`Resend failed to send admin notification: ${error.message}`);
  }
}

export async function sendAmbassadorApplicationNotification(input: {
  name: string;
  email: string;
  instagram?: string;
  code: string;
}): Promise<void> {
  await sendAdminNotification({
    subject: `New Brand Ambassador application: ${input.name}`,
    heading: "New Brand Ambassador application",
    rows: [
      { label: "Name", value: input.name },
      { label: "Email", value: input.email },
      { label: "Instagram", value: input.instagram || "—" },
      { label: "Assigned code", value: input.code },
    ],
    replyTo: input.email,
  });
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
