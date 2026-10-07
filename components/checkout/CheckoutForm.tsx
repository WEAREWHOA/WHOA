"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart/CartProvider";
import { formatCents } from "@/lib/money";
import { applyPromoCodeAction, checkoutAction, quoteCheckoutAction, saveCheckoutDraftAction } from "@/app/checkout/actions";
import { subscribeCheckoutAction } from "@/app/newsletter/actions";
import { SHIPPING_COUNTRIES, countryName, isDomestic, nextTierSaving, normalizeCountry } from "@/lib/shipping";
import { accountSignOutAction, getAccountAction } from "@/app/account/actions";
import WalletButtons, { type WalletBuyer } from "@/components/checkout/WalletButtons";
import {
  SQUARE_APPLICATION_ID as APPLICATION_ID,
  SQUARE_CARD_STYLE,
  SQUARE_JS_SRC,
  SQUARE_LOCATION_ID as LOCATION_ID,
  type SquareCard,
} from "@/lib/squareWeb";
import { newReferenceId, shopCheckoutDraft, type ShopCheckoutDraft } from "@/lib/checkoutDrafts";
import type { CheckoutQuote } from "@/lib/checkoutOrder";
import { trackBeginCheckout, trackPurchase } from "@/lib/analytics";

interface CheckoutFormProps {
  ambassadorCode: string | null;
  promoApplied?: boolean;
  promoError?: boolean;
}

/**
 * Picks up a form parked before a Cash App Pay redirect, if there is one.
 * The draft only exists client-side, so the fields below are keyed on it
 * and start from the parked values rather than being written into state
 * after the fact. See lib/checkoutDrafts.ts.
 */
export default function CheckoutForm(props: CheckoutFormProps) {
  const draft = shopCheckoutDraft.useDraft();
  return <CheckoutFields key={draft ? "restored" : "fresh"} draft={draft} {...props} />;
}

function CheckoutFields({
  ambassadorCode,
  promoApplied,
  promoError,
  draft,
}: CheckoutFormProps & { draft: ShopCheckoutDraft | null }) {
  const { lines, totalCents, clear } = useCart();
  const router = useRouter();
  const cardRef = useRef<SquareCard | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const [referenceId] = useState(() => draft?.referenceId || newReferenceId("cart"));

  // null until Square has answered one way or the other; then a wrapper
  // whose value is the quote, or null if the call failed. The extra layer
  // is what tells "still asking" apart from "asked, and we're on our own".
  const [quoteState, setQuoteState] = useState<{ value: CheckoutQuote | null } | null>(null);
  const quote = quoteState?.value ?? null;
  const quoteSettled = quoteState !== null;
  const [scriptReady, setScriptReady] = useState(false);
  const [scriptFailed, setScriptFailed] = useState(false);
  const [cardReady, setCardReady] = useState(false);
  const cardReadyRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(draft?.name ?? "");
  const [email, setEmail] = useState(draft?.email ?? "");
  const [password, setPassword] = useState("");
  // Unticked by default, always. A pre-ticked box is not consent.
  const [joinList, setJoinList] = useState(false);
  const [account, setAccount] = useState<{ name: string; email: string } | null>(null);
  const [accountChecked, setAccountChecked] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [line1, setLine1] = useState(draft?.line1 ?? "");
  const [line2, setLine2] = useState(draft?.line2 ?? "");
  const [city, setCity] = useState(draft?.city ?? "");
  const [state, setState] = useState(draft?.state ?? "");
  const [country, setCountry] = useState(draft?.country || "US");
  const [zip, setZip] = useState(draft?.zip ?? "");
  const [phone, setPhone] = useState(draft?.phone ?? "");

  // What the cart says, used until Square has priced the order and if that
  // call fails. It can't know about tax, and it assumes every item takes
  // the ambassador discount — Art Collective items don't — so it's a
  // fallback, not the number to trust.
  const estimatedDiscountCents = ambassadorCode ? Math.round(totalCents * 0.15) : 0;

  const discountCents = quote ? quote.discountCents : estimatedDiscountCents;
  const taxCents = quote?.taxCents ?? 0;
  const shippingCents = quote?.shippingCents ?? 0;
  const domestic = isDomestic(country);
  // "Spend a bit more and postage drops" — measured off the same
  // discounted merchandise subtotal the server prices shipping from, so
  // the nudge can't promise a tier the order won't actually reach.
  const shippingNudge = nextTierSaving(country, Math.max(0, totalCents - discountCents));
  const finalCents = quote ? quote.totalCents : totalCents - estimatedDiscountCents;

  // Ask Square what this cart actually costs — including any tax
  // configured on the items, which nothing on this page can work out for
  // itself. Re-runs when a promo code lands, since that changes the price.
  useEffect(() => {
    let cancelled = false;
    quoteCheckoutAction(lines, country)
      .then((result) => {
        if (!cancelled) setQuoteState({ value: result });
      })
      .catch((err) => {
        // Falling back to the cart's own arithmetic is better than
        // blocking the sale; Square still charges its own total.
        console.error("Couldn't price the checkout with Square:", err);
        if (!cancelled) setQuoteState({ value: null });
      });
    return () => {
      cancelled = true;
    };
  }, [lines, ambassadorCode, country]);

  // Once per visit to checkout. The cart reads as empty on the first
  /**
   * Remember this checkout, so it can be followed up if it is never
   * finished.
   *
   * Debounced hard. It fires on a pause in typing rather than on every
   * keystroke, because the point is to catch somebody who walked away,
   * and a half typed address is worse than nothing. Every save pushes
   * the reminder later, so nobody is emailed while they are still here.
   *
   * Deliberately not awaited and never surfaced: a shopper must never
   * see anything about this, and it must never be able to interrupt a
   * checkout that is going fine.
   */
  useEffect(() => {
    const address = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(address) || lines.length === 0) return;

    const timer = setTimeout(() => {
      void saveCheckoutDraftAction({ email: address, name: name.trim(), lines }).catch(() => undefined);
    }, 4000);
    return () => clearTimeout(timer);
  }, [email, name, lines]);

  // (hydration) render and fills in right after, so wait for real lines.
  const beginCheckoutTracked = useRef(false);
  useEffect(() => {
    if (beginCheckoutTracked.current || lines.length === 0) return;
    beginCheckoutTracked.current = true;
    trackBeginCheckout(lines, totalCents);
  }, [lines, totalCents]);

  // The Square <Script> tag's onLoad callback only reliably fires the
  // first time it's ever injected — navigating checkout -> cart -> checkout
  // again mounts a fresh CheckoutForm (and a fresh <Script>) while the
  // browser has already loaded that src, so onLoad can silently never fire
  // for this mount even though window.Square is right there. Poll for it
  // directly as a fallback so scriptReady still flips true, instead of the
  // 10s timeout below wrongly reporting an ad blocker.
  useEffect(() => {
    if (scriptReady) return;
    const check = () => {
      if (window.Square) setScriptReady(true);
    };
    const immediate = setTimeout(check, 0);
    const interval = setInterval(check, 200);
    return () => {
      clearTimeout(immediate);
      clearInterval(interval);
    };
  }, [scriptReady]);

  useEffect(() => {
    if (!scriptReady || cardRef.current) return;
    if (!window.Square || !APPLICATION_ID || !LOCATION_ID) return;

    let cancelled = false;

    (async () => {
      try {
        const payments = await window.Square!.payments(APPLICATION_ID, LOCATION_ID);
        const card = await payments.card({ style: SQUARE_CARD_STYLE });
        await card.attach("#card-container");
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
  }, [scriptReady]);

  useEffect(() => {
    cardReadyRef.current = cardReady;
  }, [cardReady]);

  // The Square SDK script can silently fail to ever call onLoad (an ad
  // blocker dropping the request rather than erroring it, a slow/flaky
  // connection) — with no fallback, the card field and Pay button would
  // just stay disabled forever with zero explanation. This turns that
  // into a real, visible error after a reasonable wait.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!cardReadyRef.current) setScriptFailed(true);
    }, 10_000);
    return () => clearTimeout(timer);
  }, []);

  // Prefills name/email for a returning, already-signed-in customer and
  // hides the password field entirely — there's nothing to sign into,
  // they're already in.
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
        // Not being able to check sign-in status shouldn't block anyone
        // from checking out as a guest — just fall back to a blank,
        // signed-out form.
        console.error("Failed to check checkout account status:", err);
      })
      .finally(() => {
        if (!cancelled) setAccountChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function saveDraft() {
    shopCheckoutDraft.save({
      name,
      email,
      line1,
      line2,
      city,
      state,
      zip,
      country,
      phone,
      referenceId,
    });
  }

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await accountSignOutAction();
    } catch (err) {
      console.error("Failed to sign out during checkout:", err);
    }
    setAccount(null);
    setPassword("");
    setSigningOut(false);
  }

  // Everything past tokenization is identical whether the token came from
  // the card field or from a wallet — Square's sourceId doesn't care which
  // it was, so neither does the server action.
  async function submitWithToken(token: string, buyer?: WalletBuyer) {
    if (lines.length === 0) return;

    // A wallet knows the customer's name, email and shipping address, so
    // what it hands back wins — it is what they picked in the payment
    // sheet. The typed form is the fallback, and the only source at all
    // for the card path and for Cash App Pay.
    const shippingAddress = buyer?.address
      ? {
          ...buyer.address,
          phone: buyer.phone?.trim() || phone,
          country: buyer.address.country || country,
        }
      : { line1, line2, city, state, zip, phone, country };

    if (!shippingAddress.line1.trim()) {
      setError("Add your shipping address below, then try again.");
      return;
    }

    // Apple Pay and Google Pay let the buyer pick any address in their
    // wallet, including one in a country the sheet's total wasn't priced
    // for — and the sheet's total is fixed once it opens. Charging the
    // recomputed rate anyway would take more than they approved, so the
    // destination is switched here and they're asked to tap again, this
    // time against a sheet showing the real number.
    const chosenCountry = normalizeCountry(shippingAddress.country);
    if (chosenCountry && chosenCountry !== normalizeCountry(country)) {
      setCountry(chosenCountry);
      setError(
        `Your wallet address is in ${countryName(chosenCountry)}, so shipping has changed. ` +
          `Check the new total and tap pay again to confirm.`,
      );
      setSubmitting(false);
      return;
    }

    setSubmitting(true);
    setError(null);

    const outcome = await checkoutAction({
      token,
      lines,
      customerName: buyer?.name?.trim() || name,
      customerEmail: buyer?.email?.trim() || email,
      password: account ? undefined : password || undefined,
      shippingAddress,
    });

    if (!outcome.ok) {
      setError(outcome.error ?? "Something went wrong.");
      setSubmitting(false);
      return;
    }

    // After the sale, not before: a card that declines must not leave
    // someone subscribed. Fire-and-forget for the same reason the
    // confirmation email is: the order is already paid for, and a
    // newsletter hiccup is not worth showing this customer an error.
    //
    // Called either way. Ticked subscribes them; unticked records the
    // buyer as a contact who is not to be mailed, which is a fact worth
    // writing down rather than a reason to write nothing down at all.
    const [first, ...rest] = (buyer?.name?.trim() || name).trim().split(/\s+/);
    void subscribeCheckoutAction({
      email: buyer?.email?.trim() || email,
      firstName: first || undefined,
      lastName: rest.join(" ") || undefined,
      phone: buyer?.phone?.trim() || phone || undefined,
      joinList,
    }).catch(() => {});

    trackPurchase(outcome.orderId ?? "", lines, finalCents, shippingCents);
    clear();
    const accountParam = outcome.accountCreated ? "created" : outcome.signedIn ? "signedin" : "";
    const params = new URLSearchParams({ order: outcome.orderId ?? "" });
    if (accountParam) params.set("account", accountParam);
    shopCheckoutDraft.clear();
    router.push(`/order-confirmed?${params.toString()}`);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!cardRef.current || lines.length === 0) return;

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

  if (lines.length === 0) {
    return <p className="mt-8 text-sm text-muted">Your cart is empty.</p>;
  }

  if (!APPLICATION_ID || !LOCATION_ID) {
    return (
      <p className="mt-8 rounded-lg border border-flame-1/40 bg-flame-1/10 px-4 py-3 text-sm text-flame-3">
        Checkout isn&apos;t configured yet — Square credentials are missing.
      </p>
    );
  }

  return (
    <>
      <Script
        src={SQUARE_JS_SRC}
        onLoad={() => setScriptReady(true)}
        onError={() => setScriptFailed(true)}
        strategy="afterInteractive"
      />

      <div className="card-surface mt-8 rounded-xl p-6">
        <div className="flex flex-col gap-2 text-sm">
          {lines.map((line) => (
            <div key={line.variationId} className="flex justify-between">
              <span className="text-muted">
                {line.productName} ({line.variationName}) × {line.quantity}
              </span>
              <span>{formatCents(line.priceCents * line.quantity)}</span>
            </div>
          ))}
        </div>

        <div className="mt-4 flex justify-between border-t border-border pt-4 text-sm">
          <span className="text-muted">Subtotal</span>
          <span>{formatCents(totalCents)}</span>
        </div>

        {ambassadorCode ? (
          <>
            <div className="text-flame-3 mt-2 flex justify-between text-sm">
              <span>Ambassador discount (15%)</span>
              <span>-{formatCents(discountCents)}</span>
            </div>
            {promoApplied && <p className="text-flame-3 mt-1 text-xs">Promo code applied.</p>}
          </>
        ) : (
          <div className="mt-4">
            <form action={applyPromoCodeAction} className="flex gap-2">
              <input
                name="promoCode"
                type="text"
                placeholder="Promo code (optional)"
                aria-label="Promo code"
                className="flex-1 rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm outline-none focus:border-flame-2"
              />
              <button
                type="submit"
                className="shrink-0 rounded-lg border border-border-strong px-4 py-2 text-sm font-medium transition-colors hover:bg-surface"
              >
                Apply
              </button>
            </form>
            {promoError && (
              <p className="text-flame-3 mt-2 text-xs">That promo code isn&apos;t valid.</p>
            )}
          </div>
        )}

        <div className="mt-2 flex justify-between text-sm">
          <span className="text-muted">Shipping</span>
          {/* Only "Free" once Square has actually priced the order. With
              no quote, shippingCents is a default rather than an answer,
              and printing "Free" would promise postage the order is
              still going to be charged for. */}
          <span>
            {!quote
              ? "Calculated at checkout"
              : shippingCents > 0
                ? formatCents(shippingCents)
                : "Free"}
          </span>
        </div>

        {quote && shippingNudge && (
          <p className="mt-1 text-xs text-flame-3">
            Spend {formatCents(shippingNudge.addCents)} more for{" "}
            {shippingNudge.newRateCents === 0 ? "free shipping" : `${formatCents(shippingNudge.newRateCents)} shipping`}.
          </p>
        )}

        {taxCents > 0 && (
          <div className="mt-2 flex justify-between text-sm">
            <span className="text-muted">Tax</span>
            <span>{formatCents(taxCents)}</span>
          </div>
        )}

        <div className="mt-4 flex justify-between border-t border-border pt-4 font-semibold">
          <span>Total</span>
          <span>{formatCents(finalCents)}</span>
        </div>
      </div>

      <form ref={formRef} onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
        <WalletButtons
          squareReady={scriptReady && !scriptFailed && quoteSettled}
          amountCents={finalCents}
          label="WHOA order"
          referenceId={referenceId}
          formRef={formRef}
          requestShipping
          onToken={submitWithToken}
          onBeforeRedirect={saveDraft}
          busy={submitting}
        />

        <div>
          <label htmlFor="name" className="text-sm font-medium">
            Name
          </label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-2 w-full rounded-lg border border-border-strong bg-surface-raised px-4 py-3 text-sm outline-none focus:border-flame-2"
          />
        </div>

        <div>
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-2 w-full rounded-lg border border-border-strong bg-surface-raised px-4 py-3 text-sm outline-none focus:border-flame-2"
          />
        </div>

        <label className="flex cursor-pointer items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={joinList}
            onChange={(e) => setJoinList(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--flame-2)]"
          />
          <span className="text-muted">
            Email me new drops and events.{" "}
            <span className="text-xs">Unsubscribe any time.</span>
          </span>
        </label>

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
              <label htmlFor="password" className="text-sm font-medium">
                Password <span className="font-normal text-muted">(optional)</span>
              </label>
              <input
                id="password"
                type="password"
                minLength={8}
                autoComplete="new-password"
                placeholder="Save your info & track this order — or leave blank for guest checkout"
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

        <div>
          <span className="text-sm font-medium">Shipping address</span>

          <input
            type="text"
            required
            aria-label="Address line 1"
            placeholder="Address line 1"
            value={line1}
            onChange={(e) => setLine1(e.target.value)}
            className="mt-2 w-full rounded-lg border border-border-strong bg-surface-raised px-4 py-3 text-sm outline-none focus:border-flame-2"
          />
          <input
            type="text"
            aria-label="Apt, suite, etc. (optional)"
            placeholder="Apt, suite, etc. (optional)"
            value={line2}
            onChange={(e) => setLine2(e.target.value)}
            className="mt-2 w-full rounded-lg border border-border-strong bg-surface-raised px-4 py-3 text-sm outline-none focus:border-flame-2"
          />
          <div className="mt-2 grid grid-cols-6 gap-2">
            <input
              type="text"
              required
              aria-label="City"
              placeholder="City"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              /* A two-letter state fits in a sixth of the row; "Region"
                 doesn't, so the row is split evenly once it's a word
                 rather than an abbreviation. */
              className={`${domestic ? "col-span-3" : "col-span-2"} w-full rounded-lg border border-border-strong bg-surface-raised px-4 py-3 text-sm outline-none focus:border-flame-2`}
            />
            <input
              type="text"
              /* Required in the US, where Square validates it. Plenty of
                 countries have no state, and demanding one would make
                 those addresses impossible to enter. */
              required={domestic}
              aria-label={domestic ? "State" : "Region"}
              placeholder={domestic ? "State" : "Region"}
              value={state}
              onChange={(e) => setState(e.target.value)}
              className={`${domestic ? "col-span-1" : "col-span-2"} w-full rounded-lg border border-border-strong bg-surface-raised px-2 py-3 text-center text-sm outline-none focus:border-flame-2`}
            />
            <input
              type="text"
              required
              aria-label={domestic ? "ZIP" : "Postcode"}
              placeholder={domestic ? "ZIP" : "Postcode"}
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              className="col-span-2 w-full rounded-lg border border-border-strong bg-surface-raised px-2 py-3 text-center text-sm outline-none focus:border-flame-2"
            />
          </div>
          <select
            aria-label="Country"
            /* Below the ZIP rather than above the street, because almost
               everyone leaves it on the default and the fields they do
               have to type shouldn't start below a dropdown. */
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="mt-2 w-full rounded-lg border border-border-strong bg-surface-raised px-4 py-3 text-sm outline-none focus:border-flame-2"
          >
            {SHIPPING_COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
          <input
            type="tel"
            required
            aria-label="Phone (for shipping updates)"
            placeholder="Phone (for shipping updates)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-2 w-full rounded-lg border border-border-strong bg-surface-raised px-4 py-3 text-sm outline-none focus:border-flame-2"
          />
          <p className="mt-2 text-xs text-muted">
            We ship worldwide. Postage is worked out from your country and order
            total, and shows in the summary above.
          </p>
        </div>

        <div>
          <span className="text-sm font-medium">Card</span>
          {scriptFailed ? (
            <div className="mt-2 rounded-lg border border-flame-1/40 bg-flame-1/10 px-4 py-3 text-sm text-flame-3">
              Payment couldn&apos;t load — this can happen with an ad blocker or a flaky
              connection. Try disabling any ad/tracker blockers and{" "}
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
            <div id="card-container" className="mt-2" />
          )}
        </div>

        {error && (
          <p className="rounded-lg border border-flame-1/40 bg-flame-1/10 px-4 py-3 text-sm text-flame-3">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!cardReady || submitting}
          className="btn-flame rounded-full px-8 py-4 text-base disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Processing…" : `Pay ${formatCents(finalCents)}`}
        </button>
      </form>
    </>
  );
}
