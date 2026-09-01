"use client";

import { useRef, useState, type PointerEvent } from "react";
import { saveDrawingAction } from "@/app/games/graffiti/actions";
import type { Stroke, StrokePoint } from "@/lib/graffiti";

const COLORS = ["#ff2fb0", "#7b2ff7", "#29e6ff", "#baff29", "#fff229", "#ff8a29", "#f7f0e6"];
const SIZES = [
  { label: "S", value: 0.006 },
  { label: "M", value: 0.014 },
  { label: "L", value: 0.028 },
];

export default function GraffitiCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const drawingRef = useRef(false);
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(SIZES[1].value);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  function toNormalized(e: PointerEvent<HTMLCanvasElement>): StrokePoint {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  }

  function drawSegment(from: StrokePoint, to: StrokePoint) {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    ctx.strokeStyle = color;
    ctx.lineWidth = size * canvas.width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(from.x * canvas.width, from.y * canvas.height);
    ctx.lineTo(to.x * canvas.width, to.y * canvas.height);
    ctx.stroke();
  }

  function handlePointerDown(e: PointerEvent<HTMLCanvasElement>) {
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    drawingRef.current = true;
    const point = toNormalized(e);
    strokesRef.current.push({ color, width: size, points: [point] });
  }

  function handlePointerMove(e: PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const stroke = strokesRef.current[strokesRef.current.length - 1];
    const point = toNormalized(e);
    const prev = stroke.points[stroke.points.length - 1];
    stroke.points.push(point);
    drawSegment(prev, point);
  }

  function handlePointerUp() {
    drawingRef.current = false;
  }

  function clear() {
    strokesRef.current = [];
    setSaveState("idle");
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  async function save() {
    if (strokesRef.current.length === 0) return;
    setSaveState("saving");
    const result = await saveDrawingAction(strokesRef.current);
    if (result.ok) {
      setSaveState("saved");
      setTimeout(clear, 1200);
    } else {
      setSaveState("error");
    }
  }

  return (
    <div className="flex flex-col items-center">
      <canvas
        ref={canvasRef}
        width={600}
        height={600}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className="aspect-square w-full max-w-lg touch-none rounded-2xl border border-border-strong bg-[#0a0806]"
      />

      <div className="mt-5 flex flex-wrap items-center justify-center gap-4">
        <div className="flex gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Color ${c}`}
              onClick={() => setColor(c)}
              className={`h-8 w-8 rounded-full border-2 transition-transform ${
                color === c ? "scale-110 border-white" : "border-transparent"
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        <div className="flex gap-1.5">
          {SIZES.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => setSize(s.value)}
              className={`h-8 w-8 rounded-full border text-xs font-semibold transition-colors ${
                size === s.value
                  ? "border-flame-2 text-flame-2"
                  : "border-border-strong text-muted hover:text-foreground"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          onClick={clear}
          className="rounded-full border border-border-strong px-5 py-2.5 text-sm text-muted hover:text-foreground"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saveState === "saving"}
          className="btn-flame rounded-full px-6 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved!" : "Save to gallery"}
        </button>
      </div>

      {saveState === "error" && (
        <p className="mt-3 text-xs text-flame-3">Couldn&apos;t save — try again in a moment.</p>
      )}
    </div>
  );
}
