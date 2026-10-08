"use server";

import { redirect } from "next/navigation";
import { getSessionAmbassadorCode } from "@/lib/auth";
import { getByCode } from "@/lib/store";
import { reviewWorkSignup } from "@/lib/eventSales";
import { unstable_rethrow } from "next/navigation";
import { revalidatePath, revalidateTag } from "next/cache";
import {
  deleteCustomEvent,
  EVENTS_TAG,
  getCustomEvent,
  saveCustomEvent,
} from "@/lib/eventsStore";
import { portalPath } from "@/lib/portalNav";

// Shared guard for the EVENTS ADMIN tab's own actions — Super Admin or the
// eventsAdmin permission, same check the tab's data fetch already requires.
async function requireEventsAdmin() {
  const code = await getSessionAmbassadorCode();
  if (!code) redirect("/login");

  const account = await getByCode(code);
  if (!account || !(account.isSuperAdmin || account.permissions.eventsAdmin)) {
    redirect("/portal");
  }

  return account;
}

export async function reviewWorkSignupAction(formData: FormData) {
  // Gate only — it redirects if this account can't review.
  await requireEventsAdmin();

  const signupId = String(formData.get("signupId") || "").trim();
  const decision = String(formData.get("decision") || "").trim();
  if (signupId && (decision === "approved" || decision === "declined")) {
    await reviewWorkSignup(signupId, decision);
  }

  redirect("/portal/events-admin");
}

/* ------------------------------------------------------------------ */
/* Creating and editing events                                         */
/* ------------------------------------------------------------------ */

/**
 * An event is on several cached pages at once, so saving one has to
 * clear all of them. The tag covers every reader that goes through
 * lib/eventsStore; the paths are the statically rendered pages that
 * list events and would otherwise sit on the old copy until their own
 * window expired.
 */
function refreshEvents() {
  // The second argument is this Next version's cache profile, not an
  // option: revalidateTag(tag) alone does not type-check. "max" matches
  // what the Square webhook already passes.
  revalidateTag(EVENTS_TAG, "max");
  revalidatePath("/events");
  revalidatePath("/stores");
  revalidatePath("/sitemap.xml");
}

/** A textarea of one-per-line values into a trimmed array. */
function lines(formData: FormData, name: string): string[] {
  return String(formData.get(name) || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

/**
 * Money arrives as dollars because that is what a person types. Stored
 * as cents, rounded rather than truncated so 12.345 does not become
 * 12.34, and an empty field is null rather than zero: a free event and
 * an event priced at nothing are the same thing to a buyer but not to
 * the "is this ticketed" check.
 */
function cents(formData: FormData, name: string): number | null {
  const raw = String(formData.get(name) || "").trim();
  if (!raw) return null;
  const dollars = Number(raw);
  if (!Number.isFinite(dollars) || dollars < 0) return null;
  return Math.round(dollars * 100);
}

export async function saveEventAction(formData: FormData) {
  const account = await requireEventsAdmin();

  const id = String(formData.get("id") || "").trim() || undefined;
  const intent = String(formData.get("intent") || "draft");

  try {
    const result = await saveCustomEvent({
      id,
      title: String(formData.get("title") || ""),
      slug: String(formData.get("slug") || ""),
      dateLabel: String(formData.get("dateLabel") || ""),
      timeLabel: String(formData.get("timeLabel") || ""),
      venue: String(formData.get("venue") || ""),
      location: String(formData.get("location") || ""),
      category: String(formData.get("category") || "shows"),
      startDate: String(formData.get("startDate") || "").trim(),
      endDate: String(formData.get("endDate") || "").trim() || null,
      lineup: lines(formData, "lineup"),
      details: lines(formData, "details"),
      tags: String(formData.get("tags") || "").split(",").map((t) => t.trim()).filter(Boolean),
      accent: String(formData.get("accent") || ""),
      gradient: [
        String(formData.get("gradient1") || ""),
        String(formData.get("gradient2") || ""),
        String(formData.get("gradient3") || ""),
      ].filter(Boolean),
      imageUrl: String(formData.get("imageUrl") || "").trim() || null,
      href: String(formData.get("href") || "").trim() || null,
      rotate: Number(formData.get("rotate") || 0),
      priceCents: cents(formData, "price"),
      earlyBirdPriceCents: cents(formData, "earlyBirdPrice"),
      capacity: Number(formData.get("capacity") || 0) || null,
      // An unchecked checkbox sends nothing at all, so presence is the
      // state. Comparing a value would make every unticked box look like
      // a field that was never rendered.
      published: intent === "publish",
      createdBy: account.code,
    });

    if (!result.ok) {
      redirect(portalPath("events-admin", `eventError=${encodeURIComponent(result.error ?? "server")}`));
    }
    refreshEvents();
  } catch (err) {
    unstable_rethrow(err);
    console.error("saveEventAction failed:", err);
    redirect(portalPath("events-admin", "eventError=server"));
  }

  redirect(portalPath("events-admin", intent === "publish" ? "eventPublished=1" : "eventSaved=1"));
}

/** Take it off the public site without losing it or its guest list. */
export async function unpublishEventAction(formData: FormData) {
  await requireEventsAdmin();
  const id = String(formData.get("id") || "").trim();
  if (!id) redirect(portalPath("events-admin"));

  try {
    const event = await getCustomEvent(id);
    if (event) {
      await saveCustomEvent({
        ...event,
        endDate: event.endDate ?? null,
        imageUrl: event.imageUrl ?? null,
        href: event.href ?? null,
        priceCents: event.priceCents ?? null,
        earlyBirdPriceCents: event.earlyBirdPriceCents ?? null,
        published: false,
      });
      refreshEvents();
    }
  } catch (err) {
    unstable_rethrow(err);
    console.error("unpublishEventAction failed:", err);
    redirect(portalPath("events-admin", "eventError=server"));
  }

  redirect(portalPath("events-admin", "eventSaved=1"));
}

export async function deleteEventAction(formData: FormData) {
  await requireEventsAdmin();
  const id = String(formData.get("id") || "").trim();
  if (!id) redirect(portalPath("events-admin"));

  try {
    await deleteCustomEvent(id);
    refreshEvents();
  } catch (err) {
    unstable_rethrow(err);
    console.error("deleteEventAction failed:", err);
    redirect(portalPath("events-admin", "eventError=server"));
  }

  redirect(portalPath("events-admin", "eventDeleted=1"));
}
