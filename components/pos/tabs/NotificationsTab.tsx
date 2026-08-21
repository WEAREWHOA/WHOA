import type { PosOrderSummary } from "@/lib/posOrders";

export default function NotificationsTab({ orders }: { orders: PosOrderSummary[] }) {
  const today = new Date();
  const todaysOrders = orders.filter((o) => {
    if (!o.createdAt) return false;
    const d = new Date(o.createdAt);
    return (
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate()
    );
  });

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <h2 className="font-display text-2xl">Notifications</h2>

      <div className="mt-6 flex flex-col gap-3">
        {todaysOrders.length > 0 ? (
          <div className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4">
            <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-flame-2" aria-hidden />
            <div>
              <p className="text-sm font-semibold">New orders</p>
              <p className="mt-0.5 text-sm text-muted">
                You have {todaysOrders.length} sale{todaysOrders.length === 1 ? "" : "s"} today.
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted">You&apos;re all caught up — no new orders today.</p>
        )}
      </div>
    </div>
  );
}
