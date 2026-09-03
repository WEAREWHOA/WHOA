"use client";

import { useState } from "react";

export default function ProductGallery({ name, imageUrls }: { name: string; imageUrls: string[] }) {
  const [active, setActive] = useState(0);

  if (imageUrls.length === 0) {
    return (
      <div className="card-surface flex aspect-square items-center justify-center rounded-2xl">
        <span className="font-display text-3xl tracking-wide text-muted">WHOA</span>
      </div>
    );
  }

  return (
    <div>
      <div className="card-surface aspect-square overflow-hidden rounded-2xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrls[active]}
          alt={name}
          className="h-full w-full object-cover"
        />
      </div>

      {imageUrls.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {imageUrls.map((url, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Show photo ${i + 1} of ${imageUrls.length}`}
              aria-current={active === i}
              className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                active === i ? "border-flame-2" : "border-transparent opacity-70 hover:opacity-100"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
