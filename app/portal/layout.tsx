import Link from "next/link";
import LogoutButton from "@/components/portal/LogoutButton";
import PortalTabs from "@/components/dashboard/PortalTabs";
import { requirePortal } from "@/lib/portalAccess";

/**
 * The portal shell: signed-in check, greeting, tab bar.
 *
 * Rendered once and kept across tab changes, so moving between tabs
 * fetches only the tab's own data instead of re-running the whole
 * dashboard. That was the point of the split — a single page used to
 * load every permitted tab's data on every visit, which meant opening
 * the portal to glance at your own orders ran the entire analytics
 * query set.
 */
export default async function PortalLayout({ children }: LayoutProps<"/portal">) {
  const { account, can } = await requirePortal();
  const firstName = account.name.trim().split(/\s+/)[0];

  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-16">
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

      <PortalTabs can={can} />

      <div className="mt-8">{children}</div>
    </section>
  );
}
