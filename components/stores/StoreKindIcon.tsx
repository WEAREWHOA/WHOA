import type { StoreKind } from "@/lib/stores";

/**
 * One drawing per kind of place, so the three read apart at a glance
 * before the words are read at all.
 *
 * They're deliberately variations on one storefront rather than three
 * unrelated pictures, because that's what the three things are:
 *
 *   RETAIL STORE   the shop, with its own door
 *   RETAIL POP-UP  the same shop outline, one part of the floor filled
 *                  in: our section inside somebody else's building
 *   EVENT POP-UP   a canopy and a table, up for a weekend
 *
 * No "use client" here on purpose. It's a pure drawing with no state, so
 * it renders into the server HTML for the page summary as happily as it
 * does inside the interactive list.
 */
export default function StoreKindIcon({
  kind,
  className = "h-4 w-4",
}: {
  kind: StoreKind;
  className?: string;
}) {
  const props = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    // Decorative: the label it sits next to already says which kind this
    // is, so a screen reader announcing it twice is noise.
    "aria-hidden": true,
    focusable: false,
  };

  switch (kind) {
    case "retail-store":
      return (
        <svg {...props}>
          <path d="M3 9l1.5-4h15L21 9" />
          <path d="M4.5 9v11h15V9" />
          <path d="M10 20v-6h4v6" />
        </svg>
      );
    case "retail-popup":
      return (
        <svg {...props}>
          <path d="M3 9l1.5-4h15L21 9" />
          <path d="M4.5 9v11h15V9" />
          {/* Our bit of their floor. */}
          <path d="M13 20v-7h5.5v7" fill="currentColor" />
        </svg>
      );
    case "event-popup":
      return (
        <svg {...props}>
          <path d="M3 10l4-5h10l4 5Z" />
          <path d="M5.5 10v10" />
          <path d="M18.5 10v10" />
          <path d="M8 20v-5h8v5" />
        </svg>
      );
  }
}
