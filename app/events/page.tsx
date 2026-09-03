import type { Metadata } from "next";
import PsychedelicBackground from "@/components/home/PsychedelicBackground";
import EventsGrid from "@/components/events/EventsGrid";
import { EVENTS } from "@/lib/events";

export const metadata: Metadata = {
  title: "Events",
  description: "Find WHOA at the WHOADEGA, shows, and festivals — RSVP or grab tickets.",
};

export default function EventsPage() {
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

      <EventsGrid events={EVENTS} />
    </section>
  );
}
