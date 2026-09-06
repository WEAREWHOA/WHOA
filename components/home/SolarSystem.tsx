"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

interface Planet {
  label: string;
  href: string;
  accent: string;
  /**
   * Diameter as a fraction of `--whoa-planet` (set on the container below).
   * Relative rather than absolute so every planet grows and shrinks with the
   * viewport together, keeping the size pecking order intact.
   */
  scale: number;
}

// The whole homepage, deliberately: six places a customer actually needs.
// Everything else (games, the register, the backend portal) lives one level
// in, off the pages below — the hub stays a hub rather than a directory.
const PLANETS: Planet[] = [
  { label: "SHOP WHOADEGA", href: "/shop", accent: "#29e6ff", scale: 1 },
  { label: "EVENTS", href: "/events", accent: "#ff8a29", scale: 0.82 },
  { label: "ART COLLECTIVE", href: "/art-collective", accent: "#fff229", scale: 0.88 },
  { label: "MUSIC COLLECTIVE", href: "/music-collective", accent: "#baff29", scale: 0.88 },
  { label: "JOIN", href: "/join", accent: "#ff2fb0", scale: 0.76 },
  { label: "ABOUT", href: "/about", accent: "#b829ff", scale: 0.76 },
];

// One shared angular velocity for every planet, so the angular gap between
// any two never changes — they drift as a formation and can never converge
// into each other, whatever radius each one lands on.
const ANGULAR_SPEED = 0.000022;

const DEFAULT_SIZE = { width: 1200, height: 800 };
const DEFAULT_SUN_RADIUS = 110;
const DEFAULT_PLANET_RADIUS = 36;

/**
 * Room a planet's own label needs around it, plus how far the innermost
 * orbit sits off the sun. A phone gets tighter numbers because its labels
 * wrap to two narrow lines (see `max-w` below) instead of running on one
 * long line — without that the outermost orbit would have to hug the middle
 * of the screen to keep "MUSIC COLLECTIVE" from clipping off the edge.
 */
function metrics(width: number) {
  const compact = width < 640;
  return {
    // Half a label's width, near enough — this is the clearance the
    // outermost orbit leaves so a label centred under its planet still
    // lands inside the viewport instead of running off the edge.
    labelMarginX: compact ? 56 : 120,
    labelMarginY: compact ? 60 : 78,
    // Enough that a label sitting between its planet and the sun still
    // clears the sun's outer glow, not just its disc. A phone gets a
    // smaller gap because 195px of half-screen has to hold the sun, the
    // gap, the planet and its label — a desktop-sized gap would push the
    // innermost orbit past the edge and take every label with it.
    sunGap: compact ? 44 : 96,
  };
}

/**
 * Evenly spaces the six orbits between the sun's edge and whatever room the
 * viewport actually has, rather than using fixed radii that would overflow a
 * phone or huddle in the middle of a desktop. X and Y are solved separately,
 * so a tall narrow screen simply gets tall narrow ellipses.
 *
 * `planetRadius` is measured rather than assumed so that resizing the planets
 * pushes the orbits out to match, instead of walking them into the sun at one
 * end and off the screen edge at the other.
 */
function orbitRadii(size: { width: number; height: number }, sunRadius: number, planetRadius: number) {
  const { labelMarginX, labelMarginY, sunGap } = metrics(size.width);
  const innermost = sunRadius + sunGap + planetRadius;
  const maxX = Math.max(innermost, size.width / 2 - labelMarginX - planetRadius);
  const maxY = Math.max(innermost, size.height / 2 - labelMarginY - planetRadius);
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
    let planetRadius = DEFAULT_PLANET_RADIUS;

    function measure() {
      const rect = container!.getBoundingClientRect();
      size = { width: rect.width, height: rect.height };
      if (sunRef.current) sunRadius = sunRef.current.getBoundingClientRect().width / 2;

      // Every planet wrapper is sized to its own body, so the widest one is
      // the clearance the outermost orbit has to leave at the screen edge.
      planetRadius = planetRefs.current.reduce((widest, el) => {
        if (!el) return widest;
        return Math.max(widest, el.getBoundingClientRect().width / 2);
      }, 0) || DEFAULT_PLANET_RADIUS;

      // Rings only change with the viewport, so they're sized here rather
      // than every frame alongside the planets.
      const radii = orbitRadii(size, sunRadius, planetRadius);
      radii.forEach(({ radiusX, radiusY }, i) => {
        const ring = ringRefs.current[i];
        if (!ring) return;
        ring.style.width = `${radiusX * 2}px`;
        ring.style.height = `${radiusY * 2}px`;
      });
    }

    function place(t: number) {
      const radii = orbitRadii(size, sunRadius, planetRadius);
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
    <div
      ref={containerRef}
      className="absolute inset-0"
      style={{ ["--whoa-planet" as string]: "clamp(44px, 7.5vw, 72px)" }}
    >
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
        style={{ width: "clamp(104px, 22vw, 220px)", height: "clamp(104px, 22vw, 220px)" }}
      >
        <div className="whoa-sphere-spin absolute inset-0 rounded-full" aria-hidden />
        {/* A star, not a planet — lit from the middle out, where
            .whoa-sphere-shade would light it from one side like a moon. */}
        <div className="whoa-sun-core absolute inset-0 rounded-full" aria-hidden />

        <div className="relative z-10 flex w-[82%] flex-col items-center text-center">
          {/* Sized off the same viewport width the sun itself is clamped
              to, so the wordmark scales with the disc instead of spilling
              out of it once the sun shrinks on a phone. */}
          <h1 className="font-display leading-[0.9] tracking-wide whitespace-nowrap text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.75)] text-[clamp(1.6rem,5.5vw,3rem)]">
            WHOA.
          </h1>
          <p className="mt-1.5 leading-tight font-semibold tracking-[0.18em] whitespace-nowrap text-white/85 uppercase text-[clamp(0.4rem,1.2vw,0.65rem)]">
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
          style={{ width: `calc(var(--whoa-planet) * ${planet.scale})` }}
        >
          {/* The link's own box is just the planet body, so the body lands
              exactly on its orbit ring; the label hangs off it absolutely,
              still inside the <a> and so still part of the same tap target,
              without pulling the body off the ring to make room for itself. */}
          <Link
            href={planet.href}
            className="pointer-events-auto group relative block aspect-square w-full rounded-full focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-white"
          >
            <span
              className="block h-full w-full rounded-full transition-transform duration-300 group-hover:scale-110"
              style={{
                background: `radial-gradient(circle at 32% 28%, #ffffff, ${planet.accent} 58%, ${planet.accent}44)`,
                boxShadow: `0 0 30px -2px ${planet.accent}, 0 0 60px -10px ${planet.accent}`,
              }}
              aria-hidden
            />

            {/* Wraps to two narrow lines on a phone and runs on one line from
                `sm` up — a long label like "MUSIC COLLECTIVE" would otherwise
                need more horizontal room than a 390px screen has to spare at
                the outer edge of its orbit. */}
            <span
              className="font-display absolute top-full left-1/2 mt-2 block w-[104px] -translate-x-1/2 text-center text-[0.8rem] leading-[1.15] tracking-[0.12em] sm:w-auto sm:text-xl sm:whitespace-nowrap"
              style={{ color: planet.accent, textShadow: "0 2px 12px rgba(0,0,0,0.95)" }}
            >
              {planet.label}
            </span>
          </Link>
        </div>
      ))}
    </div>
  );
}
