"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import HubButton from "@/components/home/HubButton";
import WhoaSphere from "@/components/home/WhoaSphere";
import TunnelTransition from "@/components/home/TunnelTransition";

interface HubStop {
  label: string;
  href: string;
  accent: string;
  rotate: number;
  big?: boolean;
  halfWidth: number;
  halfHeight: number;
  tunnel?: boolean;
}

const TUNNEL_DURATION_MS = 900;

const STOPS: HubStop[] = [
  { label: "BRAND AMBASSADORS", href: "/ambassadors", accent: "#ff2fb0", rotate: -4, halfWidth: 120, halfHeight: 45 },
  { label: "SAME SAME BUT WHOA", href: "/same-same-but-whoa", accent: "#7b2ff7", rotate: 3, halfWidth: 125, halfHeight: 45, tunnel: true },
  { label: "SHOP THE WHOADEGA", href: "https://www.wearewhoa.art/s/shop", accent: "#29e6ff", rotate: -2, big: true, halfWidth: 165, halfHeight: 55 },
  { label: "MUSIC COLLECTIVE", href: "/music-collective", accent: "#baff29", rotate: 5, halfWidth: 110, halfHeight: 45 },
  { label: "ART COLLECTIVE", href: "/art-collective", accent: "#fff229", rotate: -5, halfWidth: 95, halfHeight: 45 },
  { label: "EVENT CALENDAR", href: "/events", accent: "#ff8a29", rotate: 4, halfWidth: 100, halfHeight: 45 },
  { label: "ENTER WHOA", href: "https://www.wearewhoa.art", accent: "#ffffff", rotate: 0, big: true, halfWidth: 140, halfHeight: 55 },
];

// Every stop shares one angular velocity, so the angular gap between any
// two buttons never changes — they can drift as a formation but can never
// converge and collide, whatever radius each one ends up on.
const ANGULAR_SPEED = 0.00007;
const MARGIN = 16;
const RING_STEP = 56;
const SPHERE_CLEARANCE = 34;

const DEFAULT_SIZE = { width: 1200, height: 800 };
const DEFAULT_SPHERE_RADIUS = 130;

function orbitRadii(
  size: { width: number; height: number },
  sphereRadius: number,
): { radiusX: number; radiusY: number }[] {
  const halfW = size.width / 2;
  const halfH = size.height / 2;

  return STOPS.map((stop, i) => {
    // Clearance from the sphere needs the button's own footprint, or a
    // button wider/taller than the gap would still graze the sphere.
    const minR = sphereRadius + Math.max(stop.halfWidth, stop.halfHeight) + SPHERE_CLEARANCE;
    const raw = minR + i * RING_STEP;

    // Staying inside the viewport is a hard ceiling — it always wins over
    // sphere clearance, however little room that leaves on a narrow phone.
    const availX = Math.max(0, halfW - stop.halfWidth - MARGIN);
    const availY = Math.max(0, halfH - stop.halfHeight - MARGIN);

    return {
      radiusX: Math.min(raw, availX),
      radiusY: Math.min(raw, availY),
    };
  });
}

export default function OrbitField() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sphereRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const sizeRef = useRef(DEFAULT_SIZE);
  const sphereRadiusRef = useRef(DEFAULT_SPHERE_RADIUS);
  const router = useRouter();
  const [tunneling, setTunneling] = useState(false);

  function handleTunnelNavigate(href: string) {
    if (tunneling) return;
    setTunneling(true);
    setTimeout(() => router.push(href), TUNNEL_DURATION_MS);
  }

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function measure() {
      const rect = container!.getBoundingClientRect();
      sizeRef.current = { width: rect.width, height: rect.height };
      if (sphereRef.current) {
        sphereRadiusRef.current = sphereRef.current.getBoundingClientRect().width / 2;
      }
    }

    measure();
    window.addEventListener("resize", measure);

    function place(t: number) {
      const radii = orbitRadii(sizeRef.current, sphereRadiusRef.current);
      STOPS.forEach((_, i) => {
        const el = itemRefs.current[i];
        if (!el) return;
        const phase = (i / STOPS.length) * Math.PI * 2;
        const angle = phase + t * ANGULAR_SPEED;
        const { radiusX, radiusY } = radii[i];
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
      <TunnelTransition active={tunneling} />

      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <WhoaSphere ref={sphereRef} />
      </div>

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
              onNavigate={stop.tunnel ? handleTunnelNavigate : undefined}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
