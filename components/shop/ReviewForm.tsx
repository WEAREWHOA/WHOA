"use client";

import { useState, type FormEvent } from "react";

import { submitReviewAction } from "@/app/reviews/actions";

// Written out rather than imported from lib/reviews: that module reaches
// for node:crypto, Square and Supabase, and importing a constant from it
// would drag all three into the browser bundle. The server validates the
// range anyway, which is the copy that matters.
const RATING_MAX = 5;

/**
 * Writing a review.
 *
 * No account required. Making someone sign up to say what they thought
 * of a t-shirt is how a shop ends up with no reviews at all, and the
 * email is checked against Square anyway, which is a better test of
 * whether they bought it than whether they made an account.
 *
 * The form says plainly that a person reads it first. Somebody who
 * writes something and never sees it appear assumes it was swallowed, or
 * worse, that only the kind ones get published.
 */
export default function ReviewForm({
  productId,
  productSlug,
  productName,
  variationIds,
  reviewToken,
}: {
  productId: string;
  productSlug: string;
  productName: string;
  variationIds: string[];
  reviewToken?: string;
}) {
  // Somebody who followed the link in a review request email came here
  // to do exactly one thing. Making them find and press a button first
  // is a step that loses people for no reason.
  const [open, setOpen] = useState(Boolean(reviewToken));
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === "sending") return;

    const form = new FormData(event.currentTarget);
    setState("sending");
    setError(null);

    const result = await submitReviewAction({
      productId,
      productSlug,
      productName,
      variationIds,
      rating,
      title: String(form.get("title") || ""),
      body: String(form.get("body") || ""),
      authorName: String(form.get("authorName") || ""),
      authorEmail: String(form.get("authorEmail") || ""),
      reviewToken,
      website: String(form.get("website") || ""),
    }).catch(() => ({ ok: false as const, error: "Couldn't send that. Please try again." }));

    if (result.ok) {
      setState("done");
      return;
    }
    setError(result.error);
    setState("idle");
  }

  if (state === "done") {
    return (
      <p className="mt-6 rounded-xl border border-flame-2/40 bg-flame-2/10 px-4 py-3 text-sm" role="status">
        Thank you. Someone here reads every review before it goes up, so yours will appear shortly.
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-flame mt-6 rounded-full px-6 py-3 text-xs font-bold tracking-wide uppercase"
      >
        Write a review
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex max-w-xl flex-col gap-4">
      <fieldset>
        <legend className="text-xs font-semibold tracking-wide uppercase">Your rating</legend>
        <div className="mt-2 flex gap-1" onMouseLeave={() => setHovered(0)}>
          {Array.from({ length: RATING_MAX }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              onMouseEnter={() => setHovered(n)}
              aria-label={`${n} star${n === 1 ? "" : "s"}`}
              aria-pressed={rating === n}
              className={`text-2xl leading-none transition-colors ${
                n <= (hovered || rating) ? "text-flame-2" : "text-border-strong"
              }`}
            >
              ★
            </button>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-1 text-xs font-semibold tracking-wide uppercase">
        Headline
        <input
          name="title"
          maxLength={90}
          placeholder="Optional"
          className="rounded-xl border border-border-strong bg-surface px-4 py-2.5 text-sm font-normal normal-case tracking-normal outline-none focus:border-flame-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-xs font-semibold tracking-wide uppercase">
        Your review
        <textarea
          name="body"
          required
          rows={5}
          maxLength={3000}
          placeholder="How does it fit? How has it worn? Anything you'd want to know before buying."
          className="rounded-xl border border-border-strong bg-surface px-4 py-2.5 text-sm font-normal normal-case tracking-normal outline-none focus:border-flame-2"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs font-semibold tracking-wide uppercase">
          Name shown
          <input
            name="authorName"
            required
            maxLength={60}
            autoComplete="name"
            className="rounded-xl border border-border-strong bg-surface px-4 py-2.5 text-sm font-normal normal-case tracking-normal outline-none focus:border-flame-2"
          />
        </label>
        {/* Not asked for when the link already proves who they are: the
            token was issued against one order and sent to one address,
            so asking again can only introduce a typo. */}
        {!reviewToken && (
          <label className="flex flex-col gap-1 text-xs font-semibold tracking-wide uppercase">
            Email
            <input
              name="authorEmail"
              type="email"
              required
              autoComplete="email"
              className="rounded-xl border border-border-strong bg-surface px-4 py-2.5 text-sm font-normal normal-case tracking-normal outline-none focus:border-flame-2"
            />
          </label>
        )}
      </div>

      {/* Never shown to a person: off-screen, not display:none, and
          excluded from tab order and the accessibility tree. */}
      <input
        name="website"
        type="text"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
      />

      {error && (
        <p className="text-sm text-flame-3" role="alert">
          {error}
        </p>
      )}

      <p className="text-xs text-muted">
        {reviewToken
          ? "We already know this is your order, so it will show as a verified purchase. Someone here reads every review before it goes up."
          : "Your email is never shown. We use it to check the purchase against our orders and to reply if we need to. Someone here reads every review before it goes up."}
      </p>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={state === "sending" || rating === 0}
          className="btn-flame rounded-full px-6 py-3 text-xs font-bold tracking-wide uppercase disabled:opacity-50"
        >
          {state === "sending" ? "Sending…" : "Submit review"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full border border-border-strong px-6 py-3 text-xs font-semibold tracking-wide uppercase text-muted transition-colors hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
