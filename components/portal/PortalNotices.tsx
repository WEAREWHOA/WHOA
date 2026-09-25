/**
 * The banners an action redirects back with.
 *
 * These live on the tabs rather than in the layout because a layout
 * can't read searchParams in the App Router — and they belong with the
 * tab that produced them anyway.
 */

const ART_REQUEST_ERROR_TEXT: Record<string, string> = {
  invalid: "That request didn't come through — try again.",
  price: "Enter a valid price, or leave it blank to keep the current one.",
  empty: "Fill in at least one field you'd like changed.",
  missing: "That product isn't live any more, so there's nothing to change.",
  server: "Something went wrong sending that request — try again.",
};

const MEDIA_ERROR_TEXT: Record<string, string> = {
  forbidden: "You don't have access to upload that kind of media.",
  empty: "Choose a file to upload first.",
  missing: "That file has already been removed.",
  server: "Something went wrong with that upload — try again.",
};

export type PortalSearchParams = Record<string, string | string[] | undefined>;

export function flag(params: PortalSearchParams | undefined, key: string): boolean {
  return params?.[key] === "1";
}

export function text(params: PortalSearchParams | undefined, key: string): string | undefined {
  const value = params?.[key];
  return typeof value === "string" ? value : undefined;
}

export default function PortalNotices({ params }: { params?: PortalSearchParams }) {
  const artRequestSent = flag(params, "artRequestSent");
  const artRequestCancelled = flag(params, "artRequestCancelled");
  const artRequestReviewed = flag(params, "artRequestReviewed");
  const artRequestError = text(params, "artRequestError");
  const artRequestMessage = artRequestError
    ? (ART_REQUEST_ERROR_TEXT[artRequestError] ?? ART_REQUEST_ERROR_TEXT.server)
    : null;

  const mediaUploaded = Number(text(params, "mediaUploaded") ?? 0);
  const mediaDeleted = flag(params, "mediaDeleted");
  const mediaError = text(params, "mediaError");
  // Anything not in the table is a specific, already-readable reason from
  // MediaError (file too big, wrong format), passed through as-is.
  const mediaMessage = mediaError ? (MEDIA_ERROR_TEXT[mediaError] ?? mediaError) : null;

  const anything =
    artRequestSent || artRequestCancelled || artRequestReviewed || artRequestMessage ||
    mediaUploaded > 0 || mediaDeleted || mediaMessage;
  if (!anything) return null;

  return (
    <div className="mt-6 flex flex-col gap-2">
      {artRequestSent && (
        <p className="border-flame-2/40 bg-flame-2/10 text-flame-3 rounded-lg border px-4 py-2 text-sm">
          Request sent — we&apos;ll review it and let you know. Nothing changes in the shop until we do.
        </p>
      )}
      {artRequestCancelled && (
        <p className="rounded-lg border border-border px-4 py-2 text-sm text-muted">
          Request withdrawn. Your listing is unchanged.
        </p>
      )}
      {artRequestReviewed && (
        <p className="border-flame-2/40 bg-flame-2/10 text-flame-3 rounded-lg border px-4 py-2 text-sm">
          Request handled.
        </p>
      )}
      {artRequestMessage && (
        <p className="border-flame-1/40 bg-flame-1/10 text-flame-3 rounded-lg border px-4 py-3 text-sm">
          {artRequestMessage}
        </p>
      )}
      {mediaUploaded > 0 && (
        <p className="rounded-lg border border-flame-2/40 bg-flame-2/10 px-4 py-2 text-sm text-flame-3">
          {mediaUploaded === 1 ? "Image uploaded." : `${mediaUploaded} images uploaded.`}
        </p>
      )}
      {mediaDeleted && (
        <p className="rounded-lg border border-flame-2/40 bg-flame-2/10 px-4 py-2 text-sm text-flame-3">
          Image deleted.
        </p>
      )}
      {mediaMessage && (
        <p className="rounded-lg border border-flame-1/40 bg-flame-1/10 px-4 py-3 text-sm text-flame-3">
          {mediaMessage}
        </p>
      )}
    </div>
  );
}
