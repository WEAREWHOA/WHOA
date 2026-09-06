import { getSquare } from "./square";
import { getAllLocationIds } from "./squareSync";
import { setSquareCustomerId } from "./store";
import type { Ambassador } from "./types";

// Square caps the ids accepted by a single Orders Search filter; chunking
// at 10 keeps each request inside that limit however many duplicate
// profiles one person has accumulated.
const CUSTOMER_IDS_PER_SEARCH = 10;

export interface CustomerOrderLine {
  name: string;
  quantity: number;
  totalCents: number;
}

export interface CustomerOrderSummary {
  id: string;
  totalCents: number;
  createdAt: string | null;
  state: string;
  lines: CustomerOrderLine[];
}

export interface CustomerProfile {
  email: string | null;
  phone: string | null;
  firstVisit: string | null;
  lastVisit: string | null;
  visitCount: number;
}

// Exact-match lookup — the same email a customer signed up with must match
// the email on file in Square exactly for this to link them. Fuzzy
// matching risks linking the wrong person's purchase history to an
// account, which is worse than not linking at all.
export async function findSquareCustomerIdByEmail(email: string): Promise<string | null> {
  const ids = await findAllSquareCustomerIdsByEmail(email);
  return ids[0] ?? null;
}

// One person can end up with several Square customer records under the
// same email. Square's own docs describe this: an order or payment taken
// without an explicit customer_id "might result in the creation of new
// instant profiles", and staff can create a duplicate by hand at the
// register too. Every one of those profiles is the same human being, so
// their purchase history has to be gathered from all of them — looking at
// only the first match is what made the Customer tab show a subset of
// someone's real transactions.
export async function findAllSquareCustomerIdsByEmail(email: string): Promise<string[]> {
  const square = getSquare();
  const normalized = email.trim().toLowerCase();
  const ids: string[] = [];
  let cursor: string | undefined;

  do {
    const response = await square.customers.search({
      limit: BigInt(100),
      cursor,
      query: { filter: { emailAddress: { exact: normalized } } },
    });

    for (const customer of response.customers ?? []) {
      if (customer.id) ids.push(customer.id);
    }
    cursor = response.cursor;
  } while (cursor);

  return ids;
}

// Square's own docs warn that omitting `customer_id` on an order/payment
// "might result in the creation of new instant profiles" instead of
// reliably linking to the real Customer record — which is exactly what
// was happening here: checkout created orders with no customer_id at all,
// so every purchase landed as a disconnected instant profile that this
// email search could never find, and the buyer's own purchase never
// showed up in their portal. Called from checkout right before charging,
// so every order carries a real, findable customer_id from the start.
export async function findOrCreateSquareCustomerId(email: string, name: string): Promise<string> {
  const existing = await findSquareCustomerIdByEmail(email);
  if (existing) return existing;

  const square = getSquare();
  const trimmedName = name.trim();
  const [givenName, ...rest] = trimmedName.split(/\s+/);

  const response = await square.customers.create({
    emailAddress: email.trim().toLowerCase(),
    givenName: givenName || undefined,
    familyName: rest.length > 0 ? rest.join(" ") : undefined,
  });

  if (!response.customer?.id) {
    throw new Error("Square didn't return a customer id after creating a customer.");
  }
  return response.customer.id;
}

// Square's own Orders Search, filtered to just this customer — this is
// the authoritative source (not our square_orders sync mirror, which only
// captures orders synced via the webhook and has no customer_id column),
// so it correctly includes purchases made before this app existed.
//
// Searches every Square location (not just the one storefront checkout
// uses) and pages through the full result set — a customer with orders at
// a second location (an in-person/event location, say) or more than one
// page of history would otherwise silently undercount against what
// Square's own dashboard shows.
export async function getOrdersForSquareCustomer(
  customerIds: string | string[],
): Promise<CustomerOrderSummary[]> {
  const square = getSquare();
  const ids = (Array.isArray(customerIds) ? customerIds : [customerIds]).filter(Boolean);
  if (ids.length === 0) return [];

  // Square's Orders Search caps locationIds at 10 per request — fine for
  // this business today, but would need chunking if it ever grows past
  // that many Square locations.
  const locationIds = await getAllLocationIds();
  if (locationIds.length === 0) return [];

  // Deduped by order id: the customer id chunks below are disjoint, but an
  // order returned twice would double a customer's visit count and their
  // spend, so this is cheap insurance against ever showing wrong totals.
  const byId = new Map<string, CustomerOrderSummary>();

  // customerFilter.customerIds is capped per request the same way
  // locationIds is, so ask in chunks rather than assuming every profile
  // fits in one call.
  for (let i = 0; i < ids.length; i += CUSTOMER_IDS_PER_SEARCH) {
    const chunk = ids.slice(i, i + CUSTOMER_IDS_PER_SEARCH);
    let cursor: string | undefined;

    do {
      const response = await square.orders.search({
        locationIds,
        query: { filter: { customerFilter: { customerIds: chunk } } },
        limit: 100,
        cursor,
      });

      for (const order of response.orders ?? []) {
        if (order.state === "DRAFT" || order.state === "CANCELED") continue;
        if (!order.id) continue;
        byId.set(order.id, {
          id: order.id,
          totalCents: Number(order.totalMoney?.amount ?? 0),
          createdAt: order.createdAt ?? null,
          state: order.state ?? "UNKNOWN",
          lines: (order.lineItems ?? []).map((li) => ({
            name: li.name ?? "Item",
            quantity: Number(li.quantity ?? "1"),
            totalCents: Number(li.totalMoney?.amount ?? 0),
          })),
        });
      }

      cursor = response.cursor;
    } while (cursor);
  }

  // Newest first — the Customer tab pages backwards from here to the very
  // first purchase they ever made with us.
  return [...byId.values()].sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}

// Square's Customer Directory shows "Visits" / "First visit" / "Last
// visit" in its own dashboard, but those aren't fields on the Customer
// object via the API — they're derived from order history there, so we
// derive them the same way from the exact orders already fetched above,
// rather than inventing a separate concept.
function deriveProfile(customer: { emailAddress?: string | null; phoneNumber?: string | null }, orders: CustomerOrderSummary[]): CustomerProfile {
  const dates = orders.map((o) => o.createdAt).filter((d): d is string => Boolean(d));
  return {
    email: customer.emailAddress ?? null,
    phone: customer.phoneNumber ?? null,
    firstVisit: dates.length > 0 ? dates.reduce((a, b) => (a < b ? a : b)) : null,
    lastVisit: dates.length > 0 ? dates.reduce((a, b) => (a > b ? a : b)) : null,
    visitCount: orders.length,
  };
}

export interface CustomerHistory {
  linked: boolean;
  profile: CustomerProfile | null;
  orders: CustomerOrderSummary[];
}

// Called on every portal page load for the logged-in account. Never
// throws — a Square API hiccup here should degrade to "no purchase
// history shown yet," not break the whole dashboard.
export async function getCustomerHistory(account: Ambassador): Promise<CustomerHistory> {
  try {
    // Look the email up every time rather than trusting the cached id
    // alone. A duplicate profile created after we cached would otherwise be
    // invisible forever, and its orders with it.
    const matchedIds = await findAllSquareCustomerIdsByEmail(account.email);
    const cachedId = account.squareCustomerId ?? null;
    const customerIds = [...new Set([...(cachedId ? [cachedId] : []), ...matchedIds])];

    if (customerIds.length === 0) {
      return { linked: false, profile: null, orders: [] };
    }

    // The primary id is what checkout reuses to attach future orders to
    // this person, so keep the cached one if we already have it.
    const primaryId = cachedId ?? customerIds[0];
    if (primaryId !== cachedId) {
      await setSquareCustomerId(account.code, primaryId);
    }

    const square = getSquare();
    const [customerResponse, orders] = await Promise.all([
      square.customers.get({ customerId: primaryId }),
      getOrdersForSquareCustomer(customerIds),
    ]);

    const profile = deriveProfile(customerResponse.customer ?? {}, orders);
    return { linked: true, profile, orders };
  } catch (err) {
    console.error("getCustomerHistory failed:", err);
    return { linked: false, profile: null, orders: [] };
  }
}
