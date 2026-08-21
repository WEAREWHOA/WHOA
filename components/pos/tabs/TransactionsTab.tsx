import { formatCents } from "@/lib/money";
import type { PosOrderSummary } from "@/lib/posOrders";

function formatDateGroup(iso: string | null): string {
  if (!iso) return "Unknown date";
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  if (sameDay(date, today)) return "Today";
  if (sameDay(date, yesterday)) return "Yesterday";
  return date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

function formatTime(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function lineSummary(order: PosOrderSummary): string {
  if (order.lines.length === 0) return "No items";
  return order.lines.map((l) => (l.quantity > 1 ? `${l.name} × ${l.quantity}` : l.name)).join(", ");
}

export default function TransactionsTab({ orders }: { orders: PosOrderSummary[] }) {
  const groups: { label: string; orders: PosOrderSummary[] }[] = [];
  for (const order of orders) {
    const label = formatDateGroup(order.createdAt);
    const group = groups.find((g) => g.label === label);
    if (group) group.orders.push(order);
    else groups.push({ label, orders: [order] });
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <h2 className="font-display text-2xl">Transactions</h2>
      <p className="mt-1 text-sm text-muted">Synced from Square — every sale, online or in person.</p>

      {orders.length === 0 ? (
        <p className="mt-8 text-sm text-muted">No transactions yet.</p>
      ) : (
        <div className="mt-6 flex flex-col gap-6">
          {groups.map((group) => (
            <div key={group.label}>
              <h3 className="text-sm font-semibold text-muted">{group.label}</h3>
              <div className="mt-2 flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border">
                {group.orders.map((order) => (
                  <div key={order.id} className="flex items-center gap-3 bg-surface p-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{formatCents(order.totalCents)}</p>
                      <p className="truncate text-xs text-muted">{lineSummary(order)}</p>
                    </div>
                    <span className="shrink-0 text-xs text-muted">{formatTime(order.createdAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
