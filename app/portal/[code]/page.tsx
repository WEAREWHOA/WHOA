import { notFound, redirect } from "next/navigation";
import { getByCode, getStats } from "@/lib/store";
import { getSiteOrigin } from "@/lib/site";
import { getSessionAmbassadorCode } from "@/lib/auth";
import LogoutButton from "@/components/portal/LogoutButton";
import DashboardTabs from "@/components/dashboard/DashboardTabs";
import AmbassadorTab from "@/components/dashboard/tabs/AmbassadorTab";
import CustomerTab from "@/components/dashboard/tabs/CustomerTab";
import VendorTab from "@/components/dashboard/tabs/VendorTab";
import SsbdTab from "@/components/dashboard/tabs/SsbdTab";
import { getTier } from "@/lib/tiers";

export default async function PortalDashboardPage(props: PageProps<"/portal/[code]">) {
  const { code } = await props.params;
  const searchParams = await props.searchParams;

  const sessionCode = await getSessionAmbassadorCode();
  if (!sessionCode || sessionCode.toUpperCase() !== code.toUpperCase()) {
    redirect("/login");
  }

  const ambassador = await getByCode(code);
  if (!ambassador) notFound();

  const stats = getStats(ambassador);
  const tier = getTier(stats.orderCount);
  const origin = await getSiteOrigin();
  const firstName = ambassador.name.trim().split(/\s+/)[0];

  const isNew = searchParams?.new === "1";
  const payoutSaved = searchParams?.saved === "1";
  const linkAdded = searchParams?.linkAdded === "1";

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
            WHOA dashboard
          </span>
          <h1 className="font-display mt-2 text-4xl tracking-wide sm:text-5xl">
            Welcome back, <span className="text-flame">{firstName}</span>
          </h1>
          <p className="mt-2 max-w-lg text-sm text-muted">
            One login, every side of WHOA — ambassador tools, your purchases, vendor sales, and
            what you&apos;re bringing to SSBD, all in one place.
          </p>
        </div>
        <LogoutButton />
      </div>

      <DashboardTabs
        ambassador={
          <AmbassadorTab
            ambassador={ambassador}
            stats={stats}
            tier={tier}
            origin={origin}
            linkAdded={linkAdded}
            payoutSaved={payoutSaved}
          />
        }
        customer={<CustomerTab />}
        vendor={<VendorTab />}
        ssbd={<SsbdTab />}
      />
    </section>
  );
}
