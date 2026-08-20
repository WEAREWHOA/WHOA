"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { unlockSsbdAdmin, useSsbdUnlocked } from "@/components/ssbd/useSsbdAuth";

const CREW_PASSWORD = "WHOA2026";

export default function PasswordGate({ children }: { children: ReactNode }) {
  const unlocked = useSsbdUnlocked();
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (input.trim().toUpperCase() === CREW_PASSWORD) {
      unlockSsbdAdmin();
      setError(false);
    } else {
      setError(true);
    }
  }

  if (unlocked) return <>{children}</>;

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-sm flex-col items-center justify-center text-center">
      <span className="text-xs font-semibold tracking-[0.3em] text-muted uppercase">Crew only</span>
      <h1 className="text-psychedelic font-display mt-3 text-4xl tracking-wide">SSBD Admin</h1>
      <p className="mt-3 text-sm text-muted">
        Enter the crew password to access announcements, documents, and everything you need to
        help build, sell, and work the WHOADEGA booth at Same Same But Different.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 w-full">
        <input
          type="password"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setError(false);
          }}
          placeholder="Crew password"
          autoFocus
          className="w-full rounded-full border border-border-strong bg-surface px-5 py-3 text-center text-sm text-foreground placeholder:text-muted focus:border-flame-2 focus:outline-none"
        />
        {error && <p className="mt-2 text-xs text-red-400">That&apos;s not it — try again.</p>}
        <button
          type="submit"
          className="btn-flame mt-4 w-full rounded-full px-6 py-3 text-sm font-semibold tracking-wide uppercase"
        >
          Enter
        </button>
      </form>
    </div>
  );
}
