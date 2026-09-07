import Image from "next/image";
import { deleteMediaAction } from "@/lib/actions";
import MediaUploadForm from "@/components/portal/MediaUploadForm";
import { MEDIA_KINDS, type MediaItem, type MediaKind } from "@/lib/media";

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

      <MediaUploadForm code={code} kind={kind} />

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
