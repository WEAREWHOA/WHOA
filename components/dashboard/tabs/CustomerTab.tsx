import { formatCents } from "@/lib/money";
import type { CustomerOrderSummary } from "@/lib/squareCustomers";

const STATE_LABELS: Record<string, string> = {
  OPEN: "Open",
  COMPLETED: "Completed",
};

function lineSummary(order: CustomerOrderSummary): string {
  if (order.lines.length === 0) return "No items on file";
  return order.lines.map((l) => (l.quantity > 1 ? `${l.name} × ${l.quantity}` : l.name)).join(", ");
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function CustomerTab({
  linked,
  orders,
}: {
  linked: boolean;
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

  if (orders.length === 0) {
    return (
      <div className="border-border rounded-xl border px-5 py-4 text-sm text-muted">
        Your Square account is linked, but there&apos;s no purchase history on file yet.
      </div>
    );
  }

  return (
    <div>
      <div className="card-surface overflow-hidden rounded-2xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border text-xs text-muted uppercase">
            <tr>
              <th className="px-5 py-3 font-semibold">Item</th>
              <th className="px-5 py-3 font-semibold">Date</th>
              <th className="px-5 py-3 font-semibold">Total</th>
              <th className="px-5 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-b border-border last:border-0">
                <td className="px-5 py-3">{lineSummary(order)}</td>
                <td className="px-5 py-3 text-muted">{formatDate(order.createdAt)}</td>
                <td className="px-5 py-3">{formatCents(order.totalCents)}</td>
                <td className="px-5 py-3 text-muted">{STATE_LABELS[order.state] ?? order.state}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
