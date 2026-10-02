"use client";

import { useState, type FormEvent } from "react";

import { subscribeFooterAction } from "@/app/newsletter/actions";

/**
 * The email field in the site footer.
 *
 * Email only. Every extra box costs signups, and a first name is worth
 * less than the people who won't type one — the events form asks for more
 * because someone filling that in has already decided.
 *
 * Says the same thing whether the address was new or already on the list.
 * "You're already subscribed" would turn this box into a way of checking
 * whether a given person is on it.
 */
export default function FooterSignup() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (state === "sending") return;
    setState("sending");
    setError(null);

    const result = await subscribeFooterAction(email).catch(() => ({
      ok: false,
      error: "Couldn't sign you up right now. Please try again later.",
    }));

    if (result.ok) {
      setState("done");
      setEmail("");
      return;
    }
    setError(result.error ?? "Couldn't sign you up. Please try again.");
    setState("idle");
  }

  if (state === "done") {
    return (
      <p className="text-sm text-flame-3" role="status">
        You&apos;re on the list. Watch your inbox.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-2">
      <label htmlFor="footer-newsletter" className="text-xs font-semibold tracking-wide uppercase">
        Get the drops first
      </label>
      <div className="flex gap-2">
        <input
          id="footer-newsletter"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          className="min-w-0 flex-1 rounded-full border border-border-strong bg-surface px-4 py-2.5 text-sm outline-none focus:border-flame-2"
        />
        <button
          type="submit"
          disabled={state === "sending"}
          className="btn-flame shrink-0 rounded-full px-5 py-2.5 text-xs font-bold tracking-wide uppercase disabled:opacity-60"
        >
          {state === "sending" ? "…" : "Join"}
        </button>
      </div>
      {error && (
        <p className="text-xs text-flame-3" role="alert">
          {error}
        </p>
      )}
      <p className="text-xs text-muted">New drops, events and nothing else. Unsubscribe any time.</p>
    </form>
  );
}
