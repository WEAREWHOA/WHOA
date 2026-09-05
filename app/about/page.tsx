import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description: "WHOA's story, mission, partnerships, and how to get in touch.",
};

export default function AboutPage() {
  return (
    <section className="mx-auto w-full max-w-4xl flex-1 px-6 py-16">
      <span className="text-xs font-semibold tracking-[0.2em] text-muted uppercase">
        The full picture
      </span>
      <h1 className="font-display mt-2 text-4xl tracking-wide sm:text-5xl">
        About <span className="text-flame">WHOA</span>
      </h1>

      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        <Link
          href="/about/story"
          className="card-surface group rounded-2xl border border-border p-6 transition-colors hover:border-flame-2/50"
        >
          <h2 className="font-display text-2xl">Our Story &amp; Mission</h2>
          <p className="mt-2 text-sm text-muted">
            &ldquo;WHOA&rdquo; is the word you say when you&apos;re too impressed to find any
            other words — one-of-a-kind designs, made for individuality.
          </p>
          <span className="text-flame mt-4 inline-block text-xs font-semibold tracking-wide uppercase">
            Read our story →
          </span>
        </Link>

        <Link
          href="/contact"
          className="card-surface group rounded-2xl border border-border p-6 transition-colors hover:border-flame-2/50"
        >
          <h2 className="font-display text-2xl">Contact</h2>
          <p className="mt-2 text-sm text-muted">
            Pricing, wholesale orders, custom designs, or events — email, call, or send a message.
          </p>
          <span className="text-flame mt-4 inline-block text-xs font-semibold tracking-wide uppercase">
            Get in touch →
          </span>
        </Link>

        <div className="card-surface rounded-2xl border border-border p-6 sm:col-span-2">
          <h2 className="font-display text-2xl">Partnerships</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            As an investment in our future, the future of our planet, and future generations to
            come, we&apos;ve donated <span className="font-semibold text-foreground">$888</span>{" "}
            to{" "}
            <a
              href="https://www.surfrider.org/"
              target="_blank"
              rel="noreferrer"
              className="text-flame font-medium hover:underline"
            >
              The Surfrider Foundation USA
            </a>{" "}
            and <span className="font-semibold text-foreground">$500</span> to{" "}
            <a
              href="https://www.children.org/"
              target="_blank"
              rel="noreferrer"
              className="text-flame font-medium hover:underline"
            >
              Children International
            </a>
            . We also partner directly with independent artists and musicians — see the{" "}
            <Link href="/art-collective" className="text-flame font-medium hover:underline">
              Art Collective
            </Link>{" "}
            and{" "}
            <Link href="/music-collective" className="text-flame font-medium hover:underline">
              Music Collective
            </Link>
            .
          </p>
        </div>
      </div>

      <h2 className="font-display mt-14 text-2xl tracking-wide">More info</h2>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link
          href="/faq"
          className="rounded-full border border-border-strong px-5 py-2.5 text-xs font-semibold tracking-wide uppercase hover:border-flame-2/50"
        >
          FAQ
        </Link>
        <Link
          href="/shipping-policy"
          className="rounded-full border border-border-strong px-5 py-2.5 text-xs font-semibold tracking-wide uppercase hover:border-flame-2/50"
        >
          Shipping Policy
        </Link>
        <Link
          href="/return-policy"
          className="rounded-full border border-border-strong px-5 py-2.5 text-xs font-semibold tracking-wide uppercase hover:border-flame-2/50"
        >
          Return Policy
        </Link>
        <Link
          href="/privacy-policy"
          className="rounded-full border border-border-strong px-5 py-2.5 text-xs font-semibold tracking-wide uppercase hover:border-flame-2/50"
        >
          Privacy Policy
        </Link>
        <Link
          href="/terms-of-service"
          className="rounded-full border border-border-strong px-5 py-2.5 text-xs font-semibold tracking-wide uppercase hover:border-flame-2/50"
        >
          Terms of Service
        </Link>
      </div>
    </section>
  );
}
