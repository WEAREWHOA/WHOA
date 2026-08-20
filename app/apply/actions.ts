"use server";

import { redirect } from "next/navigation";
import { createAmbassador, getByEmail } from "@/lib/store";

export async function applyAction(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const instagram = String(formData.get("instagram") || "").trim();

  if (!name || !email || !email.includes("@")) {
    redirect("/apply?error=missing");
  }

  const existing = await getByEmail(email);
  if (existing) {
    redirect(`/portal/${existing.code}`);
  }

  const ambassador = await createAmbassador({ name, email, instagram });
  redirect(`/portal/${ambassador.code}?new=1`);
}
