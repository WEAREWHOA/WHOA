"use client";

import { useState, type ReactNode } from "react";

const ALL_TABS = [
  { id: "customer", label: "CUSTOMER" },
  { id: "events", label: "EVENTS" },
  { id: "ambassador", label: "BRAND AMBASSADORS" },
  { id: "vendor", label: "ARTIST/VENDOR" },
  { id: "art", label: "ART" },
  { id: "music", label: "MUSIC" },
  { id: "ssbd", label: "SSBD" },
  { id: "eventsAdmin", label: "EVENTS ADMIN" },
  { id: "eventSales", label: "EVENT SALES" },
  { id: "artAdmin", label: "ART ADMIN" },
  { id: "settings", label: "SETTINGS" },
] as const;

const ALWAYS_VISIBLE: TabId[] = ["customer", "events", "settings"];

type TabId = (typeof ALL_TABS)[number]["id"];

export default function DashboardTabs({
  customer,
  events,
  ambassador,
  vendor,
  art,
  music,
  ssbd,
  eventsAdmin,
  eventSales,
  artAdmin,
  settings,
  visible,
}: {
  customer: ReactNode;
  events: ReactNode;
  ambassador: ReactNode;
  vendor: ReactNode;
  art: ReactNode;
  music: ReactNode;
  ssbd: ReactNode;
  eventsAdmin: ReactNode;
  eventSales: ReactNode;
  artAdmin: ReactNode;
  settings: ReactNode;
  // Customer, Events, and Settings are always visible — everyone with an
  // account is a customer, can RSVP/buy tickets, and manages their own
  // profile. The rest are unlocked per-account by a Super Admin.
  visible: {
    ambassador: boolean;
    vendor: boolean;
    art: boolean;
    music: boolean;
    ssbd: boolean;
    eventsAdmin: boolean;
    eventSales: boolean;
    artAdmin: boolean;
  };
}) {
  const content: Record<TabId, ReactNode> = {
    customer,
    events,
    ambassador,
    vendor,
    art,
    music,
    ssbd,
    eventsAdmin,
    eventSales,
    artAdmin,
    settings,
  };
  const tabs = ALL_TABS.filter(
    (tab) => ALWAYS_VISIBLE.includes(tab.id) || visible[tab.id as keyof typeof visible],
  );

  const [active, setActive] = useState<TabId>("customer");

  return (
    <div className="mt-10">
      <div className="flex flex-wrap gap-2 border-b border-border pb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActive(tab.id)}
            className={`rounded-full px-4 py-2 text-sm font-semibold tracking-wide transition-colors ${
              active === tab.id
                ? "btn-flame"
                : "border border-border-strong text-muted hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-8">{content[active]}</div>
    </div>
  );
}
