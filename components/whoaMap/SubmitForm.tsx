"use client";

import { useState } from "react";
import HumanCheck from "@/components/forms/HumanCheck";
import PinPicker from "./PinPicker";
import { submitPinAction } from "@/app/whoa-map/actions";
import { PIN_KINDS, PIN_KIND_LABELS } from "@/lib/whoaMap";
import { MAX_MEDIA_BYTES, UPLOAD_ACCEPT } from "@/lib/media";

/**
 * Sending one in.
 *
 * A client component only because of two things: the human check needs
 * to render a widget, and the file size is worth catching here rather
 * than after somebody has waited for four megabytes to upload only to
 * be told it was too big. The submit itself is a plain form post to a
 * server action, so it still works if the JavaScript never arrives.
 */
const MAX_MB = MAX_MEDIA_BYTES / 1024 / 1024;

export default function SubmitForm() {
  const [tooBig, setTooBig] = useState<string | null>(null);

  return (
    <form action={submitPinAction} className="mt-6 flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold">How are you repping?</span>
          <select
            name="kind"
            required
            defaultValue="sticker"
            className="border-border-strong bg-surface-raised rounded-lg border px-4 py-2.5 text-sm outline-none focus:border-flame-2"
          >
            {PIN_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {PIN_KIND_LABELS[kind]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold">Your name or handle</span>
          <input
            name="uploadedBy"
            required
            maxLength={60}
            placeholder="@yourhandle"
            className="border-border-strong bg-surface-raised rounded-lg border px-4 py-2.5 text-sm outline-none focus:border-flame-2"
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold">City</span>
          <input
            name="city"
            required
            maxLength={80}
            placeholder="Lisbon"
            className="border-border-strong bg-surface-raised rounded-lg border px-4 py-2.5 text-sm outline-none focus:border-flame-2"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          {/* Not required, because most of the world has no state. */}
          <span className="font-semibold">
            State <span className="font-normal text-muted">(if you have one)</span>
          </span>
          <input
            name="region"
            maxLength={80}
            placeholder="California"
            className="border-border-strong bg-surface-raised rounded-lg border px-4 py-2.5 text-sm outline-none focus:border-flame-2"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold">Country</span>
          <input
            name="country"
            required
            maxLength={80}
            placeholder="Portugal"
            className="border-border-strong bg-surface-raised rounded-lg border px-4 py-2.5 text-sm outline-none focus:border-flame-2"
          />
        </label>
      </div>

      <PinPicker />

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-semibold">Photo of it</span>
        <input
          type="file"
          name="photo"
          required
          accept={UPLOAD_ACCEPT}
          onChange={(e) => {
            const file = e.currentTarget.files?.[0];
            // Caught before the upload rather than after it. Four
            // megabytes over a phone connection is a long wait to be
            // told it was never going to work.
            setTooBig(
              file && file.size > MAX_MEDIA_BYTES
                ? `That photo is ${(file.size / 1024 / 1024).toFixed(1)}MB. The limit is ${MAX_MB}MB, so pick a smaller one.`
                : null,
            );
          }}
          className="text-sm text-muted file:mr-3 file:rounded-full file:border-0 file:bg-surface-raised file:px-4 file:py-2 file:text-xs file:font-semibold file:tracking-wide file:uppercase"
        />
        <span className="text-xs text-muted">
          Under {MAX_MB}MB. JPG, PNG, WebP, GIF or straight off an iPhone.
        </span>
        {tooBig && <span className="text-flame-3 text-xs font-semibold">{tooBig}</span>}
      </label>

      <HumanCheck />

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={Boolean(tooBig)} className="btn-flame rounded-full px-6 py-3 text-sm font-semibold tracking-wide uppercase disabled:opacity-40">
          Put it on the map
        </button>
        <span className="text-xs text-muted">
          We look at every one before it goes up, so give it a day or two.
        </span>
      </div>
    </form>
  );
}
