import PsychedelicBackground from "@/components/home/PsychedelicBackground";
import EventCard from "@/components/events/EventCard";
import { EVENTS } from "@/lib/events";

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
          Hover a flyer to RSVP. Tap it on mobile.
        </p>
      </div>

      <div className="relative z-10 mt-14 flex w-full max-w-6xl flex-wrap items-start justify-center gap-x-8 gap-y-14">
        {EVENTS.map((event, i) => (
          <EventCard key={event.id} event={event} delay={i * 0.45} />
        ))}
      </div>
    </section>
  );
}
