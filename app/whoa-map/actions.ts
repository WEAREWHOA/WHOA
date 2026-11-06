"use server";

import { redirect, unstable_rethrow } from "next/navigation";
import { revalidatePath } from "next/cache";
import { humanCheckFromForm, verifyHuman } from "@/lib/humanCheck";
import { MediaError } from "@/lib/media";
import { submitPin } from "@/lib/whoaMap";

/**
 * Somebody sending in a photograph.
 *
 * Open to the public, which decides most of what happens here: the
 * human check runs before anything is read or stored, nothing reaches
 * the map without review, and the only detail the page gives back about
 * a failure is the one the person can act on.
 */
export async function submitPinAction(formData: FormData) {
  const human = await verifyHuman(humanCheckFromForm(formData));
  if (!human.ok) {
    console.warn("submitPinAction rejected a submission: %s", human.reason);
    redirect("/whoa-map?error=human#send");
  }

  const photo = formData.get("photo");
  if (!(photo instanceof File) || photo.size === 0) {
    redirect("/whoa-map?error=photo#send");
  }

  try {
    await submitPin({
      kind: String(formData.get("kind") || ""),
      city: String(formData.get("city") || ""),
      region: String(formData.get("region") || ""),
      country: String(formData.get("country") || ""),
      uploadedBy: String(formData.get("uploadedBy") || ""),
      photo,
    });
  } catch (err) {
    unstable_rethrow(err);
    // A MediaError is something the person typed or chose, so it is
    // worth repeating back. Anything else is ours, and saying more
    // than "it went wrong" about it only helps somebody probing.
    if (err instanceof MediaError) {
      redirect(`/whoa-map?error=${encodeURIComponent(err.message)}#send`);
    }
    console.error("submitPinAction failed:", err);
    redirect("/whoa-map?error=server#send");
  }

  // The page is revalidated hourly, and a submission is not on it yet
  // anyway, but the count of what is waiting changes on the admin side.
  revalidatePath("/portal/whoa-map");
  redirect("/whoa-map?sent=1#send");
}
