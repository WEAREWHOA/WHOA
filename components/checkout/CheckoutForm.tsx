"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart/CartProvider";
import { formatCents } from "@/lib/money";
import { checkoutAction } from "@/app/checkout/actions";
import { accountSignOutAction, getAccountAction } from "@/app/account/actions";

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

export default function CheckoutForm({ ambassadorCode }: { ambassadorCode: string | null }) {
  const { lines, totalCents, clear } = useCart();
  const router = useRouter();
  const cardRef = useRef<SquareCard | null>(null);

  const [scriptReady, setScriptReady] = useState(false);
  const [scriptFailed, setScriptFailed] = useState(false);
  const [cardReady, setCardReady] = useState(false);
  const cardReadyRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [account, setAccount] = useState<{ name: string; email: string } | null>(null);
  const [accountChecked, setAccountChecked] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [phone, setPhone] = useState("");

  const discountCents = ambassadorCode ? Math.round(totalCents * 0.15) : 0;
  const finalCents = totalCents - discountCents;

  useEffect(() => {
    if (!scriptReady || cardRef.current) return;
    if (!window.Square || !APPLICATION_ID || !LOCATION_ID) return;

    let cancelled = false;

    (async () => {
      try {
        const payments = await window.Square!.payments(APPLICATION_ID, LOCATION_ID);
        const card = await payments.card();
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

    const outcome = await checkoutAction({
      token: tokenResult.token,
      lines,
      customerName: name,
      customerEmail: email,
      password: account ? undefined : password || undefined,
      shippingAddress: { line1, line2, city, state, zip, phone },
    });

    if (!outcome.ok) {
      setError(outcome.error ?? "Something went wrong.");
      setSubmitting(false);
      return;
    }

    clear();
    const accountParam = outcome.accountCreated ? "created" : outcome.signedIn ? "signedin" : "";
    const params = new URLSearchParams({ order: outcome.orderId ?? "" });
    if (accountParam) params.set("account", accountParam);
    router.push(`/order-confirmed?${params.toString()}`);
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

        <div className="mt-4 flex justify-between text-sm">
          <span className="text-muted">Shipping</span>
          <span>Free</span>
        </div>

        {ambassadorCode && (
          <div className="text-flame-3 mt-2 flex justify-between text-sm">
            <span>Ambassador discount (15%)</span>
            <span>-{formatCents(discountCents)}</span>
          </div>
        )}

        <div className="mt-4 flex justify-between border-t border-border pt-4 font-semibold">
          <span>Total</span>
          <span>{formatCents(finalCents)}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
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
              className="col-span-3 w-full rounded-lg border border-border-strong bg-surface-raised px-4 py-3 text-sm outline-none focus:border-flame-2"
            />
            <input
              type="text"
              required
              aria-label="State"
              placeholder="State"
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="col-span-1 w-full rounded-lg border border-border-strong bg-surface-raised px-2 py-3 text-center text-sm outline-none focus:border-flame-2"
            />
            <input
              type="text"
              required
              aria-label="ZIP"
              placeholder="ZIP"
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              className="col-span-2 w-full rounded-lg border border-border-strong bg-surface-raised px-2 py-3 text-center text-sm outline-none focus:border-flame-2"
            />
          </div>
          <input
            type="tel"
            required
            aria-label="Phone (for shipping updates)"
            placeholder="Phone (for shipping updates)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-2 w-full rounded-lg border border-border-strong bg-surface-raised px-4 py-3 text-sm outline-none focus:border-flame-2"
          />
          <p className="mt-2 text-xs text-muted">Shipping within the US only, for now.</p>
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
            <div
              id="card-container"
              className="mt-2 rounded-lg border border-border-strong bg-surface-raised px-4 py-3"
            />
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
