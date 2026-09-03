"use client";

import { useState, type FormEvent } from "react";
import { submitContactAction } from "@/app/contact/actions";
import { CONTACT_TOPICS } from "@/lib/contact";

const MAX_MESSAGE = 4000;

export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState<string>(CONTACT_TOPICS[0]);
  const [message, setMessage] = useState("");
  const [focused, setFocused] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const outcome = await submitContactAction({ name, email, topic, message });

    if (!outcome.ok) {
      setError(outcome.error ?? "Something went wrong.");
      setSubmitting(false);
      return;
    }

    setSent(true);
    setSubmitting(false);
  }

  if (sent) {
    return (
      <div className="card-surface rounded-2xl p-8 text-center">
        <span className="text-psychedelic font-display text-3xl tracking-wide">Got it — WHOA.</span>
        <p className="mt-3 text-sm text-muted">
          Thanks, {name.split(" ")[0] || "friend"}. We&apos;ll get back to you soon — or hit us on
          Instagram in the meantime if it&apos;s urgent.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="card-surface relative overflow-hidden rounded-2xl p-6 sm:p-8"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-24 opacity-0 blur-3xl transition-opacity duration-700"
        style={{
          opacity: focused ? 0.35 : 0,
          background:
            "radial-gradient(closest-side, var(--flame-1), var(--flame-2) 55%, transparent 75%)",
        }}
      />

      <div className="relative grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-name" className="text-sm font-medium">
            Name
          </label>
          <input
            id="contact-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className="mt-2 w-full rounded-lg border border-border-strong bg-surface-raised px-4 py-3 text-sm outline-none transition-colors focus:border-flame-2"
          />
        </div>

        <div>
          <label htmlFor="contact-email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="contact-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className="mt-2 w-full rounded-lg border border-border-strong bg-surface-raised px-4 py-3 text-sm outline-none transition-colors focus:border-flame-2"
          />
        </div>
      </div>

      <div className="relative mt-5">
        <span className="text-sm font-medium">What&apos;s this about?</span>
        <div className="mt-2 flex flex-wrap gap-2">
          {CONTACT_TOPICS.map((t) => {
            const active = topic === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTopic(t)}
                className={`rounded-full border px-4 py-2 text-xs font-semibold tracking-wide uppercase transition-colors ${
                  active
                    ? "border-flame-2 bg-flame-2/15 text-flame-3"
                    : "border-border-strong text-muted hover:border-flame-2/50 hover:text-foreground"
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>

      <div className="relative mt-5">
        <div className="flex items-baseline justify-between">
          <label htmlFor="contact-message" className="text-sm font-medium">
            Message
          </label>
          <span className="text-xs text-muted">
            {message.length}/{MAX_MESSAGE}
          </span>
        </div>
        <textarea
          id="contact-message"
          required
          rows={5}
          maxLength={MAX_MESSAGE}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Pricing, wholesale orders, custom designs, events — whatever's on your mind."
          className="mt-2 w-full resize-none rounded-lg border border-border-strong bg-surface-raised px-4 py-3 text-sm outline-none transition-colors focus:border-flame-2"
        />
      </div>

      {error && (
        <p className="relative mt-4 rounded-lg border border-flame-1/40 bg-flame-1/10 px-4 py-3 text-sm text-flame-3">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="btn-flame relative mt-6 rounded-full px-8 py-4 text-sm font-semibold tracking-wide uppercase disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
