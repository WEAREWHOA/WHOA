"use client";

import { useState, type ReactNode } from "react";

const ALL_TABS = [
  { id: "customer", label: "CUSTOMER" },
  { id: "ambassador", label: "BRAND AMBASSADORS" },
  { id: "vendor", label: "ARTIST/VENDOR" },
  { id: "music", label: "MUSIC" },
  { id: "ssbd", label: "SSBD" },
] as const;

type TabId = (typeof ALL_TABS)[number]["id"];

export default function DashboardTabs({
  customer,
  ambassador,
  vendor,
  music,
  ssbd,
  visible,
}: {
  customer: ReactNode;
  ambassador: ReactNode;
  vendor: ReactNode;
  music: ReactNode;
  ssbd: ReactNode;
  // Customer is always visible — everyone with an account is a customer.
  // The rest are unlocked per-account by a Super Admin.
  visible: { ambassador: boolean; vendor: boolean; music: boolean; ssbd: boolean };
}) {
  const content: Record<TabId, ReactNode> = { customer, ambassador, vendor, music, ssbd };
  const tabs = ALL_TABS.filter((tab) => tab.id === "customer" || visible[tab.id]);

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
