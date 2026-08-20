import { TIERS, getTierProgress } from "@/lib/tiers";

export default function TierProgress({ orderCount }: { orderCount: number }) {
  const { current, next, percent, ordersToNext } = getTierProgress(orderCount);

  return (
    <div className="card-surface rounded-xl p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: current.color }}
          />
          <h3 className="font-semibold">{current.label} tier</h3>
        </div>
        {next ? (
          <span className="text-xs text-muted">
            {ordersToNext} order{ordersToNext === 1 ? "" : "s"} to {next.label}
          </span>
        ) : (
          <span className="text-xs text-muted">Top tier reached</span>
        )}
      </div>

      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-surface-raised">
        <div className="bg-flame h-full rounded-full transition-all" style={{ width: `${percent}%` }} />
      </div>

      <div className="mt-2 flex justify-between text-[11px] text-muted">
        {TIERS.map((tier) => (
          <span key={tier.id}>{tier.label}</span>
        ))}
      </div>

      <ul className="mt-5 flex flex-col gap-2 text-sm">
        {current.perks.map((perk) => (
          <li key={perk} className="flex gap-2">
            <span className="text-flame">+</span>
            <span className="text-foreground/90">{perk}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
