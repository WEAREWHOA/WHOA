"use server";

import { redirect, unstable_rethrow } from "next/navigation";
import {
  createAmbassador,
  createLink,
  deactivateAccount,
  getByCode,
  getByEmail,
  getCredentialsByCode,
  getCredentialsByEmail,
  setPayout,
  updateAccountInfo,
  updatePasswordHash,
} from "./store";
import { createSession, destroySession, getSessionAmbassadorCode, hashPassword, verifyPassword } from "./auth";
import { EVENTS } from "./events";
import { requestEventWorkSignup } from "./eventSales";
import { saveMusicianProfile, type MusicProfileLink } from "./musicianProfiles";
import {
  getArtProfile,
  saveArtProfile,
  submitArtProducts,
  uploadArtPhoto,
  type ArtLink,
  type SubmitArtProductInput,
} from "./artCollective";
import { sendEventWorkSignupNotification, sendArtProductSubmissionNotification } from "./email";
import type { PayoutSettings } from "./types";

export async function loginAction(formData: FormData) {
  const from = String(formData.get("from") || "/login");
  const identifier = String(formData.get("identifier") || "").trim();
  const password = String(formData.get("password") || "");

  if (!identifier || !password) {
    redirect(`${from}?error=missing`);
  }

  let target: string;
  try {
    const credentials = identifier.includes("@")
      ? await getCredentialsByEmail(identifier)
      : await getCredentialsByCode(identifier);

    if (!credentials) {
      redirect(`${from}?error=notfound`);
    }

    const valid = await verifyPassword(password, credentials.passwordHash);
    if (!valid) {
      redirect(`${from}?error=invalid`);
    }

    await createSession(credentials.code);
    target = `/portal/${credentials.code}`;
  } catch (err) {
    // redirect()/notFound() work by throwing — let those pass through
    // untouched and only treat genuine failures as errors.
    unstable_rethrow(err);
    console.error("loginAction failed:", err);
    redirect(`${from}?error=server`);
  }

  redirect(target);
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

// Lightweight universal signup: just email + password, no confirmation
// email. This is the front door for the shared backend portal — every
// account (customer, ambassador, vendor, musician, crew) starts here as a
// plain account with just the Customer tab. Extra tabs are unlocked by a
// Super Admin (or automatically by the full /apply ambassador flow).
export async function registerAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  if (!email || !email.includes("@")) {
    redirect("/login?mode=signup&error=missing");
  }

  if (password.length < 8) {
    redirect("/login?mode=signup&error=weak-password");
  }

  let target: string;
  try {
    const existing = await getByEmail(email);
    if (existing) {
      redirect("/login?mode=signup&error=exists");
    }

    const name = email.split("@")[0]?.replace(/[._-]+/g, " ").trim() || "Member";
    const passwordHash = await hashPassword(password);
    const ambassador = await createAmbassador({ name, email, passwordHash });

    await createSession(ambassador.code);
    target = `/portal/${ambassador.code}?new=1`;
  } catch (err) {
    unstable_rethrow(err);
    console.error("registerAction failed:", err);
    redirect("/login?mode=signup&error=server");
  }

  redirect(target);
}

export async function createLinkAction(formData: FormData) {
  const code = String(formData.get("code") || "").trim();
  const label = String(formData.get("label") || "").trim();

  const sessionCode = await getSessionAmbassadorCode();
  if (!sessionCode || sessionCode !== code) {
    redirect("/login");
  }

  if (!label) {
    redirect(`/portal/${code}?error=link`);
  }

  await createLink(code, label);
  redirect(`/portal/${code}?linkAdded=1`);
}

export async function updatePayoutAction(formData: FormData) {
  const code = String(formData.get("code") || "").trim();
  const method = String(formData.get("method") || "").trim() as PayoutSettings["method"];
  let destination = String(formData.get("destination") || "").trim();

  const sessionCode = await getSessionAmbassadorCode();
  if (!sessionCode || sessionCode !== code) {
    redirect("/login");
  }

  if (!code || !destination || !["venmo", "zelle"].includes(method)) {
    redirect(`/portal/${code}?error=payout`);
  }

  // A Venmo destination is a @handle, not a phone/email like Zelle's — if
  // someone forgets the leading @ (easy to do, unlike Zelle's field), fix
  // it up rather than sending a payment to a malformed handle.
  if (method === "venmo" && !destination.startsWith("@")) {
    destination = `@${destination}`;
  }

  await setPayout(code, { method, destination });
  redirect(`/portal/${code}?saved=1`);
}

export async function updateAccountInfoAction(formData: FormData) {
  const code = String(formData.get("code") || "").trim();
  const sessionCode = await getSessionAmbassadorCode();
  if (!sessionCode || sessionCode.toUpperCase() !== code.toUpperCase()) {
    redirect("/login");
  }

  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const instagram = String(formData.get("instagram") || "").trim();

  if (!name) redirect(`/portal/${code}?settingsError=missing`);
  if (!email || !email.includes("@")) redirect(`/portal/${code}?settingsError=email`);

  try {
    // Same "is this email already someone else's" check as registerAction —
    // just allow it when it's already this account's own email.
    const existing = await getByEmail(email);
    if (existing && existing.code.toUpperCase() !== code.toUpperCase()) {
      redirect(`/portal/${code}?settingsError=email-taken`);
    }
    await updateAccountInfo(code, { name, email, instagram: instagram || null });
  } catch (err) {
    unstable_rethrow(err);
    console.error("updateAccountInfoAction failed:", err);
    redirect(`/portal/${code}?settingsError=server`);
  }

  redirect(`/portal/${code}?settingsSaved=1`);
}

export async function changePasswordAction(formData: FormData) {
  const code = String(formData.get("code") || "").trim();
  const sessionCode = await getSessionAmbassadorCode();
  if (!sessionCode || sessionCode.toUpperCase() !== code.toUpperCase()) {
    redirect("/login");
  }

  const currentPassword = String(formData.get("currentPassword") || "");
  const newPassword = String(formData.get("newPassword") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (newPassword.length < 8) redirect(`/portal/${code}?settingsError=weak-password`);
  if (newPassword !== confirmPassword) redirect(`/portal/${code}?settingsError=password-mismatch`);

  try {
    const credentials = await getCredentialsByCode(code);
    if (!credentials) redirect(`/portal/${code}?settingsError=server`);

    const valid = await verifyPassword(currentPassword, credentials.passwordHash);
    if (!valid) redirect(`/portal/${code}?settingsError=wrong-password`);

    const passwordHash = await hashPassword(newPassword);
    await updatePasswordHash(code, passwordHash);
  } catch (err) {
    unstable_rethrow(err);
    console.error("changePasswordAction failed:", err);
    redirect(`/portal/${code}?settingsError=server`);
  }

  redirect(`/portal/${code}?passwordChanged=1`);
}

// Deactivates the login (see lib/store.ts's deactivateAccount) — never a
// real row delete, so orders/links/commissions/RSVPs tied to this account
// stay intact. Requires re-entering the current password first, same
// re-authenticate-before-anything-destructive posture most account
// settings pages use.
export async function deleteAccountAction(formData: FormData) {
  const code = String(formData.get("code") || "").trim();
  const sessionCode = await getSessionAmbassadorCode();
  if (!sessionCode || sessionCode.toUpperCase() !== code.toUpperCase()) {
    redirect("/login");
  }

  const password = String(formData.get("password") || "");

  try {
    const credentials = await getCredentialsByCode(code);
    if (!credentials) redirect(`/portal/${code}?settingsError=server`);

    const valid = await verifyPassword(password, credentials.passwordHash);
    if (!valid) redirect(`/portal/${code}?settingsError=wrong-password`);

    await deactivateAccount(code);
  } catch (err) {
    unstable_rethrow(err);
    console.error("deleteAccountAction failed:", err);
    redirect(`/portal/${code}?settingsError=server`);
  }

  await destroySession();
  redirect("/login?accountDeleted=1");
}

// Backs the EVENT SALES tab's per-event "Sign up to work" button. Requires
// the eventSales permission (granted by a Super Admin after a Sell For Us
// application) — it doesn't check the application itself, just the
// permission it results in, same as every other tab.
export async function signupToWorkEventAction(formData: FormData) {
  const code = String(formData.get("code") || "").trim();
  const eventId = String(formData.get("eventId") || "").trim();

  const sessionCode = await getSessionAmbassadorCode();
  if (!sessionCode || sessionCode.toUpperCase() !== code.toUpperCase()) {
    redirect("/login");
  }

  const account = await getByCode(code);
  if (!account?.permissions.eventSales) redirect(`/portal/${code}`);

  const event = EVENTS.find((e) => e.id === eventId);
  if (!event) redirect(`/portal/${code}`);

  const result = await requestEventWorkSignup(code, eventId);

  if (result.ok && result.id) {
    // Best-effort — the signup itself is already recorded either way.
    try {
      await sendEventWorkSignupNotification({
        name: account.name,
        email: account.email,
        eventTitle: event.title,
        eventDateLabel: event.dateLabel,
        signupId: result.id,
      });
    } catch (emailErr) {
      console.error("sendEventWorkSignupNotification failed:", emailErr);
    }
  }

  redirect(`/portal/${code}?workSignup=${result.ok ? "requested" : "error"}`);
}

// Backs the Music tab's profile form — both the initial save right after a
// Music Collective application and every edit after approval. Requires the
// music permission; an applicant whose account isn't approved yet can't
// use this to bypass review (their initial profile is saved by the
// application action itself, not this one).
export async function saveMusicianProfileAction(formData: FormData) {
  const code = String(formData.get("code") || "").trim();
  const sessionCode = await getSessionAmbassadorCode();
  if (!sessionCode || sessionCode.toUpperCase() !== code.toUpperCase()) {
    redirect("/login");
  }

  const account = await getByCode(code);
  if (!account?.permissions.music) redirect(`/portal/${code}`);

  const artistName = String(formData.get("artistName") || "").trim();
  if (!artistName) redirect(`/portal/${code}?musicError=missing`);

  const subgenre = String(formData.get("subgenre") || "").trim();
  const tagline = String(formData.get("tagline") || "").trim();
  const bio = String(formData.get("bio") || "").trim();

  const linkFields: { label: string; field: string }[] = [
    { label: "Spotify", field: "linkSpotify" },
    { label: "Apple Music", field: "linkAppleMusic" },
    { label: "SoundCloud", field: "linkSoundCloud" },
    { label: "YouTube", field: "linkYouTube" },
    { label: "TikTok", field: "linkTikTok" },
    { label: "Instagram", field: "linkInstagram" },
    { label: "Website", field: "linkWebsite" },
  ];
  const links: MusicProfileLink[] = linkFields
    .map(({ label, field }) => ({ label, url: String(formData.get(field) || "").trim() }))
    .filter((link) => link.url.length > 0);

  try {
    await saveMusicianProfile(code, { artistName, subgenre, tagline, bio, links });
  } catch (err) {
    unstable_rethrow(err);
    console.error("saveMusicianProfileAction failed:", err);
    redirect(`/portal/${code}?musicError=server`);
  }

  redirect(`/portal/${code}?musicSaved=1`);
}

const ART_LINK_FIELDS: { label: string; field: string }[] = [
  { label: "Instagram", field: "linkInstagram" },
  { label: "Etsy", field: "linkEtsy" },
  { label: "Website", field: "linkWebsite" },
  { label: "TikTok", field: "linkTikTok" },
];

// Backs the ART tab's profile form — same shape as
// saveMusicianProfileAction, plus an optional profile photo upload. A
// re-save without a new photo keeps whatever's already on file.
export async function saveArtProfileAction(formData: FormData) {
  const code = String(formData.get("code") || "").trim();
  const sessionCode = await getSessionAmbassadorCode();
  if (!sessionCode || sessionCode.toUpperCase() !== code.toUpperCase()) {
    redirect("/login");
  }

  const account = await getByCode(code);
  if (!account?.permissions.art) redirect(`/portal/${code}`);

  const artistName = String(formData.get("artistName") || "").trim();
  if (!artistName) redirect(`/portal/${code}?artError=missing`);

  const medium = String(formData.get("medium") || "").trim();
  const tagline = String(formData.get("tagline") || "").trim();
  const bio = String(formData.get("bio") || "").trim();
  const links: ArtLink[] = ART_LINK_FIELDS.map(({ label, field }) => ({
    label,
    url: String(formData.get(field) || "").trim(),
  })).filter((link) => link.url.length > 0);

  let profileImageUrl: string | undefined;
  const photo = formData.get("profileImage");
  if (photo instanceof File && photo.size > 0) {
    try {
      profileImageUrl = await uploadArtPhoto("profile", code, photo);
    } catch (err) {
      console.error("Failed to upload profile photo:", err);
    }
  }

  try {
    const existing = await getArtProfile(code);
    await saveArtProfile(code, {
      artistName,
      medium,
      tagline,
      bio,
      profileImageUrl: profileImageUrl ?? existing?.profileImageUrl ?? undefined,
      links,
    });
  } catch (err) {
    unstable_rethrow(err);
    console.error("saveArtProfileAction failed:", err);
    redirect(`/portal/${code}?artError=server`);
  }

  redirect(`/portal/${code}?artSaved=1`);
}

const MAX_ART_PRODUCTS_PER_SUBMISSION = 5;
const MAX_PHOTOS_PER_PRODUCT = 5;

// Backs the ART tab's "Submit products" form — up to 5 products in one
// batch (see lib/artCollective.ts's submitArtProducts), each with its own
// photos uploaded to Storage, plus the required online-only vs.
// online+retail/events choice shared by the whole batch. Sends one
// notification email per product so each can be approved individually
// right from the inbox; approving/declining the whole batch at once is a
// button in the ART ADMIN tab instead.
export async function submitArtProductsAction(formData: FormData) {
  const code = String(formData.get("code") || "").trim();
  const sessionCode = await getSessionAmbassadorCode();
  if (!sessionCode || sessionCode.toUpperCase() !== code.toUpperCase()) {
    redirect("/login");
  }

  const account = await getByCode(code);
  if (!account?.permissions.art) redirect(`/portal/${code}`);

  const retailChoice = String(formData.get("alsoRetailEvents") || "");
  if (retailChoice !== "yes" && retailChoice !== "no") {
    redirect(`/portal/${code}?artProductError=missing-choice`);
  }
  const alsoRetailEvents = retailChoice === "yes";

  const products: SubmitArtProductInput[] = [];
  for (let i = 0; i < MAX_ART_PRODUCTS_PER_SUBMISSION; i++) {
    const name = String(formData.get(`product-${i}-name`) || "").trim();
    if (!name) continue;

    const priceDollars = parseFloat(String(formData.get(`product-${i}-price`) || ""));
    const priceCents = Math.round(priceDollars * 100);
    if (!Number.isFinite(priceCents) || priceCents <= 0) {
      redirect(`/portal/${code}?artProductError=invalid-price`);
    }

    const files = formData
      .getAll(`product-${i}-photos`)
      .filter((f): f is File => f instanceof File && f.size > 0)
      .slice(0, MAX_PHOTOS_PER_PRODUCT);

    const photoUrls: string[] = [];
    for (const file of files) {
      try {
        photoUrls.push(await uploadArtPhoto("products", code, file));
      } catch (err) {
        console.error(`Failed to upload photo for product ${i}:`, err);
      }
    }

    products.push({
      ambassadorCode: code,
      name,
      description: String(formData.get(`product-${i}-description`) || "").trim(),
      priceCents,
      size: String(formData.get(`product-${i}-size`) || "").trim(),
      details: String(formData.get(`product-${i}-details`) || "").trim(),
      photoUrls,
      alsoRetailEvents,
    });
  }

  if (products.length === 0) redirect(`/portal/${code}?artProductError=empty`);

  try {
    const inserted = await submitArtProducts(products);
    const profile = await getArtProfile(code);
    const artistName = profile?.artistName ?? account.name;

    for (const product of inserted) {
      // Best-effort per product — one failed notification shouldn't block
      // the others, and the submission is already safely stored either way.
      try {
        await sendArtProductSubmissionNotification({
          artistName,
          email: account.email,
          productName: product.name,
          priceCents: product.priceCents,
          alsoRetailEvents: product.alsoRetailEvents,
          productId: product.id,
        });
      } catch (emailErr) {
        console.error("sendArtProductSubmissionNotification failed:", emailErr);
      }
    }
  } catch (err) {
    unstable_rethrow(err);
    console.error("submitArtProductsAction failed:", err);
    redirect(`/portal/${code}?artProductError=server`);
  }

  redirect(`/portal/${code}?artProductSubmitted=1`);
}
