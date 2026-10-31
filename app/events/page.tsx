import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import PsychedelicBackground from "@/components/home/PsychedelicBackground";
import EventsGrid from "@/components/events/EventsGrid";
import EventsNewsletterBanner from "@/components/events/EventsNewsletterBanner";
import { getAllEvents } from "@/lib/eventsStore";

export const metadata: Metadata = {
  // Self-canonical, so the ?cfa=gpl / ?si=true tracking variants
  // Square Online sprayed around consolidate here instead of
  // competing as separate pages.
  alternates: { canonical: "/events" },
  title: "Events",
  description: "Find WHOA at the WHOADEGA, shows, and festivals — RSVP or grab tickets.",
};

export default async function EventsPage() {
  const events = await getAllEvents();

  return (
    <section className="relative flex flex-1 flex-col items-center overflow-hidden px-6 py-20">
      <PsychedelicBackground />

      <div className="relative z-10 text-center">
        <span className="text-xs font-semibold tracking-[0.3em] text-white/70 uppercase">
          Where to find us
        </span>
        <h1 className="text-psychedelic font-display mt-3 text-5xl tracking-wide sm:text-6xl">
          Event Calendar
        </h1>
        <p className="mt-3 max-w-md text-sm text-white/60">
          Tap a flyer for full details. Hover to RSVP.
        </p>
      </div>

      {/* The weekly night, above everything else, at an address that
          does not change. Resolved per request by /whoa-wednesday, so
          this stays right without anybody editing it each week. */}
      <Link
        href="/whoa-wednesday"
        className="btn-flame relative z-10 mt-7 inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-xs font-bold tracking-[0.12em] uppercase"
      >
        Next WHOA Wednesday
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" />
        </svg>
      </Link>

      <EventsNewsletterBanner />

      <Suspense>
        <EventsGrid events={events} />
      </Suspense>
    </section>
  );
}
