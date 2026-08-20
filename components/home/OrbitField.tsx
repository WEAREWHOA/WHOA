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

// Every stop shares one angular velocity, so the angular gap between any
// two buttons never changes — they can drift as a formation but can never
// converge and collide, regardless of their individual orbit radius.
const ANGULAR_SPEED = 0.00007;
const RADIUS_FRACS = STOPS.map((_, i) => 0.3 + i * 0.062);
const ELLIPSE_SQUASH = 0.6;
const DEFAULT_SIZE = { width: 1200, height: 800 };

function orbitRadius(i: number, size: { width: number; height: number }) {
  const base = Math.min(size.width, size.height);
  const radiusX = RADIUS_FRACS[i] * base;
  return { radiusX, radiusY: radiusX * ELLIPSE_SQUASH };
}

export default function OrbitField() {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const ringRefs = useRef<(HTMLDivElement | null)[]>([]);
  const sizeRef = useRef(DEFAULT_SIZE);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function layoutRings() {
      STOPS.forEach((_, i) => {
        const ring = ringRefs.current[i];
        if (!ring) return;
        const { radiusX, radiusY } = orbitRadius(i, sizeRef.current);
        ring.style.width = `${radiusX * 2}px`;
        ring.style.height = `${radiusY * 2}px`;
      });
    }

    function measure() {
      const rect = container!.getBoundingClientRect();
      sizeRef.current = { width: rect.width, height: rect.height };
      layoutRings();
    }

    measure();
    window.addEventListener("resize", measure);

    function place(t: number) {
      STOPS.forEach((_, i) => {
        const el = itemRefs.current[i];
        if (!el) return;
        const phase = (i / STOPS.length) * Math.PI * 2;
        const angle = phase + t * ANGULAR_SPEED;
        const { radiusX, radiusY } = orbitRadius(i, sizeRef.current);
        const x = Math.cos(angle) * radiusX;
        const y = Math.sin(angle) * radiusY;
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
    <div ref={containerRef} className="absolute inset-0">
      {STOPS.map((stop, i) => {
        const { radiusX, radiusY } = orbitRadius(i, DEFAULT_SIZE);
        return (
          <div
            key={`ring-${stop.href}`}
            ref={(el) => {
              ringRefs.current[i] = el;
            }}
            aria-hidden
            className="orbit-ring pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={
              {
                width: `${radiusX * 2}px`,
                height: `${radiusY * 2}px`,
                "--ring-accent": stop.accent,
              } as React.CSSProperties
            }
          />
        );
      })}

      {STOPS.map((stop, i) => (
        <div
          key={stop.href}
          ref={(el) => {
            itemRefs.current[i] = el;
          }}
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        >
          <div className="pointer-events-auto">
            <HubButton
              href={stop.href}
              label={stop.label}
              accent={stop.accent}
              rotate={stop.rotate}
              big={stop.big}
              delay={i * 0.35}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
