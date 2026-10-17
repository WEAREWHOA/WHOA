import Link from "next/link";
import type { Metadata } from "next";

/**
 * The landing page behind the card in a WHOA GIFT BOX.
 *
 * Same posture as /water: the only way here is the thing in somebody's
 * hands, so it is rendered without the site's own chrome (see
 * components/SiteChrome.tsx) and carries its own ways in rather than a
 * navbar. Its own warm palette too, scoped under .box-root -- the
 * bottle page is cold and blue, this one is a gift.
 *
 * The whole job of this page is to say thank you properly. These boxes
 * are not sold and not won; somebody at WHOA decided a particular
 * person should have one. So the page opens with gratitude and only
 * then offers somewhere to go, rather than the other way round.
 *
 * noindex, deliberately, and out of the sitemap. Nobody is searching
 * for it, the rest of its content is already on /about, and a page
 * thanking somebody for a free box has no business turning up in
 * results for people who were never given one. Crawlable, so the
 * noindex is actually read.
 */
export const metadata: Metadata = {
  title: "WHOA Gift Box",
  description:
    "You were given a WHOA Gift Box. Here is what it is, who we are, and why you got one.",
  robots: { index: false, follow: true },
};

interface Door {
  href: string;
  label: string;
  blurb: string;
  cta: string;
}

const DOORS: Door[] = [
  {
    href: "/shop",
    label: "THE SHOP",
    blurb:
      "Hand-painted and hand-bleached one-of-ones. Every piece is the only one of itself, which is why yours is yours.",
    cta: "See what's in",
  },
  {
    href: "/join",
    label: "JOIN US",
    blurb:
      "Ambassadors, artists, musicians and the crew who work our events. There is a way in for most things people are good at.",
    cta: "Find your way in",
  },
  {
    href: "/about",
    label: "OUR STORY",
    blurb:
      "How a song and a hand-dyed t-shirt in 2015 turned into a shop on Newport Ave and everything around it.",
    cta: "Read the story",
  },
];

export default function BoxPage() {
  return (
    <div className="box-root">
      {/* ── Thank you ────────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-2xl px-6 pt-20 pb-16 text-center sm:pt-28">
        <p className="box-eyebrow">Somebody chose you</p>

        <h1 className="font-display mt-6 text-6xl leading-[0.9] tracking-wide sm:text-8xl">
          THANK YOU
          <span className="block text-[#f0b429]">FOR BEING YOU</span>
        </h1>

        <div className="mx-auto mt-10 flex max-w-lg flex-col gap-5 text-base leading-relaxed text-[#cbb89a]">
          <p>
            This box was not bought and it was not won. Somebody here thought of you, put your name
            on it, and packed it by hand.
          </p>
          <p className="text-[#f7efe2]">
            We do not make many of these. They go to the people who showed up — who wore the gear
            before anybody knew what it was, who came to the thing on a Wednesday, who told a friend,
            who helped when helping was not anybody&apos;s job.
          </p>
          <p>That is you. We noticed. That is the whole reason this is in your hands.</p>
        </div>

        <p className="box-divider mt-14">WHOA GIFT BOX</p>
      </section>

      {/* ── The note ─────────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-2xl px-6 pb-16">
        <div className="box-note">
          <p className="box-eyebrow">What this is</p>
          <p className="mt-4 text-base leading-relaxed text-[#cbb89a]">
            A WHOA Gift Box. Around here we call it the happy meal, because you do not get to pick
            what is inside and that is half the fun. What you got, somebody chose for you.
          </p>
          <p className="mt-4 text-base leading-relaxed text-[#cbb89a]">
            Wear it, use it, give a piece of it away. There is no code to redeem and nothing to
            claim. It is already yours.
          </p>
        </div>
      </section>

      {/* ── Who we are, and three ways in ────────────────────────────── */}
      <section className="mx-auto w-full max-w-3xl px-6 pb-24">
        <p className="box-eyebrow text-center">So who sent it</p>

        <h2 className="font-display mt-5 text-center text-4xl tracking-wide sm:text-5xl">
          WE ARE WHOA
        </h2>

        <p className="mx-auto mt-6 max-w-xl text-center text-base leading-relaxed text-[#cbb89a]">
          An art, music and clothing collective in Ocean Beach, San Diego. We run the{" "}
          <strong className="text-[#f7efe2]">WHOADEGA</strong> on Newport Ave, throw shows and
          festivals, put local artists&apos; work on real shelves, and hand-paint every piece one at
          a time.
        </p>

        {/* auto-rows-fr so all three read as the same size whatever the
            blurbs come out at, the same rule the About grid uses. */}
        <div className="mt-10 grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-3">
          {DOORS.map((door) => (
            <Link key={door.href} href={door.href} className="box-card group">
              <h3 className="font-display text-xl tracking-wide">{door.label}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#cbb89a]">{door.blurb}</p>
              <span className="mt-auto pt-4 text-xs font-semibold tracking-wide text-[#f0b429] uppercase">
                {door.cta} →
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="font-display text-2xl tracking-wide">COME SAY HI</p>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[#cbb89a]">
            The WHOADEGA is at 4847 Newport Ave in Ocean Beach. Bring the box, bring a friend, or
            just bring yourself.
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link href="/stores" className="box-btn">
              Find the shop
            </Link>
            <Link href="/events" className="box-btn-ghost">
              See what&apos;s on
            </Link>
          </div>
        </div>

        <p className="mt-14 text-center text-xs leading-relaxed text-[#8a7658]">
          Gift boxes are given, never sold. There is nothing to redeem and no catch.
        </p>

        <p className="mt-8 text-center">
          <Link
            href="/"
            className="text-xs tracking-[0.2em] text-[#8a7658] uppercase hover:text-[#f7efe2]"
          >
            wearewhoa.art →
          </Link>
        </p>
      </section>
    </div>
  );
}
