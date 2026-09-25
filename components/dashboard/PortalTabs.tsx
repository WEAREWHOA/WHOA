"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PORTAL_TABS, portalPath, type PortalTabId } from "@/lib/portalNav";

/**
 * The tab bar. Links now, not buttons.
 *
 * Which tab is open is a fact about the URL, so the back button, a
 * bookmark and a link sent to a colleague all work — and the tab someone
 * is actually using finally shows up in the traffic table as its own
 * path.
 */
export default function PortalTabs({ can }: { can: Record<PortalTabId, boolean> }) {
  const pathname = usePathname();
  const tabs = PORTAL_TABS.filter((tab) => can[tab.id]);

  // Longest slug first, so /portal/events-admin isn't claimed by
  // /portal/events.
  const activeSlug = [...tabs]
    .sort((a, b) => b.slug.length - a.slug.length)
    .find((tab) => (tab.slug ? pathname.startsWith(`/portal/${tab.slug}`) : pathname === "/portal"))
    ?.slug;

  return (
    <nav className="mt-10 flex flex-wrap gap-2 border-b border-border pb-3" aria-label="Portal sections">
      {tabs.map((tab) => {
        const active = tab.slug === activeSlug;
        return (
          <Link
            key={tab.id}
            href={portalPath(tab.id)}
            aria-current={active ? "page" : undefined}
            className={`rounded-full px-4 py-2 text-xs font-semibold tracking-[0.12em] transition-colors ${
              active
                ? "bg-foreground text-background"
                : "border border-border-strong text-muted hover:text-foreground"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
