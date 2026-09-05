"use server";

import { redirect, unstable_rethrow } from "next/navigation";
import { createAmbassador, getByEmail } from "@/lib/store";
import { saveMusicianProfile, type MusicProfileLink } from "@/lib/musicianProfiles";
import { createSession, hashPassword } from "@/lib/auth";
import { sendMusicApplicationNotification } from "@/lib/email";

const LINK_FIELDS: { label: string; field: string }[] = [
  { label: "Spotify", field: "linkSpotify" },
  { label: "Apple Music", field: "linkAppleMusic" },
  { label: "SoundCloud", field: "linkSoundCloud" },
  { label: "YouTube", field: "linkYouTube" },
  { label: "TikTok", field: "linkTikTok" },
  { label: "Instagram", field: "linkInstagram" },
  { label: "Website", field: "linkWebsite" },
];

export async function applyMusicAction(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const artistName = String(formData.get("artistName") || "").trim();
  const subgenre = String(formData.get("subgenre") || "").trim();
  const tagline = String(formData.get("tagline") || "").trim();
  const bio = String(formData.get("bio") || "").trim();
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (!name || !email || !email.includes("@") || !artistName) {
    redirect("/music-collective/apply?error=missing");
  }

  const links: MusicProfileLink[] = LINK_FIELDS.map(({ label, field }) => ({
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
      if (password.length < 8) redirect("/music-collective/apply?error=weak-password");
      if (password !== confirmPassword) redirect("/music-collective/apply?error=password-mismatch");

      const passwordHash = await hashPassword(password);
      const created = await createAmbassador({ name, email, passwordHash });
      code = created.code;
      await createSession(code);
    }

    await saveMusicianProfile(code, { artistName, subgenre, tagline, bio, links });

    // Best-effort — staff should hear about every application, but a
    // Resend hiccup must never block the submission that already
    // succeeded.
    try {
      await sendMusicApplicationNotification({ name, email, artistName, subgenre, bio, code });
    } catch (emailErr) {
      console.error("sendMusicApplicationNotification failed:", emailErr);
    }
  } catch (err) {
    unstable_rethrow(err);
    console.error("applyMusicAction failed:", err);
    redirect("/music-collective/apply?error=server");
  }

  redirect("/music-collective/apply/thank-you");
}
