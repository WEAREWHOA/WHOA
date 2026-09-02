"use client";

import { useEffect, useRef, useState, type PointerEvent, type FormEvent } from "react";
import GarmentSilhouette from "./GarmentSilhouette";
import { submitDesignAction } from "@/app/custom-design/actions";
import {
  GARMENT_TEMPLATES,
  GARMENT_VIEWBOX,
  SIZE_RANGE,
  DENSITY_RANGE,
  SPREAD_RANGE,
  buildGarmentPath2D,
  drawGarmentBase,
  drawStroke,
  generateSprayDabs,
  type GarmentTemplate,
  type BleachStroke,
  type BleachTool,
  type StrokePoint,
} from "@/lib/customDesign";

type Step = "pick" | "edit" | "submitted";

// Bleach canvas resolution is the viewBox scaled up by this, for crisp
// strokes regardless of how large the container renders on screen.
const CANVAS_SCALE = 2;

export default function CustomDesignEditor() {
  const [step, setStep] = useState<Step>("pick");
  const [template, setTemplate] = useState<GarmentTemplate | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<BleachStroke[]>([]);
  const drawingRef = useRef(false);

  const [tool, setTool] = useState<BleachTool>("marker");
  const [size, setSize] = useState((SIZE_RANGE.min + SIZE_RANGE.max) / 2);
  const [density, setDensity] = useState(0.6);
  const [spread, setSpread] = useState((SPREAD_RANGE.min + SPREAD_RANGE.max) / 2);
  const [canUndo, setCanUndo] = useState(false);

  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [submitState, setSubmitState] = useState<"idle" | "submitting">("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);

  function redrawAll() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const stroke of strokesRef.current) {
      drawStroke(ctx, stroke, canvas.width, canvas.height);
    }
  }

  function setupCanvas() {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !template) return;

    canvas.width = container.clientWidth * CANVAS_SCALE;
    canvas.height = container.clientHeight * CANVAS_SCALE;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const path = buildGarmentPath2D(
      template,
      canvas.width / GARMENT_VIEWBOX.width,
      canvas.height / GARMENT_VIEWBOX.height,
    );
    ctx.save();
    ctx.clip(path);
    redrawAll();
  }

  useEffect(() => {
    if (step !== "edit") return;
    setupCanvas();
    window.addEventListener("resize", setupCanvas);
    return () => window.removeEventListener("resize", setupCanvas);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, template]);

  function toNormalized(clientX: number, clientY: number): StrokePoint {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) / rect.width,
      y: (clientY - rect.top) / rect.height,
    };
  }

  function handlePointerDown(e: PointerEvent<HTMLCanvasElement>) {
    if (!template) return;
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    drawingRef.current = true;

    const point = toNormalized(e.clientX, e.clientY);
    const stroke: BleachStroke = { tool, size, density, spread, points: [point] };
    strokesRef.current.push(stroke);
    setCanUndo(true);

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) drawStroke(ctx, stroke, canvas.width, canvas.height);
  }

  function handlePointerMove(e: PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const point = toNormalized(e.clientX, e.clientY);
    const stroke = strokesRef.current[strokesRef.current.length - 1];

    if (tool === "marker") {
      const prev = stroke.points[stroke.points.length - 1];
      stroke.points.push(point);
      drawStroke(ctx, { ...stroke, points: [prev, point] }, canvas.width, canvas.height);
    } else {
      const dabCount = Math.max(1, Math.round(density * 6));
      const offsets = generateSprayDabs(dabCount, spread);
      const newDabs = offsets.map((o) => ({ x: point.x + o.x, y: point.y + o.y }));
      stroke.points.push(...newDabs);
      drawStroke(ctx, { ...stroke, points: newDabs }, canvas.width, canvas.height);
    }
  }

  function handlePointerUp() {
    drawingRef.current = false;
  }

  function undo() {
    strokesRef.current.pop();
    setCanUndo(strokesRef.current.length > 0);
    redrawAll();
  }

  function clearDesign() {
    strokesRef.current = [];
    setCanUndo(false);
    redrawAll();
  }

  function pickTemplate(t: GarmentTemplate) {
    strokesRef.current = [];
    setCanUndo(false);
    setTemplate(t);
    setStep("edit");
  }

  function changeTemplate() {
    strokesRef.current = [];
    setCanUndo(false);
    setTemplate(null);
    setShowSubmitForm(false);
    setStep("pick");
  }

  function buildPreviewDataUrl(): string | null {
    const bleachCanvas = canvasRef.current;
    if (!bleachCanvas || !template) return null;
    const out = document.createElement("canvas");
    out.width = bleachCanvas.width;
    out.height = bleachCanvas.height;
    const ctx = out.getContext("2d");
    if (!ctx) return null;

    ctx.fillStyle = "#14100c";
    ctx.fillRect(0, 0, out.width, out.height);
    drawGarmentBase(ctx, template, out.width, out.height);
    ctx.globalCompositeOperation = "screen";
    ctx.drawImage(bleachCanvas, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    return out.toDataURL("image/png");
  }

  function openSubmitForm() {
    if (strokesRef.current.length === 0) {
      setSubmitError("Add at least one bleach mark before submitting.");
      return;
    }
    setSubmitError(null);
    setShowSubmitForm(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!template) return;

    const previewDataUrl = buildPreviewDataUrl();
    if (!previewDataUrl) {
      setSubmitError("Couldn't capture your design — try again.");
      return;
    }

    setSubmitState("submitting");
    setSubmitError(null);

    const result = await submitDesignAction({
      templateId: template.id,
      strokes: strokesRef.current,
      previewDataUrl,
      name: form.name,
      email: form.email,
      phone: form.phone,
    });

    if (result.ok) {
      setStep("submitted");
    } else {
      setSubmitState("idle");
      setSubmitError(result.error ?? "Something went wrong — try again.");
    }
  }

  function startOver() {
    strokesRef.current = [];
    setCanUndo(false);
    setTemplate(null);
    setShowSubmitForm(false);
    setForm({ name: "", email: "", phone: "" });
    setSubmitState("idle");
    setSubmitError(null);
    setStep("pick");
  }

  if (step === "submitted") {
    return (
      <div className="card-surface mx-auto max-w-md rounded-2xl border border-border p-8 text-center">
        <p className="text-psychedelic font-display text-2xl tracking-wide">Design received</p>
        <p className="mt-3 text-sm text-foreground/80">
          This is a test of the tool, not a live order yet — nothing&apos;s being printed. We&apos;ll
          follow up by phone or email.
        </p>
        <button
          type="button"
          onClick={startOver}
          className="btn-flame mt-6 rounded-full px-6 py-2.5 text-sm"
        >
          Start another design
        </button>
      </div>
    );
  }

  if (step === "pick") {
    return (
      <div>
        <p className="text-center text-sm text-muted">
          Black only, for now — pick a piece to bleach.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {GARMENT_TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => pickTemplate(t)}
              className="card-surface group rounded-2xl border border-border p-4 text-center transition-colors hover:border-flame-2/50"
            >
              <GarmentSilhouette template={t} className="mx-auto h-32 w-full" />
              <p className="mt-3 text-sm font-semibold">{t.label}</p>
              <p className="text-xs text-muted">Black</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // step === "edit"
  return (
    <div className="flex flex-col items-center">
      <div className="flex w-full max-w-md items-center justify-between text-xs">
        <button type="button" onClick={changeTemplate} className="text-muted hover:text-foreground">
          ← Change template
        </button>
        <span className="font-semibold tracking-wide uppercase">{template?.label} · Black</span>
      </div>

      <div
        ref={containerRef}
        className="relative mt-4 w-full max-w-md overflow-hidden rounded-2xl border border-border-strong bg-surface"
        style={{ aspectRatio: `${GARMENT_VIEWBOX.width} / ${GARMENT_VIEWBOX.height}` }}
      >
        {template && <GarmentSilhouette template={template} className="absolute inset-0 h-full w-full" />}
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="absolute inset-0 h-full w-full touch-none"
          style={{ mixBlendMode: "screen" }}
        />
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-6">
        <div className="flex gap-2">
          {(["marker", "spray"] as BleachTool[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTool(t)}
              className={`rounded-full px-4 py-2 text-xs font-semibold uppercase transition-colors ${
                tool === t ? "btn-flame" : "border border-border-strong text-muted hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto mt-6 flex w-full max-w-md flex-col gap-4">
        <label className="flex items-center gap-3 text-xs text-muted">
          Size
          <input
            type="range"
            min={SIZE_RANGE.min}
            max={SIZE_RANGE.max}
            step="0.002"
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            className="flex-1"
          />
        </label>
        <label className="flex items-center gap-3 text-xs text-muted">
          Density
          <input
            type="range"
            min={DENSITY_RANGE.min}
            max={DENSITY_RANGE.max}
            step="0.02"
            value={density}
            onChange={(e) => setDensity(Number(e.target.value))}
            className="flex-1"
          />
        </label>
        {tool === "spray" && (
          <label className="flex items-center gap-3 text-xs text-muted">
            Spread
            <input
              type="range"
              min={SPREAD_RANGE.min}
              max={SPREAD_RANGE.max}
              step="0.005"
              value={spread}
              onChange={(e) => setSpread(Number(e.target.value))}
              className="flex-1"
            />
          </label>
        )}
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={undo}
          disabled={!canUndo}
          className="rounded-full border border-border-strong px-5 py-2.5 text-sm text-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
        >
          Undo
        </button>
        <button
          type="button"
          onClick={clearDesign}
          disabled={!canUndo}
          className="rounded-full border border-border-strong px-5 py-2.5 text-sm text-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={openSubmitForm}
          className="btn-flame rounded-full px-6 py-2.5 text-sm"
        >
          Submit
        </button>
      </div>

      {submitError && !showSubmitForm && <p className="mt-3 text-xs text-flame-3">{submitError}</p>}

      {showSubmitForm && (
        <div className="mt-8 w-full max-w-md rounded-2xl border border-border-strong bg-surface p-6 text-left">
          <p className="font-display text-lg">Your info</p>
          <p className="mt-1 text-xs text-muted">
            This is a test of the tool — nothing&apos;s being printed yet. We&apos;ll follow up by
            phone or email.
          </p>
          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
            <input
              type="text"
              required
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="rounded-lg border border-border-strong bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-flame-2 focus:outline-none"
            />
            <input
              type="email"
              required
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="rounded-lg border border-border-strong bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-flame-2 focus:outline-none"
            />
            <input
              type="tel"
              required
              placeholder="Phone"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className="rounded-lg border border-border-strong bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-flame-2 focus:outline-none"
            />

            {submitError && <p className="text-xs text-flame-3">{submitError}</p>}

            <div className="mt-2 flex gap-3">
              <button
                type="button"
                onClick={() => setShowSubmitForm(false)}
                className="flex-1 rounded-full border border-border-strong px-5 py-2.5 text-sm text-muted hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitState === "submitting"}
                className="btn-flame flex-1 rounded-full px-5 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitState === "submitting" ? "Submitting…" : "Submit"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
