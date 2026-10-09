"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, type PointerEvent } from "react";
import type { Musician } from "@/lib/musicians";

export default function MusicianCard({ musician, delay = 0 }: { musician: Musician; delay?: number }) {
  const ref = useRef<HTMLAnchorElement>(null);

  function handlePointerMove(e: PointerEvent<HTMLAnchorElement>) {
    const el = ref.current;
    if (!el || e.pointerType === "touch") return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `rotate(${musician.rotate}deg) perspective(900px) rotateX(${(-py * 10).toFixed(2)}deg) rotateY(${(px * 10).toFixed(2)}deg) translateY(-6px) scale(1.03)`;
  }

  function handlePointerLeave() {
    const el = ref.current;
    if (!el) return;
    el.style.transform = `rotate(${musician.rotate}deg)`;
  }

  const [c1, c2, c3] = musician.gradient;
  const seed = musician.patternSeed;
  const photo = musician.photos?.[0];
  const local = photo?.startsWith("/") ?? false;

  return (
    <Link
      ref={ref}
      href={`/music-collective/${musician.slug}`}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      style={
        {
          transform: `rotate(${musician.rotate}deg)`,
          animationDelay: `${delay}s`,
          "--accent": musician.accent,
        } as React.CSSProperties
      }
      className="artist-card event-float group relative block w-full max-w-sm shrink-0 overflow-hidden rounded-2xl border border-white/15 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.8)] transition-shadow duration-300 hover:shadow-[0_25px_65px_-15px_var(--accent)]"
    >
      {/* Taller than it was, because it holds a photograph now rather
          than a wash of colour. The gradient stays underneath: it's what
          an artist without photos still gets, and what fills the frame
          while a photo loads. */}
      <div className="relative h-56 w-full overflow-hidden" aria-hidden>
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
        {/* A local file under /public goes through next/image; an
            uploaded one does not, because it is served from Supabase
            Storage and next/image refuses a remote host that isn't in
            remotePatterns. Same split as the blog's cover images, and
            the same local-or-not test the artist page uses to decide
            whether a link opens in a new tab. */}
        {photo && local && (
          <Image
            src={photo}
            alt=""
            fill
            // The card is max-w-sm, so one column's worth on any screen.
            sizes="(max-width: 640px) 100vw, 384px"
            // Biased above centre: these are portraits and press shots,
            // and a face sits in the upper third of nearly all of them.
            // Dead centre crops foreheads.
            className="object-cover object-[center_30%]"
            priority={false}
          />
        )}
        {photo && !local && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover object-[center_30%]"
          />
        )}
        <div className="event-card-noise absolute inset-0" />
      </div>

      <div className="relative z-10 bg-black/70 p-5 text-left backdrop-blur-sm">
        <span className="text-flame-2 text-[0.65rem] font-semibold tracking-wide uppercase">
          {musician.subgenre}
        </span>
        <h3 className="font-display mt-1 text-2xl text-white">{musician.name}</h3>
        <p className="mt-1 text-sm text-white/70">{musician.tagline}</p>
        <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold tracking-wide text-white/90 uppercase transition-colors group-hover:text-white">
          View artist
          <span aria-hidden className="inline-block transition-transform group-hover:translate-x-1">
            →
          </span>
        </span>
      </div>
    </Link>
  );
}
