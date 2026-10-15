"use server";

import { submitDesign, type SubmitDesignInput } from "@/lib/customDesign";
import { HUMAN_CHECK_ERROR, verifyHuman, type HumanCheckInput } from "@/lib/humanCheck";

export async function submitDesignAction(
  input: SubmitDesignInput & HumanCheckInput,
): Promise<{ ok: boolean; error?: string }> {
  // A design submission carries an uploaded image and reaches a human
  // inbox, so it is worth the check before any of it is stored.
  //
  // The clock floor is left at the default rather than raised: somebody
  // drawing on the canvas has been on this page for minutes, so the
  // only submission this can catch is one that never drew at all.
  const human = await verifyHuman(input);
  if (!human.ok) {
    console.warn("submitDesignAction rejected a submission:", human.reason);
    return { ok: false, error: HUMAN_CHECK_ERROR };
  }

  const { templateId, strokes, previewDataUrl, name, email, phone } = input;
  return submitDesign({ templateId, strokes, previewDataUrl, name, email, phone });
}
