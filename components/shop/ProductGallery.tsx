"use client";

import { useRef, useState } from "react";
import ImageSwiper from "./ImageSwiper";

/**
 * The photographs on a product page.
 *
 * Swipe first, thumbnails second. The strip underneath was the only way
 * through the other shots, which is a desktop habit: on a phone the
 * gesture for "next photo" is a swipe across the picture itself, and a
 * row of 64px squares is both unobvious and a small target.
 *
 * Both, rather than one. The thumbnails still earn their place on a
 * wide screen, where there is no swipe to make and seeing all four at
 * once is faster than paging through them.
 */
export default function ProductGallery({ name, imageUrls }: { name: string; imageUrls: string[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  if (imageUrls.length === 0) {
    return (
      <div className="card-surface flex aspect-square items-center justify-center rounded-2xl">
        <span className="font-display text-3xl tracking-wide text-muted">WHOA</span>
      </div>
    );
  }

  function show(i: number) {
    const el = trackRef.current;
    if (!el) return;
    // Scrolling the track rather than setting an index: the swiper reads
    // its own scroll position, so moving the element is what keeps a
    // thumbnail press and a swipe telling the same story.
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  }

  return (
    <div>
      <ImageSwiper
        urls={imageUrls}
        alt={name}
        aspect="aspect-square"
        eager
        trackRef={trackRef}
        onIndexChange={setActive}
      />

      {imageUrls.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {imageUrls.map((url, i) => (
            <button
              key={url}
              type="button"
              onClick={() => show(i)}
              aria-label={`Show photo ${i + 1} of ${imageUrls.length}`}
              aria-current={active === i}
              className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                active === i ? "border-flame-2" : "border-transparent opacity-70 hover:opacity-100"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt=""
                loading="lazy"
                decoding="async"
                width={96}
                height={96}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
