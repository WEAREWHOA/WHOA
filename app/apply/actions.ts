"use server";

import { redirect } from "next/navigation";
import { createAmbassador, getByEmail } from "@/lib/store";
import { createSession, hashPassword } from "@/lib/auth";

export async function applyAction(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const instagram = String(formData.get("instagram") || "").trim();
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (!name || !email || !email.includes("@")) {
    redirect("/apply?error=missing");
  }

  if (password.length < 8) {
    redirect("/apply?error=weak-password");
  }

  if (password !== confirmPassword) {
    redirect("/apply?error=password-mismatch");
  }

  const existing = await getByEmail(email);
  if (existing) {
    redirect("/login?error=exists");
  }

  const passwordHash = await hashPassword(password);
  const ambassador = await createAmbassador({ name, email, instagram, passwordHash });

  await createSession(ambassador.code);
  redirect(`/portal/${ambassador.code}?new=1`);
}
