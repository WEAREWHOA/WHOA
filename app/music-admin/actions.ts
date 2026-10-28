"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { MediaError, uploadMedia } from "@/lib/media";
import { redirect, unstable_rethrow } from "next/navigation";
import { getSessionAmbassadorCode } from "@/lib/auth";
import { getByCode } from "@/lib/store";
import { MUSIC_ROSTER_TAG } from "@/lib/musicRoster";
import {
  listMusicianApplications,
  reviewMusician,
  setMusicianSiteHidden,
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

  // The public roster is cached for five minutes; a decision has to show
  // up on the site before then. Second argument is the cache profile this
  // Next version requires -- revalidateTag(tag) alone does not
  // type-check, and "max" is what the Square webhook uses.
  // The tag clears the cached roster read; the path clears the rendered
  // page, which is the half that was missing. Without it a decision
  // updated the data behind a page that had been built once and was
  // never asked to render again.
  revalidateTag(MUSIC_ROSTER_TAG, "max");
  revalidatePath("/music-collective");
  revalidatePath("/music-collective/[slug]", "page");

  redirect(`/portal/music-admin?musicReviewed=${decision === "approved" ? "approved" : "declined"}`);
}

/**
 * Shows or hides one approved artist on the public Music Collective
 * page, without touching whether they are approved.
 */
export async function setMusicianVisibilityAction(formData: FormData) {
  const reviewer = await requireMusicAdmin();

  const code = String(formData.get("code") || "").trim();
  const hidden = String(formData.get("hidden") || "") === "1";
  if (!code) redirect("/portal/music-admin?musicAdminError=invalid");

  try {
    await setMusicianSiteHidden(code, hidden, reviewer.code);
  } catch (err) {
    unstable_rethrow(err);
    console.error("setMusicianVisibilityAction failed:", err);
    // The one failure worth naming out loud is the unrun migration:
    // silence there means staff think somebody is hidden when they are
    // still on the site.
    const reason = err instanceof Error && err.message.includes("0050") ? "migration" : "server";
    redirect(`/portal/music-admin?musicAdminError=${reason}`);
  }

  // The tag clears the cached roster read; the path clears the rendered
  // page, which is the half that was missing. Without it a decision
  // updated the data behind a page that had been built once and was
  // never asked to render again.
  revalidateTag(MUSIC_ROSTER_TAG, "max");
  revalidatePath("/music-collective");
  revalidatePath("/music-collective/[slug]", "page");
  redirect(`/portal/music-admin?musicVisibility=${hidden ? "hidden" : "shown"}`);
}

/**
 * Adds a photo to an artist's own library, on their behalf.
 *
 * The roster builds an artist's photos from their account_media rows,
 * and the application form never asks for one, so the only way a photo
 * ever reached the page was the artist signing in and uploading it
 * themselves. An admin could already rewrite their name, bio and links
 * from this tab and still had no way to give them the one thing that
 * was missing.
 *
 * uploadMediaAction cannot do this: it requires the session to be the
 * account being uploaded for, which is right for the portal and wrong
 * here. This is the music-admin equivalent, and it files the photo
 * under the artist's code so the roster finds it exactly as it finds
 * one they uploaded themselves.
 */
export async function uploadMusicianPhotoAction(formData: FormData) {
  await requireMusicAdmin();

  const code = String(formData.get("code") || "").trim();
  if (!code) redirect("/portal/music-admin?musicAdminError=invalid");

  // Only ever an artist who has applied, so this cannot be used to file
  // media under an arbitrary account.
  const artists = await listMusicianApplications();
  const artist = artists.find((a) => a.ambassadorCode.toUpperCase() === code.toUpperCase());
  if (!artist) redirect("/portal/music-admin?musicAdminError=invalid");

  const files = formData
    .getAll("media")
    .filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) redirect("/portal/music-admin?musicAdminError=empty");

  let problem: string | null = null;
  for (const file of files) {
    try {
      // "music" rather than "profile": this is a press shot somebody
      // added for them, not a face they chose for their own account.
      await uploadMedia(artist.ambassadorCode, "music", file);
    } catch (err) {
      unstable_rethrow(err);
      console.error("uploadMusicianPhotoAction failed:", err);
      problem = err instanceof MediaError ? err.message : "server";
      break;
    }
  }

  if (problem) {
    redirect(`/portal/music-admin?musicAdminError=${encodeURIComponent(problem)}`);
  }

  revalidateTag(MUSIC_ROSTER_TAG, "max");
  revalidatePath("/music-collective");
  revalidatePath("/music-collective/[slug]", "page");
  redirect("/portal/music-admin?musicPhoto=1");
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

  // The public roster is cached for five minutes; a decision has to show
  // up on the site before then. Second argument is the cache profile this
  // Next version requires -- revalidateTag(tag) alone does not
  // type-check, and "max" is what the Square webhook uses.
  revalidateTag(MUSIC_ROSTER_TAG, "max");
  revalidatePath("/music-collective");
  revalidatePath("/music-collective/[slug]", "page");

  redirect("/portal/music-admin?musicAdminSaved=1");
}
