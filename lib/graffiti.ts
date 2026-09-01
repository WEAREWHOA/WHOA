import { getSupabase } from "./supabase";

export interface StrokePoint {
  x: number;
  y: number;
}

export interface Stroke {
  color: string;
  width: number;
  points: StrokePoint[];
}

export interface GraffitiDrawing {
  id: string;
  strokes: Stroke[];
  createdAt: string;
}

const MAX_STROKES_PER_DRAWING = 200;
const MAX_POINTS_PER_STROKE = 2000;

function sanitizeStrokes(strokes: unknown): Stroke[] {
  if (!Array.isArray(strokes)) return [];

  return strokes.slice(0, MAX_STROKES_PER_DRAWING).flatMap((stroke): Stroke[] => {
    if (typeof stroke !== "object" || stroke === null) return [];
    const s = stroke as Record<string, unknown>;
    if (typeof s.color !== "string" || typeof s.width !== "number" || !Array.isArray(s.points)) {
      return [];
    }

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

    if (points.length < 2) return [];

    return [{ color: s.color.slice(0, 20), width: Math.min(Math.max(s.width, 0.002), 0.05), points }];
  });
}

function clamp01(n: number): number {
  return Math.min(Math.max(n, 0), 1);
}

export async function saveDrawing(strokes: Stroke[]): Promise<{ ok: boolean; error?: string }> {
  const clean = sanitizeStrokes(strokes);
  if (clean.length === 0) return { ok: false, error: "Nothing to save." };

  const { error } = await getSupabase().from("graffiti_drawings").insert({ strokes: clean });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function getRecentDrawings(limit = 24): Promise<GraffitiDrawing[]> {
  const { data, error } = await getSupabase()
    .from("graffiti_drawings")
    .select("id, strokes, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    strokes: sanitizeStrokes(row.strokes),
    createdAt: row.created_at,
  }));
}
