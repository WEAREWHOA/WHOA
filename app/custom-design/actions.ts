"use server";

import { submitDesign, type SubmitDesignInput } from "@/lib/customDesign";

export async function submitDesignAction(
  input: SubmitDesignInput,
): Promise<{ ok: boolean; error?: string }> {
  return submitDesign(input);
}
