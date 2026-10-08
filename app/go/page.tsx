import type { Metadata } from "next";
import Link from "next/link";
import PsychedelicBackground from "@/components/home/PsychedelicBackground";

/**
 * /go — the URL printed on flyers, stickers and the back of a card.
 *
 * It used to be the SSBD experience: a sign-up gate, a portal animation,
 * four element doors and a scavenger strip. All of that is gone. What is
 * left is the four things somebody scanning a flyer actually wants, with
 * the site's own nav around it rather than a sealed room.
 *
 * Deliberately kept out of the index. It has no content of its own, only
 * links to pages that do, so letting it rank would put a thin hub in
 * front of the real ones. `follow` stays on, so the links still pass
 * their signal through.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: true },
  title: "Start here",
  description: "RSVP to an event, shop online, join the Music Collective, or sign in to WHOA.",
};

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
    // Both halves of the same page: /login signs in, ?mode=signup opens
    // on the create-account side. One card rather than two, because
    // "which of these am I" is a question nobody arriving off a flyer
    // should have to answer.
    href: "/login?mode=signup",
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

      {/* auto-rows-fr so all four read as the same size whatever the
          blurbs come out at, the same rule the About grid uses. */}
      <div className="relative z-10 mt-12 grid w-full max-w-4xl auto-rows-fr gap-6 sm:grid-cols-2">
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
