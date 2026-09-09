import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getByCode, getStats } from "@/lib/store";
import { getSiteOrigin } from "@/lib/site";
import { getSessionAmbassadorCode } from "@/lib/auth";
import { getArtist } from "@/lib/artists";
import { getVendorProducts, getVendorStats } from "@/lib/vendor";
import { getCustomerHistory } from "@/lib/squareCustomers";
import { allowedKinds, listMedia, type MediaItem } from "@/lib/media";
import MediaLibrary from "@/components/portal/MediaLibrary";
import { getEventHistoryForAccount } from "@/lib/eventRsvps";
import { getEventsAdminOverview } from "@/lib/eventsAdmin";
import { getScheduleForAccount, getSignupsForAccount } from "@/lib/eventSales";
import { getMusicianProfile } from "@/lib/musicianProfiles";
import {
  getArtInventory,
  getArtProfile,
  getArtStats,
  getPendingArtBatches,
  getPendingArtProductRequests,
  canSubmitProducts,
  getProductsForAccount,
} from "@/lib/artCollective";
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

  // Never fatal: a storage hiccup should cost someone their photo grid, not
  // their whole dashboard.
  let media: MediaItem[] = [];
  try {
    media = await listMedia(account.code);
  } catch (err) {
    console.error("Failed to load account media:", err);
  }
  const mediaKinds = allowedKinds(account.permissions);

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
  const [artStats, artInventory] = account.permissions.art
    ? await Promise.all([getArtStats(account.code), getArtInventory(account.code)])
    : [{ totalSalesCents: 0, itemsSold: 0, orderCount: 0 }, []];

  // Submissions aren't art-only any more — a vendor or musician uses the
  // same pipeline — so they're loaded for anyone who can submit, and the
  // same list is handed to whichever of the three tabs is showing.
  const canSubmit = canSubmitProducts(account.permissions);
  const artProducts = canSubmit ? await getProductsForAccount(account.code) : [];

  const canAccessArtAdmin = account.isSuperAdmin || account.permissions.artAdmin;
  const pendingArtBatches = canAccessArtAdmin ? await getPendingArtBatches() : undefined;
  const pendingArtRequests = canAccessArtAdmin ? await getPendingArtProductRequests() : [];

  const isNew = searchParams?.new === "1";
  const payoutSaved = searchParams?.saved === "1";
  const linkAdded = searchParams?.linkAdded === "1";
  const linkDeleted = searchParams?.linkDeleted === "1";
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
  const artPhotoError = searchParams?.artPhotoError === "1";
  const artRequestSent = searchParams?.artRequestSent === "1";
  const artRequestCancelled = searchParams?.artRequestCancelled === "1";
  const artRequestReviewed = searchParams?.artRequestReviewed === "1";
  const artRequestError =
    typeof searchParams?.artRequestError === "string" ? searchParams.artRequestError : undefined;
  const ART_REQUEST_ERROR_TEXT: Record<string, string> = {
    invalid: "That request didn't come through — try again.",
    price: "Enter a valid price, or leave it blank to keep the current one.",
    empty: "Fill in at least one field you'd like changed.",
    missing: "That product isn't live any more, so there's nothing to change.",
    server: "Something went wrong sending that request — try again.",
  };
  const artRequestMessage = artRequestError
    ? (ART_REQUEST_ERROR_TEXT[artRequestError] ?? ART_REQUEST_ERROR_TEXT.server)
    : null;
  const mediaUploaded =
    typeof searchParams?.mediaUploaded === "string" ? Number(searchParams.mediaUploaded) : 0;
  const mediaDeleted = searchParams?.mediaDeleted === "1";
  const mediaError =
    typeof searchParams?.mediaError === "string" ? searchParams.mediaError : undefined;
  const MEDIA_ERROR_TEXT: Record<string, string> = {
    forbidden: "You don't have access to upload that kind of media.",
    empty: "Choose a file to upload first.",
    missing: "That file has already been removed.",
    server: "Something went wrong with that upload — try again.",
  };
  // Anything not in the table is a specific, already-readable reason from
  // MediaError (file too big, wrong format), passed through as-is.
  const mediaMessage = mediaError
    ? (MEDIA_ERROR_TEXT[mediaError] ?? mediaError)
    : null;

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

      {(artRequestSent || artRequestCancelled || artRequestReviewed || artRequestMessage) && (
        <div className="mt-6 flex flex-col gap-2">
          {artRequestSent && (
            <p className="border-flame-2/40 bg-flame-2/10 text-flame-3 rounded-lg border px-4 py-2 text-sm">
              Request sent — we&apos;ll review it and let you know. Nothing changes in the shop
              until we do.
            </p>
          )}
          {artRequestCancelled && (
            <p className="rounded-lg border border-border px-4 py-2 text-sm text-muted">
              Request withdrawn. Your listing is unchanged.
            </p>
          )}
          {artRequestReviewed && (
            <p className="border-flame-2/40 bg-flame-2/10 text-flame-3 rounded-lg border px-4 py-2 text-sm">
              Request handled.
            </p>
          )}
          {artRequestMessage && (
            <p className="border-flame-1/40 bg-flame-1/10 text-flame-3 rounded-lg border px-4 py-3 text-sm">
              {artRequestMessage}
            </p>
          )}
        </div>
      )}

      {(mediaUploaded > 0 || mediaDeleted || mediaMessage) && (
        <div className="mt-6 flex flex-col gap-2">
          {mediaUploaded > 0 && (
            <p className="rounded-lg border border-flame-2/40 bg-flame-2/10 px-4 py-2 text-sm text-flame-3">
              {mediaUploaded === 1 ? "Image uploaded." : `${mediaUploaded} images uploaded.`}
            </p>
          )}
          {mediaDeleted && (
            <p className="rounded-lg border border-flame-2/40 bg-flame-2/10 px-4 py-2 text-sm text-flame-3">
              Image deleted.
            </p>
          )}
          {mediaMessage && (
            <p className="rounded-lg border border-flame-1/40 bg-flame-1/10 px-4 py-3 text-sm text-flame-3">
              {mediaMessage}
            </p>
          )}
        </div>
      )}

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
          <>
            <AmbassadorTab
            ambassador={account}
            stats={stats}
            tier={tier}
            origin={origin}
            linkAdded={linkAdded}
            linkDeleted={linkDeleted}
            payoutSaved={payoutSaved}
          />
            {mediaKinds.includes("ambassador") && (
              <MediaLibrary code={account.code} kind="ambassador" items={media} />
            )}
          </>
        }
        vendor={
          <>
            <VendorTab
              vendorName={vendorArtist?.name}
              stats={vendorStats}
              products={vendorProducts}
              code={account.code}
              canSubmit={account.permissions.vendor}
              submissions={artProducts}
              submitted={artProductSubmitted}
              submitError={artProductError}
              photoError={artPhotoError}
            />
            {mediaKinds.includes("vendor") && (
              <MediaLibrary code={account.code} kind="vendor" items={media} />
            )}
          </>
        }
        art={
          <>
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
            photoError={artPhotoError}
            />
            {mediaKinds.includes("art") && (
              <MediaLibrary code={account.code} kind="art" items={media} />
            )}
          </>
        }
        music={
          <>
            <MusicTab
              code={account.code}
              hasMusicAccess={account.permissions.music}
              profile={musicianProfile}
              saved={musicSaved}
              error={musicError}
              submissions={artProducts}
              submitted={artProductSubmitted}
              submitError={artProductError}
              photoError={artPhotoError}
            />
            {mediaKinds.includes("music") && (
              <MediaLibrary code={account.code} kind="music" items={media} />
            )}
          </>
        }
        ssbd={<SsbdTab />}
        eventsAdmin={eventsAdminOverview ? <EventsAdminTab data={eventsAdminOverview} /> : null}
        eventSales={
          canAccessEventSales ? (
            <>
              <EventSalesTab
                code={account.code}
                upcoming={upcomingEvents}
                signups={eventSalesSignups}
                schedule={eventSalesSchedule}
                workSignup={workSignup}
              />
              {mediaKinds.includes("eventSales") && (
                <MediaLibrary code={account.code} kind="eventSales" items={media} />
              )}
            </>
          ) : null
        }
        artAdmin={
          pendingArtBatches ? (
            <ArtAdminTab batches={pendingArtBatches} requests={pendingArtRequests} />
          ) : null
        }
        settings={
          <>
            <SettingsTab
            account={account}
            settingsSaved={settingsSaved}
            passwordChanged={passwordChanged}
            settingsError={settingsError}
          />
            {mediaKinds.includes("profile") && (
              <MediaLibrary code={account.code} kind="profile" items={media} />
            )}
          </>
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
