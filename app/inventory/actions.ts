"use server";

import { redirect, unstable_rethrow } from "next/navigation";
import { requirePortalTab } from "@/lib/portalAccess";
import { setStock, adjustStock, seedStockFromSquareMirror } from "@/lib/stockStore";
import { getSquareLocationId } from "@/lib/square";
import { portalPath } from "@/lib/portalNav";

/**
 * Editing stock by hand.
 *
 * Everything here goes through the same two functions the rest of the
 * app uses, so a correction typed on this screen lands in the ledger
 * beside a sale and carries the name of whoever made it. A screen that
 * wrote the table directly would be the second path this design exists
 * to prevent.
 */

function location(): string {
  // One location for now: the one the website already sells from. When
  // stock moves between the shop and a booth this becomes a choice on
  // the screen rather than a constant.
  return getSquareLocationId();
}

/** A stocktake: this is what is actually on the shelf. */
export async function setStockAction(formData: FormData) {
  const { account } = await requirePortalTab("inventory");

  const variationId = String(formData.get("variationId") || "").trim();
  const raw = String(formData.get("quantity") || "").trim();
  const tracked = formData.get("tracked") !== null;

  if (!variationId) redirect(portalPath("inventory", "stockError=invalid"));

  const quantity = Number(raw);
  if (!Number.isFinite(quantity) || quantity < 0 || !Number.isInteger(quantity)) {
    redirect(portalPath("inventory", "stockError=quantity"));
  }

  try {
    await setStock({
      variationId,
      locationId: location(),
      quantity,
      tracked,
      reason: "count",
      actor: account.code,
    });
  } catch (err) {
    unstable_rethrow(err);
    console.error("setStockAction failed:", err);
    redirect(portalPath("inventory", "stockError=server"));
  }

  redirect(portalPath("inventory", "stockSaved=1"));
}

/** One in or one out, for a breakage or a found box. */
export async function adjustStockAction(formData: FormData) {
  const { account } = await requirePortalTab("inventory");

  const variationId = String(formData.get("variationId") || "").trim();
  const delta = Number(String(formData.get("delta") || "0"));

  if (!variationId || !Number.isInteger(delta) || delta === 0) {
    redirect(portalPath("inventory", "stockError=invalid"));
  }

  try {
    const result = await adjustStock({
      variationId,
      locationId: location(),
      delta,
      reason: delta > 0 ? "restock" : "count",
      actor: account.code,
    });
    // A refusal is the honest answer rather than a failure: it means
    // the shelf does not have what somebody tried to take off it.
    if (!result.applied) redirect(portalPath("inventory", "stockError=short"));
  } catch (err) {
    unstable_rethrow(err);
    console.error("adjustStockAction failed:", err);
    redirect(portalPath("inventory", "stockError=server"));
  }

  redirect(portalPath("inventory", "stockSaved=1"));
}

/**
 * Copy Square's counts across.
 *
 * Safe while Square is still selling, because it sets rather than
 * adjusts: a second run restates what Square says. Stops being safe the
 * day the website sells against this table instead, when it would
 * overwrite real sales with Square's stale view, which is why the
 * button says so.
 */
export async function seedStockAction() {
  const { account } = await requirePortalTab("inventory");

  try {
    const { seeded } = await seedStockFromSquareMirror(location(), account.code);
    redirect(portalPath("inventory", `stockSeeded=${seeded}`));
  } catch (err) {
    unstable_rethrow(err);
    console.error("seedStockAction failed:", err);
    redirect(portalPath("inventory", "stockError=server"));
  }
}
