"use server";

import { getSessionAmbassadorCode } from "@/lib/auth";
import { sendAdminNotificationRows } from "@/lib/email";
import { getOasisCatalogue, recordOasisPreorder, type OasisOrderLine } from "@/lib/oasisCatalogue";
import { formatCents } from "@/lib/money";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_QUANTITY = 20;

export interface OasisPreorderResult {
  ok: boolean;
  error?: string;
  totalCents?: number;
}

/**
 * Submits a pre-order request. No payment: nothing here touches Square.
 *
 * Prices are re-read from the catalogue rather than taken from the
 * browser, the same posture as the shop's checkout — the client says
 * *what* was ordered, never what it costs.
 */
export async function submitOasisPreorderAction(input: {
  name: string;
  email: string;
  phone?: string;
  note?: string;
  lines: { slug: string; size: string | null; quantity: number }[];
}): Promise<OasisPreorderResult> {
  const name = input.name.trim().slice(0, 200);
  const email = input.email.trim().slice(0, 200);
  const phone = input.phone?.trim().slice(0, 40) || undefined;
  const note = input.note?.trim().slice(0, 2000) || undefined;

  if (!name) return { ok: false, error: "Name is required." };
  if (!EMAIL_PATTERN.test(email)) return { ok: false, error: "Enter a valid email." };
  if (!input.lines.length) return { ok: false, error: "Your order is empty." };

  const { items } = await getOasisCatalogue();
  const bySlug = new Map(items.map((item) => [item.slug, item]));

  const lines: OasisOrderLine[] = [];
  for (const line of input.lines) {
    const item = bySlug.get(line.slug);
    // An item pulled from the catalogue since this order was started.
    if (!item) return { ok: false, error: "Something in your order is no longer available." };

    const quantity = Math.min(Math.max(Math.floor(Number(line.quantity) || 1), 1), MAX_QUANTITY);
    // A size that isn't offered means a stale or tampered order.
    const size = item.sizes.length > 0 ? line.size : null;
    if (item.sizes.length > 0 && (!size || !item.sizes.includes(size))) {
      return { ok: false, error: `Choose a size for ${item.name}.` };
    }

    lines.push({
      slug: item.slug,
      name: item.name,
      size,
      unitPriceCents: item.priceCents,
      quantity,
    });
  }

  const totalCents = lines.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0);
  const accountCode = await getSessionAmbassadorCode().catch(() => null);

  let recorded = false;
  try {
    await recordOasisPreorder({ accountCode, name, email, phone, note, lines });
    recorded = true;
  } catch (err) {
    console.error("Failed to record Oasis pre-order:", err);
  }

  // Stored and emailed independently, and the request counts as received
  // if either worked — same reasoning as lib/contact.ts. A pre-order is
  // someone's intent to buy; losing it over a table being unavailable
  // would be the worst possible failure here.
  let notified = false;
  try {
    await sendAdminNotificationRows({
      subject: `Oasis pre-order from ${name}`,
      heading: "New Oasis pre-order",
      replyTo: email,
      rows: [
        { label: "Name", value: name },
        { label: "Email", value: email },
        ...(phone ? [{ label: "Phone", value: phone }] : []),
        ...(accountCode ? [{ label: "Account", value: accountCode }] : []),
        {
          label: "Items",
          value: lines
            .map(
              (line) =>
                `${line.quantity} × ${line.name}${line.size ? ` (${line.size})` : ""} — ${formatCents(
                  line.unitPriceCents * line.quantity,
                )}`,
            )
            .join("\n"),
        },
        { label: "Total", value: formatCents(totalCents) },
        ...(note ? [{ label: "Note", value: note }] : []),
      ],
    });
    notified = true;
  } catch (err) {
    console.error("Failed to email the Oasis pre-order:", err);
  }

  if (!recorded && !notified) {
    return {
      ok: false,
      error: "We couldn't get that through — please email info@wearewhoa.com directly.",
    };
  }

  return { ok: true, totalCents };
}
