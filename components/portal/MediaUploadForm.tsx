"use client";

import { useState, type ChangeEvent } from "react";
import { uploadMediaAction } from "@/lib/actions";
import {
  ALLOWED_MEDIA_TYPES,
  MAX_MEDIA_BATCH_BYTES,
  MAX_MEDIA_BYTES,
  type MediaKind,
} from "@/lib/media";

const MB = 1024 * 1024;

function mb(bytes: number): string {
  return `${(bytes / MB).toFixed(1)}MB`;
}

/**
 * Checks the picked files before anything is sent.
 *
 * Not belt-and-braces over the server check — it catches a failure the
 * server never gets to see. A request body over the platform's limit is
 * rejected while it's still being parsed, so an oversized photo would come
 * back as an unexplained error with none of our own messages attached. This
 * is the only place that failure can be described in terms the person can
 * act on.
 */
export default function MediaUploadForm({ code, kind }: { code: string; kind: MediaKind }) {
  const [problem, setProblem] = useState<string | null>(null);
  const [chosen, setChosen] = useState(0);

  function check(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    setChosen(files.length);

    const tooBig = files.find((file) => file.size > MAX_MEDIA_BYTES);
    if (tooBig) {
      setProblem(
        `"${tooBig.name}" is ${mb(tooBig.size)} — the limit is ${mb(MAX_MEDIA_BYTES)} per image. Most phones can shrink a photo when you share it, or send a screenshot of it instead.`,
      );
      return;
    }

    const total = files.reduce((sum, file) => sum + file.size, 0);
    if (total > MAX_MEDIA_BATCH_BYTES) {
      setProblem(
        `Those ${files.length} images come to ${mb(total)} together, and they all travel in one upload — keep a batch under ${mb(MAX_MEDIA_BATCH_BYTES)}, or add them a few at a time.`,
      );
      return;
    }

    const wrongType = files.find((file) => file.type && !ALLOWED_MEDIA_TYPES.includes(file.type));
    if (wrongType) {
      setProblem(`"${wrongType.name}" isn't an image we can take — use JPG, PNG, WebP or GIF.`);
      return;
    }

    setProblem(null);
  }

  return (
    <>
      <form action={uploadMediaAction} className="mt-4 flex flex-wrap items-center gap-3">
        <input type="hidden" name="code" value={code} />
        <input type="hidden" name="kind" value={kind} />
        <input
          type="file"
          name="media"
          multiple
          required
          accept={ALLOWED_MEDIA_TYPES.join(",")}
          onChange={check}
          className="max-w-full text-sm text-muted file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-surface-raised file:px-4 file:py-2 file:text-sm file:font-semibold file:text-foreground"
        />
        <button
          type="submit"
          disabled={problem !== null || chosen === 0}
          className="btn-flame rounded-full px-6 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-40"
        >
          Upload
        </button>
      </form>

      {problem ? (
        <p className="border-flame-1/40 bg-flame-1/10 text-flame-3 mt-3 rounded-lg border px-4 py-3 text-sm">
          {problem}
        </p>
      ) : (
        <p className="mt-2 text-xs text-muted">
          JPG, PNG, WebP or GIF. Up to {mb(MAX_MEDIA_BYTES)} per image, and {mb(MAX_MEDIA_BATCH_BYTES)}{" "}
          for everything you upload at once.
        </p>
      )}
    </>
  );
}
