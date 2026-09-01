import type { Stroke } from "@/lib/graffiti";

export default function DrawingThumbnail({ strokes }: { strokes: Stroke[] }) {
  return (
    <svg
      viewBox="0 0 1 1"
      className="aspect-square w-full rounded-xl border border-border bg-[#0a0806]"
    >
      {strokes.map((stroke, i) => (
        <polyline
          key={i}
          points={stroke.points.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="none"
          stroke={stroke.color}
          strokeWidth={stroke.width}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}
