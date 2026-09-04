"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Script from "next/script";
import type { EventInfo } from "@/lib/events";
import { formatCents } from "@/lib/money";
import { eventRsvpAction } from "@/app/events/actions";
import { accountSignOutAction, getAccountAction } from "@/app/account/actions";
import { markRsvped } from "@/components/events/useRsvp";

interface SquareCard {
  attach: (selector: string) => Promise<void>;
  tokenize: () => Promise<{ status: string; token?: string; errors?: { message: string }[] }>;
  destroy: () => Promise<void>;
}

interface SquarePayments {
  card: () => Promise<SquareCard>;
}

declare global {
  interface Window {
    Square?: {
      payments: (appId: string, locationId: string) => Promise<SquarePayments>;
    };
  }
}

const APPLICATION_ID = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID ?? "";
const LOCATION_ID = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID ?? "";
const SQUARE_JS_SRC =
  process.env.NEXT_PUBLIC_SQUARE_ENVIRONMENT === "production"
    ? "https://web.squarecdn.com/v1/square.js"
    : "https://sandbox.web.squarecdn.com/v1/square.js";

export default function EventCheckoutModal({ event, onClose }: { event: EventInfo; onClose: () => void }) {
  const priceCents = event.priceCents ?? 0;
  const isPaid = priceCents > 0;

  const cardRef = useRef<SquareCard | null>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [scriptFailed, setScriptFailed] = useState(false);
  const [cardReady, setCardReady] = useState(!isPaid);
  const cardReadyRef = useRef(!isPaid);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [account, setAccount] = useState<{ name: string; email: string } | null>(null);
  const [accountChecked, setAccountChecked] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

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

  // Prefills name/email for a returning, already-signed-in customer and
  // hides the password field — same pattern as CheckoutForm.
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
        console.error("Failed to check event checkout account status:", err);
      })
      .finally(() => {
        if (!cancelled) setAccountChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await accountSignOutAction();
    } catch (err) {
      console.error("Failed to sign out during event checkout:", err);
    }
    setAccount(null);
    setPassword("");
    setSigningOut(false);
  }

  // Card field only exists for a paid event — a free RSVP never loads the
  // Square SDK at all.
  useEffect(() => {
    if (!isPaid || !scriptReady || cardRef.current) return;
    if (!window.Square || !APPLICATION_ID || !LOCATION_ID) return;

    let cancelled = false;

    (async () => {
      try {
        const payments = await window.Square!.payments(APPLICATION_ID, LOCATION_ID);
        const card = await payments.card();
        await card.attach("#event-card-container");
        if (cancelled) {
          await card.destroy();
          return;
        }
        cardRef.current = card;
        setCardReady(true);
      } catch (err) {
        console.error("Square card field failed to initialize:", err);
        if (!cancelled) setScriptFailed(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isPaid, scriptReady]);

  useEffect(() => {
    cardReadyRef.current = cardReady;
  }, [cardReady]);

  useEffect(() => {
    if (!isPaid) return;
    const timer = setTimeout(() => {
      if (!cardReadyRef.current) setScriptFailed(true);
    }, 10_000);
    return () => clearTimeout(timer);
  }, [isPaid]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    let token: string | undefined;
    if (isPaid) {
      if (!cardRef.current) {
        setSubmitting(false);
        return;
      }
      const tokenResult = await cardRef.current.tokenize();
      if (tokenResult.status !== "OK" || !tokenResult.token) {
        setError(tokenResult.errors?.[0]?.message ?? "Card details couldn't be verified.");
        setSubmitting(false);
        return;
      }
      token = tokenResult.token;
    }

    const outcome = await eventRsvpAction({
      eventId: event.id,
      name,
      email,
      phone: phone || undefined,
      password: account ? undefined : password || undefined,
      token,
    });

    if (!outcome.ok) {
      setError(outcome.error ?? "Something went wrong.");
      setSubmitting(false);
      return;
    }

    markRsvped(event.id);
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
            <p className="text-flame-2 text-xs font-semibold tracking-[0.2em] uppercase">
              {isPaid ? "Ticket confirmed" : "RSVP confirmed"}
            </p>
            <h3 className="font-display mt-3 text-3xl">You&apos;re in!</h3>
            <p className="mt-3 text-sm text-muted">
              {event.title} — {event.dateLabel}. A confirmation is on its way to {email}.
            </p>
            <button type="button" onClick={onClose} className="btn-flame mt-6 rounded-full px-8 py-3 text-sm">
              Done
            </button>
          </div>
        ) : (
          <>
            <span className="text-xs font-semibold tracking-[0.2em] text-muted uppercase">
              {isPaid ? "Buy ticket" : "Free RSVP"}
            </span>
            <h3 className="font-display mt-1 text-2xl">{event.title}</h3>
            <p className="mt-1 text-sm text-muted">
              {event.dateLabel} · {event.timeLabel}
            </p>

            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
              <div>
                <label htmlFor="rsvp-name" className="text-sm font-medium">
                  Name
                </label>
                <input
                  id="rsvp-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-border-strong bg-surface-raised px-4 py-3 text-sm outline-none focus:border-flame-2"
                />
              </div>

              <div>
                <label htmlFor="rsvp-email" className="text-sm font-medium">
                  Email
                </label>
                <input
                  id="rsvp-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-border-strong bg-surface-raised px-4 py-3 text-sm outline-none focus:border-flame-2"
                />
              </div>

              <div>
                <label htmlFor="rsvp-phone" className="text-sm font-medium">
                  Phone <span className="font-normal text-muted">(optional)</span>
                </label>
                <input
                  id="rsvp-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-border-strong bg-surface-raised px-4 py-3 text-sm outline-none focus:border-flame-2"
                />
              </div>

              {account ? (
                <div className="flex items-center justify-between rounded-lg border border-border-strong bg-surface-raised px-4 py-3 text-sm">
                  <span className="text-muted">
                    Signed in as <span className="text-foreground">{account.email}</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    disabled={signingOut}
                    className="text-flame font-medium underline underline-offset-2 disabled:opacity-50"
                  >
                    Not you?
                  </button>
                </div>
              ) : (
                accountChecked && (
                  <div>
                    <label htmlFor="rsvp-password" className="text-sm font-medium">
                      Password <span className="font-normal text-muted">(optional)</span>
                    </label>
                    <input
                      id="rsvp-password"
                      type="password"
                      minLength={8}
                      autoComplete="new-password"
                      placeholder="Save your info & track this in your portal — or leave blank"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="mt-2 w-full rounded-lg border border-border-strong bg-surface-raised px-4 py-3 text-sm outline-none focus:border-flame-2"
                    />
                    <p className="mt-2 text-xs text-muted">
                      Have an account already? Enter your password here to sign in.
                    </p>
                  </div>
                )
              )}

              {isPaid && (
                <div>
                  <span className="text-sm font-medium">Card</span>
                  {scriptFailed ? (
                    <div className="mt-2 rounded-lg border border-flame-1/40 bg-flame-1/10 px-4 py-3 text-sm text-flame-3">
                      Payment couldn&apos;t load — this can happen with an ad blocker or a flaky connection. Try
                      disabling any ad/tracker blockers and{" "}
                      <button
                        type="button"
                        onClick={() => window.location.reload()}
                        className="underline underline-offset-2"
                      >
                        reload the page
                      </button>
                      .
                    </div>
                  ) : (
                    <div
                      id="event-card-container"
                      className="mt-2 rounded-lg border border-border-strong bg-surface-raised px-4 py-3"
                    />
                  )}
                </div>
              )}

              {!APPLICATION_ID || !LOCATION_ID
                ? isPaid && (
                    <p className="rounded-lg border border-flame-1/40 bg-flame-1/10 px-4 py-3 text-sm text-flame-3">
                      Ticket purchases aren&apos;t configured yet — Square credentials are missing.
                    </p>
                  )
                : null}

              {error && (
                <p className="rounded-lg border border-flame-1/40 bg-flame-1/10 px-4 py-3 text-sm text-flame-3">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting || (isPaid && (!cardReady || !APPLICATION_ID || !LOCATION_ID))}
                className="btn-flame mt-2 rounded-full px-8 py-4 text-base disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Processing…" : isPaid ? `Pay ${formatCents(priceCents)}` : "Confirm RSVP"}
              </button>
            </form>

            {isPaid && (
              <Script
                src={SQUARE_JS_SRC}
                onLoad={() => setScriptReady(true)}
                onError={() => setScriptFailed(true)}
                strategy="afterInteractive"
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
