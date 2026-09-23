import Link from "next/link";
import type { Metadata } from "next";
import SpinTheWheel from "@/components/water/SpinTheWheel";

/**
 * The landing page behind the QR code on an H2WHOA bottle.
 *
 * Deliberately not linked from the nav or the footer — the only way here
 * is the bottle in someone's hand. It's rendered without the site's own
 * chrome (see components/SiteChrome.tsx) so a scan lands on something
 * that reads as its own thing rather than a page of the website, with its
 * own explicit ways in rather than a navbar.
 *
 * The spin is stored per device, not per account: asking someone to sign
 * in before they can spin would lose most of them at the first tap. That
 * makes it a fun promo rather than a controlled voucher — clearing site
 * data gets another spin. Fine for a sticker; worth revisiting before the
 * prize is worth more than one.
 */
export const metadata: Metadata = {
  title: "H2WHOA",
  description:
    "You found an H2WHOA bottle. Recycle me, meet WHOA, and spin once for a free sticker at the WHOAdega in Ocean Beach.",
};

export default function WaterPage() {
  return (
    <div className="water-root">
      {/* ── The bottle talking ───────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-2xl px-6 pt-20 pb-16 text-center sm:pt-28">
        <p className="water-eyebrow">Hi. I&apos;m a bottle.</p>

        <h1 className="font-display mt-6 text-6xl leading-[0.9] tracking-wide sm:text-8xl">
          THANK YOU
          <span className="block text-[#4fc3e0]">FOR FINDING ME</span>
        </h1>

        <div className="mx-auto mt-10 flex max-w-lg flex-col gap-5 text-base leading-relaxed text-[#a9c9d4]">
          <p>
            Someone made me, someone filled me, and you picked me up. That&apos;s already a good day
            for a bottle.
          </p>
          <p className="text-[#e9f6fa]">
            When you&apos;re done with me, please <strong>recycle me</strong>. I&apos;d like to come
            back as something else — a bench, a jacket, another me. Anything but a beach.
          </p>
          <p>
            Drink the water. Keep the cap. Put me in the right bin. We&apos;re in Ocean Beach — the
            ocean is right there, and it has enough plastic already.
          </p>
        </div>

        <p className="water-divider mt-14">H2WHOA</p>
      </section>

      {/* ── What WHOA is ─────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-3xl px-6 pb-16">
        <p className="water-eyebrow text-center">So who put water in a bottle called that?</p>

        <h2 className="font-display mt-5 text-center text-4xl tracking-wide sm:text-5xl">
          WE ARE WHOA
        </h2>

        <p className="mx-auto mt-6 max-w-xl text-center text-base leading-relaxed text-[#a9c9d4]">
          WHOA is a San Diego art, music and clothing collective. We run the{" "}
          <strong className="text-[#e9f6fa]">WHOAdega</strong> in Ocean Beach, throw shows and
          festivals, put local artists&apos; work on real shelves, and make the gear you&apos;re
          holding a piece of.
        </p>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="water-card">
            <h3 className="font-display text-xl tracking-wide">THE SHOP</h3>
            <p className="mt-2 text-sm text-[#a9c9d4]">
              Clothing and art from us and the artists around us.
            </p>
          </div>
          <div className="water-card">
            <h3 className="font-display text-xl tracking-wide">THE SHOWS</h3>
            <p className="mt-2 text-sm text-[#a9c9d4]">
              WHOA Wednesdays, gallery nights, festivals up and down the coast.
            </p>
          </div>
          <div className="water-card">
            <h3 className="font-display text-xl tracking-wide">THE PEOPLE</h3>
            <p className="mt-2 text-sm text-[#a9c9d4]">
              Ambassadors, artists, musicians and crew who make all of it run.
            </p>
          </div>
        </div>

        <div className="mt-10 text-center">
          <p className="font-display text-2xl tracking-wide">JOIN THE MOVEMENT</p>
          <p className="mx-auto mt-3 max-w-md text-sm text-[#a9c9d4]">
            Become an ambassador and you get your own link, 15% off for your people and 10% back on
            everything they buy. Or just come to a show.
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link href="/join" className="water-btn">
              Join WHOA
            </Link>
            <Link href="/events" className="water-btn-ghost">
              See what&apos;s on
            </Link>
            <Link href="/shop" className="water-btn-ghost">
              Shop
            </Link>
          </div>
        </div>
      </section>

      {/* ── One spin ─────────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-2xl px-6 pb-24">
        <div className="water-spin-panel">
          <p className="water-eyebrow text-center">One bottle, one spin</p>
          <h2 className="font-display mt-4 text-center text-4xl tracking-wide sm:text-5xl">
            SPIN THE WHEEL
          </h2>
          <p className="mx-auto mt-4 mb-10 max-w-md text-center text-sm leading-relaxed text-[#a9c9d4]">
            You get one. Land on a sticker and it&apos;s yours — show this screen at the WHOAdega in
            Ocean Beach to pick it up.
          </p>

          <SpinTheWheel />
        </div>

        <p className="mt-10 text-center text-xs leading-relaxed text-[#6f909c]">
          One spin per bottle, while stickers last. Claim in person at the WHOAdega, 4847 Newport
          Ave, San Diego.
        </p>

        <p className="mt-8 text-center">
          <Link href="/" className="text-xs tracking-[0.2em] text-[#6f909c] uppercase hover:text-[#e9f6fa]">
            wearewhoa.art →
          </Link>
        </p>
      </section>
    </div>
  );
}
