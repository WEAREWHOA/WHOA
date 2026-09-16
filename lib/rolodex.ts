import { getSupabase } from "./supabase";

/**
 * Categories seeded for a brand that sells through shops, plays events and
 * makes physical product. Staff can create others — `category` is free
 * text — but these cover the relationships WHOA already has, so nobody has
 * to invent a taxonomy on their first entry.
 */
export const ROLODEX_CATEGORIES = [
  "RETAILER",
  "EVENT",
  "SALES",
  "ARTIST",
  "MUSICIAN",
  "VENUE",
  "SUPPLIER",
  "PRESS",
  "CREATOR",
  "SPONSOR",
  "OTHER",
] as const;

/** Where a relationship stands, so a long list can be filtered to what needs chasing. */
export const ROLODEX_STATUSES = ["LEAD", "IN TALKS", "ACTIVE", "DORMANT"] as const;

export interface RolodexContact {
  id: string;
  name: string;
  company: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  instagram: string | null;
  city: string | null;
  category: string;
  partnership: string | null;
  status: string;
  lastContactedAt: string | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Row {
  id: string;
  name: string;
  company: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  instagram: string | null;
  city: string | null;
  category: string;
  partnership: string | null;
  status: string;
  last_contacted_at: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

function mapRow(row: Row): RolodexContact {
  return {
    id: row.id,
    name: row.name,
    company: row.company,
    phone: row.phone,
    email: row.email,
    website: row.website,
    instagram: row.instagram,
    city: row.city,
    category: row.category,
    partnership: row.partnership,
    status: row.status,
    lastContactedAt: row.last_contacted_at,
    notes: row.notes,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** The fields a form can set. Everything but name is optional. */
export interface RolodexInput {
  name: string;
  company?: string;
  phone?: string;
  email?: string;
  website?: string;
  instagram?: string;
  city?: string;
  category?: string;
  partnership?: string;
  status?: string;
  lastContactedAt?: string;
  notes?: string;
}

/** Empty strings become null, so "not set" is one value in the database rather than two. */
function clean(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/**
 * Categories are stored shouting (RETAILER, not Retailer) so a hand-typed
 * "retailer" lands in the same bucket as the one picked from the list
 * rather than quietly starting a second group.
 */
export function normalizeCategory(value: string | undefined): string {
  return clean(value)?.toUpperCase() ?? "OTHER";
}

function toRow(input: RolodexInput) {
  return {
    name: input.name.trim(),
    company: clean(input.company),
    phone: clean(input.phone),
    email: clean(input.email)?.toLowerCase() ?? null,
    website: clean(input.website),
    // Stored without the @, so searching for either form finds it.
    instagram: clean(input.instagram)?.replace(/^@+/, "") ?? null,
    city: clean(input.city),
    category: normalizeCategory(input.category),
    partnership: clean(input.partnership),
    status: clean(input.status)?.toUpperCase() ?? "LEAD",
    last_contacted_at: clean(input.lastContactedAt),
    notes: clean(input.notes),
  };
}

export async function createContact(input: RolodexInput, byCode: string): Promise<RolodexContact> {
  const { data, error } = await getSupabase()
    .from("rolodex_contacts")
    .insert({ ...toRow(input), created_by: byCode.trim().toUpperCase() })
    .select("*")
    .single();

  if (error) throw new Error(`Failed to save that contact: ${error.message}`);
  return mapRow(data as Row);
}

export async function updateContact(id: string, input: RolodexInput): Promise<void> {
  const { error } = await getSupabase()
    .from("rolodex_contacts")
    .update({ ...toRow(input), updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error(`Failed to update that contact: ${error.message}`);
}

export async function deleteContact(id: string): Promise<void> {
  const { error } = await getSupabase().from("rolodex_contacts").delete().eq("id", id);
  if (error) throw new Error(`Failed to delete that contact: ${error.message}`);
}

/**
 * The whole book, newest first.
 *
 * Loaded in one go and searched in the browser rather than round-tripping
 * per keystroke: a contact book is hundreds of rows, not millions, and
 * instant filtering is most of what makes it usable. If this ever grows
 * past a few thousand, move `searchContacts` server-side.
 */
export async function listContacts(): Promise<RolodexContact[]> {
  const { data, error } = await getSupabase()
    .from("rolodex_contacts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to load the rolodex: ${error.message}`);
  return (data ?? []).map((row) => mapRow(row as Row));
}

/**
 * Free-text search across every field someone might remember a contact by.
 *
 * Deliberately matches on notes too — "the guy from the Oakland pop-up" is
 * often the only thing anyone recalls, and it'll be in there.
 */
export function searchContacts(contacts: RolodexContact[], query: string): RolodexContact[] {
  const q = query.trim().toLowerCase();
  if (!q) return contacts;

  return contacts.filter((c) =>
    [c.name, c.company, c.email, c.phone, c.website, c.instagram, c.city, c.category, c.partnership, c.notes]
      .some((field) => field?.toLowerCase().includes(q)),
  );
}

/** Every category actually in use, so ones staff invented show up alongside the seeded list. */
export function categoriesInUse(contacts: RolodexContact[]): string[] {
  const seen = new Set<string>(ROLODEX_CATEGORIES);
  for (const contact of contacts) seen.add(contact.category);
  return [...seen].sort();
}
