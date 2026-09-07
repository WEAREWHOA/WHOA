import { randomUUID } from "crypto";
import { getSupabase } from "./supabase";
import type { AccountPermissions } from "./types";

export const MEDIA_BUCKET = "whoa-media";

/**
 * Per file, and for a whole multi-select batch, because both travel in one
 * Server Action request body.
 *
 * Sized from the platform rather than picked: Vercel caps a serverless
 * function's request body at 4.5MB, and next.config.ts asks for exactly
 * that. 4MB leaves room for the multipart overhead on top of the bytes
 * themselves. Going higher wouldn't work — it would just move the rejection
 * from our code to the platform's, which is what made uploads fail silently
 * before (Next's own default is 1MB, below an ordinary phone photo).
 */
export const MAX_MEDIA_BYTES = 4 * 1024 * 1024;

/** A batch is one request, so the same ceiling applies to all of it. */
export const MAX_MEDIA_BATCH_BYTES = MAX_MEDIA_BYTES;

export const ALLOWED_MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/**
 * What a piece of media is for. The key is both the folder inside the
 * account's own space and the thing that decides who may add one: `permission`
 * names the tab it belongs to, and an account can only upload for a tab it
 * actually has unlocked. `null` means every logged-in account — everyone has
 * a profile and a Settings tab, whatever else they are.
 */
export const MEDIA_KINDS = {
  profile: {
    label: "Profile photo",
    blurb: "Shown wherever you're featured on the site.",
    permission: null,
  },
  art: {
    label: "Art Collective media",
    blurb: "Work in progress, product shots, anything for your Art Collective profile.",
    permission: "art",
  },
  music: {
    label: "Music Collective media",
    blurb: "Press photos, cover art, flyers for your Music Collective profile.",
    permission: "music",
  },
  vendor: {
    label: "Vendor media",
    blurb: "Product and stall photos for your Artist/Vendor listings.",
    permission: "vendor",
  },
  ambassador: {
    label: "Ambassador media",
    blurb: "Photos and creative for promoting your link.",
    permission: "ambassador",
  },
  eventSales: {
    label: "Event sales media",
    blurb: "Shots from events you've worked — setups, booths, crowds.",
    permission: "eventSales",
  },
} as const satisfies Record<
  string,
  { label: string; blurb: string; permission: keyof AccountPermissions | null }
>;

export type MediaKind = keyof typeof MEDIA_KINDS;

export const MEDIA_KIND_LIST = Object.keys(MEDIA_KINDS) as MediaKind[];

export function isMediaKind(value: string): value is MediaKind {
  return (MEDIA_KIND_LIST as string[]).includes(value);
}

/** Whether this account is allowed to upload media of this kind. */
export function canUploadKind(kind: MediaKind, permissions: AccountPermissions): boolean {
  const permission = MEDIA_KINDS[kind].permission;
  return permission === null || permissions[permission];
}

/** Every kind this account can actually use, in a stable order. */
export function allowedKinds(permissions: AccountPermissions): MediaKind[] {
  return MEDIA_KIND_LIST.filter((kind) => canUploadKind(kind, permissions));
}

export interface MediaItem {
  id: string;
  ambassadorCode: string;
  kind: MediaKind;
  storagePath: string;
  publicUrl: string;
  fileName: string | null;
  contentType: string | null;
  sizeBytes: number | null;
  createdAt: string;
}

interface MediaRow {
  id: string;
  ambassador_code: string;
  kind: string;
  storage_path: string;
  public_url: string;
  file_name: string | null;
  content_type: string | null;
  size_bytes: number | null;
  created_at: string;
}

function toMediaItem(row: MediaRow): MediaItem {
  return {
    id: row.id,
    ambassadorCode: row.ambassador_code,
    kind: (isMediaKind(row.kind) ? row.kind : "profile") as MediaKind,
    storagePath: row.storage_path,
    publicUrl: row.public_url,
    fileName: row.file_name,
    contentType: row.content_type,
    sizeBytes: row.size_bytes,
    createdAt: row.created_at,
  };
}

let bucketReady = false;

/**
 * Creates the media bucket if it isn't there yet, once per server instance.
 *
 * The Art Collective bucket had to be made by hand in the Supabase dashboard
 * because a migration's `insert into storage.buckets` is rejected on many
 * projects — and when someone forgot, every upload failed with a message
 * that pointed nowhere. Creating it through the Storage API with the
 * service-role key works where that insert doesn't, so nobody has to know
 * this bucket exists.
 *
 * Public on purpose: these are storefront images. They have to be fetchable
 * by URL for Square to copy an approved product's photos into its own
 * catalog, and for the shop to serve them from cache. Writes are never
 * public — every upload goes through a Server Action holding the
 * service-role key.
 */
export async function ensureMediaBucket(): Promise<void> {
  if (bucketReady) return;

  const supabase = getSupabase();
  const { data, error } = await supabase.storage.getBucket(MEDIA_BUCKET);
  if (data && !error) {
    bucketReady = true;
    return;
  }

  const { error: createError } = await supabase.storage.createBucket(MEDIA_BUCKET, {
    public: true,
    fileSizeLimit: MAX_MEDIA_BYTES,
    allowedMimeTypes: ALLOWED_MEDIA_TYPES,
  });

  // A parallel request may have created it between our check and our
  // create; that's a success for our purposes, not a failure.
  if (createError && !/already exists/i.test(createError.message)) {
    throw new Error(`Couldn't set up media storage: ${createError.message}`);
  }

  bucketReady = true;
}

function extensionFor(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{1,5}$/.test(fromName)) return fromName;
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/gif") return "gif";
  return "jpg";
}

export class MediaError extends Error {}

/**
 * Stores one file in the account's own folder and indexes it.
 *
 * Validation happens here rather than in each caller so a new upload
 * surface can't quietly skip it.
 */
export async function uploadMedia(
  code: string,
  kind: MediaKind,
  file: File,
): Promise<MediaItem> {
  if (file.size === 0) throw new MediaError("That file is empty.");
  if (file.size > MAX_MEDIA_BYTES) {
    throw new MediaError(
      `That file is ${(file.size / 1024 / 1024).toFixed(1)}MB — the limit is ${MAX_MEDIA_BYTES / 1024 / 1024}MB.`,
    );
  }
  if (file.type && !ALLOWED_MEDIA_TYPES.includes(file.type)) {
    throw new MediaError("Only JPG, PNG, WebP and GIF images can be uploaded.");
  }

  await ensureMediaBucket();

  const normalizedCode = code.trim().toUpperCase();
  const id = randomUUID();
  const storagePath = `${normalizedCode}/${kind}/${id}.${extensionFor(file)}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const supabase = getSupabase();

  const { error: uploadError } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(storagePath, buffer, { contentType: file.type || "image/jpeg", upsert: false });
  if (uploadError) throw new MediaError(`Upload failed: ${uploadError.message}`);

  const { data: urlData } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(storagePath);

  const row = {
    id,
    ambassador_code: normalizedCode,
    kind,
    storage_path: storagePath,
    public_url: urlData.publicUrl,
    file_name: file.name || null,
    content_type: file.type || null,
    size_bytes: file.size,
  };

  const { error: insertError } = await supabase.from("account_media").insert(row);
  if (insertError) {
    // Don't leave a file nobody can see or delete behind a failed index.
    await supabase.storage.from(MEDIA_BUCKET).remove([storagePath]);
    throw new MediaError(`Couldn't save that upload: ${insertError.message}`);
  }

  return toMediaItem({ ...row, created_at: new Date().toISOString() });
}

/** Everything this account has uploaded, newest first. */
export async function listMedia(code: string): Promise<MediaItem[]> {
  const { data, error } = await getSupabase()
    .from("account_media")
    .select("*")
    .eq("ambassador_code", code.trim().toUpperCase())
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to load media: ${error.message}`);
  return (data ?? []).map((row) => toMediaItem(row as MediaRow));
}

/**
 * Removes one file, from Storage and from the index.
 *
 * Scoped to the owner in the query itself, not just by a check beforehand,
 * so a guessed id from another account can't delete someone else's photo
 * even if a caller forgets to look first.
 */
export async function deleteMedia(code: string, mediaId: string): Promise<boolean> {
  const supabase = getSupabase();
  const normalizedCode = code.trim().toUpperCase();

  const { data, error } = await supabase
    .from("account_media")
    .select("*")
    .eq("id", mediaId)
    .eq("ambassador_code", normalizedCode)
    .maybeSingle();

  if (error) throw new Error(`Failed to look up that file: ${error.message}`);
  if (!data) return false;

  const item = toMediaItem(data as MediaRow);

  // Storage first: a row with no file is a broken thumbnail the owner can
  // still remove, while a file with no row is invisible and permanent.
  const { error: removeError } = await supabase.storage
    .from(MEDIA_BUCKET)
    .remove([item.storagePath]);
  if (removeError) throw new Error(`Failed to delete that file: ${removeError.message}`);

  const { error: deleteError } = await supabase
    .from("account_media")
    .delete()
    .eq("id", mediaId)
    .eq("ambassador_code", normalizedCode);
  if (deleteError) throw new Error(`Failed to delete that file: ${deleteError.message}`);

  return true;
}
