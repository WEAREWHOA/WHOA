"use server";

import { redirect, unstable_rethrow } from "next/navigation";
import { createAmbassador, getByEmail } from "@/lib/store";
import { createSession, hashPassword } from "@/lib/auth";
import { sendAmbassadorApplicationNotification } from "@/lib/email";
import { recordContactInBackground, TAG } from "@/lib/newsletter";

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
    // Ambassador access is NOT granted here — the account is created
    // without it and stays a plain account until staff approve the
    // application from the notification email (or /super-admin). No
    // referral link exists until then either.
    const ambassador = await createAmbassador({
      name,
      email,
      instagram,
      passwordHash,
    });

    await createSession(ambassador.code);
    target = "/portal?applied=1";

    // An applicant is a contact. Not subscribed: applying to represent the
    // brand is not the same as asking for the newsletter, and an ambassador
    // already receives everything operational through their portal.
    const [firstName, ...restOfName] = name.split(/\s+/);
    recordContactInBackground({
      email,
      firstName: firstName || undefined,
      lastName: restOfName.join(" ") || undefined,
      source: "apply",
      tags: [TAG.ambassadors],
      accountCode: ambassador.code,
    });

    // Best-effort — staff should hear about every application, but a
    // Resend hiccup must never block the signup that already succeeded.
    try {
      await sendAmbassadorApplicationNotification({
        name,
        email,
        instagram,
        code: ambassador.code,
      });
    } catch (emailErr) {
      console.error("sendAmbassadorApplicationNotification failed:", emailErr);
    }
  } catch (err) {
    // redirect()/notFound() work by throwing — let those pass through
    // untouched and only treat genuine failures as errors.
    unstable_rethrow(err);
    console.error("applyAction failed:", err);
    redirect("/apply?error=server");
  }

  redirect(target);
}
