"use client";

import { useState } from "react";
import { formatCents } from "@/lib/money";
import type { CustomerOrderSummary, CustomerProfile } from "@/lib/squareCustomers";

const ORDERS_PER_PAGE = 10;

const STATE_LABELS: Record<string, string> = {
  OPEN: "Open",
  COMPLETED: "Completed",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function OrderCard({ order }: { order: CustomerOrderSummary }) {
  return (
    <div className="card-surface rounded-2xl border border-border p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold">{formatDateTime(order.createdAt)}</span>
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold tracking-wide text-muted uppercase">
            {STATE_LABELS[order.state] ?? order.state}
          </span>
          <span className="text-sm font-semibold">{formatCents(order.totalCents)}</span>
        </div>
      </div>

      {order.lines.length === 0 ? (
        <p className="mt-3 text-sm text-muted">No line items on file for this order.</p>
      ) : (
        <div className="mt-3 flex flex-col divide-y divide-border border-t border-border">
          {order.lines.map((line, i) => (
            <div key={i} className="flex items-center justify-between py-2 text-sm">
              <span className="text-muted">
                {line.name}
                {line.quantity > 1 ? ` × ${line.quantity}` : ""}
              </span>
              <span>{formatCents(line.totalCents)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CustomerTab({
  linked,
  profile,
  orders,
}: {
  linked: boolean;
  profile: CustomerProfile | null;
  orders: CustomerOrderSummary[];
}) {
  const [page, setPage] = useState(0);

  // Orders arrive newest-first (see getOrdersForSquareCustomer), so paging
  // forward walks back through time to the very first purchase they made
  // with us — rather than dumping years of history in one scroll.
  const pageCount = Math.max(1, Math.ceil(orders.length / ORDERS_PER_PAGE));
  const safePage = Math.min(page, pageCount - 1);
  const first = safePage * ORDERS_PER_PAGE;
  const last = Math.min(first + ORDERS_PER_PAGE, orders.length);

  if (!linked) {
    return (
      <div className="border-flame-2/40 bg-flame-2/10 rounded-xl border px-5 py-4 text-sm text-muted">
        We couldn&apos;t find a Square customer profile matching your email yet. Once you&apos;ve
        made a purchase (in person or online) with this same email, your history will show up
        here automatically.
      </div>
    );
  }

  return (
    <div>
      {profile && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="card-surface rounded-xl border border-border p-5">
            <p className="text-xs text-muted uppercase">Visits</p>
            <p className="font-display mt-1 text-2xl">{profile.visitCount}</p>
          </div>
          <div className="card-surface rounded-xl border border-border p-5">
            <p className="text-xs text-muted uppercase">First visit</p>
            <p className="font-display mt-1 text-2xl">{formatDate(profile.firstVisit)}</p>
          </div>
          <div className="card-surface rounded-xl border border-border p-5">
            <p className="text-xs text-muted uppercase">Last visit</p>
            <p className="font-display mt-1 text-2xl">{formatDate(profile.lastVisit)}</p>
          </div>
          <div className="card-surface rounded-xl border border-border p-5">
            <p className="text-xs text-muted uppercase">On file with Square</p>
            <p className="mt-2 truncate text-sm">{profile.email ?? "No email on file"}</p>
            <p className="mt-1 text-sm text-muted">{profile.phone ?? "No phone on file"}</p>
          </div>
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-xl">Transactions</h3>
        {orders.length > 0 && (
          <p className="text-xs text-muted">
            {orders.length === 1
              ? "1 transaction"
              : `Showing ${first + 1}\u2013${last} of ${orders.length}`}
          </p>
        )}
      </div>

      {orders.length === 0 ? (
        <p className="border-border mt-4 rounded-xl border px-5 py-4 text-sm text-muted">
          No purchase history on file yet.
        </p>
      ) : (
        <>
          <div className="mt-4 flex flex-col gap-4">
            {orders.slice(first, last).map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>

          {pageCount > 1 && (
            <div className="mt-6 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setPage(Math.max(0, safePage - 1))}
                disabled={safePage === 0}
                className="rounded-full border border-border px-4 py-2 text-xs font-semibold tracking-wide uppercase transition-colors hover:border-flame-2/60 disabled:cursor-default disabled:opacity-35 disabled:hover:border-border"
              >
                ← Newer
              </button>
              <span className="text-xs text-muted">
                Page {safePage + 1} of {pageCount}
              </span>
              <button
                type="button"
                onClick={() => setPage(Math.min(pageCount - 1, safePage + 1))}
                disabled={safePage >= pageCount - 1}
                className="rounded-full border border-border px-4 py-2 text-xs font-semibold tracking-wide uppercase transition-colors hover:border-flame-2/60 disabled:cursor-default disabled:opacity-35 disabled:hover:border-border"
              >
                Older →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
