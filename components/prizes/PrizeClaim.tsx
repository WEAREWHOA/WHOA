"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { getAccountAction } from "@/app/account/actions";
import { claimPrizeAction, getPrizeAction } from "@/app/prizes/actions";
import { REWARDS, type Reward } from "@/lib/gamePrizes";

/**
 * The gate between winning and having something to show at the counter.
 *
 * A win on its own is just a message on a phone. The code exists only
 * once there's an account behind it, which is what makes one person
 * worth one prize however many times they play.
 *
 * Shared by the snake game and the scavenger card so both claims behave
 * the same way, down to signing in and signing up being one form —
 * someone standing at the counter shouldn't have to work out which of
 * those they are.
 */
export default function PrizeClaim({
  game,
  rewards = REWARDS as readonly string[] as Reward[],
}: {
  game: "snake" | "scavenger";
  /** One option claims silently; several ask them to pick. */
  rewards?: Reward[];
}) {
  const [account, setAccount] = useState<{ name: string; email: string } | null>(null);
  const [checked, setChecked] = useState(false);
  const [held, setHeld] = useState<{ code: string; reward: string; alreadyHeld: boolean } | null>(
    null,
  );
  const [reward, setReward] = useState<Reward>(rewards[0]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;

    Promise.all([getAccountAction(), getPrizeAction(game)])
      .then(([who, prize]) => {
        if (who) {
          setAccount(who);
          setName((prev) => prev || who.name);
          setEmail((prev) => prev || who.email);
        }
        if (prize.ok && prize.code) {
          setHeld({ code: prize.code, reward: prize.reward ?? "", alreadyHeld: true });
        }
      })
      .catch((err) => {
        // Not knowing who they are shouldn't block the claim — the server
        // checks the session again anyway.
        console.error("Couldn't check the player's account:", err);
      })
      .finally(() => setChecked(true));
  }, [game]);

  function handleClaim(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    claimPrizeAction({ game, reward, name, email, password: password || undefined })
      .then((result) => {
        if (!result.ok || !result.code) {
          setError(result.error ?? "Something went wrong.");
          setSubmitting(false);
          return;
        }
        setHeld({
          code: result.code,
          reward: result.reward ?? reward,
          alreadyHeld: result.alreadyHeld === true,
        });
        setSubmitting(false);
      })
      .catch(() => {
        setError("Something went wrong. Try again in a moment.");
        setSubmitting(false);
      });
  }

  if (held) {
    return (
      <div className="prize-won">
        <p className="prize-eyebrow">{held.reward}</p>
        <p className="prize-code">{held.code}</p>
        <p className="prize-note">Show this to someone at the WHOADEGA / WHOA OASIS.</p>
        {held.alreadyHeld && (
          // Where to take it matters more than how they got back here, so
          // this goes under the instruction rather than replacing it.
          <p className="prize-note">
            This is the code already on your account — one per person.
          </p>
        )}
      </div>
    );
  }

  if (!checked) return <p className="prize-note">One moment…</p>;

  return (
    <form onSubmit={handleClaim} className="prize-form">
      {rewards.length > 1 && (
        <fieldset className="prize-picker">
          <legend className="prize-eyebrow">Pick your prize</legend>
          {rewards.map((option) => (
            <label
              key={option}
              className={`prize-option ${reward === option ? "prize-option-on" : ""}`}
            >
              <input
                type="radio"
                name="reward"
                value={option}
                checked={reward === option}
                onChange={() => setReward(option)}
              />
              {option}
            </label>
          ))}
        </fieldset>
      )}

      <p className="prize-note">
        {account
          ? "Show this to someone at the WHOADEGA / WHOA OASIS."
          : "Create a free WHOA account to claim it — it's how we know the prize is yours."}
      </p>

      {!account && (
        <>
          <input
            aria-label="Your name"
            placeholder="Your name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="prize-input"
          />
          <input
            type="email"
            aria-label="Email"
            placeholder="Email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="prize-input"
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
            className="prize-input"
          />
          <p className="prize-note">
            Already have a WHOA account? Same email and password signs you in.
          </p>
        </>
      )}

      {error && <p className="prize-error">{error}</p>}

      <button type="submit" disabled={submitting} className="prize-btn">
        {submitting ? "Claiming…" : account ? "Claim my prize" : "Create account & claim"}
      </button>
    </form>
  );
}
