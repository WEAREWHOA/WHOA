"use server";

import { redirect, unstable_rethrow } from "next/navigation";
import { createAmbassador, getByEmail } from "@/lib/store";
import { recordEventSalesApplication } from "@/lib/eventSales";
import { createSession, hashPassword } from "@/lib/auth";
import { sendEventSalesApplicationNotification } from "@/lib/email";

export async function applySellForUsAction(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const phone = String(formData.get("phone") || "").trim();
  const instagram = String(formData.get("instagram") || "").trim();
  const message = String(formData.get("message") || "").trim();
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (!name || !email || !email.includes("@") || !phone) {
    redirect("/sell-for-us?error=missing");
  }

  try {
    // Same "do they already have an account" check as the rest of the
    // site's signup flows — link the application to it instead of
    // creating a duplicate. A brand-new applicant sets a password here so
    // they can check back once approved; an existing account's password
    // is never touched by this form.
    const existing = await getByEmail(email);
    let code: string;

    if (existing) {
      code = existing.code;
    } else {
      if (password.length < 8) redirect("/sell-for-us?error=weak-password");
      if (password !== confirmPassword) redirect("/sell-for-us?error=password-mismatch");

      const passwordHash = await hashPassword(password);
      const created = await createAmbassador({ name, email, instagram, passwordHash });
      code = created.code;
      await createSession(code);
    }

    await recordEventSalesApplication({ ambassadorCode: code, name, email, phone, instagram, message });

    // Best-effort — staff should hear about every application, but a
    // Resend hiccup must never block the submission that already
    // succeeded.
    try {
      await sendEventSalesApplicationNotification({ name, email, phone, instagram, message, code });
    } catch (emailErr) {
      console.error("sendEventSalesApplicationNotification failed:", emailErr);
    }
  } catch (err) {
    unstable_rethrow(err);
    console.error("applySellForUsAction failed:", err);
    redirect("/sell-for-us?error=server");
  }

  redirect("/sell-for-us/thank-you");
}
