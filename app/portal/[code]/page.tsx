import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getByCode, getStats } from "@/lib/store";
import { getSiteOrigin } from "@/lib/site";
import { getSessionAmbassadorCode } from "@/lib/auth";
import { getArtist } from "@/lib/artists";
import { getVendorProducts, getVendorStats } from "@/lib/vendor";
import { getCustomerHistory } from "@/lib/squareCustomers";
import { getEventHistoryForAccount } from "@/lib/eventRsvps";
import { getEventsAdminOverview } from "@/lib/eventsAdmin";
import { getScheduleForAccount, getSignupsForAccount } from "@/lib/eventSales";
import { getMusicianProfile } from "@/lib/musicianProfiles";
import { getArtInventory, getArtProfile, getArtStats, getPendingArtBatches, getProductsForAccount } from "@/lib/artCollective";
import { EVENTS } from "@/lib/events";
import LogoutButton from "@/components/portal/LogoutButton";
import DashboardTabs from "@/components/dashboard/DashboardTabs";
import AmbassadorTab from "@/components/dashboard/tabs/AmbassadorTab";
import CustomerTab from "@/components/dashboard/tabs/CustomerTab";
import EventsTab from "@/components/dashboard/tabs/EventsTab";
import VendorTab from "@/components/dashboard/tabs/VendorTab";
import ArtTab from "@/components/dashboard/tabs/ArtTab";
import MusicTab from "@/components/dashboard/tabs/MusicTab";
import SsbdTab from "@/components/dashboard/tabs/SsbdTab";
import EventsAdminTab from "@/components/dashboard/tabs/EventsAdminTab";
import EventSalesTab from "@/components/dashboard/tabs/EventSalesTab";
import ArtAdminTab from "@/components/dashboard/tabs/ArtAdminTab";
import SettingsTab from "@/components/dashboard/tabs/SettingsTab";
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

  // Gated server-side, not just by hiding the tab button: this tab's content
  // is pre-rendered JSX handed to a client component, so an unauthorized
  // viewer must never have this fetched in the first place — hiding it
  // client-side would still leak every guest's name/email/phone into the
  // page's RSC payload.
  const canAccessEventsAdmin = account.isSuperAdmin || account.permissions.eventsAdmin;
  const eventsAdminOverview = canAccessEventsAdmin ? await getEventsAdminOverview() : undefined;

  const canAccessEventSales = account.permissions.eventSales;
  const [eventSalesSignups, eventSalesSchedule] = canAccessEventSales
    ? await Promise.all([getSignupsForAccount(account.code), getScheduleForAccount(account.code)])
    : [[], []];
  const todayKey = new Date().toISOString().slice(0, 10);
  const upcomingEvents = EVENTS.filter((e) => (e.endDate ?? e.startDate) >= todayKey).sort((a, b) =>
    a.startDate.localeCompare(b.startDate),
  );

  const musicianProfile = await getMusicianProfile(account.code);

  const artProfile = await getArtProfile(account.code);
  const [artStats, artInventory, artProducts] = account.permissions.art
    ? await Promise.all([getArtStats(account.code), getArtInventory(account.code), getProductsForAccount(account.code)])
    : [{ totalSalesCents: 0, itemsSold: 0, orderCount: 0 }, [], []];

  const canAccessArtAdmin = account.isSuperAdmin || account.permissions.artAdmin;
  const pendingArtBatches = canAccessArtAdmin ? await getPendingArtBatches() : undefined;

  const isNew = searchParams?.new === "1";
  const payoutSaved = searchParams?.saved === "1";
  const linkAdded = searchParams?.linkAdded === "1";
  const settingsSaved = searchParams?.settingsSaved === "1";
  const passwordChanged = searchParams?.passwordChanged === "1";
  const settingsError =
    typeof searchParams?.settingsError === "string" ? searchParams.settingsError : undefined;
  const workSignup = typeof searchParams?.workSignup === "string" ? searchParams.workSignup : undefined;
  const musicSaved = searchParams?.musicSaved === "1";
  const musicError = typeof searchParams?.musicError === "string" ? searchParams.musicError : undefined;
  const artSaved = searchParams?.artSaved === "1";
  const artError = typeof searchParams?.artError === "string" ? searchParams.artError : undefined;
  const artProductSubmitted = searchParams?.artProductSubmitted === "1";
  const artProductError =
    typeof searchParams?.artProductError === "string" ? searchParams.artProductError : undefined;

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
        art={
          <ArtTab
            code={account.code}
            hasArtAccess={account.permissions.art}
            profile={artProfile}
            stats={artStats}
            inventory={artInventory}
            products={artProducts}
            saved={artSaved}
            error={artError}
            productSubmitted={artProductSubmitted}
            productError={artProductError}
          />
        }
        music={
          <MusicTab
            code={account.code}
            hasMusicAccess={account.permissions.music}
            profile={musicianProfile}
            saved={musicSaved}
            error={musicError}
          />
        }
        ssbd={<SsbdTab />}
        eventsAdmin={eventsAdminOverview ? <EventsAdminTab data={eventsAdminOverview} /> : null}
        eventSales={
          canAccessEventSales ? (
            <EventSalesTab
              code={account.code}
              upcoming={upcomingEvents}
              signups={eventSalesSignups}
              schedule={eventSalesSchedule}
              workSignup={workSignup}
            />
          ) : null
        }
        artAdmin={pendingArtBatches ? <ArtAdminTab batches={pendingArtBatches} /> : null}
        settings={
          <SettingsTab
            account={account}
            settingsSaved={settingsSaved}
            passwordChanged={passwordChanged}
            settingsError={settingsError}
          />
        }
        visible={{
          ambassador: account.permissions.ambassador,
          vendor: showVendor,
          art: account.permissions.art,
          music: account.permissions.music,
          ssbd: account.permissions.ssbd,
          eventsAdmin: canAccessEventsAdmin,
          eventSales: canAccessEventSales,
          artAdmin: canAccessArtAdmin,
        }}
      />
    </section>
  );
}
