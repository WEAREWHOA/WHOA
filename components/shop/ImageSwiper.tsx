"use client";

import { useRef, useState, type RefObject, type UIEvent } from "react";

/**
 * Photographs you swipe through, in place.
 *
 * The product page stacked its other shots underneath as thumbnails,
 * which is a desktop idea: on a phone the gesture for "show me the
 * next one" is a swipe, and a row of 64px squares under the fold is
 * neither obvious nor easy to hit.
 *
 * Built on scroll snapping rather than a slider library. The browser
 * already does momentum, rubber-banding and the trackpad gesture
 * properly, and anything hand-written here would be a worse version of
 * all three that also has to ship.
 *
 * Used on the grid card as well, where it has to live inside a <Link>:
 * a swipe scrolls and a tap still opens the product, because scrolling
 * never raises a click.
 */
export default function ImageSwiper({
  urls,
  alt,
  aspect,
  eager = false,
  rounded = "rounded-2xl",
  showDots = true,
  onIndexChange,
  trackRef,
}: {
  urls: string[];
  alt: string;
  /** A Tailwind aspect class, so the caller owns the shape. */
  aspect: string;
  /** True on the product page, where this is the thing the page is about. */
  eager?: boolean;
  rounded?: string;
  showDots?: boolean;
  /** Reported so a thumbnail strip can follow along. */
  onIndexChange?: (i: number) => void;
  /**
   * Handed in by a caller that also wants to drive the track, like the
   * product page's thumbnails. Given rather than taken, so scrolling
   * from outside is a method call on a real element instead of a prop
   * this component has to reconcile against its own scroll position.
   */
  trackRef?: RefObject<HTMLDivElement | null>;
}) {
  const ownRef = useRef<HTMLDivElement>(null);
  const track = trackRef ?? ownRef;
  const [active, setActive] = useState(0);

  // Driven from the scroll position rather than from a click, so a
  // swipe, a trackpad flick and a thumbnail press all end up agreeing
  // about which photo is showing.
  function handleScroll(e: UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    const next = Math.round(el.scrollLeft / el.clientWidth);
    if (next === active || next < 0 || next >= urls.length) return;
    setActive(next);
    onIndexChange?.(next);
  }

  return (
    <div className={`bg-surface-raised relative overflow-hidden ${rounded} ${aspect}`}>
      <div
        ref={track}
        onScroll={handleScroll}
        className="swipe-track h-full w-full"
        // Only a carousel when there is something to swipe to. One
        // photo in a scroll container is a scroll container that does
        // nothing and still eats the gesture.
        style={urls.length > 1 ? undefined : { overflowX: "hidden" }}
      >
        {urls.map((url, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={url}
            src={url}
            alt={i === 0 ? alt : ""}
            loading={eager && i === 0 ? "eager" : "lazy"}
            fetchPriority={eager && i === 0 ? "high" : undefined}
            decoding="async"
            width={800}
            height={800}
            className="h-full w-full shrink-0 snap-start object-cover"
          />
        ))}
      </div>

      {showDots && urls.length > 1 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center gap-1.5">
          {urls.map((url, i) => (
            <span
              key={url}
              className={`h-1.5 rounded-full transition-all ${
                i === active ? "w-4 bg-white" : "w-1.5 bg-white/50"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
