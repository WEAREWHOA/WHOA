import type { Metadata } from "next";
import Link from "next/link";
import PsychedelicBackground from "@/components/home/PsychedelicBackground";

/**
 * /go — the URL printed on flyers, stickers and the back of a card.
 *
 * It used to be the SSBD experience: a sign-up gate, a portal animation,
 * four element doors and a scavenger strip. All of that is gone. What is
 * left is the handful of things somebody scanning a flyer actually
 * wants, with the site's own nav around it rather than a sealed room.
 *
 * Deliberately kept out of the index. It has no content of its own, only
 * links to pages that do, so letting it rank would put a thin hub in
 * front of the real ones. `follow` stays on, so the links still pass
 * their signal through.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: true },
  title: "Start here",
  description:
    "RSVP to an event, shop online, join the Music Collective, spin the prize wheel, or sign in to WHOA.",
};

/**
 * The socials, above the doors.
 *
 * Inline SVG rather than an icon package: four glyphs is not worth a
 * dependency, and these render instantly on a page somebody opens from
 * a flyer on a phone with one bar of signal.
 *
 * Labelled, which was not the original idea. There are two TikToks --
 * the brand's and the shop's -- and two identical glyphs side by side
 * read as a bug rather than as a choice. A word under each is the
 * cheapest way to make four icons say four things.
 */
const TIKTOK_PATH =
  "M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5 2.59 2.59 0 1 1 .72-5.08V9.66a5.7 5.7 0 0 0-.72-.05A5.66 5.66 0 1 0 15.54 15V8.9a7.35 7.35 0 0 0 4.3 1.38V7.2a4.3 4.3 0 0 1-3.24-1.38Z";

const SOCIALS: { label: string; title: string; href: string; path: string }[] = [
  {
    label: "Instagram",
    title: "@wearewhoa.art on Instagram",
    href: "https://instagram.com/wearewhoa.art",
    path: "M12 2.2c3.2 0 3.6 0 4.9.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.86s0 3.6-.07 4.86c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.86.07s-3.6 0-4.86-.07c-1.17-.05-1.8-.25-2.23-.41-.56-.22-.96-.48-1.38-.9-.42-.42-.68-.82-.9-1.38-.16-.42-.36-1.06-.41-2.23C2.21 15.6 2.2 15.2 2.2 12s0-3.6.07-4.86c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.46 2.21 8.84 2.2 12 2.2Zm0 1.8c-3.14 0-3.5 0-4.74.07-.9.04-1.38.19-1.7.31-.43.17-.74.37-1.06.69-.32.32-.52.63-.69 1.06-.12.32-.27.8-.31 1.7C3.43 8.5 3.42 8.86 3.42 12s0 3.5.08 4.74c.04.9.19 1.38.31 1.7.17.43.37.74.69 1.06.32.32.63.52 1.06.69.32.12.8.27 1.7.31 1.24.07 1.6.08 4.74.08s3.5 0 4.74-.08c.9-.04 1.38-.19 1.7-.31.43-.17.74-.37 1.06-.69.32-.32.52-.63.69-1.06.12-.32.27-.8.31-1.7.07-1.24.08-1.6.08-4.74s0-3.5-.08-4.74c-.04-.9-.19-1.38-.31-1.7a2.86 2.86 0 0 0-.69-1.06 2.86 2.86 0 0 0-1.06-.69c-.32-.12-.8-.27-1.7-.31C15.5 4.01 15.14 4 12 4Zm0 3.14a4.86 4.86 0 1 1 0 9.72 4.86 4.86 0 0 1 0-9.72Zm0 1.8a3.06 3.06 0 1 0 0 6.12 3.06 3.06 0 0 0 0-6.12Zm6.2-2a1.14 1.14 0 1 1-2.27 0 1.14 1.14 0 0 1 2.27 0Z",
  },
  {
    label: "TikTok",
    title: "@wearewhoa.art on TikTok",
    href: "https://www.tiktok.com/@wearewhoa.art",
    path: TIKTOK_PATH,
  },
  {
    // The shop's own account, separate from the brand's.
    label: "WHOADEGA",
    title: "@whoadega on TikTok",
    href: "https://www.tiktok.com/@whoadega",
    path: TIKTOK_PATH,
  },
  {
    label: "YouTube",
    title: "@wearewhoa on YouTube",
    href: "https://www.youtube.com/@wearewhoa",
    path: "M21.58 7.19a2.52 2.52 0 0 0-1.77-1.78C18.25 5 12 5 12 5s-6.25 0-7.81.41a2.52 2.52 0 0 0-1.77 1.78A26.3 26.3 0 0 0 2 12a26.3 26.3 0 0 0 .42 4.81 2.52 2.52 0 0 0 1.77 1.78C5.75 19 12 19 12 19s6.25 0 7.81-.41a2.52 2.52 0 0 0 1.77-1.78A26.3 26.3 0 0 0 22 12a26.3 26.3 0 0 0-.42-4.81ZM10 15.02V8.98L15.2 12 10 15.02Z",
  },
];

interface Door {
  href: string;
  label: string;
  blurb: string;
  cta: string;
}

const DOORS: Door[] = [
  {
    href: "/events",
    label: "RSVP & Events",
    blurb: "Everything we have on: WHOADEGA nights, pop-ups, shows and festivals. RSVP free or grab a ticket.",
    cta: "See what's on",
  },
  {
    href: "/shop",
    label: "Shop Online",
    blurb: "Hand-bleached and hand-painted one-of-ones. Same stock and the same prices as the shop on Newport Ave.",
    cta: "Shop WHOA",
  },
  {
    href: "/music-collective/apply",
    label: "Join the Music Collective",
    blurb: "Artists and producers in the WHOA world. Sign up to apply and we will come back to you.",
    cta: "Apply to join",
  },
  {
    href: "/spin",
    label: "Spin the Wheel",
    blurb:
      "One spin per account, and everybody wins something. Stickers, a keychain or lighter, or a $50 gift card.",
    cta: "Take your spin",
  },
  {
    // Both halves of the same page: /login signs in, ?mode=signup opens
    // on the create-account side. One card rather than two, because
    // "which of these am I" is a question nobody arriving off a flyer
    // should have to answer.
    // next=/go so signing in or signing up comes back here rather than
    // dropping somebody into the portal. They tapped this from a flyer
    // landing page; the other three doors are the reason they are here.
    href: "/login?mode=signup&next=/go",
    label: "Sign up / Sign in",
    blurb: "A free WHOA account tracks your tickets, your orders and anything you are owed.",
    cta: "Get started",
  },
];

export default function GoPage() {
  return (
    <section className="relative flex flex-1 flex-col items-center overflow-hidden px-6 py-16 sm:py-20">
      <PsychedelicBackground />

      <div className="relative z-10 max-w-xl text-center">
        <span className="text-xs font-semibold tracking-[0.3em] text-white/70 uppercase">
          You found us
        </span>
        <h1 className="text-psychedelic font-display mt-3 text-5xl tracking-wide sm:text-6xl">
          WHOA
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-white/70">
          Pick where you are headed.
        </p>
      </div>

      {/* Floating above the doors rather than sitting in a footer: on a
          page somebody opens from a flyer, following is one of the
          things they are most likely to want, and it should not be at
          the bottom of four cards. */}
      <div className="relative z-10 mt-10 flex items-start justify-center gap-4 sm:gap-6">
        {SOCIALS.map((social) => (
          <a
            key={social.href}
            href={social.href}
            target="_blank"
            rel="noreferrer"
            title={social.title}
            aria-label={social.title}
            className="group flex flex-col items-center gap-1.5"
          >
            <span className="rounded-full border border-white/20 p-3 text-white/70 transition-colors group-hover:border-white/60 group-hover:text-white">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden>
                <path d={social.path} />
              </svg>
            </span>
            <span className="text-[0.6rem] font-semibold tracking-[0.12em] text-white/50 uppercase transition-colors group-hover:text-white/80">
              {social.label}
            </span>
          </a>
        ))}
      </div>

      {/* auto-rows-fr so they all read as the same size whatever the
          blurbs come out at, the same rule the About grid uses. */}
      <div className="relative z-10 mt-8 grid w-full max-w-4xl auto-rows-fr gap-6 sm:grid-cols-2">
        {DOORS.map((door) => (
          <Link
            key={door.href}
            href={door.href}
            className="card-surface group flex h-full flex-col rounded-2xl border border-border p-6 transition-colors hover:border-flame-2/50"
          >
            <h2 className="font-display text-2xl">{door.label}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{door.blurb}</p>
            <span className="text-flame mt-auto pt-4 inline-block text-xs font-semibold tracking-wide uppercase">
              {door.cta} →
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
