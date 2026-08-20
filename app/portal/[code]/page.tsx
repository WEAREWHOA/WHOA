import { notFound } from "next/navigation";
import { getByCode, getStats } from "@/lib/store";
import { getSiteOrigin } from "@/lib/site";
import CopyField from "@/components/portal/CopyField";
import StatsGrid from "@/components/portal/StatsGrid";
import TierProgress from "@/components/portal/TierProgress";
import OrdersTable from "@/components/portal/OrdersTable";
import ResourcePack from "@/components/portal/ResourcePack";
import PayoutSettings from "@/components/portal/PayoutSettings";
import { getTier } from "@/lib/tiers";

export default async function PortalDashboardPage(props: PageProps<"/portal/[code]">) {
  const { code } = await props.params;
  const searchParams = await props.searchParams;

  const ambassador = await getByCode(code);
  if (!ambassador) notFound();

  const stats = getStats(ambassador);
  const tier = getTier(stats.orderCount);
  const origin = await getSiteOrigin();
  const specialLink = `${origin}/r/${ambassador.code}`;
  const firstName = ambassador.name.trim().split(/\s+/)[0];

  const isNew = searchParams?.new === "1";
  const payoutSaved = searchParams?.saved === "1";

  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-16">
      {isNew && (
        <div className="mb-8 rounded-xl border border-flame-2/40 bg-flame-2/10 px-5 py-4 text-sm">
          You&apos;re in. Your code and link are live below — start sharing.
        </div>
      )}

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <span className="text-xs font-semibold tracking-[0.2em] text-muted uppercase">
            Ambassador portal
          </span>
          <h1 className="font-display mt-2 text-4xl tracking-wide sm:text-5xl">
            Welcome back, <span className="text-flame">{firstName}</span>
          </h1>
        </div>
        <span
          className="w-fit rounded-full px-4 py-1.5 text-sm font-semibold"
          style={{ backgroundColor: tier.color, color: "#14100c" }}
        >
          {tier.label} tier
        </span>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <CopyField label="Your code" value={ambassador.code} mono />
        <CopyField label="Your special link" value={specialLink} />
      </div>

      <div className="mt-8">
        <StatsGrid stats={stats} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <TierProgress orderCount={stats.orderCount} />
        <OrdersTable orders={ambassador.orders} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <ResourcePack code={ambassador.code} />
        <PayoutSettings code={ambassador.code} payout={ambassador.payout} saved={payoutSaved} />
      </div>
    </section>
  );
}
