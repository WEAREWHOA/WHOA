"use client";

import { useState } from "react";
import type { MediaItem } from "@/lib/media";

/**
 * Choosing the flyer, instead of copying a URL between two panels.
 *
 * The field was a bare text input and the uploader was somewhere else on
 * the page, so getting a flyer onto an event meant uploading it, finding
 * its URL, copying that, scrolling back and pasting. Miss the last step
 * and the upload has plainly worked while the event still has no image,
 * with nothing anywhere saying why.
 *
 * So the uploads are here, as thumbnails, and picking one fills the
 * field. The field stays, because a URL from somewhere else is still
 * allowed, and it still posts under the same name either way.
 *
 * The preview is the other half. An image that will not load is the one
 * thing this form could never tell you about until it was on the public
 * page, and it is exactly what a pasted share link does.
 */
export default function FlyerPicker({
  defaultValue,
  media,
}: {
  defaultValue: string;
  media: MediaItem[];
}) {
  const [value, setValue] = useState(defaultValue);
  // Keyed by URL so switching images clears the previous verdict rather
  // than carrying a failure over to a picture that is fine.
  const [failed, setFailed] = useState<string | null>(null);

  const trimmed = value.trim();
  const showPreview = trimmed.length > 0;

  return (
    <div>
      <label htmlFor="ev-image" className="text-sm font-medium">
        Flyer image
      </label>

      <input
        id="ev-image"
        name="imageUrl"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setFailed(null);
        }}
        placeholder="https://..."
        className="border-border-strong bg-surface-raised mt-2 w-full rounded-lg border px-4 py-3 text-sm outline-none focus:border-flame-2"
      />

      {media.length > 0 ? (
        <>
          <p className="mt-3 text-xs text-muted">
            Tap one of your uploads to use it, or paste a URL above.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {media.map((item) => {
              const chosen = item.publicUrl === trimmed;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setValue(item.publicUrl);
                    setFailed(null);
                  }}
                  title={item.fileName ?? "Uploaded image"}
                  aria-pressed={chosen}
                  className={`relative h-20 w-20 overflow-hidden rounded-lg border transition-colors ${
                    chosen ? "border-flame-2" : "border-border hover:border-flame-2/60"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.publicUrl}
                    alt={item.fileName ?? ""}
                    className="h-full w-full object-cover"
                  />
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <p className="mt-2 text-xs text-muted">
          Nothing uploaded yet. Use the Images panel below, and what you add appears here to pick
          from.
        </p>
      )}

      {showPreview && (
        <div className="mt-3">
          {failed === trimmed ? (
            <p className="border-flame-1/40 bg-flame-1/10 text-flame-3 rounded-lg border px-4 py-3 text-sm">
              That image isn&apos;t loading, so the card would show the gradient instead. A Dropbox
              or Drive share link is a web page rather than the picture itself. Upload it below and
              pick it from there.
            </p>
          ) : (
            <div className="border-border relative h-40 w-full max-w-xs overflow-hidden rounded-lg border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={trimmed}
                alt="Flyer preview"
                onError={() => setFailed(trimmed)}
                className="h-full w-full object-cover"
              />
            </div>
          )}
        </div>
      )}

      <p className="mt-2 text-xs text-muted">
        Left blank, the card uses the gradient below instead.
      </p>
    </div>
  );
}
