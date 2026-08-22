import { getSquare } from "./square";
import { getAllLocationIds } from "./squareSync";
import { setSquareCustomerId } from "./store";
import type { Ambassador } from "./types";

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
  const square = getSquare();
  const response = await square.customers.search({
    limit: BigInt(1),
    query: { filter: { emailAddress: { exact: email.trim().toLowerCase() } } },
  });

  return response.customers?.[0]?.id ?? null;
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
export async function getOrdersForSquareCustomer(customerId: string): Promise<CustomerOrderSummary[]> {
  const square = getSquare();
  // Square's Orders Search caps locationIds at 10 per request — fine for
  // this business today, but would need chunking if it ever grows past
  // that many Square locations.
  const locationIds = await getAllLocationIds();
  if (locationIds.length === 0) return [];

  const orders: CustomerOrderSummary[] = [];
  let cursor: string | undefined;

  do {
    const response = await square.orders.search({
      locationIds,
      query: { filter: { customerFilter: { customerIds: [customerId] } } },
      limit: 100,
      cursor,
    });

    for (const order of response.orders ?? []) {
      if (order.state === "DRAFT" || order.state === "CANCELED") continue;
      orders.push({
        id: order.id ?? "",
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

  return orders.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
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
    let squareCustomerId = account.squareCustomerId ?? null;

    if (!squareCustomerId) {
      squareCustomerId = await findSquareCustomerIdByEmail(account.email);
      if (squareCustomerId) {
        await setSquareCustomerId(account.code, squareCustomerId);
      }
    }

    if (!squareCustomerId) {
      return { linked: false, profile: null, orders: [] };
    }

    const square = getSquare();
    const [customerResponse, orders] = await Promise.all([
      square.customers.get({ customerId: squareCustomerId }),
      getOrdersForSquareCustomer(squareCustomerId),
    ]);

    const profile = deriveProfile(customerResponse.customer ?? {}, orders);
    return { linked: true, profile, orders };
  } catch (err) {
    console.error("getCustomerHistory failed:", err);
    return { linked: false, profile: null, orders: [] };
  }
}
