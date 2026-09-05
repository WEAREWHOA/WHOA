"use client";

import { useEffect, useState, type FormEvent } from "react";
import { subscribeEventsNewsletterAction } from "@/app/events/actions";

export default function NewsletterSignupModal({ onClose }: { onClose: () => void }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const outcome = await subscribeEventsNewsletterAction({ firstName, lastName, email, phone: phone || undefined });
    if (!outcome.ok) {
      setError(outcome.error ?? "Something went wrong.");
      setSubmitting(false);
      return;
    }

    setDone(true);
    setSubmitting(false);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div aria-hidden className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      <div
        className="card-surface relative z-10 w-full max-w-md rounded-2xl border border-border-strong p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full border border-border-strong text-lg text-muted hover:text-foreground"
        >
          ×
        </button>

        {done ? (
          <div className="flex flex-col items-center py-6 text-center">
            <p className="text-flame-2 text-xs font-semibold tracking-[0.2em] uppercase">Signed up</p>
            <h3 className="font-display mt-3 text-3xl">You&apos;re in!</h3>
            <p className="mt-3 text-sm text-muted">
              Keep an eye on your inbox for what&apos;s next at the WHOAdega, SH!FT, and beyond.
            </p>
            <button type="button" onClick={onClose} className="btn-flame mt-6 rounded-full px-8 py-3 text-sm">
              Done
            </button>
          </div>
        ) : (
          <>
            <span className="text-xs font-semibold tracking-[0.2em] text-muted uppercase">Event Newsletter</span>
            <h3 className="font-display mt-1 text-2xl">Stay in the loop</h3>
            <p className="mt-1 text-sm text-muted">
              Weekly updates on the WHOAdega, SH!FT & WHOA events.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="newsletter-first-name" className="text-sm font-medium">
                    First name
                  </label>
                  <input
                    id="newsletter-first-name"
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-border-strong bg-surface-raised px-4 py-3 text-sm outline-none focus:border-flame-2"
                  />
                </div>
                <div>
                  <label htmlFor="newsletter-last-name" className="text-sm font-medium">
                    Last name
                  </label>
                  <input
                    id="newsletter-last-name"
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-border-strong bg-surface-raised px-4 py-3 text-sm outline-none focus:border-flame-2"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="newsletter-phone" className="text-sm font-medium">
                  Phone <span className="font-normal text-muted">(optional)</span>
                </label>
                <input
                  id="newsletter-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-border-strong bg-surface-raised px-4 py-3 text-sm outline-none focus:border-flame-2"
                />
              </div>

              <div>
                <label htmlFor="newsletter-email" className="text-sm font-medium">
                  Email
                </label>
                <input
                  id="newsletter-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-border-strong bg-surface-raised px-4 py-3 text-sm outline-none focus:border-flame-2"
                />
              </div>

              {error && (
                <p className="rounded-lg border border-flame-1/40 bg-flame-1/10 px-4 py-3 text-sm text-flame-3">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="btn-flame mt-2 rounded-full px-8 py-4 text-base disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Signing Up…" : "Sign Up"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
