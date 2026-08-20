import type { Order } from "@/lib/types";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export default function OrdersTable({ orders }: { orders: Order[] }) {
  if (orders.length === 0) {
    return (
      <div className="card-surface rounded-xl p-8 text-center">
        <p className="text-sm text-muted">
          No orders yet. Share your link — new orders show up here in real time.
        </p>
      </div>
    );
  }

  const recent = [...orders]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8);

  return (
    <div className="card-surface overflow-hidden rounded-xl">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted">
            <th className="px-5 py-3 font-medium">Date</th>
            <th className="px-5 py-3 font-medium">Customer</th>
            <th className="px-5 py-3 font-medium">Sale</th>
            <th className="px-5 py-3 font-medium">Your commission</th>
          </tr>
        </thead>
        <tbody>
          {recent.map((order) => (
            <tr key={order.id} className="border-b border-border last:border-0">
              <td className="px-5 py-3 text-muted">{formatDate(order.date)}</td>
              <td className="px-5 py-3">{order.customer}</td>
              <td className="px-5 py-3">${order.saleAmount.toFixed(2)}</td>
              <td className="px-5 py-3 text-flame font-medium">
                ${order.commission.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
