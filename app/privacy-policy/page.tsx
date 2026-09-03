import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How WHOA collects, uses, and protects your information.",
};

export default function PrivacyPolicyPage() {
  return (
    <section className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <span className="text-xs font-semibold tracking-[0.2em] text-muted uppercase">
        The fine print
      </span>
      <h1 className="font-display mt-2 text-4xl tracking-wide">
        Privacy <span className="text-flame">Policy</span>
      </h1>
      <p className="mt-3 text-xs text-muted">Last updated: September 2026</p>

      <div className="card-surface mt-8 flex flex-col gap-6 rounded-2xl p-6 text-sm leading-relaxed text-muted sm:p-8">
        <p>
          This policy covers wearewhoa.com and the WHOA online store (&ldquo;WHOA,&rdquo;
          &ldquo;we,&rdquo; &ldquo;us&rdquo;). It explains what information we collect, how we use
          it, and the choices you have.
        </p>

        <div>
          <h2 className="font-display text-xl text-foreground">Information we collect</h2>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li>
              <span className="text-foreground">Information you give us</span> — your name, email,
              phone number, and shipping address when you check out, apply to become an ambassador,
              submit a Custom Design, or send us a message through the Contact page.
            </li>
            <li>
              <span className="text-foreground">Payment information</span> — handled directly by
              Square, our payment processor. WHOA never sees or stores your full card details.
            </li>
            <li>
              <span className="text-foreground">Cookies</span> — a short-lived cookie remembers an
              ambassador referral link for 30 days so the right ambassador gets credit for a sale,
              and, if you&apos;re a logged-in ambassador, a session cookie keeps you signed in for
              30 days. Your shopping cart is stored only in your browser (not a cookie, and never
              sent to us until you check out).
            </li>
          </ul>
          <p className="mt-2">
            We don&apos;t currently run any third-party analytics or advertising trackers on this
            site.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-foreground">How we use it</h2>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li>To process and ship your order, and to contact you about it.</li>
            <li>To respond to messages sent through the Contact page.</li>
            <li>To run the ambassador program — applying discounts and calculating commissions.</li>
            <li>To operate, maintain, and improve the site.</li>
          </ul>
        </div>

        <div>
          <h2 className="font-display text-xl text-foreground">Who we share it with</h2>
          <p className="mt-2">
            We share information only with the vendors that make the store work:{" "}
            <span className="text-foreground">Square</span>, for payment processing and order
            fulfillment, and <span className="text-foreground">Supabase</span>, our database host.
            We don&apos;t sell your personal information to anyone.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-foreground">Data retention &amp; security</h2>
          <p className="mt-2">
            We keep order and account information for as long as needed to run the store and meet
            legal/accounting requirements. We use industry-standard safeguards, but no method of
            transmission or storage is 100% secure.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-foreground">Your choices</h2>
          <p className="mt-2">
            To access, correct, or request deletion of your personal information, email{" "}
            <a href="mailto:info@wearewhoa.com" className="text-flame font-medium hover:underline">
              info@wearewhoa.com
            </a>
            . Depending on where you live, you may have additional rights under local law — reach
            out and we&apos;ll do our best to help.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-foreground">Children&apos;s privacy</h2>
          <p className="mt-2">
            WHOA isn&apos;t directed at children under 13, and we don&apos;t knowingly collect
            information from them.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-foreground">Changes to this policy</h2>
          <p className="mt-2">
            We may update this policy from time to time. Material changes will be reflected by
            updating the &ldquo;Last updated&rdquo; date above.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-foreground">Contact us</h2>
          <p className="mt-2">
            Questions about this policy?{" "}
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
