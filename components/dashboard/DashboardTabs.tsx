"use client";

import { useState, type ReactNode } from "react";

const TABS = [
  { id: "ambassador", label: "Brand Ambassadors" },
  { id: "customer", label: "Customer Dashboard" },
  { id: "vendor", label: "Vendor Sales" },
  { id: "ssbd", label: "SSBD" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function DashboardTabs({
  ambassador,
  customer,
  vendor,
  ssbd,
}: {
  ambassador: ReactNode;
  customer: ReactNode;
  vendor: ReactNode;
  ssbd: ReactNode;
}) {
  const [active, setActive] = useState<TabId>("ambassador");
  const content: Record<TabId, ReactNode> = { ambassador, customer, vendor, ssbd };

  return (
    <div className="mt-10">
      <div className="flex flex-wrap gap-2 border-b border-border pb-4">
        {TABS.map((tab) => (
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
