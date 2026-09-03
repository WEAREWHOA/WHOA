import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shipping Policy",
  description: "WHOA's shipping policy — processing time, rates, tracking, and delivery.",
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
        </div>

        <div>
          <h2 className="font-display text-xl text-foreground">Shipping method &amp; rates</h2>
          <p className="mt-2">
            We currently offer <span className="font-semibold text-foreground">free shipping</span> on
            all online orders within the US, shipped via standard shipping unless otherwise
            specified. Shipping times vary depending on your location.
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
            from the shipping date.
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
            </a>
            .
          </p>
        </div>
      </div>
    </section>
  );
}
