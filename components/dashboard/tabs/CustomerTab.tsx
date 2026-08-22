import { formatCents } from "@/lib/money";
import type { CustomerOrderSummary, CustomerProfile } from "@/lib/squareCustomers";

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

      <h3 className="font-display mt-8 text-xl">Transactions</h3>

      {orders.length === 0 ? (
        <p className="border-border mt-4 rounded-xl border px-5 py-4 text-sm text-muted">
          No purchase history on file yet.
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}
