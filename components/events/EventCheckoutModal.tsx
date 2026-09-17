"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Script from "next/script";
import { getCurrentPriceCents, type EventInfo } from "@/lib/events";
import { formatCents } from "@/lib/money";
import { eventRsvpAction } from "@/app/events/actions";
import { accountSignOutAction, getAccountAction } from "@/app/account/actions";
import { markRsvped } from "@/components/events/useRsvp";
import WalletButtons, { type WalletBuyer } from "@/components/checkout/WalletButtons";
import { eventCheckoutDraft, newReferenceId, type EventCheckoutDraft } from "@/lib/checkoutDrafts";
import {
  SQUARE_APPLICATION_ID as APPLICATION_ID,
  SQUARE_CARD_STYLE,
  SQUARE_JS_SRC,
  SQUARE_LOCATION_ID as LOCATION_ID,
  type SquareCard,
} from "@/lib/squareWeb";

export default function EventCheckoutModal({
  event,
  waiverAgreed,
  restored,
  onClose,
}: {
  event: EventInfo;
  // Whether the user already agreed to the damage-responsibility waiver in
  // the modal shown before this one — see EventsGrid.tsx. Only relevant for
  // events requiresDamageWaiver flags; ignored otherwise.
  waiverAgreed?: boolean;
  // A ticket form parked before a Cash App Pay redirect, handed back by
  // EventsGrid when the customer lands here again — see
  // lib/checkoutDrafts.ts.
  restored?: EventCheckoutDraft;
  onClose: () => void;
}) {
  const priceCents = getCurrentPriceCents(event);
  const isPaid = priceCents > 0;

  const cardRef = useRef<SquareCard | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [referenceId] = useState(() => restored?.referenceId || newReferenceId("ticket"));
  const [scriptReady, setScriptReady] = useState(false);
  const [scriptFailed, setScriptFailed] = useState(false);
  const [cardReady, setCardReady] = useState(!isPaid);
  const cardReadyRef = useRef(!isPaid);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  // Where the ticket was actually sent — with a wallet that can be the
  // email Apple Pay supplied, not whatever is sitting in the form field.
  const [sentTo, setSentTo] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const [name, setName] = useState(restored?.name ?? "");
  const [email, setEmail] = useState(restored?.email ?? "");
  const [phone, setPhone] = useState(restored?.phone ?? "");
  const [selectedArtist, setSelectedArtist] = useState(restored?.selectedArtist ?? "");
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

  // The Square <Script> tag's onLoad callback only reliably fires the
  // first time it's ever injected — opening this modal again (or landing
  // back on checkout after navigating away and back) mounts a fresh
  // <Script> while the browser has already loaded that src, so onLoad can
  // silently never fire for this mount even though window.Square is right
  // there. Poll for it directly as a fallback so scriptReady still flips
  // true, instead of the 10s timeout below wrongly reporting an ad blocker.
  useEffect(() => {
    if (!isPaid || scriptReady) return;
    const check = () => {
      if (window.Square) setScriptReady(true);
    };
    const immediate = setTimeout(check, 0);
    const interval = setInterval(check, 200);
    return () => {
      clearTimeout(immediate);
      clearInterval(interval);
    };
  }, [isPaid, scriptReady]);

  // Card field only exists for a paid event — a free RSVP never loads the
  // Square SDK at all.
  useEffect(() => {
    if (!isPaid || !scriptReady || cardRef.current) return;
    if (!window.Square || !APPLICATION_ID || !LOCATION_ID) return;

    let cancelled = false;

    (async () => {
      try {
        const payments = await window.Square!.payments(APPLICATION_ID, LOCATION_ID);
        const card = await payments.card({ style: SQUARE_CARD_STYLE });
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
      // Hand the card iframe back to Square on the way out. Without this it
      // was simply abandoned, so every visit to this form left another live
      // cross-origin frame behind and the SDK was never told the old field
      // was finished with.
      const card = cardRef.current;
      cardRef.current = null;
      if (card) void card.destroy().catch(() => {});
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

  function saveDraft() {
    eventCheckoutDraft.save({
      eventId: event.id,
      name,
      email,
      phone,
      selectedArtist,
      waiverAgreed: waiverAgreed === true,
      referenceId,
    });
  }

  // Square's sourceId is the same field whether the token came from the
  // card field or from Apple Pay / Google Pay / Cash App Pay, so the
  // server action below doesn't need to know which one it was.
  async function submitWithToken(token: string | undefined, buyer?: WalletBuyer) {
    // A ticket needs a name and an email to send the QR code to. Apple Pay
    // and Google Pay supply both, so buying one needn't mean typing them.
    const buyerName = buyer?.name?.trim() || name;
    const buyerEmail = buyer?.email?.trim() || email;

    if (!buyerName || !buyerEmail) {
      setError("Add your name and email below, then try again.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const outcome = await eventRsvpAction({
      eventId: event.id,
      name: buyerName,
      email: buyerEmail,
      phone: buyer?.phone?.trim() || phone || undefined,
      selectedArtist: selectedArtist || undefined,
      password: account ? undefined : password || undefined,
      token,
      waiverAgreed,
    });

    if (!outcome.ok) {
      setError(outcome.error ?? "Something went wrong.");
      setSubmitting(false);
      return;
    }

    eventCheckoutDraft.clear();
    setSentTo(buyerEmail);
    markRsvped(event.id);
    setQrDataUrl(outcome.qrDataUrl ?? null);
    setDone(true);
    setSubmitting(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!isPaid) {
      await submitWithToken(undefined);
      return;
    }

    if (!cardRef.current) return;

    setSubmitting(true);
    setError(null);

    const tokenResult = await cardRef.current.tokenize();
    if (tokenResult.status !== "OK" || !tokenResult.token) {
      setError(tokenResult.errors?.[0]?.message ?? "Card details couldn't be verified.");
      setSubmitting(false);
      return;
    }

    await submitWithToken(tokenResult.token);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div aria-hidden className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      <div
        className="card-surface relative z-10 flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border-strong"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-border-strong bg-surface-raised text-lg text-muted hover:text-foreground"
        >
          ×
        </button>

        <div className="overflow-y-auto p-6 sm:p-8">
          {done ? (
            <div className="flex flex-col items-center py-6 text-center">
              <p className="text-flame-2 text-xs font-semibold tracking-[0.2em] uppercase">
                {isPaid ? "Ticket confirmed" : "RSVP confirmed"}
              </p>
              <h3 className="font-display mt-3 text-3xl">You&apos;re in!</h3>
              <p className="mt-3 text-sm text-muted">
                {event.title} — {event.dateLabel}. A confirmation is on its way to {sentTo || email}.
              </p>
  
              {qrDataUrl && (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrDataUrl}
                    alt="Ticket QR code"
                    className="mt-6 h-44 w-44 rounded-xl border border-border-strong bg-white p-2"
                  />
                  <p className="mt-3 text-xs text-muted">Present this at the door — it&apos;s also saved to your portal.</p>
                </>
              )}
  
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
  
              <form ref={formRef} onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
                {isPaid && (
                  <WalletButtons
                    squareReady={scriptReady && !scriptFailed}
                    amountCents={priceCents}
                    label={event.title}
                    referenceId={referenceId}
                    formRef={formRef}
                    onToken={submitWithToken}
                    onBeforeRedirect={saveDraft}
                    busy={submitting}
                  />
                )}

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
  
                {event.lineup && event.lineup.length > 0 && (
                  <div>
                    <label htmlFor="rsvp-artist" className="text-sm font-medium">
                      Pick an artist <span className="font-normal text-muted">(optional)</span>
                    </label>
                    <select
                      id="rsvp-artist"
                      value={selectedArtist}
                      onChange={(e) => setSelectedArtist(e.target.value)}
                      className="mt-2 w-full rounded-lg border border-border-strong bg-surface-raised px-4 py-3 text-sm outline-none focus:border-flame-2"
                    >
                      <option value="">No preference</option>
                      {event.lineup.map((artist) => (
                        <option key={artist} value={artist}>
                          {artist}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
  
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
                      <div id="event-card-container" className="mt-2" />
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
    </div>
  );
}
