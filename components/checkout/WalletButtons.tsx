"use client";

import { useEffect, useId, useRef, useState, type RefObject } from "react";
import {
  SQUARE_APPLICATION_ID,
  SQUARE_LOCATION_ID,
  squareAmount,
  type SquarePayments,
  type SquareWallet,
} from "@/lib/squareWeb";

/**
 * Apple Pay / Google Pay / Cash App Pay, rendered above the card field.
 *
 * Everything here is strictly additive: each wallet is set up on its own,
 * behind its own try/catch, and simply doesn't render if Square says it
 * isn't available (wrong browser, no domain verification, not enabled on
 * the Square account). Nothing in here can throw into the parent form, so
 * the card field stays the guaranteed path to checking out no matter what
 * happens on this side.
 */
export default function WalletButtons({
  squareReady,
  amountCents,
  label,
  referenceId,
  formRef,
  onToken,
  onBeforeRedirect,
  busy,
}: {
  /** window.Square has loaded — the parent already polls for this. */
  squareReady: boolean;
  amountCents: number;
  /** Shown as the line item in the native payment sheet. */
  label: string;
  /**
   * Stable per-cart/per-ticket id. Cash App Pay uses it to match a customer
   * coming back from the Cash App to the checkout they left.
   */
  referenceId: string;
  /**
   * The checkout form. Wallets skip our own fields, so we watch this for
   * validity and refuse to open a payment sheet until the name/email/
   * shipping details the order actually needs are filled in.
   */
  formRef: RefObject<HTMLFormElement | null>;
  onToken: (token: string) => void | Promise<void>;
  /**
   * Called just before Cash App Pay may navigate the customer out to the
   * Cash App — the parent uses it to stash the form so it can be restored
   * when they land back here.
   */
  onBeforeRedirect?: () => void;
  busy?: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const googleId = `gpay-${uid}`;
  const cashAppId = `cashapp-${uid}`;

  const [available, setAvailable] = useState({ apple: false, google: false, cashApp: false });
  const [formValid, setFormValid] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applePayRef = useRef<SquareWallet | null>(null);
  const googlePayRef = useRef<SquareWallet | null>(null);

  // Square tears its payment-method objects down asynchronously, and asking
  // it for a second one of the same kind while the first is still being
  // destroyed is refused. That really happens here: applying an ambassador
  // promo code redirects back to this same route, so the total changes and
  // this effect re-runs *without* the component remounting. Racing the
  // teardown would leave the customer watching the wallet buttons vanish
  // the moment they entered a code. Each setup therefore chains onto the
  // previous teardown instead of starting alongside it.
  const teardownRef = useRef<Promise<void>>(Promise.resolve());

  // onToken lives in the parent's render scope, so it's a new function
  // every render. Keep it in a ref so the wallet setup effect below isn't
  // torn down and rebuilt on every keystroke in the form.
  const onTokenRef = useRef(onToken);
  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    const update = () => setFormValid(form.checkValidity());
    update();
    form.addEventListener("input", update);
    form.addEventListener("change", update);
    return () => {
      form.removeEventListener("input", update);
      form.removeEventListener("change", update);
    };
  }, [formRef]);

  useEffect(() => {
    if (!squareReady || !window.Square || !SQUARE_APPLICATION_ID || !SQUARE_LOCATION_ID) return;
    if (amountCents <= 0) return;

    let cancelled = false;
    // Whatever this run manages to create, in the order it was created.
    // Only these get torn down — a wallet the SDK refused never lands here.
    const destroyers: (() => Promise<void>)[] = [];

    const setup = teardownRef.current.then(async () => {
      if (cancelled) return;

      let payments: SquarePayments;
      try {
        payments = await window.Square!.payments(SQUARE_APPLICATION_ID, SQUARE_LOCATION_ID);
      } catch (err) {
        console.error("Square payments unavailable for wallets:", err);
        return;
      }

      const buildRequest = () =>
        payments.paymentRequest({
          countryCode: "US",
          currencyCode: "USD",
          total: { amount: squareAmount(amountCents), label },
        });

      // Apple Pay is never attached — Square hands back an object and we
      // supply our own button, which has to be a real Apple Pay button
      // (see .apple-pay-button in globals.css) for Safari to honour it.
      try {
        const applePay = await payments.applePay(buildRequest());
        if (applePay.destroy) destroyers.push(() => applePay.destroy!());
        if (cancelled) return;
        applePayRef.current = applePay;
        setAvailable((prev) => ({ ...prev, apple: true }));
      } catch {
        // Not Safari, or the domain isn't registered with Square yet.
      }

      try {
        const googlePay = await payments.googlePay(buildRequest());
        if (googlePay.destroy) destroyers.push(() => googlePay.destroy!());
        if (cancelled) return;
        await googlePay.attach?.(`#${googleId}`, {
          buttonColor: "white",
          buttonType: "buy",
          buttonSizeMode: "fill",
        });
        if (cancelled) return;
        googlePayRef.current = googlePay;
        setAvailable((prev) => ({ ...prev, google: true }));
      } catch {
        // Google Pay isn't offered in this browser.
      }

      try {
        const pay = await payments.cashAppPay(buildRequest(), {
          redirectURL: window.location.href,
          referenceId,
        });
        destroyers.push(() => pay.destroy());
        if (cancelled) return;
        // Cash App Pay reports its token through an event rather than from
        // tokenize(): on a phone it sends the customer out to the Cash App
        // and the page is reloaded on the way back, so there's no pending
        // promise left to resolve. Re-creating it here on that fresh load
        // is what lets the token find its way home.
        pay.addEventListener("ontokenization", (event) => {
          const result = event.detail.tokenResult;
          if (result.status === "OK" && result.token) {
            void onTokenRef.current(result.token);
          } else if (result.status !== "ABORT" && result.status !== "CANCEL") {
            setError(result.errors?.[0]?.message ?? "Cash App Pay couldn't be completed.");
          }
        });
        await pay.attach(`#${cashAppId}`, { shape: "semiround", width: "full" });
        if (cancelled) return;
        setAvailable((prev) => ({ ...prev, cashApp: true }));
      } catch {
        // Cash App Pay isn't enabled on this Square account.
      }
    });

    return () => {
      cancelled = true;
      setAvailable({ apple: false, google: false, cashApp: false });
      applePayRef.current = null;
      googlePayRef.current = null;
      // Publish the teardown so the next run waits on it. Failures are
      // swallowed on purpose: a wallet that won't destroy cleanly must not
      // deadlock every later setup behind a rejected promise.
      teardownRef.current = setup
        .then(async () => {
          for (const destroy of destroyers) {
            await destroy().catch(() => {});
          }
        })
        .catch(() => {});
    };
    // The total is baked into the payment request when it's built, so a
    // changed amount (a promo code applied, early-bird pricing rolling
    // over) has to rebuild the wallets rather than update them.
  }, [squareReady, amountCents, label, referenceId, googleId, cashAppId]);

  async function payWith(wallet: SquareWallet | null) {
    if (!wallet || busy) return;
    setError(null);
    try {
      const result = await wallet.tokenize();
      if (result.status === "OK" && result.token) {
        await onTokenRef.current(result.token);
        return;
      }
      // The customer closing the sheet isn't an error worth shouting about.
      if (result.status === "ABORT" || result.status === "CANCEL") return;
      setError(result.errors?.[0]?.message ?? "That payment couldn't be completed.");
    } catch (err) {
      console.error("Wallet payment failed:", err);
      setError("That payment couldn't be completed — try a card instead.");
    }
  }

  const anyAvailable = available.apple || available.google || available.cashApp;

  return (
    <div className={anyAvailable ? "flex flex-col gap-3" : "hidden"} aria-hidden={!anyAvailable}>
      <span className="text-sm font-medium">Express checkout</span>

      <div className="relative flex flex-col gap-2">
        {available.apple && (
          <button
            type="button"
            aria-label="Pay with Apple Pay"
            className="apple-pay-button"
            onClick={() => void payWith(applePayRef.current)}
          />
        )}

        <div
          id={googleId}
          className={available.google ? "h-12 w-full overflow-hidden rounded-full" : "hidden"}
          onClick={() => void payWith(googlePayRef.current)}
        />

        <div
          id={cashAppId}
          className={available.cashApp ? "w-full" : "hidden"}
          onClickCapture={() => onBeforeRedirect?.()}
        />

        {/* Wallets bypass our own inputs, so an order could otherwise be
            paid for with no name, email or address attached to it. Cover
            the buttons until the rest of the form is filled in — clicking
            the cover pops the browser's own "please fill this in" hints. */}
        {!formValid && (
          <button
            type="button"
            className="absolute inset-0 z-10 cursor-not-allowed rounded-xl bg-surface/70 text-xs font-medium text-muted backdrop-blur-[1px]"
            onClick={() => formRef.current?.reportValidity()}
          >
            Fill in your details below to pay this way
          </button>
        )}
      </div>

      {error && (
        <p className="rounded-lg border border-flame-1/40 bg-flame-1/10 px-4 py-3 text-sm text-flame-3">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs tracking-[0.15em] text-muted uppercase">or pay by card</span>
        <span className="h-px flex-1 bg-border" />
      </div>
    </div>
  );
}
