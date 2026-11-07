"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

/**
 * Follow the smoke.
 *
 * Below the solar system, a trail curls down the page. It draws itself
 * as you scroll, so the smoke is always a little ahead of where you are
 * and there is always more of it below: that is the whole mechanism,
 * and it is what makes somebody keep going. At the bottom it arrives at
 * the rocket, parked beside a planet that goes somewhere.
 *
 * The scroll position drives a stroke-dashoffset rather than a class
 * being toggled at a threshold. A threshold makes the trail appear;
 * this makes it unroll, which is the difference between a decoration
 * and a thing to follow.
 */

/**
 * The path, in a 100 by 3000 box that stretches to whatever height the
 * section gets. It crosses back and forth rather than running straight
 * down a margin, which on a wide screen reads as a border.
 *
 * Nine bends over three thousand units, where it used to be three over
 * one thousand. The box and the section both grew by the same factor,
 * so each curve still takes up the same amount of screen as before and
 * the only thing that changed is how far there is to go. Stretching the
 * old path instead would have given the same three bends pulled over
 * three times the height, which is a nearly straight line with a kink
 * in it.
 *
 * The numbers lean different amounts on purpose. Nine identical S-bends
 * read as a repeated motif; these read as something drifting.
 *
 * The last bend is the exception: its second control point sits on the
 * centre line, so the trail arrives straight down rather than sweeping
 * in from one side. Coming in at an angle, the end of a wide stroke
 * lands beside the engine instead of on it, and the smoke reads as
 * something passing the rocket rather than coming out of it.
 */
const TRAIL =
  "M 50 0 C 20 123, 82 213, 50 333 C 18 457, 85 547, 50 667 C 24 790, 78 880, 50 1000 " +
  "C 16 1123, 88 1213, 50 1333 C 26 1457, 74 1547, 50 1667 C 19 1790, 84 1880, 50 2000 " +
  "C 22 2123, 80 2213, 50 2333 C 15 2457, 86 2547, 50 2667 C 25 2790, 50 2900, 50 3000";

export default function RocketTrail() {
  const section = useRef<HTMLDivElement>(null);
  const path = useRef<SVGPathElement>(null);
  const [progress, setProgress] = useState(0);
  // Measured once, in an effect, rather than read off the ref while
  // rendering: the first render has no element to measure, and reading
  // a ref during render is how a component stops updating when you
  // expect it to. The fallback is close enough to this path's real
  // length that the opening frame is not visibly wrong.
  const [length, setLength] = useState(7200);

  useEffect(() => {
    // In viewBox units, not pixels: preserveAspectRatio="none" stretches
    // the box to the section, so this number does not change with the
    // viewport and never needs measuring again.
    if (path.current) setLength(path.current.getTotalLength());

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      // Everything, at once. Somebody who has asked for less movement
      // should still get the picture rather than an empty box.
      setProgress(1);
      return;
    }

    let frame = 0;
    function update() {
      frame = 0;
      const el = section.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      // Zero when the section's top is at the bottom of the screen, one
      // when its own bottom gets there.
      //
      // Measured against the section's height rather than its height
      // plus a screen, which was the first version and could never
      // finish: that asks for the section to scroll clear off the top,
      // and this is the last thing on the page, so there is nothing
      // below to scroll it with. The trail stopped three quarters drawn
      // and the rocket never arrived.
      const span = Math.max(rect.height, 1);
      const travelled = window.innerHeight - rect.top;
      setProgress(Math.min(Math.max(travelled / span, 0), 1));
    }

    function onScroll() {
      // One update a frame. Scroll fires far more often than the screen
      // redraws, and setting state on every one of them is how a smooth
      // page starts to stutter on a phone.
      if (!frame) frame = requestAnimationFrame(update);
    }

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  // The trail is drawn in the first three quarters of the scroll, so it
  // has finished arriving by the time the rocket needs to be looked at.
  const drawn = Math.min(progress / 0.75, 1);
  // And the rocket lands in the last quarter.
  const arrival = Math.max((progress - 0.7) / 0.3, 0);

  return (
    <section
      ref={section}
      aria-labelledby="whoa-next"
      className="relative z-10 w-full overflow-hidden px-6 pt-10 pb-24 sm:pt-16"
    >
      {/* The trail. Decorative: everything it means is said in words at
          the bottom of the section. */}
      <div aria-hidden className="pointer-events-none relative mx-auto h-[210vh] w-full max-w-xl sm:h-[270vh]">
        <svg
          viewBox="0 0 100 3000"
          preserveAspectRatio="none"
          className="h-full w-full overflow-visible"
        >
          <defs>
            <linearGradient id="whoa-smoke" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.02" />
              <stop offset="55%" stopColor="#ffb37a" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#ff7a00" stopOpacity="0.85" />
            </linearGradient>
          </defs>

          {/* Two strokes on one path: a wide soft one for the body of
              the smoke and a narrow bright one for its core. One stroke
              alone reads as a drawn line rather than as something left
              behind. */}
          <path
            d={TRAIL}
            fill="none"
            stroke="url(#whoa-smoke)"
            className="whoa-trail-soft"
            strokeLinecap="round"
            style={{
              strokeDasharray: length,
              strokeDashoffset: length * (1 - drawn),
            }}
          />
          <path
            ref={path}
            d={TRAIL}
            fill="none"
            stroke="url(#whoa-smoke)"
            className="whoa-trail-core"
            strokeLinecap="round"
            style={{
              strokeDasharray: length,
              strokeDashoffset: length * (1 - drawn),
            }}
          />
        </svg>
      </div>

      {/* What the trail arrives at.

          The rocket is centred in the same box the trail is drawn in,
          so the smoke leaves its engine rather than running down beside
          it. The planet hangs off to the right rather than sharing a
          flex row, which would push the rocket off-centre and break
          that join. */}
      <div
        className="relative mx-auto -mt-16 w-full max-w-xl transition-all duration-700 sm:-mt-20"
        style={{
          opacity: arrival,
          transform: `translateY(${(1 - arrival) * 40}px)`,
        }}
      >
        <div className="flex justify-center">
          <Rocket />
        </div>

        {/* The planet, now a way in rather than a locked door.

            It carries no name on purpose. Somebody who follows the
            smoke all the way down has earned a thing that does not
            explain itself, and a planet labelled with its destination
            is just a nav link with a sphere on it. The accessible
            name has to say more than "???" though, because a screen
            reader user gets no payoff from a mystery they cannot
            see the shape of. */}
        <Link
          href="/mystery"
          aria-label="Open the mystery world map"
          className="whoa-planet-link absolute right-0 bottom-6 flex flex-col items-center text-center sm:bottom-10"
        >
          <span
            className="whoa-sphere whoa-coming-soon relative block rounded-full"
            style={{ width: "clamp(80px, 18vw, 140px)", height: "clamp(80px, 18vw, 140px)" }}
          >
            <span className="whoa-sphere-shade absolute inset-0 rounded-full" aria-hidden />
          </span>
          <span
            id="whoa-next"
            aria-hidden
            className="font-display mt-3 inline-flex items-center gap-1.5 text-sm tracking-[0.3em] text-white sm:text-base"
          >
            ???
          </span>
        </Link>
      </div>
    </section>
  );
}

/**
 * The rocket, with the word on its side.
 *
 * Drawn rather than an image so the name is text in the markup and
 * stays sharp at any size, and so the flame can flicker without a
 * second file.
 */
function Rocket() {
  return (
    <svg
      viewBox="0 0 120 220"
      role="img"
      aria-label="A rocket with WHOA written on it, coming in to land"
      className="h-44 w-auto shrink-0 drop-shadow-[0_10px_30px_rgba(255,122,0,0.35)] sm:h-56"
    >
      <defs>
        <linearGradient id="whoa-rocket-body" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#8d8d94" />
          <stop offset="38%" stopColor="#f7f0e6" />
          <stop offset="100%" stopColor="#6f6f77" />
        </linearGradient>
        {/* Bottom to top: brightest where it leaves the engine, fading
            out into the smoke above it. */}
        <linearGradient id="whoa-rocket-flame" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#fff229" />
          <stop offset="55%" stopColor="#ff7a00" />
          <stop offset="100%" stopColor="#ff2f1a" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Nose down and burning upwards, because it is coming in to land
          rather than leaving. That is also what puts the engine at the
          top, where the smoke trail arrives. */}
      <path d="M32 88 C 10 70, 10 52, 18 38 L 32 52 Z" fill="#ff2f1a" />
      <path d="M88 88 C 110 70, 110 52, 102 38 L 88 52 Z" fill="#ff2f1a" />

      <path
        d="M60 216 C 84 184, 92 142, 92 104 C 92 74, 86 52, 78 38 L 42 38 C 34 52, 28 74, 28 104 C 28 142, 36 184, 60 216 Z"
        fill="url(#whoa-rocket-body)"
        stroke="#2b2b31"
        strokeWidth="2"
      />

      <circle cx="60" cy="158" r="15" fill="#0b1b24" stroke="#2b2b31" strokeWidth="2" />
      <circle cx="55" cy="153" r="5" fill="#29e6ff" opacity="0.65" />

      <path d="M30 70 L 90 70" stroke="#2b2b31" strokeWidth="2" opacity="0.4" />

      {/* The name, upright, whichever way the rocket is pointing. */}
      <text
        x="60"
        y="104"
        textAnchor="middle"
        className="font-display"
        fill="#1a1510"
        fontSize="19"
        letterSpacing="1.5"
      >
        WHOA
      </text>

      <g className="whoa-rocket-flame">
        <path
          d="M46 36 C 52 14, 56 8, 60 0 C 64 8, 68 14, 74 36 Z"
          fill="url(#whoa-rocket-flame)"
        />
      </g>
    </svg>
  );
}
