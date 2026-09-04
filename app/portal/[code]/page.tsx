import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getByCode, getStats } from "@/lib/store";
import { getSiteOrigin } from "@/lib/site";
import { getSessionAmbassadorCode } from "@/lib/auth";
import { getArtist } from "@/lib/artists";
import { getVendorProducts, getVendorStats } from "@/lib/vendor";
import { getCustomerHistory } from "@/lib/squareCustomers";
import { getEventHistoryForAccount } from "@/lib/eventRsvps";
import LogoutButton from "@/components/portal/LogoutButton";
import DashboardTabs from "@/components/dashboard/DashboardTabs";
import AmbassadorTab from "@/components/dashboard/tabs/AmbassadorTab";
import CustomerTab from "@/components/dashboard/tabs/CustomerTab";
import EventsTab from "@/components/dashboard/tabs/EventsTab";
import VendorTab from "@/components/dashboard/tabs/VendorTab";
import MusicTab from "@/components/dashboard/tabs/MusicTab";
import SsbdTab from "@/components/dashboard/tabs/SsbdTab";
import { getTier } from "@/lib/tiers";

export default async function PortalDashboardPage(props: PageProps<"/portal/[code]">) {
  const { code } = await props.params;
  const searchParams = await props.searchParams;

  const sessionCode = await getSessionAmbassadorCode();
  if (!sessionCode || sessionCode.toUpperCase() !== code.toUpperCase()) {
    redirect("/login");
  }

  const account = await getByCode(code);
  if (!account) notFound();

  const stats = getStats(account);
  const tier = getTier(stats.orderCount);
  const origin = await getSiteOrigin();
  const firstName = account.name.trim().split(/\s+/)[0];

  const showVendor = account.permissions.vendor && Boolean(account.vendorSlug);
  const vendorArtist = showVendor ? getArtist(account.vendorSlug!) : undefined;
  const [vendorProducts, vendorStats] = vendorArtist
    ? await Promise.all([getVendorProducts(vendorArtist.slug), getVendorStats(vendorArtist.slug)])
    : [undefined, undefined];

  const customerHistory = await getCustomerHistory(account);
  const eventHistory = await getEventHistoryForAccount(account.code);

  const isNew = searchParams?.new === "1";
  const payoutSaved = searchParams?.saved === "1";
  const linkAdded = searchParams?.linkAdded === "1";

  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-16">
      {isNew && (
        <div className="mb-8 rounded-xl border border-flame-2/40 bg-flame-2/10 px-5 py-4 text-sm">
          You&apos;re in. Your account is live below — start exploring.
        </div>
      )}

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <span className="text-xs font-semibold tracking-[0.2em] text-muted uppercase">
            WHOA Backend Portal
          </span>
          <h1 className="font-display mt-2 text-4xl tracking-wide sm:text-5xl">
            Welcome back, <span className="text-flame">{firstName}</span>
          </h1>
          <p className="mt-2 max-w-lg text-sm text-muted">
            One login, every side of WHOA — your purchases, and whatever else has been unlocked
            on your account, all in one place.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {account.isSuperAdmin && (
            <Link
              href="/super-admin"
              className="rounded-full border border-border-strong px-5 py-2 text-sm font-semibold text-muted transition-colors hover:text-foreground"
            >
              Super Admin
            </Link>
          )}
          <LogoutButton />
        </div>
      </div>

      <DashboardTabs
        customer={
          <CustomerTab
            linked={customerHistory.linked}
            profile={customerHistory.profile}
            orders={customerHistory.orders}
          />
        }
        events={<EventsTab upcoming={eventHistory.upcoming} past={eventHistory.past} />}
        ambassador={
          <AmbassadorTab
            ambassador={account}
            stats={stats}
            tier={tier}
            origin={origin}
            linkAdded={linkAdded}
            payoutSaved={payoutSaved}
          />
        }
        vendor={
          <VendorTab vendorName={vendorArtist?.name} stats={vendorStats} products={vendorProducts} />
        }
        music={<MusicTab />}
        ssbd={<SsbdTab />}
        visible={{
          ambassador: account.permissions.ambassador,
          vendor: showVendor,
          music: account.permissions.music,
          ssbd: account.permissions.ssbd,
        }}
      />
    </section>
  );
}
