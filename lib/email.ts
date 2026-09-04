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

export interface OrderConfirmationLine {
  name: string;
  quantity: number;
  totalCents: number;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}

function buildHtml(input: {
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

  return `
    <div style="background:#0a0806;padding:32px 16px;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;">
      <div style="max-width:480px;margin:0 auto;background:#14100c;border:1px solid #2a231b;border-radius:16px;padding:32px;">
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
        </p>
      </div>
    </div>`;
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
    html: buildHtml(input),
  });

  if (error) {
    throw new Error(`Resend failed to send order confirmation: ${error.message}`);
  }
}
