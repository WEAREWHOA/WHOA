import { unstable_cache } from "next/cache";

import { getSquare } from "@/lib/square";
import { getSupabase } from "@/lib/supabase";

/**
 * The customer directory: everyone Square knows about, everyone with a
 * WHOA account, and which of them are the same person.
 *
 * ───────────────────────────────────────────────────────────────────────
 * This module only ever READS. It does not create, update, merge or
 * re-link a single Square customer, and it does not touch the pinned
 * square_customer_id on an account.
 *
 * That restraint is the point. People who signed up recently already
 * have a Square customer profile, linked at checkout by
 * findOrCreateSquareCustomerId. Anything here that wrote to Square could
 * break a live link between an account and its purchase history — so
 * nothing here writes.
 * ───────────────────────────────────────────────────────────────────────
 *
 * Matching an account to a Square profile follows the same rule the rest
 * of the app already uses, and no looser one:
 *
 *  1. The account's pinned square_customer_id, when it has one. That's a
 *     deliberate link and it always wins.
 *  2. Otherwise an exact, case-folded email match.
 *
 * A shared email is reported as a match here but is never acted on —
 * see lib/squareCustomers.ts on why merging profiles by email alone
 * turns a staff member's register profile into a feed of other people's
 * shopping.
 */

/** Square returns at most 100 per page; this caps the total we hold. */
const PAGE_LIMIT = 100;

/**
 * A ceiling on how many Square profiles this will load, so a directory
 * that grows into the tens of thousands degrades into "showing the first
 * N" rather than into a page that never finishes. The count is reported
 * so the tab can say plainly that it's truncated.
 */
export const DIRECTORY_CAP = 5000;

/** How long a loaded directory is reused. Contact details change rarely;
 *  waiting five minutes to see an edit is a fair trade for not paging the
 *  whole directory again on every keystroke-triggered reload. */
const CACHE_SECONDS = 300;

export const CUSTOMER_DIRECTORY_TAG = "customer-directory";

export interface DirectoryRow {
  /** Square's customer id, when this person exists in Square. */
  squareCustomerId: string | null;
  /** The WHOA account code, when they have one. */
  accountCode: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  /** Square's own note on the profile — staff write real things in here. */
  note: string | null;
  /** Where they came from, for the filter chips. */
  inSquare: boolean;
  hasAccount: boolean;
  /** Created dates from each side; either can be missing. */
  squareCreatedAt: string | null;
  accountCreatedAt: string | null;
  /** Roles worth seeing at a glance in a directory. */
  isAmbassador: boolean;
  isSuperAdmin: boolean;
  /** City/region, when Square has an address on file. */
  location: string | null;
  /**
   * True when the link came from an exact email match rather than a
   * pinned id. Shown so someone reading the directory knows which links
   * are deliberate and which are inferred.
   */
  matchedByEmail: boolean;
}

export interface CustomerDirectory {
  rows: DirectoryRow[];
  /** Totals, computed over everything loaded. */
  squareCount: number;
  accountCount: number;
  linkedCount: number;
  /** True when Square has more profiles than DIRECTORY_CAP. */
  truncated: boolean;
  /** Set when Square couldn't be reached — accounts still listed. */
  squareError: string | null;
  loadedAt: string;
}

export interface AccountRow {
  code: string;
  name: string | null;
  email: string | null;
  created_at: string | null;
  perm_ambassador: boolean | null;
  is_super_admin: boolean | null;
  square_customer_id: string | null;
}

export interface SquareRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  note: string | null;
  createdAt: string | null;
  location: string | null;
}

const normalizeEmail = (email: string | null | undefined): string =>
  (email ?? "").trim().toLowerCase();

function displayName(given?: string | null, family?: string | null, company?: string | null): string {
  const person = [given?.trim(), family?.trim()].filter(Boolean).join(" ").trim();
  return person || company?.trim() || "";
}

/**
 * Every Square customer profile, paged.
 *
 * Square's list endpoint is the whole directory; its search endpoint
 * filters on specific fields and can't do the free-text "search
 * everything" this tab is for. So the list is loaded once, cached, and
 * searched in the browser — which also means typing in the search box
 * costs nothing.
 */
async function fetchSquareCustomers(): Promise<{ rows: SquareRow[]; truncated: boolean }> {
  const square = getSquare();
  const rows: SquareRow[] = [];
  let truncated = false;

  // The SDK's list() returns an async pager; it handles the cursor.
  const page = await square.customers.list({ limit: PAGE_LIMIT, sortField: "CREATED_AT", sortOrder: "DESC" });
  for await (const customer of page) {
    if (!customer.id) continue;
    if (rows.length >= DIRECTORY_CAP) {
      truncated = true;
      break;
    }

    const address = customer.address;
    const location = [address?.locality, address?.administrativeDistrictLevel1]
      .filter(Boolean)
      .join(", ");

    rows.push({
      id: customer.id,
      name: displayName(customer.givenName, customer.familyName, customer.companyName),
      email: customer.emailAddress ?? null,
      phone: customer.phoneNumber ?? null,
      company: customer.companyName ?? null,
      note: customer.note ?? null,
      createdAt: customer.createdAt ?? null,
      location: location || null,
    });
  }

  return { rows, truncated };
}

const cachedSquareCustomers = unstable_cache(fetchSquareCustomers, ["square-customer-directory"], {
  revalidate: CACHE_SECONDS,
  tags: [CUSTOMER_DIRECTORY_TAG],
});

async function fetchAccounts(): Promise<AccountRow[]> {
  const { data, error } = await getSupabase()
    .from("ambassadors")
    .select("code, name, email, created_at, perm_ambassador, is_super_admin, square_customer_id")
    .is("deleted_at", null);

  if (error) {
    console.error("Customer directory: failed to read accounts:", error.message);
    return [];
  }
  return (data ?? []) as AccountRow[];
}

/**
 * Merge the two sides into one directory.
 *
 * Pure, and exported, because this is where the judgement lives: which
 * Square profile belongs to which account, who gets listed once, and who
 * gets listed at all. Fetching is the easy half.
 */
export function buildDirectory({
  accounts,
  square,
  truncated = false,
  squareError = null,
}: {
  accounts: AccountRow[];
  square: SquareRow[];
  truncated?: boolean;
  squareError?: string | null;
}): CustomerDirectory {
  const squareById = new Map(square.map((r) => [r.id, r]));
  const squareByEmail = new Map<string, SquareRow>();
  for (const row of square) {
    const key = normalizeEmail(row.email);
    // First wins: the list is newest-first, and if one email really does
    // have several profiles, the recent one is the live one.
    if (key && !squareByEmail.has(key)) squareByEmail.set(key, row);
  }

  const rows: DirectoryRow[] = [];
  const claimedSquareIds = new Set<string>();

  for (const account of accounts) {
    const pinned = account.square_customer_id ? squareById.get(account.square_customer_id) : undefined;
    const byEmail = pinned ? undefined : squareByEmail.get(normalizeEmail(account.email));
    const match = pinned ?? byEmail;
    if (match) claimedSquareIds.add(match.id);

    rows.push({
      squareCustomerId: match?.id ?? account.square_customer_id ?? null,
      accountCode: account.code,
      name: (account.name ?? "").trim() || match?.name || "",
      email: account.email ?? match?.email ?? null,
      phone: match?.phone ?? null,
      company: match?.company ?? null,
      note: match?.note ?? null,
      inSquare: Boolean(match),
      hasAccount: true,
      squareCreatedAt: match?.createdAt ?? null,
      accountCreatedAt: account.created_at,
      isAmbassador: Boolean(account.perm_ambassador),
      isSuperAdmin: Boolean(account.is_super_admin),
      location: match?.location ?? null,
      matchedByEmail: Boolean(byEmail),
    });
  }

  // Everyone Square knows who has never made a WHOA account — the
  // in-person buyers, mostly, and the reason this directory is bigger
  // than the accounts table.
  for (const row of square) {
    if (claimedSquareIds.has(row.id)) continue;
    rows.push({
      squareCustomerId: row.id,
      accountCode: null,
      name: row.name,
      email: row.email,
      phone: row.phone,
      company: row.company,
      note: row.note,
      inSquare: true,
      hasAccount: false,
      squareCreatedAt: row.createdAt,
      accountCreatedAt: null,
      isAmbassador: false,
      isSuperAdmin: false,
      location: row.location,
      matchedByEmail: false,
    });
  }

  // Newest first, by whichever date we have. Someone opening this tab is
  // usually looking for a person they just met.
  const when = (r: DirectoryRow) => r.accountCreatedAt ?? r.squareCreatedAt ?? "";
  rows.sort((a, b) => when(b).localeCompare(when(a)));

  return {
    rows,
    squareCount: square.length,
    accountCount: accounts.length,
    linkedCount: rows.filter((r) => r.hasAccount && r.inSquare).length,
    truncated,
    squareError,
    loadedAt: new Date().toISOString(),
  };
}

export async function getCustomerDirectory(): Promise<CustomerDirectory> {
  let squareError: string | null = null;

  const [accounts, squareResult] = await Promise.all([
    fetchAccounts(),
    cachedSquareCustomers().catch((err) => {
      console.error("Customer directory: Square lookup failed:", err);
      // A Square outage shouldn't blank the tab — the WHOA accounts are
      // in our own database and are still worth showing.
      squareError = "Square couldn't be reached, so only WHOA accounts are listed.";
      return null;
    }),
  ]);

  return buildDirectory({
    accounts,
    square: squareResult?.rows ?? [],
    truncated: squareResult?.truncated ?? false,
    squareError,
  });
}
