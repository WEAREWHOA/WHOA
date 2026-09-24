"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import Portal from "@/components/go/Portal";
import { enterExperienceAction } from "@/app/go/actions";

/**
 * The way in. The portal turns behind the form, so the experience has
 * already started before anyone has typed anything — the account is the
 * key to the door, not a form standing in front of it.
 */
export default function GoGate({ scanned }: { scanned?: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleEnter(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await enterExperienceAction({ name, email, password });
    if (!result.ok) {
      setError(result.error ?? "Something went wrong.");
      setSubmitting(false);
      return;
    }

    // The page decides what to show from the session, so a refresh moves
    // them through the door — and because ?s= is still in the URL, a
    // scanned sticker gets stamped on that same pass.
    router.refresh();
  }

  return (
    <div className="go-root go-gate-root">
      <Portal opening={false} />

      <div className="go-gate">
        <p className="go-eyebrow">Same Same But Different</p>
        <h1 className="font-display go-title">THE SSBD EXPERIENCE</h1>
        <p className="go-gate-sub">
          {scanned
            ? "Nice find. Make a free WHOA account to keep that stamp — or sign in with one you already have."
            : "Four doors on the other side. Make a free WHOA account to step through — or sign in with one you already have."}
        </p>

        <form onSubmit={handleEnter} className="go-gate-form">
          <input
            aria-label="Your name"
            placeholder="Your name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="go-input"
          />
          <input
            type="email"
            aria-label="Email"
            placeholder="Email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="go-input"
          />
          <input
            type="password"
            aria-label="Password"
            placeholder="Password (8+ characters)"
            required
            minLength={8}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="go-input"
          />

          {error && <p className="go-error">{error}</p>}

          <button type="submit" disabled={submitting} className="go-enter">
            {submitting ? "Opening…" : "Enter"}
          </button>

          <p className="go-gate-note">
            Already have a WHOA account? Same email and password signs you in.
          </p>
        </form>
      </div>
    </div>
  );
}
