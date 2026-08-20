"use client";

const RING_COUNT = 8;

export default function TunnelTransition({ active }: { active: boolean }) {
  if (!active) return null;

  return (
    <div className="tunnel-overlay pointer-events-none fixed inset-0 z-[200] overflow-hidden" aria-hidden>
      {Array.from({ length: RING_COUNT }).map((_, i) => (
        <span
          key={i}
          className="tunnel-ring"
          style={{ animationDelay: `${i * 0.07}s`, filter: `hue-rotate(${i * 45}deg)` }}
        />
      ))}
    </div>
  );
}
