"use server";

import { redirect, unstable_rethrow } from "next/navigation";
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

  let target: string;
  try {
    const existing = await getByEmail(email);
    if (existing) {
      redirect("/login?error=exists");
    }

    const passwordHash = await hashPassword(password);
    const ambassador = await createAmbassador({
      name,
      email,
      instagram,
      passwordHash,
      permissions: { ambassador: true },
    });

    await createSession(ambassador.code);
    target = `/portal/${ambassador.code}?new=1`;
  } catch (err) {
    // redirect()/notFound() work by throwing — let those pass through
    // untouched and only treat genuine failures as errors.
    unstable_rethrow(err);
    console.error("applyAction failed:", err);
    redirect("/apply?error=server");
  }

  redirect(target);
}
