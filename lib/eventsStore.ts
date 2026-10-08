import { unstable_cache } from "next/cache";

import { EVENTS, sortEventsByProximity, type EventCategory, type EventInfo } from "./events";
import { getSupabase } from "./supabase";

/**
 * Every event, from both places it can come from.
 *
 * ───────────────────────────────────────────────────────────────────────
 * lib/events.ts stays the source of truth for the events that were
 * written by hand, and this adds the ones staff create. They are merged
 * here rather than migrated, and the hand-written ones win on a
 * collision. Two reasons, both about not breaking what already works:
 *
 *   Those ids are referenced by rsvp rows, by the SSBD crew hub, by the
 *   scavenger hunt and by the door list. A database row that could
 *   shadow one would silently rewrite the meaning of data already
 *   written against it.
 *
 *   Some carry behaviour no column describes, like the damage waiver
 *   that keys off the venue. Moving them would mean moving that in the
 *   same change that introduces the table.
 *
 * Reads fail soft: a Supabase hiccup returns the hand-written events
 * rather than an empty page, because an events page missing the custom
 * ones is a bad day and an events page missing everything is a broken
 * site. The admin reader below is the exception and throws, since
 * showing staff "no events" on a failed connection would have them
 * create duplicates.
 * ───────────────────────────────────────────────────────────────────────
 */

export const EVENTS_TAG = "custom-events";

/** The database half, with the fields the admin screen needs on top. */
export interface CustomEventRecord extends EventInfo {
  capacity: number | null;
  published: boolean;
  createdBy: string | null;
  updatedAt: string;
}

interface Row {
  id: string;
  title: string;
  date_label: string | null;
  time_label: string | null;
  venue: string | null;
  location: string | null;
  category: string | null;
  start_date: string;
  end_date: string | null;
  lineup: string[] | null;
  details: string[] | null;
  tags: string[] | null;
  accent: string | null;
  gradient: string[] | null;
  image_url: string | null;
  href: string | null;
  rotate: number | string | null;
  price_cents: number | null;
  early_bird_price_cents: number | null;
  capacity: number | null;
  published: boolean | null;
  created_by: string | null;
  updated_at: string;
}

const COLUMNS =
  "id, title, date_label, time_label, venue, location, category, start_date, end_date, lineup, details, tags, accent, gradient, image_url, href, rotate, price_cents, early_bird_price_cents, capacity, published, created_by, updated_at";

const CATEGORIES: EventCategory[] = ["whoadega", "shows", "festivals"];

function mapRow(row: Row): CustomEventRecord {
  const gradient = row.gradient ?? [];
  const accent = row.accent || "#ff7a00";

  return {
    id: row.id,
    title: row.title,
    dateLabel: row.date_label || "",
    timeLabel: row.time_label || "",
    venue: row.venue || "",
    location: row.location || "",
    category: CATEGORIES.includes(row.category as EventCategory)
      ? (row.category as EventCategory)
      : "shows",
    // Postgres hands a `date` back as yyyy-mm-dd, which is the shape the
    // rest of the app expects, but slice anyway: a column later widened
    // to timestamptz would otherwise start returning an ISO instant and
    // every date comparison in the app would quietly stop matching.
    startDate: String(row.start_date).slice(0, 10),
    endDate: row.end_date ? String(row.end_date).slice(0, 10) : undefined,
    lineup: row.lineup?.length ? row.lineup : undefined,
    details: row.details?.length ? row.details : undefined,
    tags: row.tags?.length ? row.tags : undefined,
    accent,
    // The card reads gradient[0..2] unconditionally, so a row saved
    // without one must still produce three colours rather than undefined
    // holes that render as transparent gaps.
    gradient: [gradient[0] || accent, gradient[1] || accent, gradient[2] || "#14100c"],
    imageUrl: row.image_url || undefined,
    href: row.href || undefined,
    rotate: Number(row.rotate ?? 0) || 0,
    priceCents: row.price_cents ?? undefined,
    earlyBirdPriceCents: row.early_bird_price_cents ?? undefined,
    capacity: row.capacity ?? null,
    published: row.published ?? false,
    createdBy: row.created_by,
    updatedAt: row.updated_at,
  };
}

const BUILT_IN_IDS = new Set(EVENTS.map((e) => e.id));

/** Whether this id belongs to a hand-written event and so cannot be used. */
export function isBuiltInEventId(id: string): boolean {
  return BUILT_IN_IDS.has(id);
}

async function readPublished(): Promise<EventInfo[]> {
  const { data, error } = await getSupabase()
    .from("custom_events")
    .select(COLUMNS)
    .eq("published", true)
    .order("start_date", { ascending: true });

  if (error) {
    // 0047 not run yet is the common case here and is not worth shouting
    // about on every request, but anything else is.
    console.error("Couldn't read custom events:", error.message);
    return [];
  }
  return ((data ?? []) as Row[]).map(mapRow).filter((e) => !isBuiltInEventId(e.id));
}

/**
 * Cached across requests, because this is now on the path of every
 * events page, every RSVP and every ticket purchase. The tag is
 * revalidated whenever an event is saved, so a change is visible
 * immediately rather than within the window.
 */
const publishedEvents = unstable_cache(readPublished, ["custom-events"], {
  revalidate: 300,
  tags: [EVENTS_TAG],
});

/** Everything the public can see, hand-written and created alike. */
export async function getAllEvents(): Promise<EventInfo[]> {
  try {
    const custom = await publishedEvents();
    return [...EVENTS, ...custom];
  } catch (err) {
    console.error("Couldn't load custom events, falling back to the built-in list:", err);
    return [...EVENTS];
  }
}

/** One event by id, from either source. */
export async function getEventById(id: string): Promise<EventInfo | undefined> {
  if (!id) return undefined;
  // Checked first and without touching the database: this runs on the
  // RSVP path, and a built-in event must resolve even when Supabase is
  // having a bad day.
  const builtIn = EVENTS.find((e) => e.id === id);
  if (builtIn) return builtIn;

  const all = await getAllEvents();
  return all.find((e) => e.id === id);
}

/**
 * Every event keyed by id.
 *
 * For the several places that join a list of rows against events. Those
 * were `EVENTS.find` inside a loop, which was free when EVENTS was an
 * array in memory and would be one database read per row now. One read,
 * then a map.
 */
export async function getEventMap(): Promise<Map<string, EventInfo>> {
  return new Map((await getAllEvents()).map((event) => [event.id, event]));
}

/** Upcoming first, the same ordering the events page has always used. */
export async function getUpcomingEvents(now: Date = new Date()): Promise<EventInfo[]> {
  const today = now.toISOString().slice(0, 10);
  const upcoming = (await getAllEvents()).filter((e) => (e.endDate ?? e.startDate) >= today);
  return sortEventsByProximity(upcoming, now);
}

/* ------------------------------------------------------------------ */
/* Admin                                                               */
/* ------------------------------------------------------------------ */

/**
 * Every created event, drafts included. Throws rather than degrading:
 * showing staff an empty list on a failed connection is how an event
 * gets created twice.
 */
export async function listCustomEvents(): Promise<CustomEventRecord[]> {
  const { data, error } = await getSupabase()
    .from("custom_events")
    .select(COLUMNS)
    .order("start_date", { ascending: false });
  if (error) throw new Error(`Couldn't list created events: ${error.message}`);
  return ((data ?? []) as Row[]).map(mapRow);
}

export async function getCustomEvent(id: string): Promise<CustomEventRecord | null> {
  const { data, error } = await getSupabase()
    .from("custom_events")
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Couldn't read that event: ${error.message}`);
  return data ? mapRow(data as Row) : null;
}

/** Lowercase, hyphenated, and stable for the life of the event. */
export function eventSlug(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

export interface SaveEventInput {
  /** Set when editing. The id never changes once set. */
  id?: string;
  title: string;
  slug?: string;
  dateLabel?: string;
  timeLabel?: string;
  venue?: string;
  location?: string;
  category?: string;
  startDate: string;
  endDate?: string | null;
  lineup?: string[];
  details?: string[];
  tags?: string[];
  accent?: string;
  gradient?: string[];
  imageUrl?: string | null;
  href?: string | null;
  rotate?: number;
  priceCents?: number | null;
  earlyBirdPriceCents?: number | null;
  capacity?: number | null;
  published?: boolean;
  createdBy?: string | null;
}

export interface SaveEventResult {
  ok: boolean;
  error?: string;
  id?: string;
}

export async function saveCustomEvent(input: SaveEventInput): Promise<SaveEventResult> {
  const title = input.title.trim().slice(0, 200);
  if (!title) return { ok: false, error: "A title is required." };

  const id = input.id ?? eventSlug(input.slug || title);
  if (!id) {
    return { ok: false, error: "That title doesn't make a usable URL. Add some letters or numbers." };
  }
  if (!input.id && isBuiltInEventId(id)) {
    return {
      ok: false,
      error: `"${id}" is already one of the built-in events. Change the title or the URL slug.`,
    };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.startDate)) {
    return { ok: false, error: "A start date is required." };
  }
  if (input.endDate && input.endDate < input.startDate) {
    return { ok: false, error: "The end date is before the start date." };
  }

  const price = input.priceCents ?? null;
  const earlyBird = input.earlyBirdPriceCents ?? null;
  const href = input.href?.trim() || null;

  // The same rule the table enforces, checked here so the message says
  // what to do rather than surfacing a constraint name.
  if (href && (price || earlyBird)) {
    return {
      ok: false,
      error: "An event is either ticketed here or linked out, not both. Clear the price or the link.",
    };
  }
  if (earlyBird != null && price != null && earlyBird > price) {
    return { ok: false, error: "The early bird price is higher than the door price." };
  }

  const row = {
    id,
    title,
    date_label: input.dateLabel?.trim().slice(0, 120) || "",
    time_label: input.timeLabel?.trim().slice(0, 120) || "",
    venue: input.venue?.trim().slice(0, 200) || "",
    location: input.location?.trim().slice(0, 300) || "",
    category: CATEGORIES.includes(input.category as EventCategory) ? input.category : "shows",
    start_date: input.startDate,
    end_date: input.endDate || null,
    lineup: (input.lineup ?? []).map((v) => v.trim()).filter(Boolean).slice(0, 40),
    details: (input.details ?? []).map((v) => v.trim()).filter(Boolean).slice(0, 20),
    tags: (input.tags ?? []).map((v) => v.trim()).filter(Boolean).slice(0, 12),
    accent: input.accent?.trim() || "#ff7a00",
    gradient: (input.gradient ?? []).filter(Boolean).slice(0, 3),
    image_url: input.imageUrl?.trim() || null,
    href,
    rotate: Number.isFinite(input.rotate) ? Number(input.rotate) : 0,
    price_cents: price,
    early_bird_price_cents: earlyBird,
    capacity: input.capacity && input.capacity > 0 ? Math.floor(input.capacity) : null,
    published: input.published ?? false,
    updated_at: new Date().toISOString(),
    ...(input.id ? {} : { created_by: input.createdBy ?? null }),
  };

  const { error } = await getSupabase().from("custom_events").upsert(row, { onConflict: "id" });
  if (error) {
    console.error("Couldn't save the event:", error.message);
    if (/custom_events_href_xor_price/.test(error.message)) {
      return { ok: false, error: "An event is either ticketed here or linked out, not both." };
    }
    return { ok: false, error: "Couldn't save that right now. Please try again." };
  }
  return { ok: true, id };
}

export async function deleteCustomEvent(id: string): Promise<void> {
  const { error } = await getSupabase().from("custom_events").delete().eq("id", id);
  if (error) throw new Error(`Couldn't delete that event: ${error.message}`);
}
