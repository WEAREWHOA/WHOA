"use server";

import { revalidatePath } from "next/cache";
import { saveDrawing, type Stroke } from "@/lib/graffiti";

export async function saveDrawingAction(strokes: Stroke[]): Promise<{ ok: boolean; error?: string }> {
  const result = await saveDrawing(strokes);
  if (result.ok) revalidatePath("/games/graffiti");
  return result;
}
