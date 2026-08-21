"use client";

import type { PosTab } from "@/components/pos/PosApp";

const TABS: { id: PosTab; label: string }[] = [
  { id: "checkout", label: "Checkout" },
  { id: "inventory", label: "Inventory" },
  { id: "transactions", label: "Transactions" },
  { id: "notifications", label: "Notifications" },
  { id: "more", label: "More" },
];

function TabIcon({ id }: { id: PosTab }) {
  const props = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "h-5 w-5",
  };

  switch (id) {
    case "checkout":
      return (
        <svg {...props}>
          <path d="M6 6h15l-1.5 9h-12z" />
          <path d="M6 6 5 3H2" />
          <circle cx="9" cy="20" r="1.4" fill="currentColor" stroke="none" />
          <circle cx="18" cy="20" r="1.4" fill="currentColor" stroke="none" />
        </svg>
      );
    case "inventory":
      return (
        <svg {...props}>
          <path d="M3 7l9-4 9 4-9 4-9-4Z" />
          <path d="M3 7v10l9 4 9-4V7" />
          <path d="M12 11v10" />
        </svg>
      );
    case "transactions":
      return (
        <svg {...props}>
          <path d="M4 7h13l-3-3" />
          <path d="M20 17H7l3 3" />
        </svg>
      );
    case "notifications":
      return (
        <svg {...props}>
          <path d="M6 10a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 14 6 10Z" />
          <path d="M10 19a2 2 0 0 0 4 0" />
        </svg>
      );
    case "more":
      return (
        <svg {...props}>
          <path d="M4 7h16" />
          <path d="M4 12h16" />
          <path d="M4 17h16" />
        </svg>
      );
  }
}

export default function PosTabBar({
  active,
  onChange,
}: {
  active: PosTab;
  onChange: (tab: PosTab) => void;
}) {
  return (
    <nav className="border-border bg-background flex shrink-0 items-stretch border-t">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[0.65rem] font-medium transition-colors ${
            active === tab.id ? "text-flame-2" : "text-muted hover:text-foreground"
          }`}
        >
          <TabIcon id={tab.id} />
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
