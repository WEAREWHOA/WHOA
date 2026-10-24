import { createCustomPromoCodeAction, deleteCustomPromoCodeAction } from "@/lib/actions";
import {
  PROMO_CODE_MAX,
  PROMO_CODE_MIN,
  PROMO_CODE_REJECTION_TEXT,
  type PromoCodeRejection,
} from "@/lib/promoCodes";
import type { AmbassadorLink } from "@/lib/types";
import CopyField from "./CopyField";

export type PromoCodeError = PromoCodeRejection | "taken" | "exists" | "server";

const ERROR_TEXT: Record<PromoCodeError, string> = {
  ...PROMO_CODE_REJECTION_TEXT,
  taken: "Somebody already has that one. Try another.",
  exists: "You already have a code of your own.",
  server: "Something went wrong saving that — try again.",
};

/**
 * The second promo code, the one the ambassador writes themselves.
 *
 * Their signup code is derived from their name and cannot change; this
 * is the one they choose. It is the same kind of row underneath, so it
 * carries the same 15% off and the same commission with no extra
 * wiring, and it is shown here rather than in the links list so the
 * one-per-ambassador rule has somewhere to be explained.
 */
export default function CustomPromoCode({
  signupCode,
  origin,
  custom,
  added,
  deleted,
  error,
}: {
  signupCode: string;
  origin: string;
  custom?: AmbassadorLink;
  added?: boolean;
  deleted?: boolean;
  // Comes off the query string, so it is whatever somebody put there.
  // ERROR_TEXT is keyed by the reasons the action actually redirects
  // with and anything else falls through to the generic line, rather
  // than indexing to undefined and rendering a blank banner.
  error?: string;
}) {
  return (
    <div className="card-surface rounded-xl p-6">
      <h3 className="font-semibold">Your own promo code</h3>
      <p className="mt-1 text-sm text-muted">
        {signupCode} is yours for good. On top of it you get one code you
        name yourself, and it works exactly the same way: same 15% off for
        your people, same commission back to you, tracked separately so you
        can see which one they actually use.
      </p>

      {added && custom && (
        <p className="mt-4 rounded-lg border border-flame-2/40 bg-flame-2/10 px-4 py-2 text-sm text-flame-3">
          {custom.slug} is live. Customers can type it at checkout right now.
        </p>
      )}
      {deleted && (
        <p className="mt-4 rounded-lg border border-border px-4 py-2 text-sm text-muted">
          Code released. You can claim a new one below.
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-lg border border-flame-1/40 bg-flame-1/10 px-4 py-3 text-sm text-flame-3">
          {ERROR_TEXT[error as PromoCodeError] ?? ERROR_TEXT.server}
        </p>
      )}

      {custom ? (
        <div className="mt-5 rounded-lg border border-border bg-surface-raised p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="font-mono-code text-lg text-flame">{custom.slug}</span>
            <span className="text-xs text-muted">
              {custom.clicks} click{custom.clicks === 1 ? "" : "s"}
            </span>
          </div>
          <CopyField label="Your link for it" value={`${origin}/r/${custom.slug}`} compact />
          <form action={deleteCustomPromoCodeAction} className="mt-4">
            <p className="text-xs text-muted">
              Want a different one? Releasing this code frees it up for a new
              one, but {custom.slug} stops working the moment you do, so
              anything you have already printed or posted it on goes dead.
              Sales it has already earned you are safe.
            </p>
            <button
              type="submit"
              className="mt-2 text-xs font-medium text-muted underline underline-offset-2 transition-colors hover:text-flame-1"
            >
              Release {custom.slug}
            </button>
          </form>
        </div>
      ) : (
        <form action={createCustomPromoCodeAction} className="mt-5">
          <label htmlFor="custom-promo-code" className="text-xs text-muted">
            Your code
          </label>
          <div className="mt-1.5 flex gap-2">
            <input
              id="custom-promo-code"
              name="promoCode"
              type="text"
              required
              minLength={PROMO_CODE_MIN}
              maxLength={PROMO_CODE_MAX}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              placeholder="e.g. JANEVIBES"
              className="font-mono-code flex-1 rounded-lg border border-border-strong bg-surface-raised px-4 py-2.5 text-sm uppercase outline-none focus:border-flame-2"
            />
            <button
              type="submit"
              className="shrink-0 rounded-lg border border-border-strong px-4 py-2.5 text-sm font-medium transition-colors hover:bg-surface"
            >
              Claim it
            </button>
          </div>
          <p className="mt-2 text-xs text-muted">
            {PROMO_CODE_MIN} to {PROMO_CODE_MAX} characters, letters and
            numbers only, at least one letter. Capitals either way, customers
            can type it however they like.
          </p>
        </form>
      )}
    </div>
  );
}
