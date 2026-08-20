"use client";

import Link from "next/link";
import { useRef, type PointerEvent } from "react";

export default function HubButton({
  href,
  label,
  rotate = 0,
  accent,
  delay = 0,
  big = false,
}: {
  href: string;
  label: string;
  rotate?: number;
  accent: string;
  delay?: number;
  big?: boolean;
}) {
  const ref = useRef<HTMLAnchorElement>(null);

  function handlePointerMove(e: PointerEvent<HTMLAnchorElement>) {
    const el = ref.current;
    if (!el || e.pointerType === "touch") return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `perspective(700px) rotateX(${(-py * 18).toFixed(2)}deg) rotateY(${(px * 18).toFixed(2)}deg) rotate(${rotate}deg) scale(1.06)`;
  }

  function handlePointerLeave() {
    const el = ref.current;
    if (!el) return;
    el.style.transform = `rotate(${rotate}deg)`;
  }

  return (
    <Link
      ref={ref}
      href={href}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      style={
        {
          transform: `rotate(${rotate}deg)`,
          borderColor: accent,
          boxShadow: `0 0 40px -14px ${accent}`,
          animationDelay: `${delay}s`,
          "--accent": accent,
        } as React.CSSProperties
      }
      className={`hub-bob group relative flex items-center justify-center rounded-full border-2 bg-black/40 text-center font-display tracking-wide backdrop-blur-sm transition-shadow duration-300 hover:shadow-[0_0_60px_-8px_var(--accent)] ${
        big ? "px-10 py-8 text-2xl sm:text-3xl" : "px-7 py-5 text-lg sm:text-xl"
      }`}
    >
      {label}
    </Link>
  );
}
