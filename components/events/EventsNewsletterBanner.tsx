"use client";

import { useState, type FormEvent } from "react";
import { subscribeEventsNewsletterAction } from "@/app/events/actions";

export default function EventsNewsletterBanner() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; error?: string } | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);
    const outcome = await subscribeEventsNewsletterAction({ email });
    setResult(outcome);
    if (outcome.ok) setEmail("");
    setSubmitting(false);
  }

  return (
    <div className="relative z-10 mt-8 w-full max-w-xl rounded-2xl border border-white/20 bg-black/40 p-5 text-center backdrop-blur-sm">
      <p className="text-xs font-semibold tracking-wide text-white uppercase sm:text-sm">
        Sign up for our weekly event newsletter to stay in the loop on the WHOAdega, SH!FT & WHOA events
      </p>
      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <label htmlFor="newsletter-email" className="sr-only">
          Email
        </label>
        <input
          id="newsletter-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="flex-1 rounded-full border border-white/30 bg-white/10 px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/50 focus:border-flame-2"
        />
        <button
          type="submit"
          disabled={submitting}
          className="btn-flame rounded-full px-6 py-2.5 text-sm font-semibold tracking-wide uppercase disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Signing Up…" : "Sign Up"}
        </button>
      </form>
      {result && (
        <p className={`mt-3 text-xs ${result.ok ? "text-flame-2" : "text-flame-3"}`}>
          {result.ok ? "You're in — keep an eye on your inbox." : (result.error ?? "Something went wrong.")}
        </p>
      )}
    </div>
  );
}
