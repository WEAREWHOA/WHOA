import { getSupabase } from "./supabase";

export type GarmentId = "tshirt" | "hoodie" | "tapered-sweatpants" | "wide-leg-sweatpants";

export interface GarmentTemplate {
  id: GarmentId;
  label: string;
  // Filled black shapes that make up the garment silhouette — also the
  // exact region bleach marks get clipped to, so a stray spray can never
  // land outside the garment. Each polygon is a list of points in a
  // shared 300x380 coordinate space.
  polygons: [number, number][][];
  // Non-fill decorative strokes (pocket outline, drawstrings) — purely
  // visual, not part of the bleach clip region.
  decorations?: { points: [number, number][] }[];
}

export const GARMENT_VIEWBOX = { width: 300, height: 380 };

const TSHIRT_BODY: [number, number][] = [
  [130, 20],
  [145, 34],
  [155, 34],
  [170, 20],
  [210, 35],
  [255, 65],
  [230, 100],
  [215, 88],
  [215, 360],
  [85, 360],
  [85, 88],
  [70, 100],
  [45, 65],
  [90, 35],
];

const HOODIE_HOOD: [number, number][] = [
  [90, 42],
  [95, 18],
  [115, 4],
  [150, 0],
  [185, 4],
  [205, 18],
  [210, 42],
  [185, 25],
  [150, 20],
  [115, 25],
];

const WAISTBAND: [number, number][] = [
  [95, 10],
  [205, 10],
  [205, 35],
  [95, 35],
];
const HIP: [number, number][] = [
  [85, 35],
  [215, 35],
  [205, 110],
  [95, 110],
];
const TAPERED_LEFT_LEG: [number, number][] = [
  [95, 110],
  [150, 108],
  [142, 360],
  [118, 360],
];
const TAPERED_RIGHT_LEG: [number, number][] = [
  [150, 108],
  [205, 110],
  [182, 360],
  [158, 360],
];
const WIDE_LEFT_LEG: [number, number][] = [
  [95, 110],
  [150, 108],
  [175, 360],
  [75, 360],
];
const WIDE_RIGHT_LEG: [number, number][] = [
  [150, 108],
  [205, 110],
  [225, 360],
  [185, 360],
];

export const GARMENT_TEMPLATES: GarmentTemplate[] = [
  { id: "tshirt", label: "T-Shirt", polygons: [TSHIRT_BODY] },
  {
    id: "hoodie",
    label: "Hoodie",
    polygons: [HOODIE_HOOD, TSHIRT_BODY],
    decorations: [
      { points: [[115, 230], [112, 275], [118, 282], [182, 282], [188, 275], [185, 230]] },
      { points: [[140, 20], [136, 70]] },
      { points: [[160, 20], [164, 70]] },
    ],
  },
  {
    id: "tapered-sweatpants",
    label: "Tapered Sweatpants",
    polygons: [WAISTBAND, HIP, TAPERED_LEFT_LEG, TAPERED_RIGHT_LEG],
  },
  {
    id: "wide-leg-sweatpants",
    label: "Wide Leg Sweatpants",
    polygons: [WAISTBAND, HIP, WIDE_LEFT_LEG, WIDE_RIGHT_LEG],
  },
];

// An authentic bleach-on-black tone (rust/tan) rather than flat white —
// bleach breaks down black cotton dye to the fabric's underlying pigment,
// which reads warm, not clean white.
export const BLEACH_COLOR = "#caa06a";

export type BleachTool = "marker" | "spray";

export interface StrokePoint {
  x: number; // normalized 0-1 within the garment canvas
  y: number;
}

export interface BleachStroke {
  tool: BleachTool;
  size: number; // normalized 0-1, brush diameter as a fraction of canvas width
  density: number; // 0-1
  spread: number; // 0-1, spray only
  points: StrokePoint[];
}

export const SIZE_RANGE = { min: 0.01, max: 0.09 };
export const DENSITY_RANGE = { min: 0.15, max: 1 };
export const SPREAD_RANGE = { min: 0.02, max: 0.18 };

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

function clamp01(n: number): number {
  return clamp(n, 0, 1);
}

export function buildGarmentPath2D(template: GarmentTemplate, scaleX: number, scaleY: number): Path2D {
  const path = new Path2D();
  for (const polygon of template.polygons) {
    polygon.forEach(([x, y], i) => {
      const px = x * scaleX;
      const py = y * scaleY;
      if (i === 0) path.moveTo(px, py);
      else path.lineTo(px, py);
    });
    path.closePath();
  }
  return path;
}

// Draws the garment's black base (and its decorative details) directly
// onto a canvas — used to flatten a submission preview. Shares the exact
// same polygon data as the on-screen SVG, so the preview always matches
// what the visitor actually saw.
export function drawGarmentBase(
  ctx: CanvasRenderingContext2D,
  template: GarmentTemplate,
  width: number,
  height: number,
) {
  const scaleX = width / GARMENT_VIEWBOX.width;
  const scaleY = height / GARMENT_VIEWBOX.height;

  ctx.fillStyle = "#050505";
  for (const polygon of template.polygons) {
    ctx.beginPath();
    polygon.forEach(([x, y], i) => {
      const px = x * scaleX;
      const py = y * scaleY;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.fill();
  }

  if (template.decorations) {
    ctx.strokeStyle = "#1c1c1c";
    ctx.lineWidth = 3 * ((scaleX + scaleY) / 2);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const d of template.decorations) {
      ctx.beginPath();
      d.points.forEach(([x, y], i) => {
        const px = x * scaleX;
        const py = y * scaleY;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
    }
  }
}

// Draws one stroke — called both for live, incremental drawing (a 2-point
// marker segment, or a batch of newly-scattered spray dabs) and for a full
// replay of a stroke's every point (redrawing after undo, or a resize).
export function drawStroke(
  ctx: CanvasRenderingContext2D,
  stroke: BleachStroke,
  canvasWidth: number,
  canvasHeight: number,
) {
  ctx.fillStyle = BLEACH_COLOR;
  ctx.strokeStyle = BLEACH_COLOR;

  if (stroke.tool === "marker") {
    ctx.globalAlpha = 0.35 + stroke.density * 0.55;
    const lineWidth = stroke.size * canvasWidth;
    if (stroke.points.length === 1) {
      const p = stroke.points[0];
      ctx.beginPath();
      ctx.arc(p.x * canvasWidth, p.y * canvasHeight, lineWidth / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.lineWidth = lineWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      stroke.points.forEach((p, i) => {
        const x = p.x * canvasWidth;
        const y = p.y * canvasHeight;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }
  } else {
    ctx.globalAlpha = 0.45 + stroke.density * 0.4;
    const dotRadius = Math.max(stroke.size * canvasWidth * 0.6, 1);
    for (const p of stroke.points) {
      ctx.beginPath();
      ctx.arc(p.x * canvasWidth, p.y * canvasHeight, dotRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.globalAlpha = 1;
}

// Random offsets (relative to a center point) for one spray burst —
// uniformly scattered within a disk of radius `spread`, not just along
// the disk's edge.
export function generateSprayDabs(count: number, spread: number): StrokePoint[] {
  const dabs: StrokePoint[] = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.sqrt(Math.random()) * spread;
    dabs.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
  }
  return dabs;
}

const MAX_STROKES = 300;
const MAX_POINTS_PER_STROKE = 4000;

export function sanitizeStrokes(strokes: unknown): BleachStroke[] {
  if (!Array.isArray(strokes)) return [];

  return strokes.slice(0, MAX_STROKES).flatMap((stroke): BleachStroke[] => {
    if (typeof stroke !== "object" || stroke === null) return [];
    const s = stroke as Record<string, unknown>;
    if (s.tool !== "marker" && s.tool !== "spray") return [];
    if (typeof s.size !== "number" || typeof s.density !== "number" || typeof s.spread !== "number") {
      return [];
    }
    if (!Array.isArray(s.points)) return [];

    const points = s.points
      .slice(0, MAX_POINTS_PER_STROKE)
      .filter(
        (p): p is StrokePoint =>
          typeof p === "object" &&
          p !== null &&
          typeof (p as StrokePoint).x === "number" &&
          typeof (p as StrokePoint).y === "number",
      )
      .map((p) => ({ x: clamp01(p.x), y: clamp01(p.y) }));

    if (points.length === 0) return [];

    return [
      {
        tool: s.tool,
        size: clamp(s.size, 0.002, 0.2),
        density: clamp01(s.density),
        spread: clamp01(s.spread),
        points,
      },
    ];
  });
}

export interface SubmitDesignInput {
  templateId: string;
  strokes: BleachStroke[];
  previewDataUrl: string;
  name: string;
  email: string;
  phone: string;
}

const MAX_PREVIEW_LENGTH = 2_000_000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// A test of the submission pipeline, not a live ordering flow yet — see
// README. Public/customer-facing, so this fails soft (returns an error
// string) rather than throwing, same posture as checkout and the
// ambassador referral lookup.
export async function submitDesign(input: SubmitDesignInput): Promise<{ ok: boolean; error?: string }> {
  const template = GARMENT_TEMPLATES.find((t) => t.id === input.templateId);
  if (!template) return { ok: false, error: "Pick a template first." };

  const strokes = sanitizeStrokes(input.strokes);
  if (strokes.length === 0) return { ok: false, error: "Add at least one bleach mark before submitting." };

  const name = input.name.trim().slice(0, 200);
  const email = input.email.trim().slice(0, 200);
  const phone = input.phone.trim().slice(0, 50);
  if (!name) return { ok: false, error: "Name is required." };
  if (!EMAIL_PATTERN.test(email)) return { ok: false, error: "Enter a valid email." };
  if (!phone) return { ok: false, error: "Phone is required." };

  if (typeof input.previewDataUrl !== "string" || !input.previewDataUrl.startsWith("data:image/")) {
    return { ok: false, error: "Couldn't capture the design preview — try again." };
  }
  if (input.previewDataUrl.length > MAX_PREVIEW_LENGTH) {
    return { ok: false, error: "Design preview is too large." };
  }

  try {
    const { error } = await getSupabase().from("custom_design_submissions").insert({
      template_id: template.id,
      strokes,
      preview_data_url: input.previewDataUrl,
      name,
      email,
      phone,
    });

    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    console.error("submitDesign failed:", err);
    return { ok: false, error: "Something went wrong on our end — try again in a moment." };
  }
}
