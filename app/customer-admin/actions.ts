"use server";

import { getSessionAmbassadorCode } from "@/lib/auth";
import { getByCode } from "@/lib/store";
import { getCustomerDirectory, type CustomerDirectory } from "@/lib/customerDirectory";
import { getOrdersForSquareCustomer, type CustomerOrderSummary } from "@/lib/squareCustomers";

/**
 * Everything here reads every customer's contact details, so the
 * permission is re-checked on the server each time rather than trusted
 * from a client that could simply call the action — a hidden tab is not
 * a closed door.
 *
 * Nothing here writes. Not to Square, not to the accounts table. The
 * directory is a view over data that other parts of the app own.
 */
async function requireCustomerAdmin(): Promise<boolean> {
  const code = await getSessionAmbassadorCode().catch(() => null);
  if (!code) return false;
  const account = await getByCode(code).catch(() => null);
  if (!account) return false;
  return account.isSuperAdmin || account.permissions.customerAdmin;
}

export async function loadCustomerDirectoryAction(): Promise<CustomerDirectory | null> {
  if (!(await requireCustomerAdmin())) return null;
  return getCustomerDirectory();
}

export interface CustomerOrdersResult {
  ok: boolean;
  orders: CustomerOrderSummary[];
  error?: string;
}

/**
 * One customer's purchase history, fetched when their row is opened
 * rather than for the whole directory at once.
 *
 * Square has no bulk "orders for everyone" call — it's one search per
 * customer — so loading history for a few thousand people up front would
 * take minutes and most of it would never be looked at.
 */
export async function loadCustomerOrdersAction(squareCustomerId: string): Promise<CustomerOrdersResult> {
  if (!(await requireCustomerAdmin())) {
    return { ok: false, orders: [], error: "You don't have access to customer records." };
  }
  if (!squareCustomerId.trim()) {
    return { ok: false, orders: [], error: "This customer has no Square profile to read." };
  }

  try {
    // Exactly the one profile, never everything sharing their email —
    // see lib/squareCustomers.ts on why merging by email shows one
    // person a shift's worth of other people's shopping.
    const orders = await getOrdersForSquareCustomer(squareCustomerId.trim());
    return { ok: true, orders };
  } catch (err) {
    console.error("Customer admin: failed to load orders:", err);
    return { ok: false, orders: [], error: "Couldn't reach Square for this customer's orders." };
  }
}
