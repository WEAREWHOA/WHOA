"use server";

import { redirect, unstable_rethrow } from "next/navigation";
import { createAmbassador, getByEmail } from "@/lib/store";
import { saveArtProfile, type ArtLink } from "@/lib/artCollective";
import { createSession, hashPassword } from "@/lib/auth";
import { sendArtApplicationNotification } from "@/lib/email";

const LINK_FIELDS: { label: string; field: string }[] = [
  { label: "Instagram", field: "linkInstagram" },
  { label: "Etsy", field: "linkEtsy" },
  { label: "Website", field: "linkWebsite" },
  { label: "TikTok", field: "linkTikTok" },
];

export async function applyArtAction(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const artistName = String(formData.get("artistName") || "").trim();
  const medium = String(formData.get("medium") || "").trim();
  const tagline = String(formData.get("tagline") || "").trim();
  const bio = String(formData.get("bio") || "").trim();
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (!name || !email || !email.includes("@") || !artistName) {
    redirect("/art-collective/apply?error=missing");
  }

  const links: ArtLink[] = LINK_FIELDS.map(({ label, field }) => ({
    label,
    url: String(formData.get(field) || "").trim(),
  })).filter((link) => link.url.length > 0);

  try {
    // Same "do they already have an account" check as every other
    // application on the site — link to it instead of creating a
    // duplicate. A brand-new applicant sets a password here so they can
    // check back once approved; an existing account's password is never
    // touched by this form.
    const existing = await getByEmail(email);
    let code: string;

    if (existing) {
      code = existing.code;
    } else {
      if (password.length < 8) redirect("/art-collective/apply?error=weak-password");
      if (password !== confirmPassword) redirect("/art-collective/apply?error=password-mismatch");

      const passwordHash = await hashPassword(password);
      const created = await createAmbassador({ name, email, passwordHash });
      code = created.code;
      await createSession(code);
    }

    await saveArtProfile(code, { artistName, medium, tagline, bio, links });

    // Best-effort — staff should hear about every application, but a
    // Resend hiccup must never block the submission that already
    // succeeded.
    try {
      await sendArtApplicationNotification({ name, email, artistName, medium, bio, code });
    } catch (emailErr) {
      console.error("sendArtApplicationNotification failed:", emailErr);
    }
  } catch (err) {
    unstable_rethrow(err);
    console.error("applyArtAction failed:", err);
    redirect("/art-collective/apply?error=server");
  }

  redirect("/art-collective/apply/thank-you");
}
