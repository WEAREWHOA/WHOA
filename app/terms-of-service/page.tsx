import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that govern using the WHOA website and store.",
};

export default function TermsOfServicePage() {
  return (
    <section className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <span className="text-xs font-semibold tracking-[0.2em] text-muted uppercase">
        The fine print
      </span>
      <h1 className="font-display mt-2 text-4xl tracking-wide">
        Terms of <span className="text-flame">Service</span>
      </h1>
      <p className="mt-3 text-xs text-muted">Last updated: September 2026</p>

      <div className="card-surface mt-8 flex flex-col gap-6 rounded-2xl p-6 text-sm leading-relaxed text-muted sm:p-8">
        <div>
          <h2 className="font-display text-xl text-foreground">Agreement to terms</h2>
          <p className="mt-2">
            By using wearewhoa.com or buying from WHOA (&ldquo;we,&rdquo; &ldquo;us&rdquo;), you
            agree to these terms. If you don&apos;t agree, please don&apos;t use the site.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-foreground">One-of-a-kind products</h2>
          <p className="mt-2">
            Many WHOA pieces are hand-painted, hand-bleached, or otherwise individually made.
            Slight variations in color, pattern, and finish between what&apos;s pictured and what
            you receive are normal and part of what makes each piece unique — not a defect.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-foreground">Orders &amp; payment</h2>
          <p className="mt-2">
            Prices are shown at checkout in USD. Payment is processed securely through Square. We
            reserve the right to refuse or cancel an order — for example if an item turns out to
            be out of stock, pricing was displayed in error, or we suspect fraud — in which case
            we&apos;ll notify you and issue a refund for anything already charged.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-foreground">Shipping &amp; returns</h2>
          <p className="mt-2">
            See our{" "}
            <a href="/shipping-policy" className="text-flame font-medium hover:underline">
              Shipping Policy
            </a>{" "}
            and{" "}
            <a href="/return-policy" className="text-flame font-medium hover:underline">
              Return Policy
            </a>{" "}
            for details on delivery times and how to start a return or exchange.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-foreground">Ambassador program</h2>
          <p className="mt-2">
            Ambassadors get a personal referral code and link that gives their audience a discount
            and earns the ambassador a commission on resulting sales. Discount and commission
            rates, and program eligibility, are set out on the{" "}
            <a href="/ambassadors" className="text-flame font-medium hover:underline">
              Ambassador Program
            </a>{" "}
            page and may change going forward; we&apos;ll do our best to give notice of any change
            that affects commissions already earned.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-foreground">Accounts</h2>
          <p className="mt-2">
            Ambassador accounts are personal to you — keep your login credentials to yourself, and
            let us know right away at{" "}
            <a href="mailto:info@wearewhoa.com" className="text-flame font-medium hover:underline">
              info@wearewhoa.com
            </a>{" "}
            if you think your account has been compromised.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-foreground">User submissions</h2>
          <p className="mt-2">
            Interactive features like the Custom Design editor, the Graffiti Wall, and the Contact
            form let you send us content or messages. By submitting, you confirm it&apos;s yours to
            share and give us permission to use it to respond to you and operate these features.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-foreground">Intellectual property</h2>
          <p className="mt-2">
            The WHOA name, logo, artwork, and site content belong to WHOA (or our artists and
            vendors) and are protected by applicable intellectual property law. You&apos;re welcome
            to share and link to our pages — please don&apos;t reproduce or resell our content or
            designs without permission.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-foreground">Limitation of liability</h2>
          <p className="mt-2">
            The site and products are provided &ldquo;as is.&rdquo; To the fullest extent permitted
            by law, WHOA isn&apos;t liable for indirect, incidental, or consequential damages
            arising from your use of the site or purchase of our products, beyond the amount you
            paid for the order in question.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-foreground">Governing law</h2>
          <p className="mt-2">
            These terms are governed by the laws of the State of California, without regard to
            conflict-of-law principles.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-foreground">Changes to these terms</h2>
          <p className="mt-2">
            We may update these terms from time to time. Continuing to use the site after a change
            means you accept the updated terms.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-foreground">Contact us</h2>
          <p className="mt-2">
            Questions about these terms?{" "}
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
