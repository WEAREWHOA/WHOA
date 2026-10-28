import { randomUUID } from "crypto";
import heicConvert from "heic-convert";
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
 * What a HEIC arrives declared as. Separate from ALLOWED_MEDIA_TYPES
 * because these are accepted at the door and converted, never stored:
 * the bucket, and anything that draws one of these files, still only
 * deals in the four web formats above.
 */
export const HEIC_MEDIA_TYPES = ["image/heic", "image/heif", "image/heic-sequence"];

/**
 * What the file picker offers. The extensions are listed as well as the
 * types because iOS hands HEIC over with an empty type often enough
 * that a types-only accept list greys out the camera roll.
 */
export const UPLOAD_ACCEPT = [...ALLOWED_MEDIA_TYPES, ...HEIC_MEDIA_TYPES, ".heic", ".heif"].join(",");

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
  event: {
    label: "Event flyers",
    blurb: "Flyers and photos for events you create. Upload here, then paste the URL into the event.",
    permission: "eventsAdmin",
  },
  blog: {
    label: "Blog images",
    blurb: "Cover photos and anything used inside a post. Upload here, then paste the URL into the editor.",
    permission: "blog",
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
    // Existing, but not necessarily public. A bucket made by hand in the
    // dashboard defaults to private, and a private one fails in the
    // worst way available: the upload succeeds, a public URL is handed
    // back and indexed, and every request for it is refused. The flyer
    // is simply missing, with the library showing it as safely stored.
    if (!data.public) {
      const { error: publicError } = await supabase.storage.updateBucket(MEDIA_BUCKET, {
        public: true,
        fileSizeLimit: MAX_MEDIA_BYTES,
        allowedMimeTypes: ALLOWED_MEDIA_TYPES,
      });
      if (publicError) {
        throw new Error(
          `The ${MEDIA_BUCKET} storage bucket is private, so uploaded images cannot be served, and it could not be made public: ${publicError.message}`,
        );
      }
    }
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

/**
 * Whether these bytes are a HEIC/HEIF photo, read from the file itself
 * rather than from what the browser called it.
 *
 * iPhones shoot HEIC by default, so this is what most flyer photos
 * arrive as. The declared type cannot be trusted for them: Safari
 * sometimes sends an empty string, and the filename is no better, so a
 * photo could pass the type check and then be stored as a .jpg that is
 * not one, which renders as a broken flyer on the public page.
 *
 * The shape is an ISO base media box: a four byte length, then "ftyp",
 * then the brand. The brands below are the ones Apple writes.
 */
const HEIF_BRANDS = new Set([
  "heic", "heix", "heim", "heis",
  "hevc", "hevx", "hevm", "hevs",
  "mif1", "msf1",
]);

function looksLikeHeif(buffer: Buffer): boolean {
  if (buffer.length < 12) return false;
  if (buffer.toString("ascii", 4, 8) !== "ftyp") return false;
  return HEIF_BRANDS.has(buffer.toString("ascii", 8, 12).toLowerCase());
}

/**
 * A HEIC photo as a JPEG the browser can draw.
 *
 * Quality 0.75 because an iPhone photo lands around 3MB there, inside
 * the limit, and 0.85 barely shrinks it at all. The second pass exists
 * for the occasional photo that is still too big after the first, which
 * is better than telling somebody their own camera's output is not
 * allowed.
 */
async function heifToJpeg(buffer: Buffer): Promise<Buffer> {
  for (const quality of [0.75, 0.5]) {
    const out = Buffer.from(
      await heicConvert({ buffer: buffer as never, format: "JPEG", quality }),
    );
    if (out.length <= MAX_MEDIA_BYTES) return out;
  }
  throw new MediaError(
    "That photo is too big to convert. Send it smaller, or screenshot it and upload that.",
  );
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
  // Read first, then decide what it is. A HEIC arrives with its type
  // declared three different ways depending on the browser, so the
  // bytes get the final say -- see looksLikeHeif.
  const original = Buffer.from(await file.arrayBuffer());
  const heif = looksLikeHeif(original);

  if (!heif && file.type && !ALLOWED_MEDIA_TYPES.includes(file.type)) {
    throw new MediaError("Only JPG, PNG, WebP, GIF and HEIC images can be uploaded.");
  }

  // Converted here rather than refused, because HEIC is what an iPhone
  // takes photographs in and telling somebody to go and convert their
  // own flyer by hand is not a limit worth having. Storage keeps the
  // JPEG: the bucket allows the four web formats and nothing drawing
  // one of these can render HEIC anyway.
  const buffer = heif ? await heifToJpeg(original) : original;
  const contentType = heif ? "image/jpeg" : file.type || "image/jpeg";
  const extension = heif ? "jpg" : extensionFor(file);

  await ensureMediaBucket();

  const normalizedCode = code.trim().toUpperCase();
  const id = randomUUID();
  const storagePath = `${normalizedCode}/${kind}/${id}.${extension}`;
  const supabase = getSupabase();

  const { error: uploadError } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(storagePath, buffer, { contentType, upsert: false });
  if (uploadError) throw new MediaError(`Upload failed: ${uploadError.message}`);

  const { data: urlData } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(storagePath);

  const row = {
    id,
    ambassador_code: normalizedCode,
    kind,
    storage_path: storagePath,
    public_url: urlData.publicUrl,
    file_name: file.name || null,
    content_type: contentType,
    // The size of what was actually stored, not of what was sent, so
    // the library's figures match the files behind them.
    size_bytes: buffer.length,
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
 * Media for several accounts at once, oldest first.
 *
 * One query per batch of accounts rather than one per account: the public
 * Music Collective roster needs photos for everybody on it, and a page
 * that fires a query per artist gets slower every time somebody is
 * approved.
 *
 * Oldest first on purpose. The first photo is the one that ends up on an
 * artist's card, and ordering newest-first would reshuffle the roster's
 * faces every time one of them uploaded a flyer.
 *
 * Paged, because PostgREST caps a response at its own db-max-rows (1,000
 * here) and silently returns a short page rather than erroring -- the same
 * cap that quietly truncated the analytics numbers. A short page is the
 * end of the data; a full one means ask again.
 */
export async function listMediaForAccounts(
  codes: string[],
  kinds: MediaKind[],
): Promise<Map<string, MediaItem[]>> {
  const byAccount = new Map<string, MediaItem[]>();
  const unique = [...new Set(codes.map((c) => c.trim().toUpperCase()))].filter(Boolean);
  if (unique.length === 0 || kinds.length === 0) return byAccount;

  const CODE_CHUNK = 50;
  const PAGE_SIZE = 1000;

  for (let i = 0; i < unique.length; i += CODE_CHUNK) {
    const chunk = unique.slice(i, i + CODE_CHUNK);

    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await getSupabase()
        .from("account_media")
        .select("*")
        .in("ambassador_code", chunk)
        .in("kind", kinds)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, from + PAGE_SIZE - 1);

      if (error) throw new Error(`Failed to load media: ${error.message}`);

      const rows = (data ?? []) as MediaRow[];
      for (const row of rows) {
        const code = row.ambassador_code;
        const list = byAccount.get(code);
        if (list) list.push(toMediaItem(row));
        else byAccount.set(code, [toMediaItem(row)]);
      }

      if (rows.length < PAGE_SIZE) break;
    }
  }

  return byAccount;
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
