"use server";

import { cookies } from "next/headers";

import { REF_COOKIE, REF_COOKIE_DAYS } from "@/lib/attribution";
import { listProducts } from "@/lib/catalog";
import { getLinkBySlug, recordLinkClick } from "@/lib/store";
import type { CartLine } from "@/lib/types";

/**
 * Filling a cart from a link.
 *
 * Meta's Commerce Manager hands a shopper off to a URL of our choosing
 * and expects it to understand what they were looking at:
 *
 *   /cart?products=VARIATION:QTY,VARIATION:QTY&coupon=CODE
 *
 * with the colons and commas percent-encoded. The ids are whatever the
 * feed published as <g:id>, which is Square's variation id, so the thing
 * Meta sends back is the same thing the till and the warehouse use. No
 * mapping table, nothing to keep in sync.
 *
 * It is not a Meta-shaped feature though, which is why it lives on the
 * cart rather than in a /meta route. The same link works in a campaign
 * email, on a QR code at the register, or anywhere a "shop this look"
 * button wants to hand somebody a ready-made basket.
 */

/** Per line, and per link. Both are sanity limits rather than policy. */
const MAX_QUANTITY = 10;
const MAX_LINES = 20;

export interface PrefillResult {
  lines: CartLine[];
  /** Ids in the link that match nothing we sell any more. */
  unknown: string[];
  couponApplied: boolean;
}

/** "V1:2,V2" -> [["V1", 2], ["V2", 1]] */
function parseProducts(param: string): [string, number][] {
  const out: [string, number][] = [];
  for (const entry of param.split(",")) {
    const [rawId, rawQty] = entry.split(":");
    const id = rawId?.trim();
    if (!id) continue;
    // A missing quantity means one. Meta always sends one, but a
    // hand-written link in a campaign email will not.
    const quantity = Math.min(MAX_QUANTITY, Math.max(1, Math.floor(Number(rawQty ?? 1)) || 1));
    out.push([id, quantity]);
    if (out.length >= MAX_LINES) break;
  }
  return out;
}

export async function prefillCartAction(
  products: string,
  coupon?: string,
): Promise<PrefillResult> {
  const wanted = parseProducts(products || "");
  if (wanted.length === 0) return { lines: [], unknown: [], couponApplied: false };

  const lines: CartLine[] = [];
  const unknown: string[] = [];

  try {
    const catalogue = await listProducts({ onlineOnly: true });

    // One pass over the catalogue rather than a lookup per id: the
    // catalogue read is cached and this keeps a twenty item link to a
    // single fetch.
    const byVariation = new Map(
      catalogue.flatMap((product) =>
        product.variations.map((variation) => [variation.id, { product, variation }] as const),
      ),
    );

    for (const [id, quantity] of wanted) {
      const found = byVariation.get(id);
      if (!found) {
        unknown.push(id);
        continue;
      }
      const { product, variation } = found;
      // A price of zero means Square has no price on that variation, so
      // there is nothing honest to charge and it is left out.
      if (variation.priceCents <= 0) {
        unknown.push(id);
        continue;
      }
      lines.push({
        variationId: variation.id,
        productId: product.id,
        productName: product.name,
        variationName: variation.name,
        priceCents: variation.priceCents,
        imageUrl: product.imageUrls[0] ?? null,
        quantity,
      });
    }
  } catch (err) {
    // A shopper arriving from Instagram with an empty cart is a bad
    // afternoon. A shopper arriving at an error page is a lost sale.
    console.error("Couldn't prefill a cart from a link:", err);
    return { lines: [], unknown: [], couponApplied: false };
  }

  let couponApplied = false;
  const code = coupon?.trim();
  if (code) {
    try {
      // The same path as typing the code at checkout: every ambassador's
      // Default link uses their own code as its slug, so this is the
      // same cookie and the same discount, and it counts as a real click
      // on their link.
      const link = await getLinkBySlug(code);
      if (link) {
        await recordLinkClick(link.slug).catch((err) =>
          console.error("Couldn't record a click for a prefilled cart:", err),
        );
        const store = await cookies();
        store.set(REF_COOKIE, link.ambassadorCode, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: REF_COOKIE_DAYS * 24 * 60 * 60,
          path: "/",
        });
        couponApplied = true;
      }
    } catch (err) {
      // A bad code is not a reason to refuse somebody their basket.
      console.error("Couldn't apply a coupon from a link:", err);
    }
  }

  return { lines, unknown, couponApplied };
}
