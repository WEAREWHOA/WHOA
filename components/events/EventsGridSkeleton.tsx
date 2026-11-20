import { EVENT_CATEGORIES } from "@/lib/events";

/**
 * The space EventsGrid will take, rendered on the server.
 *
 * EventsGrid reads the query string with useSearchParams, which on a
 * prerendered page makes React skip it server-side and render the
 * Suspense fallback instead. That fallback used to be nothing, so the
 * HTML arrived 899px tall and grew to 26,294px once the grid hydrated:
 * a 25,000px jump.
 *
 * The jump is not only ugly. The browser restores scroll position
 * against whatever height the document has at that moment, so a reload
 * part way down /events was clamped to the bottom of a one-screen
 * document, which put the footer under the sticky navbar and lost the
 * reader's place. Reserving the height is what fixes both.
 *
 * So this exists to be the right SIZE, not to be pretty. The numbers
 * are measured from the real grid rather than guessed: a flyer is
 * 384x574 from the small breakpoint up and 165x311 below it, and the
 * calendar is 650px and 544px. Expressed as aspect ratios so they hold
 * at any width inside a breakpoint rather than only at the two widths
 * they were measured at.
 *
 * Measured with offsetWidth/offsetHeight, not getBoundingClientRect:
 * .tilt-card rotates each flyer from the small breakpoint up, and a
 * rotated element's bounding rectangle is bigger than the element.
 * Reserving the rotated size would leave a gap on every row.
 *
 * Hidden from assistive technology: it carries no information, and
 * announcing a list of empty boxes is worse than announcing nothing
 * for the moment before the real list arrives.
 */
export default function EventsGridSkeleton({ count }: { count: number }) {
  // One placeholder per real flyer, so the reserved height matches what
  // is coming. Capped because a catalogue that somehow returned
  // thousands should not put thousands of divs in every page's HTML.
  const cards = Math.max(0, Math.min(count, 200));

  return (
    <div aria-hidden className="contents">
      {/* The filter row, at its real size. Spans rather than buttons:
          nothing here is pressable yet, and a button that does nothing
          is a worse promise than a shape. */}
      <div className="relative z-10 mt-8 flex flex-wrap items-center justify-center gap-2">
        <span className="btn-flame rounded-full px-4 py-1.5 text-sm font-semibold tracking-wide">
          All
        </span>
        {EVENT_CATEGORIES.map((cat) => (
          <span
            key={cat.id}
            className="border-border-strong rounded-full border px-4 py-1.5 text-sm font-semibold tracking-wide text-muted uppercase"
          >
            {cat.label}
          </span>
        ))}
      </div>

      <div className="relative z-10 mt-8 flex w-full justify-center px-2">
        <div className="h-[544px] w-full max-w-4xl animate-pulse rounded-2xl border border-white/10 bg-white/5 sm:h-[650px]" />
      </div>

      <h2 className="font-display relative z-10 mt-14 text-2xl tracking-wide text-foreground">
        All flyers
      </h2>

      <div className="relative z-10 mt-8 grid w-full max-w-6xl grid-cols-2 gap-x-3 gap-y-6 sm:flex sm:flex-wrap sm:items-start sm:justify-center sm:gap-x-8 sm:gap-y-14">
        {Array.from({ length: cards }, (_, i) => (
          <div
            key={i}
            className="aspect-[165/311] w-full shrink-0 animate-pulse rounded-2xl border border-white/15 bg-white/5 sm:aspect-[384/574] sm:max-w-sm"
          />
        ))}
      </div>
    </div>
  );
}
