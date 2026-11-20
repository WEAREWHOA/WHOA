/**
 * The space ShopGrid will take, rendered on the server.
 *
 * Same reason as EventsGridSkeleton, which has the long version:
 * ShopGrid reads the query string, so on a prerendered page React
 * renders this instead of the grid, and an empty fallback meant the
 * document arrived at a fraction of its real height and jumped once
 * the grid hydrated. The jump broke scroll restoration, which is what
 * put the footer under the sticky navbar on a reload.
 *
 * The shop is paginated, so unlike the events grid the reserved height
 * is bounded: at most one page of cards however large the catalogue
 * is. Measured untransformed, since .tilt-card rotates each card and
 * a rotated element's bounding box is bigger than the element.
 *
 * Approximate on purpose, and this one cannot be anything else. A
 * product card's height follows the length of its name: measured
 * across a page of them, 521px to 541px from the small breakpoint up
 * and 327px to 367px below it, with most names fitting one line. The
 * ratios here sit just above that common case rather than at the
 * worst one, so a page of ordinary names lands within about 1% and a
 * page of long ones is reserved slightly short rather than every page
 * being reserved too tall.
 *
 * Close is what this needs to be. The point is a document roughly its
 * real height when the browser restores scroll, not a pixel match.
 */
export default function ShopGridSkeleton({ count }: { count: number }) {
  const cards = Math.max(0, Math.min(count, 25));

  return (
    <div aria-hidden className="relative z-10 mt-6 w-full max-w-6xl sm:mt-10">
      {/* Search, filters and the count, at their real height. */}
      <div className="shop-controls -mx-6 h-[202px] animate-pulse px-6 py-3 sm:mx-0 sm:h-[173px] sm:rounded-2xl sm:px-4" />

      <div className="mt-6 grid w-full grid-cols-2 gap-x-3 gap-y-6 sm:mt-14 sm:flex sm:flex-wrap sm:items-start sm:justify-center sm:gap-x-8 sm:gap-y-14">
        {Array.from({ length: cards }, (_, i) => (
          <div
            key={i}
            className="aspect-[165/335] w-full shrink-0 animate-pulse rounded-2xl border border-white/15 bg-white/5 sm:aspect-[320/525] sm:w-80"
          />
        ))}
      </div>
    </div>
  );
}
