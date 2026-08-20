"use client";

import Link from "next/link";
import { useRef, type PointerEvent } from "react";
import type { Artist } from "@/lib/artists";

export default function ArtistCard({ artist, delay = 0 }: { artist: Artist; delay?: number }) {
  const ref = useRef<HTMLAnchorElement>(null);

  function handlePointerMove(e: PointerEvent<HTMLAnchorElement>) {
    const el = ref.current;
    if (!el || e.pointerType === "touch") return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `rotate(${artist.rotate}deg) perspective(900px) rotateX(${(-py * 10).toFixed(2)}deg) rotateY(${(px * 10).toFixed(2)}deg) translateY(-6px) scale(1.03)`;
  }

  function handlePointerLeave() {
    const el = ref.current;
    if (!el) return;
    el.style.transform = `rotate(${artist.rotate}deg)`;
  }

  const [c1, c2, c3] = artist.gradient;
  const seed = artist.patternSeed;

  return (
    <Link
      ref={ref}
      href={`/art-collective/${artist.slug}`}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      style={
        {
          transform: `rotate(${artist.rotate}deg)`,
          animationDelay: `${delay}s`,
          "--accent": artist.accent,
        } as React.CSSProperties
      }
      className="artist-card event-float group relative block w-full max-w-sm shrink-0 overflow-hidden rounded-2xl border border-white/15 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.8)] transition-shadow duration-300 hover:shadow-[0_25px_65px_-15px_var(--accent)]"
    >
      <div className="relative h-44 w-full overflow-hidden" aria-hidden>
        <div className="absolute inset-0" style={{ background: `linear-gradient(160deg, ${c1}, ${c3})` }} />
        <div
          className="absolute rounded-full blur-2xl"
          style={{
            background: c2,
            width: "65%",
            height: "65%",
            top: "-15%",
            left: `${10 + seed * 15}%`,
            opacity: 0.8,
          }}
        />
        <div
          className="absolute rounded-full blur-2xl"
          style={{
            background: c3,
            width: "50%",
            height: "50%",
            bottom: "-20%",
            right: `${5 + seed * 10}%`,
            opacity: 0.7,
          }}
        />
        <div className="event-card-noise absolute inset-0" />
      </div>

      <div className="relative z-10 bg-black/70 p-5 text-left backdrop-blur-sm">
        <span className="text-flame-2 text-[0.65rem] font-semibold tracking-wide uppercase">
          {artist.medium}
        </span>
        <h3 className="font-display mt-1 text-2xl text-white">{artist.name}</h3>
        <p className="mt-1 text-sm text-white/70">{artist.tagline}</p>
        <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold tracking-wide text-white/90 uppercase transition-colors group-hover:text-white">
          View shop
          <span aria-hidden className="inline-block transition-transform group-hover:translate-x-1">
            →
          </span>
        </span>
      </div>
    </Link>
  );
}
