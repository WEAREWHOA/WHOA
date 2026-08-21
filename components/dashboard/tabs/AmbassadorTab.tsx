import CopyField from "@/components/portal/CopyField";
import StatsGrid from "@/components/portal/StatsGrid";
import TierProgress from "@/components/portal/TierProgress";
import OrdersTable from "@/components/portal/OrdersTable";
import ResourcePack from "@/components/portal/ResourcePack";
import PayoutSettings from "@/components/portal/PayoutSettings";
import LinksManager from "@/components/portal/LinksManager";
import type { Ambassador, AmbassadorStats } from "@/lib/types";
import type { TierDef } from "@/lib/tiers";

export default function AmbassadorTab({
  ambassador,
  stats,
  tier,
  origin,
  linkAdded,
  payoutSaved,
}: {
  ambassador: Ambassador;
  stats: AmbassadorStats;
  tier: TierDef;
  origin: string;
  linkAdded: boolean;
  payoutSaved: boolean;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <CopyField label="Your code" value={ambassador.code} mono />
        <span
          className="w-fit rounded-full px-4 py-1.5 text-sm font-semibold"
          style={{ backgroundColor: tier.color, color: "#14100c" }}
        >
          {tier.label} tier
        </span>
      </div>

      <div className="mt-8">
        <StatsGrid stats={stats} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <TierProgress orderCount={stats.orderCount} />
        <OrdersTable orders={ambassador.orders} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <LinksManager code={ambassador.code} origin={origin} links={ambassador.links} added={linkAdded} />
        <ResourcePack code={ambassador.code} />
      </div>

      <div className="mt-8">
        <PayoutSettings code={ambassador.code} payout={ambassador.payout} saved={payoutSaved} />
      </div>
    </div>
  );
}
