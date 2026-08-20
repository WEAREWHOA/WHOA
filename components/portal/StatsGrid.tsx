import type { AmbassadorStats } from "@/lib/types";

function formatCurrency(amount: number) {
  return `$${amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export default function StatsGrid({ stats }: { stats: AmbassadorStats }) {
  const cards = [
    { label: "Clicks", value: stats.clicks.toLocaleString() },
    { label: "Orders", value: stats.orderCount.toLocaleString() },
    { label: "Sales", value: formatCurrency(stats.totalSales) },
    { label: "Commission", value: formatCurrency(stats.totalCommission) },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="card-surface rounded-xl p-5">
          <p className="text-xs text-muted">{card.label}</p>
          <p className="font-display mt-1 text-3xl tracking-wide">{card.value}</p>
        </div>
      ))}
    </div>
  );
}
