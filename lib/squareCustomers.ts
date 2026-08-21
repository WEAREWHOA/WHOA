import { getSquare, getSquareLocationId } from "./square";
import { setSquareCustomerId } from "./store";
import type { Ambassador } from "./types";

export interface CustomerOrderSummary {
  id: string;
  totalCents: number;
  createdAt: string | null;
  state: string;
  lines: { name: string; quantity: number }[];
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
export async function getOrdersForSquareCustomer(customerId: string): Promise<CustomerOrderSummary[]> {
  const square = getSquare();
  const locationId = getSquareLocationId();

  const response = await square.orders.search({
    locationIds: [locationId],
    query: { filter: { customerFilter: { customerIds: [customerId] } } },
    limit: 50,
  });

  return (response.orders ?? [])
    .filter((order) => order.state !== "DRAFT" && order.state !== "CANCELED")
    .map((order) => ({
      id: order.id ?? "",
      totalCents: Number(order.totalMoney?.amount ?? 0),
      createdAt: order.createdAt ?? null,
      state: order.state ?? "UNKNOWN",
      lines: (order.lineItems ?? []).map((li) => ({
        name: li.name ?? "Item",
        quantity: Number(li.quantity ?? "1"),
      })),
    }))
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}

export interface CustomerHistory {
  linked: boolean;
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
      return { linked: false, orders: [] };
    }

    const orders = await getOrdersForSquareCustomer(squareCustomerId);
    return { linked: true, orders };
  } catch (err) {
    console.error("getCustomerHistory failed:", err);
    return { linked: false, orders: [] };
  }
}
