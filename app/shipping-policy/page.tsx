import type { Metadata } from "next";

import { formatCents } from "@/lib/money";
import { SHIPPING_ZONES } from "@/lib/shipping";

export const metadata: Metadata = {
  // Self-canonical, so the ?cfa=gpl / ?si=true tracking variants
  // Square Online sprayed around consolidate here instead of
  // competing as separate pages.
  alternates: { canonical: "/shipping-policy" },
  title: "Shipping Policy",
  description:
    "WHOA's shipping policy — processing time, domestic and international rates, tracking, and delivery.",
};

export default function ShippingPolicyPage() {
  return (
    <section className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <span className="text-xs font-semibold tracking-[0.2em] text-muted uppercase">
        The fine print
      </span>
      <h1 className="font-display mt-2 text-4xl tracking-wide">
        Shipping <span className="text-flame">Policy</span>
      </h1>

      <div className="card-surface mt-8 flex flex-col gap-6 rounded-2xl p-6 text-sm leading-relaxed text-muted sm:p-8">
        <div>
          <h2 className="font-display text-xl text-foreground">Processing time</h2>
          <p className="mt-2">
            Orders are typically processed within 3-5 business days from the date of purchase.
            Processing may take longer during peak seasons and promotional periods due to the
            nature of our small business.
          </p>
          <p className="mt-2">
            Certain custom-made, hand-painted designs take longer to complete —{" "}
            <span className="font-semibold text-foreground">2 weeks to 1 month</span> — since
            each one is painted to order rather than pulled from existing stock.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-foreground">Shipping method &amp; rates</h2>
          <p className="mt-2">
            We ship worldwide via standard shipping unless otherwise specified. What you pay
            depends on where it&apos;s going and what the order comes to before tax — the exact
            amount is shown at checkout once you pick your country, so there&apos;s nothing to
            work out from this table.
          </p>

          {/* Rendered from the same rate table the checkout charges from
              (lib/shipping.ts), so this page cannot quietly go out of date
              the way a hand-typed one would. */}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 pr-4 font-semibold text-foreground">Destination</th>
                  <th className="py-2 font-semibold text-foreground">Order total</th>
                  <th className="py-2 pl-4 text-right font-semibold text-foreground">Shipping</th>
                </tr>
              </thead>
              <tbody>
                {SHIPPING_ZONES.map((zone) => {
                  // Cheapest threshold first, so each row reads as a
                  // rising ladder rather than the matching order the
                  // pricing code needs.
                  const tiers = [...zone.tiers].sort(
                    (a, b) => a.minSubtotalCents - b.minSubtotalCents,
                  );
                  return tiers.map((tier, i) => {
                    const next = tiers[i + 1];
                    return (
                      <tr key={`${zone.id}-${tier.minSubtotalCents}`} className="border-b border-border/50">
                        {i === 0 && (
                          <th
                            scope="rowgroup"
                            rowSpan={tiers.length}
                            className="py-2 pr-4 align-top font-medium text-foreground"
                          >
                            {zone.label}
                          </th>
                        )}
                        <td className="py-2">
                          {next
                            ? `${formatCents(tier.minSubtotalCents)}\u2013${formatCents(next.minSubtotalCents - 1)}`
                            : `${formatCents(tier.minSubtotalCents)} and up`}
                        </td>
                        <td className="py-2 pl-4 text-right">
                          {tier.rateCents === 0 ? (
                            <span className="font-semibold text-flame">Free</span>
                          ) : (
                            formatCents(tier.rateCents)
                          )}
                        </td>
                      </tr>
                    );
                  });
                })}
              </tbody>
            </table>
          </div>

          <p className="mt-4">
            &ldquo;Europe &amp; UK&rdquo; covers the countries listed in our rate table at
            checkout; anywhere not named above ships at the rest-of-world rate. Duties, import
            VAT and customs charges on international orders are set by the destination country
            and are the recipient&apos;s responsibility — they aren&apos;t included in the
            shipping shown at checkout.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-foreground">Tracking your order</h2>
          <p className="mt-2">
            Once your order ships, you&apos;ll receive a tracking number via email to monitor the
            status of your delivery.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-foreground">Delivery time</h2>
          <p className="mt-2">
            Delivery times vary depending on your location and the shipping method chosen.
            Typically, orders within the continental United States arrive within 5-7 business days
            from the shipping date. International orders usually take 2-4 weeks, and can take
            longer when a parcel is held in customs — which is outside our control.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-foreground">Order modifications</h2>
          <p className="mt-2">
            Please ensure that all shipping information is correct before finalizing your
            purchase. We&apos;re unable to modify orders once they&apos;ve shipped.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-foreground">Lost or damaged packages</h2>
          <p className="mt-2">
            WHOA isn&apos;t responsible for lost or damaged packages once they&apos;ve shipped —
            please contact the shipping carrier for assistance in such cases.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-foreground">Questions?</h2>
          <p className="mt-2">
            Reach us anytime at{" "}
            <a href="mailto:info@wearewhoa.com" className="text-flame font-medium hover:underline">
              info@wearewhoa.com
            </a>{" "}
            or (619) 630-9551.
          </p>
        </div>
      </div>
    </section>
  );
}
