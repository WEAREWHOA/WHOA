import { randomUUID } from "crypto";
import { getSupabase } from "./supabase";
import { ensureMediaBucket, MediaError, MEDIA_BUCKET, prepareImage } from "./media";
import { SITE_URL } from "./siteUrl";

/**
 * Where WHOA has turned up.
 *
 * A sticker on a lamppost in Lisbon, a hoodie on a street in Seoul.
 * People send a photograph and where they saw it, and the ones we have
 * looked at go on the map.
 *
 * Nothing reaches the public map unreviewed. A form that accepts a
 * photograph and a place name from anybody and publishes both is an
 * invitation, and what gets accepted is not always photographs of
 * stickers. Every write here lands as pending.
 */

export const PIN_KINDS = ["sticker", "apparel"] as const;
export type PinKind = (typeof PIN_KINDS)[number];

export const PIN_KIND_LABELS: Record<PinKind, string> = {
  sticker: "STICKER",
  apparel: "APPAREL",
};

export type PinStatus = "pending" | "approved" | "rejected";

export interface MapPin {
  id: string;
  kind: PinKind;
  city: string;
  region: string | null;
  country: string;
  latitude: number | null;
  longitude: number | null;
  uploadedBy: string;
  photoUrl: string;
  status: PinStatus;
  submittedAt: string;
  /** How it got its position, for the screen that reviews it. */
  locatedBy: LocatedBy | null;
}

/** What the pin's label reads, with the parts we actually have. */
export function placeLabel(pin: Pick<MapPin, "city" | "region" | "country">): string {
  return [pin.city, pin.region, pin.country].filter(Boolean).join(", ");
}

export function isPinKind(value: string): value is PinKind {
  return (PIN_KINDS as readonly string[]).includes(value);
}

/**
 * Trimmed, collapsed and cut to length.
 *
 * The cut is the point. These are free-text fields on a public map, and
 * without a ceiling the "city" is eventually a paragraph that breaks
 * the pin's label and the page around it.
 */
function clean(value: unknown, max: number): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

const LIMITS = { city: 80, region: 80, country: 80, uploadedBy: 60 };

export type LocatedBy = "pin" | "device" | "geocode";

export interface PinSubmission {
  kind: string;
  city: string;
  region: string;
  country: string;
  uploadedBy: string;
  photo: File;
  /** Dropped on the map or taken from the device. Optional. */
  latitude?: string | number | null;
  longitude?: string | number | null;
}

/**
 * A coordinate pair, or nothing.
 *
 * Both or neither: half a pair is a pin in the Atlantic. Range checked
 * as well as parsed, because these arrive from a form and a number that
 * is merely finite can still be nowhere.
 */
export function parsePoint(
  latitude: unknown,
  longitude: unknown,
): { latitude: number; longitude: number } | null {
  const rawLat = String(latitude ?? "").trim();
  const rawLng = String(longitude ?? "").trim();

  // Emptiness is checked before the numbers are, because Number("") is
  // 0 rather than NaN. Without this, a latitude with no longitude
  // beside it parses as a real pair and drops the pin off the coast of
  // Africa, which is a wrong answer that looks like a right one.
  if (!rawLat || !rawLng) return null;

  const lat = Number(rawLat);
  const lng = Number(rawLng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  // Exactly zero in both is the null island, which is what an empty
  // form field becomes if it slips through as a number. Nobody has
  // ever stuck a sticker there.
  if (lat === 0 && lng === 0) return null;

  return { latitude: lat, longitude: lng };
}

/**
 * Take a submission. Always pending, never plotted yet.
 *
 * The photograph is stored before the row is written and removed again
 * if the row fails, so a rejected insert does not leave a file in the
 * bucket that nothing references and nobody can find to delete.
 */
export async function submitPin(input: PinSubmission): Promise<void> {
  const kind = clean(input.kind, 20).toLowerCase();
  if (!isPinKind(kind)) throw new MediaError("Choose whether it's a sticker or apparel.");

  const city = clean(input.city, LIMITS.city);
  const country = clean(input.country, LIMITS.country);
  const region = clean(input.region, LIMITS.region);
  const uploadedBy = clean(input.uploadedBy, LIMITS.uploadedBy);

  if (!city) throw new MediaError("Which city was it in?");
  if (!country) throw new MediaError("Which country was it in?");
  if (!uploadedBy) throw new MediaError("Tell us what to call you.");

  // An email typed into the name box is published on a public map
  // otherwise. Refused rather than quietly stripped, so the person
  // decides what their name is instead of us guessing.
  if (uploadedBy.includes("@")) {
    throw new MediaError("Use a name or a handle rather than an email address.");
  }

  // Where they said, if they said. A submission that arrives with its
  // own point keeps it through approval rather than being geocoded
  // over the top of.
  const point = parsePoint(input.latitude, input.longitude);

  const { buffer, contentType, extension } = await prepareImage(input.photo);
  await ensureMediaBucket();

  const supabase = getSupabase();
  const id = randomUUID();
  const storagePath = `whoa-map/${id}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(storagePath, buffer, { contentType, upsert: false });
  if (uploadError) throw new MediaError(`Couldn't save that photo: ${uploadError.message}`);

  const { data: urlData } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(storagePath);

  const { error } = await supabase.from("whoa_map_pins").insert({
    id,
    kind,
    city,
    region: region || null,
    country,
    uploaded_by: uploadedBy,
    photo_url: urlData.publicUrl,
    photo_path: storagePath,
    latitude: point?.latitude ?? null,
    longitude: point?.longitude ?? null,
    located_by: point ? "pin" : null,
    status: "pending",
  });

  if (error) {
    await supabase.storage.from(MEDIA_BUCKET).remove([storagePath]);
    throw new MediaError(`Couldn't save that submission: ${error.message}`);
  }
}

interface Row {
  id: string;
  kind: PinKind;
  city: string;
  region: string | null;
  country: string;
  latitude: number | null;
  longitude: number | null;
  uploaded_by: string;
  photo_url: string;
  status: PinStatus;
  submitted_at: string;
  located_by: LocatedBy | null;
}

function toPin(row: Row): MapPin {
  return {
    id: row.id,
    kind: row.kind,
    city: row.city,
    region: row.region,
    country: row.country,
    latitude: row.latitude,
    longitude: row.longitude,
    uploadedBy: row.uploaded_by,
    photoUrl: row.photo_url,
    status: row.status,
    submittedAt: row.submitted_at,
    locatedBy: row.located_by,
  };
}

const COLUMNS =
  "id, kind, city, region, country, latitude, longitude, uploaded_by, photo_url, status, submitted_at, located_by";

/**
 * What goes on the public map: approved and placed.
 *
 * A pin the geocoder could not place is left off rather than dropped at
 * zero by zero, which is in the Atlantic and looks like a bug because
 * it is one.
 */
export async function approvedPins(limit = 500): Promise<MapPin[]> {
  const { data, error } = await getSupabase()
    .from("whoa_map_pins")
    .select(COLUMNS)
    .eq("status", "approved")
    .not("latitude", "is", null)
    .order("submitted_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Couldn't read the map: ${error.message}`);
  return ((data ?? []) as Row[]).map(toPin);
}

/**
 * How much is on the map, and who put it there.
 *
 * Both counted in the database rather than off the array the map
 * draws from, because that array stops at 500 pins. Counting it
 * gives the right answer today and quietly stops being true at pin
 * 501, with nothing anywhere saying so.
 *
 * Both match what the map shows: approved, and placed. An approved
 * pin with no coordinates is real and somebody sent it, but it is
 * not on the map, and a headline saying twelve over a map with ten
 * pins on it is a headline nobody trusts.
 */

export interface MapTotals {
  pins: number;
  /** Deduplicated. Five stickers in Lisbon is five pins, one city. */
  cities: number;
}

export async function mapTotals(): Promise<MapTotals> {
  const { data, error } = await getSupabase()
    .rpc("whoa_map_totals")
    .maybeSingle<{ pins: number; cities: number }>();

  if (error) throw new Error(`Couldn't count the map: ${error.message}`);
  return { pins: data?.pins ?? 0, cities: data?.cities ?? 0 };
}

export interface Tagger {
  /** Their own most recent spelling of their name. */
  name: string;
  pins: number;
}

export async function topTaggers(limit = 10): Promise<Tagger[]> {
  const { data, error } = await getSupabase().rpc("whoa_map_top_taggers", { p_limit: limit });

  if (error) throw new Error(`Couldn't read the leaderboard: ${error.message}`);
  return ((data ?? []) as { name: string; pins: number }[]).map((r) => ({
    name: r.name,
    pins: r.pins,
  }));
}

/** The queue, oldest first, because the person who waited longest goes first. */
export async function pendingPins(limit = 100): Promise<MapPin[]> {
  const { data, error } = await getSupabase()
    .from("whoa_map_pins")
    .select(COLUMNS)
    .eq("status", "pending")
    .order("submitted_at", { ascending: true })
    .limit(limit);

  if (error) throw new Error(`Couldn't read pending pins: ${error.message}`);
  return ((data ?? []) as Row[]).map(toPin);
}

/** Approved but unplaced: the ones somebody should look at again. */
export async function unplacedPins(limit = 50): Promise<MapPin[]> {
  const { data, error } = await getSupabase()
    .from("whoa_map_pins")
    .select(COLUMNS)
    .eq("status", "approved")
    .is("latitude", null)
    .order("submitted_at", { ascending: true })
    .limit(limit);

  if (error) throw new Error(`Couldn't read unplaced pins: ${error.message}`);
  return ((data ?? []) as Row[]).map(toPin);
}

/**
 * Turn a place into a point, using OpenStreetMap's geocoder.
 *
 * Run on approval rather than on submission: it is one outbound request
 * per pin, and there is no sense spending it, or handing a public form
 * the ability to spend it, on something nobody has agreed to show.
 *
 * Nominatim asks that clients identify themselves, so this names the
 * app and the site. Not an email, even though their policy invites one:
 * the only address to hand is a person's, and a third party's logs are
 * not somewhere to put it.
 */
export async function geocode(
  city: string,
  region: string | null,
  country: string,
): Promise<{ latitude: number; longitude: number } | null> {
  const query = [city, region, country].filter(Boolean).join(", ");
  const url =
    "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=" +
    encodeURIComponent(query);

  const response = await fetch(url, {
    headers: { "User-Agent": `WHOA map (${SITE_URL})`, "Accept-Language": "en" },
    // Their guidance is one request a second; a slow reply should give
    // up rather than hold a server action open behind it.
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) throw new Error(`Geocoder returned ${response.status}`);

  const results = (await response.json()) as { lat?: string; lon?: string }[];
  const first = results?.[0];
  if (!first?.lat || !first?.lon) return null;

  const latitude = Number(first.lat);
  const longitude = Number(first.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  return { latitude, longitude };
}

/**
 * Approve a pin and try to place it.
 *
 * A geocoder that is down or slow must not block the approval. The pin
 * goes live either way and shows up in the unplaced list, where it can
 * be retried, rather than the whole action failing and somebody having
 * to guess which half happened.
 */
export async function approvePin(id: string, reviewer: string): Promise<{ placed: boolean }> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("whoa_map_pins")
    .select("city, region, country, latitude, longitude, located_by")
    .eq("id", id)
    .single();
  if (error) throw new Error(`Couldn't find that pin: ${error.message}`);

  const place = data as {
    city: string;
    region: string | null;
    country: string;
    latitude: number | null;
    longitude: number | null;
    located_by: LocatedBy | null;
  };

  // Somebody who dropped a pin knows better than a geocoder does.
  // Geocoding over the top of it would move a sticker on a named
  // corner back to the middle of the city, which is the whole thing
  // this was built to stop.
  const already = parsePoint(place.latitude, place.longitude);

  let point = already;
  let locatedBy: LocatedBy | null = already ? (place.located_by ?? "pin") : null;

  if (!point) {
    try {
      point = await geocode(place.city, place.region, place.country);
      if (point) locatedBy = "geocode";
    } catch (err) {
      console.error(`Couldn't geocode pin ${id}:`, err);
    }
  }

  const { error: updateError } = await supabase
    .from("whoa_map_pins")
    .update({
      status: "approved",
      latitude: point?.latitude ?? null,
      longitude: point?.longitude ?? null,
      located_by: locatedBy,
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewer,
    })
    .eq("id", id);

  if (updateError) throw new Error(`Couldn't approve that pin: ${updateError.message}`);
  return { placed: Boolean(point) };
}

/**
 * Turn one down, and take the photograph with it.
 *
 * The row stays so the same thing resubmitted is recognisable, but the
 * file goes: whatever got it rejected is the reason not to keep hosting
 * it on a public bucket.
 */
export async function rejectPin(id: string, reviewer: string): Promise<void> {
  const supabase = getSupabase();

  const { data } = await supabase
    .from("whoa_map_pins")
    .select("photo_path")
    .eq("id", id)
    .single();

  const path = (data as { photo_path?: string } | null)?.photo_path;
  if (path) {
    const { error } = await supabase.storage.from(MEDIA_BUCKET).remove([path]);
    if (error) console.error(`Couldn't remove the photo for rejected pin ${id}:`, error.message);
  }

  const { error } = await supabase
    .from("whoa_map_pins")
    .update({
      status: "rejected",
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewer,
    })
    .eq("id", id);

  if (error) throw new Error(`Couldn't reject that pin: ${error.message}`);
}

/** Try the geocoder again on one that went live unplaced. */
export async function replacePin(id: string): Promise<{ placed: boolean }> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("whoa_map_pins")
    .select("city, region, country")
    .eq("id", id)
    .single();
  if (error) throw new Error(`Couldn't find that pin: ${error.message}`);

  const place = data as { city: string; region: string | null; country: string };
  const point = await geocode(place.city, place.region, place.country);
  if (!point) return { placed: false };

  const { error: updateError } = await supabase
    .from("whoa_map_pins")
    .update({ latitude: point.latitude, longitude: point.longitude, located_by: "geocode" })
    .eq("id", id);
  if (updateError) throw new Error(`Couldn't place that pin: ${updateError.message}`);

  return { placed: true };
}
