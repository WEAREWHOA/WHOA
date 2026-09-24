"use client";

import { useEffect, useState, type FormEvent } from "react";
import { getAccountAction } from "@/app/account/actions";
import { claimWaterPrizeAction } from "@/app/water/actions";
import { saveWaterCode } from "@/components/water/waterPrize";

/**
 * The gate between winning and having something to show at the counter.
 *
 * A win on its own is just a message on a phone. The code only exists
 * once there's an account behind it, which is what makes one person worth
 * one sticker no matter how many bottles they pick up.
 *
 * Signing in and signing up are the same form on purpose — someone who
 * just scanned a bottle shouldn't have to work out which one they are.
 */
export default function ClaimPrize({ code }: { code?: string }) {
  const [account, setAccount] = useState<{ name: string; email: string } | null>(null);
  const [checked, setChecked] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alreadyHeld, setAlreadyHeld] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getAccountAction()
      .then((result) => {
        if (cancelled) return;
        setAccount(result);
        if (result) {
          setName((prev) => prev || result.name);
          setEmail((prev) => prev || result.email);
        }
      })
      .catch((err) => {
        // Not knowing whether they're signed in shouldn't block the claim
        // — the server checks the session again anyway.
        console.error("Couldn't check the H2WHOA visitor's account:", err);
      })
      .finally(() => {
        if (!cancelled) setChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleClaim(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await claimWaterPrizeAction({ name, email, password: password || undefined });

    if (!result.ok || !result.code) {
      setError(result.error ?? "Something went wrong.");
      setSubmitting(false);
      return;
    }

    setAlreadyHeld(result.alreadyHeld === true);
    saveWaterCode(result.code);
    setSubmitting(false);
  }

  if (code) {
    return (
      <>
        <p className="water-code mt-5">{code}</p>
        {alreadyHeld && (
          <p className="mt-3 text-xs text-[#6f909c]">
            This is the code already on your account — one sticker per person.
          </p>
        )}
        <p className="mt-3 text-xs text-[#6f909c]">
          4847 Newport Ave, San Diego · saved to your WHOA account
        </p>
      </>
    );
  }

  if (!checked) {
    return <p className="mt-5 text-sm text-[#6f909c]">One moment…</p>;
  }

  return (
    <form onSubmit={handleClaim} className="mt-6 flex flex-col gap-3 text-left">
      <p className="text-center text-sm text-[#a9c9d4]">
        {account
          ? "Show this to someone at the WHOADEGA / WHOA OASIS."
          : "Create a free WHOA account to claim it — it takes a second, and it's how we know the sticker is yours."}
      </p>

      {!account && (
        <>
          <input
            aria-label="Your name"
            placeholder="Your name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="water-input"
          />
          <input
            type="email"
            aria-label="Email"
            placeholder="Email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="water-input"
          />
          <input
            type="password"
            aria-label="Password"
            placeholder="Password (8+ characters)"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="water-input"
          />
          <p className="text-xs text-[#6f909c]">
            Already have a WHOA account? Use the same email and password to sign in.
          </p>
        </>
      )}

      {error && (
        <p className="rounded-lg border border-[#ff6b4a]/40 bg-[#ff6b4a]/10 px-3 py-2 text-sm text-[#ff9b7a]">
          {error}
        </p>
      )}

      <button type="submit" disabled={submitting} className="water-btn mt-1 w-full">
        {submitting ? "Claiming…" : account ? "Claim my sticker" : "Create account & claim"}
      </button>
    </form>
  );
}
