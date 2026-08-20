"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import FlamingoIcon from "@/components/home/FlamingoIcon";

interface FlamingoDef {
  label: string;
  href: string;
  accent: string;
}

const FLAMINGOS: FlamingoDef[] = [
  { label: "BRAND AMBASSADORS", href: "/ambassadors", accent: "#ff2fb0" },
  { label: "SAME SAME BUT WHOA", href: "/same-same-but-whoa", accent: "#7b2ff7" },
  { label: "SHOP THE WHOADEGA", href: "/shop", accent: "#29e6ff" },
  { label: "MUSIC COLLECTIVE", href: "/music-collective", accent: "#baff29" },
  { label: "ART COLLECTIVE", href: "/art-collective", accent: "#fff229" },
  { label: "EVENTS", href: "/events", accent: "#ff8a29" },
];

function wanderPosition(i: number, t: number) {
  const freqX = 0.6 + i * 0.11;
  const freqY = 0.5 + i * 0.13;
  const phaseX = i * 1.7;
  const phaseY = i * 2.3;
  const xFrac = 0.5 + 0.4 * Math.sin(t * 0.00015 * freqX + phaseX);
  const yFrac = 0.5 + 0.36 * Math.cos(t * 0.00013 * freqY + phaseY);
  return { xFrac, yFrac };
}

export default function Pond() {
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    let raf = 0;

    function tick(t: number) {
      FLAMINGOS.forEach((_, i) => {
        const el = itemRefs.current[i];
        if (!el) return;
        const { xFrac, yFrac } = wanderPosition(i, t);
        const prevX = Number(el.dataset.px ?? xFrac);
        el.dataset.px = String(xFrac);
        el.style.left = `${xFrac * 100}%`;
        el.style.top = `${yFrac * 100}%`;
        el.style.transform = xFrac < prevX ? "scaleX(-1)" : "scaleX(1)";
      });
      raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="pond relative mx-auto mt-10 h-[62vh] w-full max-w-5xl overflow-hidden rounded-[3rem]">
      <div className="pond-water absolute inset-0" aria-hidden />
      <div className="pond-ripple absolute inset-0" aria-hidden />

      {FLAMINGOS.map((f, i) => {
        const { xFrac, yFrac } = wanderPosition(i, 0);
        return (
          <div
            key={f.href}
            ref={(el) => {
              itemRefs.current[i] = el;
            }}
            className="absolute"
            style={
              {
                left: `${xFrac * 100}%`,
                top: `${yFrac * 100}%`,
                transform: "scaleX(1)",
              } as React.CSSProperties
            }
          >
            <Link
              href={f.href}
              style={{ "--accent": f.accent } as React.CSSProperties}
              className="flamingo-btn group block translate-x-[-50%] translate-y-[-50%] scale-100 transition-[scale,filter] duration-300 hover:scale-[1.14] hover:drop-shadow-[0_0_30px_var(--accent)] focus-visible:scale-[1.14] focus-visible:drop-shadow-[0_0_30px_var(--accent)] focus-visible:outline-none"
            >
              <FlamingoIcon accent={f.accent} label={f.label} />
            </Link>
          </div>
        );
      })}
    </div>
  );
}
