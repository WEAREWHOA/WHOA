"use client";

import { useEffect, useRef } from "react";
import HubButton from "@/components/home/HubButton";

interface HubStop {
  label: string;
  href: string;
  accent: string;
  rotate: number;
  big?: boolean;
}

const STOPS: HubStop[] = [
  { label: "BRAND AMBASSADORS", href: "/ambassadors", accent: "#ff2fb0", rotate: -4 },
  { label: "SAME SAME BUT WHOA", href: "/same-same-but-whoa", accent: "#7b2ff7", rotate: 3 },
  { label: "SHOP THE WHOADEGA", href: "/shop", accent: "#29e6ff", rotate: -2, big: true },
  { label: "MUSIC COLLECTIVE", href: "/music-collective", accent: "#baff29", rotate: 5 },
  { label: "ART COLLECTIVE", href: "/art-collective", accent: "#fff229", rotate: -5 },
  { label: "EVENTS", href: "/events", accent: "#ff8a29", rotate: 4 },
  { label: "WHOA", href: "/whoa", accent: "#ffffff", rotate: 0, big: true },
];

const ORBITS = STOPS.map((_, i) => {
  const ring = i % 2;
  return {
    radiusXFrac: ring === 0 ? 0.33 : 0.45,
    radiusYFrac: ring === 0 ? 0.24 : 0.33,
    speed: (i % 2 === 0 ? 1 : -1) * (0.00008 + (i % 4) * 0.00002),
    phase: (i / STOPS.length) * Math.PI * 2,
    wobbleAmp: 0.07 + (i % 3) * 0.03,
    wobbleSpeed: 0.00035 + i * 0.00004,
  };
});

export default function OrbitField() {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const sizeRef = useRef({ width: 1200, height: 800 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function measure() {
      const rect = container!.getBoundingClientRect();
      sizeRef.current = { width: rect.width, height: rect.height };
    }

    measure();
    window.addEventListener("resize", measure);

    function place(t: number) {
      const { width, height } = sizeRef.current;
      ORBITS.forEach((o, i) => {
        const el = itemRefs.current[i];
        if (!el) return;
        const angle = o.phase + t * o.speed;
        const wobble = 1 + o.wobbleAmp * Math.sin(t * o.wobbleSpeed + o.phase);
        const x = Math.cos(angle) * o.radiusXFrac * width * wobble;
        const y = Math.sin(angle) * o.radiusYFrac * height * wobble;
        el.style.transform = `translate(${x}px, ${y}px)`;
      });
    }

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
    <div ref={containerRef} className="pointer-events-none absolute inset-0">
      {STOPS.map((stop, i) => (
        <div
          key={stop.href}
          ref={(el) => {
            itemRefs.current[i] = el;
          }}
          className="pointer-events-auto absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        >
          <HubButton
            href={stop.href}
            label={stop.label}
            accent={stop.accent}
            rotate={stop.rotate}
            big={stop.big}
            delay={i * 0.35}
          />
        </div>
      ))}
    </div>
  );
}
