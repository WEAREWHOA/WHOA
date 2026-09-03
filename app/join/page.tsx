import Link from "next/link";
import type { Metadata } from "next";
import PsychedelicBackground from "@/components/home/PsychedelicBackground";

export const metadata: Metadata = {
  title: "Join",
  description: "Join the WHOA community — the ambassador program, events, the art and music collectives, and pop ups.",
};

const TILES = [
  {
    href: "/ambassadors",
    title: "Brand Ambassador Program",
    description: "Give your people 15% off and earn 10% commission on every sale.",
    gradient: "linear-gradient(160deg, #3a0a05, #8a2a15 55%, #ff2f1a)",
  },
  {
    href: "/events",
    title: "Events & Festivals",
    description: "WHOA Wednesday at the WHOADEGA, shows, and festivals — find us and RSVP.",
    gradient: "linear-gradient(160deg, #0a2a1f, #1a6b4a 55%, #29e6ff)",
  },
  {
    href: "/art-collective",
    title: "Art Collective",
    description: "The artists and vendors behind WHOA — shop their work straight from the collective.",
    gradient: "linear-gradient(160deg, #2a0a3a, #7b2ff7 55%, #ff2fb0)",
  },
  {
    href: "/music-collective",
    title: "Music Collective",
    description: "The DJs and producers behind WHOA Wednesday and the WHOADEGA speaker stack.",
    gradient: "linear-gradient(160deg, #3a3a0a, #8a8a1a 55%, #fff229)",
  },
  {
    href: "/events?category=whoadega",
    title: "Pop Ups & Retail",
    description: "Find WHOA in person — the WHOADEGA and pop-up retail dates.",
    gradient: "linear-gradient(160deg, #0d3b3b, #1a8a6b 55%, #baff29)",
  },
];

export default function JoinPage() {
  return (
    <section className="relative flex flex-1 flex-col items-center overflow-hidden px-6 py-20">
      <PsychedelicBackground />

      <div className="relative z-10 text-center">
        <span className="text-xs font-semibold tracking-[0.3em] text-white/70 uppercase">
          Get involved
        </span>
        <h1 className="text-psychedelic font-display mt-3 text-5xl tracking-wide sm:text-6xl">
          Join the Community
        </h1>
        <p className="mt-3 max-w-md text-sm text-white/60">
          Pick a lane — ambassadors, events, art, music, or find us in person.
        </p>
      </div>

      <div className="relative z-10 mt-14 grid w-full max-w-4xl gap-6 sm:grid-cols-2">
        {TILES.map((tile, i) => (
          <Link
            key={tile.href}
            href={tile.href}
            className={`group relative overflow-hidden rounded-2xl border border-white/15 p-8 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.8)] transition-transform duration-300 hover:-translate-y-1 hover:shadow-[0_25px_65px_-15px_rgba(255,122,0,0.35)] ${
              i === TILES.length - 1 && TILES.length % 2 === 1 ? "sm:col-span-2" : ""
            }`}
            style={{ background: tile.gradient }}
          >
            <div aria-hidden className="event-card-noise absolute inset-0" />
            <div className="relative z-10">
              <h2 className="font-display text-2xl tracking-wide text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)] sm:text-3xl">
                {tile.title}
              </h2>
              <p className="mt-2 max-w-sm text-sm text-white/85">{tile.description}</p>
              <span className="mt-5 inline-flex items-center gap-1 text-xs font-semibold tracking-wide text-white uppercase">
                Explore
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" className="transition-transform group-hover:translate-x-1">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" />
                </svg>
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
