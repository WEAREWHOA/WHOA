"use server";

import { revalidatePath } from "next/cache";
import { getSessionAmbassadorCode } from "@/lib/auth";
import { getByCode } from "@/lib/store";
import { createContact, deleteContact, updateContact, type RolodexInput } from "@/lib/rolodex";
import type { Ambassador } from "@/lib/types";

/**
 * Who can open the contact book.
 *
 * Super Admins always; everyone else only if a Super Admin turned
 * `rolodex` on for them. Re-checked on every write rather than trusted
 * from the fact that the tab rendered — these actions are POST endpoints
 * like any other, and the book holds people's personal numbers.
 */
async function requireRolodex(): Promise<Ambassador | undefined> {
  const code = await getSessionAmbassadorCode();
  if (!code) return undefined;

  const account = await getByCode(code);
  if (!account) return undefined;
  return account.isSuperAdmin || account.permissions.rolodex ? account : undefined;
}

/** Reads the shared contact fields out of a form. */
function readInput(formData: FormData): RolodexInput {
  const get = (key: string) => String(formData.get(key) || "");
  return {
    name: get("name"),
    company: get("company"),
    phone: get("phone"),
    email: get("email"),
    website: get("website"),
    instagram: get("instagram"),
    city: get("city"),
    // The form offers a picker and a "new category" box; whatever was
    // typed wins, so a category can be created without leaving the form.
    category: get("newCategory").trim() || get("category"),
    partnership: get("partnership"),
    status: get("status"),
    lastContactedAt: get("lastContactedAt"),
    notes: get("notes"),
  };
}

export async function createContactAction(formData: FormData): Promise<void> {
  const account = await requireRolodex();
  if (!account) return;

  const input = readInput(formData);
  // A contact with no name is a blank row nobody can search for. Everything
  // else is genuinely optional — half of these start as a name and an
  // Instagram handle scribbled at an event.
  if (!input.name.trim()) return;

  try {
    await createContact(input, account.code);
  } catch (err) {
    console.error("createContactAction failed:", err);
  }

  revalidatePath(`/portal/${account.code}`);
}

export async function updateContactAction(formData: FormData): Promise<void> {
  const account = await requireRolodex();
  if (!account) return;

  const id = String(formData.get("id") || "").trim();
  const input = readInput(formData);
  if (!id || !input.name.trim()) return;

  try {
    await updateContact(id, input);
  } catch (err) {
    console.error("updateContactAction failed:", err);
  }

  revalidatePath(`/portal/${account.code}`);
}

export async function deleteContactAction(formData: FormData): Promise<void> {
  const account = await requireRolodex();
  if (!account) return;

  const id = String(formData.get("id") || "").trim();
  if (!id) return;

  try {
    await deleteContact(id);
  } catch (err) {
    console.error("deleteContactAction failed:", err);
  }

  revalidatePath(`/portal/${account.code}`);
}
