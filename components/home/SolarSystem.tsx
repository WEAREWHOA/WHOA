"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

interface Planet {
  label: string;
  caption: string;
  href: string;
  accent: string;
  /** Diameter of the planet body in px. */
  size: number;
}

// The whole homepage, deliberately: six places a customer actually needs.
// Everything else (games, the register, the backend portal) lives one level
// in, off the pages below — the hub stays a hub rather than a directory.
const PLANETS: Planet[] = [
  { label: "SHOP WHOADEGA", caption: "The store", href: "/shop", accent: "#29e6ff", size: 30 },
  { label: "EVENTS", caption: "What's coming up", href: "/events", accent: "#ff8a29", size: 24 },
  { label: "ART COLLECTIVE", caption: "The artists", href: "/art-collective", accent: "#fff229", size: 26 },
  { label: "MUSIC COLLECTIVE", caption: "The sound", href: "/music-collective", accent: "#baff29", size: 26 },
  { label: "JOIN", caption: "Be part of it", href: "/join", accent: "#ff2fb0", size: 22 },
  { label: "ABOUT", caption: "Who we are", href: "/about", accent: "#b829ff", size: 22 },
];

// One shared angular velocity for every planet, so the angular gap between
// any two never changes — they drift as a formation and can never converge
// into each other, whatever radius each one lands on.
const ANGULAR_SPEED = 0.000022;

const DEFAULT_SIZE = { width: 1200, height: 800 };
const DEFAULT_SUN_RADIUS = 110;

/**
 * Room a planet's own label needs around it, plus how far the innermost
 * orbit sits off the sun. A phone gets tighter numbers because its labels
 * wrap to two narrow lines (see `max-w-[86px]` below) instead of running on
 * one long line — without that the outermost orbit would have to hug the
 * middle of the screen to keep "MUSIC COLLECTIVE" from clipping off the edge.
 */
function metrics(width: number) {
  const compact = width < 640;
  return {
    labelMarginX: compact ? 56 : 100,
    labelMarginY: compact ? 62 : 64,
    // Enough that a label sitting between its planet and the sun still
    // clears the sun's outer glow, not just its disc.
    sunGap: compact ? 74 : 96,
  };
}

/**
 * Evenly spaces the six orbits between the sun's edge and whatever room the
 * viewport actually has, rather than using fixed radii that would overflow a
 * phone or huddle in the middle of a desktop. X and Y are solved separately,
 * so a tall narrow screen simply gets tall narrow ellipses.
 */
function orbitRadii(size: { width: number; height: number }, sunRadius: number) {
  const { labelMarginX, labelMarginY, sunGap } = metrics(size.width);
  const innermost = sunRadius + sunGap;
  const maxX = Math.max(innermost, size.width / 2 - labelMarginX);
  const maxY = Math.max(innermost, size.height / 2 - labelMarginY);
  const last = Math.max(1, PLANETS.length - 1);

  return PLANETS.map((_, i) => ({
    radiusX: innermost + ((maxX - innermost) * i) / last,
    radiusY: innermost + ((maxY - innermost) * i) / last,
  }));
}

export default function SolarSystem() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sunRef = useRef<HTMLDivElement>(null);
  const planetRefs = useRef<(HTMLDivElement | null)[]>([]);
  const ringRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let size = DEFAULT_SIZE;
    let sunRadius = DEFAULT_SUN_RADIUS;

    function measure() {
      const rect = container!.getBoundingClientRect();
      size = { width: rect.width, height: rect.height };
      if (sunRef.current) sunRadius = sunRef.current.getBoundingClientRect().width / 2;

      // Rings only change with the viewport, so they're sized here rather
      // than every frame alongside the planets.
      const radii = orbitRadii(size, sunRadius);
      radii.forEach(({ radiusX, radiusY }, i) => {
        const ring = ringRefs.current[i];
        if (!ring) return;
        ring.style.width = `${radiusX * 2}px`;
        ring.style.height = `${radiusY * 2}px`;
      });
    }

    function place(t: number) {
      const radii = orbitRadii(size, sunRadius);
      PLANETS.forEach((_, i) => {
        const el = planetRefs.current[i];
        if (!el) return;
        // Start every planet at its own angle around the dial, then move
        // them all together — an even spread that stays even.
        const angle = (i / PLANETS.length) * Math.PI * 2 + t * ANGULAR_SPEED;
        const { radiusX, radiusY } = radii[i];
        el.style.transform = `translate(${Math.cos(angle) * radiusX}px, ${Math.sin(angle) * radiusY}px)`;
      });
    }

    measure();
    window.addEventListener("resize", measure);

    let raf = 0;
    function tick(t: number) {
      place(t);
      raf = requestAnimationFrame(tick);
    }

    if (reduceMotion) {
      place(0);
    } else {
      raf = requestAnimationFrame(tick);
    }

    return () => {
      window.removeEventListener("resize", measure);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0">
      {/* Orbit paths. Purely decorative — the planets themselves are the
          links, so these never take a tap that was meant for a planet. */}
      {PLANETS.map((planet, i) => (
        <div
          key={`ring-${planet.href}`}
          ref={(el) => {
            ringRefs.current[i] = el;
          }}
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-[50%] border"
          style={{ borderColor: `${planet.accent}26` }}
        />
      ))}

      <div
        ref={sunRef}
        className="whoa-sphere absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full"
        style={{ width: "clamp(120px, 22vw, 220px)", height: "clamp(120px, 22vw, 220px)" }}
      >
        <div className="whoa-sphere-spin absolute inset-0 rounded-full" aria-hidden />
        {/* A star, not a planet — lit from the middle out, where
            .whoa-sphere-shade would light it from one side like a moon. */}
        <div className="whoa-sun-core absolute inset-0 rounded-full" aria-hidden />

        <div className="relative z-10 flex w-[82%] flex-col items-center text-center">
          <h1 className="font-display text-4xl leading-[0.9] tracking-wide text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.75)] sm:text-5xl">
            WHOA.
          </h1>
          <p className="mt-1.5 text-[0.55rem] leading-tight font-semibold tracking-[0.18em] text-white/85 uppercase sm:text-[0.65rem]">
            Pick a planet
          </p>
        </div>
      </div>

      {PLANETS.map((planet, i) => (
        <div
          key={planet.href}
          ref={(el) => {
            planetRefs.current[i] = el;
          }}
          className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        >
          {/* The link's own box is just the planet body, so the body lands
              exactly on its orbit ring; the label hangs off it absolutely,
              still inside the <a> and so still part of the same tap target,
              without pulling the body off the ring to make room for itself. */}
          <Link
            href={planet.href}
            className="pointer-events-auto group relative flex items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-white"
            style={{ width: planet.size, height: planet.size }}
          >
            <span
              className="block h-full w-full rounded-full transition-transform duration-300 group-hover:scale-125"
              style={{
                background: `radial-gradient(circle at 32% 28%, #ffffff, ${planet.accent} 58%, ${planet.accent}44)`,
                boxShadow: `0 0 22px -2px ${planet.accent}, 0 0 44px -8px ${planet.accent}`,
              }}
              aria-hidden
            />

            {/* Wraps to two narrow lines on a phone and runs on one line from
                `sm` up — a long label like "MUSIC COLLECTIVE" would otherwise
                need more horizontal room than a 390px screen has to spare at
                the outer edge of its orbit. */}
            <span className="absolute top-full left-1/2 mt-1.5 flex w-[86px] -translate-x-1/2 flex-col items-center text-center sm:w-auto">
              <span
                className="font-display text-[0.7rem] leading-[1.1] tracking-[0.12em] sm:text-sm sm:whitespace-nowrap"
                style={{ color: planet.accent, textShadow: "0 2px 12px rgba(0,0,0,0.95)" }}
              >
                {planet.label}
              </span>
              <span className="mt-1 text-[0.55rem] leading-[1.1] text-white/60 sm:text-[0.65rem] sm:whitespace-nowrap">
                {planet.caption}
              </span>
            </span>
          </Link>
        </div>
      ))}
    </div>
  );
}
