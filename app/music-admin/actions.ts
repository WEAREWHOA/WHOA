"use server";

import { redirect, unstable_rethrow } from "next/navigation";
import { getSessionAmbassadorCode } from "@/lib/auth";
import { getByCode } from "@/lib/store";
import {
  reviewMusician,
  saveMusicianProfile,
  type MusicProfileLink,
} from "@/lib/musicianProfiles";

// Shared guard for the MUSIC ADMIN tab's own actions -- Super Admin or the
// musicAdmin permission, the same check the tab's data fetch already
// requires. Deliberately not satisfied by holding `music`: an artist in
// the collective does not get to approve the next one.
async function requireMusicAdmin() {
  const code = await getSessionAmbassadorCode();
  if (!code) redirect("/login");

  const account = await getByCode(code);
  if (!account || !(account.isSuperAdmin || account.permissions.musicAdmin)) {
    redirect("/portal");
  }

  return account;
}

const LINK_FIELDS: { label: string; field: string }[] = [
  { label: "Spotify", field: "linkSpotify" },
  { label: "Apple Music", field: "linkAppleMusic" },
  { label: "SoundCloud", field: "linkSoundCloud" },
  { label: "YouTube", field: "linkYouTube" },
  { label: "TikTok", field: "linkTikTok" },
  { label: "Instagram", field: "linkInstagram" },
  { label: "Website", field: "linkWebsite" },
];

/**
 * Approves or declines one applicant.
 *
 * Approving grants the MUSIC tab and emails them; declining takes the tab
 * away again, which is also how an artist is removed from the roster
 * later. Both land back on the tab with a banner, because the row moves
 * to a different group and otherwise it just vanishes.
 */
export async function reviewMusicianAction(formData: FormData) {
  const reviewer = await requireMusicAdmin();

  const code = String(formData.get("code") || "").trim();
  const decision = String(formData.get("decision") || "").trim();
  const note = String(formData.get("note") || "").trim();

  if (!code || (decision !== "approved" && decision !== "declined")) {
    redirect("/portal/music-admin?musicAdminError=invalid");
  }

  try {
    await reviewMusician(code, decision as "approved" | "declined", {
      reviewedBy: reviewer.code,
      note,
    });
  } catch (err) {
    unstable_rethrow(err);
    console.error("reviewMusicianAction failed:", err);
    redirect("/portal/music-admin?musicAdminError=server");
  }

  redirect(`/portal/music-admin?musicReviewed=${decision === "approved" ? "approved" : "declined"}`);
}

/**
 * Edits an artist's profile on their behalf.
 *
 * The same row the artist edits in their own MUSIC tab, saved through the
 * same function -- staff fixing a dead Spotify link or a typo'd stage
 * name should not produce a second, divergent copy of the profile. The
 * artist can still change any of it back.
 */
export async function saveMusicianProfileAsAdminAction(formData: FormData) {
  await requireMusicAdmin();

  const code = String(formData.get("code") || "").trim();
  const artistName = String(formData.get("artistName") || "").trim();
  if (!code || !artistName) {
    redirect("/portal/music-admin?musicAdminError=missing");
  }

  const links: MusicProfileLink[] = LINK_FIELDS.map(({ label, field }) => ({
    label,
    url: String(formData.get(field) || "").trim(),
  })).filter((link) => link.url.length > 0);

  try {
    await saveMusicianProfile(code, {
      artistName,
      subgenre: String(formData.get("subgenre") || "").trim(),
      tagline: String(formData.get("tagline") || "").trim(),
      bio: String(formData.get("bio") || "").trim(),
      links,
    });
  } catch (err) {
    unstable_rethrow(err);
    console.error("saveMusicianProfileAsAdminAction failed:", err);
    redirect("/portal/music-admin?musicAdminError=server");
  }

  redirect("/portal/music-admin?musicAdminSaved=1");
}
