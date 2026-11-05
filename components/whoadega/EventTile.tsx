import Link from "next/link";
import type { EventInfo } from "@/lib/events";

/**
 * One night at the shop, as a link.
 *
 * A server component, unlike the flyer cards on /events, which are
 * client-side so they can open a modal. Here the flyer should go to the
 * event's own page: this is a landing page, and a crawler that cannot
 * run the modal should still find every night through a real href.
 */
export default function EventTile({ event, past = false }: { event: EventInfo; past?: boolean }) {
  const [c1, c2, c3] = event.gradient;

  return (
    <Link
      href={`/events/${event.id}`}
      className="group border-border hover:border-flame-2/60 relative block overflow-hidden rounded-2xl border transition-colors"
    >
      <div
        className="relative aspect-[4/5] w-full"
        style={{
          background: event.imageUrl
            ? undefined
            : `linear-gradient(145deg, ${c1} 0%, ${c2} 55%, ${c3} 100%)`,
        }}
      >
        {event.imageUrl && (
          // Plain img, not next/image. These are flyers of wildly
          // different shapes already sized for the web, and the
          // optimiser's cost here is a per-image transform on a page
          // that exists to load fast on a phone outside the shop.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.imageUrl}
            alt=""
            loading="lazy"
            className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 ${
              past ? "opacity-60 grayscale" : ""
            }`}
          />
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-3 pt-10">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-white/80 uppercase">
            {event.dateLabel}
            {event.timeLabel ? ` · ${event.timeLabel}` : ""}
          </p>
          {/* Two lines, then stop. A long themed title ("WHOA Wednesday
              — Open Decks Contest") otherwise grows the overlay until it
              covers the flyer it is captioning. */}
          <p
            className="font-display mt-0.5 overflow-hidden text-sm leading-tight text-white"
            style={{ display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 2 }}
          >
            {event.title}
          </p>
        </div>
      </div>
    </Link>
  );
}
