import Image from "next/image";
import { deleteMediaAction, uploadMediaAction } from "@/lib/actions";
import { MAX_MEDIA_BYTES, MEDIA_KINDS, type MediaItem, type MediaKind } from "@/lib/media";

function formatSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

/**
 * One account's files for one tab: upload, see what's there, delete any of
 * it. Dropped into each tab with its own `kind`, so an artist's media sits
 * under ART and a musician's under MUSIC rather than in one undifferentiated
 * pile — and so a tab someone doesn't have simply never renders an uploader.
 *
 * A Server Component wrapping two Server Actions: no client JavaScript, so
 * uploading and deleting both work before (and without) hydration.
 */
export default function MediaLibrary({
  code,
  kind,
  items,
}: {
  code: string;
  kind: MediaKind;
  items: MediaItem[];
}) {
  const meta = MEDIA_KINDS[kind];
  const mine = items.filter((item) => item.kind === kind);

  return (
    <div className="card-surface mt-8 rounded-2xl border border-border p-5 sm:p-6">
      <h3 className="font-display text-xl tracking-wide">{meta.label}</h3>
      <p className="mt-1 text-sm text-muted">{meta.blurb}</p>

      <form action={uploadMediaAction} className="mt-4 flex flex-wrap items-center gap-3">
        <input type="hidden" name="code" value={code} />
        <input type="hidden" name="kind" value={kind} />
        <input
          type="file"
          name="media"
          multiple
          accept="image/jpeg,image/png,image/webp,image/gif"
          required
          className="max-w-full text-sm text-muted file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-surface-raised file:px-4 file:py-2 file:text-sm file:font-semibold file:text-foreground"
        />
        <button type="submit" className="btn-flame rounded-full px-6 py-2.5 text-sm">
          Upload
        </button>
      </form>
      <p className="mt-2 text-xs text-muted">
        JPG, PNG, WebP or GIF, up to {MAX_MEDIA_BYTES / 1024 / 1024}MB each. You can pick several
        at once.
      </p>

      {mine.length === 0 ? (
        <p className="mt-5 rounded-xl border border-border px-4 py-3 text-sm text-muted">
          Nothing uploaded here yet.
        </p>
      ) : (
        <ul className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {mine.map((item) => (
            <li key={item.id} className="overflow-hidden rounded-xl border border-border">
              <div className="relative aspect-square bg-surface-raised">
                <Image
                  src={item.publicUrl}
                  alt={item.fileName ?? "Uploaded image"}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="object-cover"
                  // Supabase Storage hostnames vary per project, so these
                  // aren't in next.config's remotePatterns — serving them
                  // unoptimized keeps them working on any project without
                  // a config change per deployment.
                  unoptimized
                />
              </div>
              <div className="flex items-center justify-between gap-2 px-3 py-2">
                <span className="truncate text-xs text-muted" title={item.fileName ?? undefined}>
                  {formatSize(item.sizeBytes)}
                </span>
                <form action={deleteMediaAction}>
                  <input type="hidden" name="code" value={code} />
                  <input type="hidden" name="mediaId" value={item.id} />
                  <button
                    type="submit"
                    className="text-xs font-semibold text-muted uppercase transition-colors hover:text-flame-3"
                  >
                    Delete
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
