"use server";

import { revalidatePath } from "next/cache";
import { getSessionAmbassadorCode } from "@/lib/auth";
import { getByCode } from "@/lib/store";
import { deleteUtmLink, saveUtmLinks, type UtmLinkInput } from "@/lib/utmLinkStore";
import type { Ambassador } from "@/lib/types";

/**
 * Who can manage the link library: the same people who can read the
 * traffic it feeds. Re-checked on every write rather than trusted from
 * the tab having rendered — these are POST endpoints like any other.
 */
async function requireLinks(): Promise<Ambassador | undefined> {
  const code = await getSessionAmbassadorCode().catch(() => null);
  if (!code) return undefined;
  const account = await getByCode(code).catch(() => undefined);
  if (!account) return undefined;
  return account.isSuperAdmin || account.permissions.analytics ? account : undefined;
}

export interface SaveLinksResult {
  ok: boolean;
  saved: number;
  error?: string;
}

/** A whole campaign kit at once is the normal case, so this takes a list. */
export async function saveUtmLinksAction(inputs: UtmLinkInput[]): Promise<SaveLinksResult> {
  const account = await requireLinks();
  if (!account) return { ok: false, saved: 0, error: "You don't have access to the link library." };
  if (!Array.isArray(inputs) || inputs.length === 0) return { ok: false, saved: 0, error: "Nothing to save." };

  try {
    const saved = await saveUtmLinks(inputs.slice(0, 100), account.code);
    revalidatePath("/portal/links");
    return { ok: true, saved };
  } catch (err) {
    console.error("saveUtmLinksAction failed:", err);
    return { ok: false, saved: 0, error: "Couldn't save — the link library may not be set up yet." };
  }
}

export async function deleteUtmLinkAction(formData: FormData): Promise<void> {
  const account = await requireLinks();
  if (!account) return;

  const id = String(formData.get("id") || "").trim();
  if (!id) return;

  try {
    await deleteUtmLink(id);
  } catch (err) {
    console.error("deleteUtmLinkAction failed:", err);
  }

  revalidatePath("/portal/links");
}
