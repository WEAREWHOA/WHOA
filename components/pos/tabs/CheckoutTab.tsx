"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Script from "next/script";
import { checkoutAction, lookupPromoCodeAction, quoteCheckoutAction } from "@/app/checkout/actions";
import { formatCents } from "@/lib/money";
import type { CartLine, Product } from "@/lib/types";
import {
  SQUARE_APPLICATION_ID as APPLICATION_ID,
  SQUARE_CARD_STYLE,
  SQUARE_JS_SRC,
  SQUARE_LOCATION_ID as LOCATION_ID,
  type SquareCard,
} from "@/lib/squareWeb";

type Step = "shop" | "pay" | "done";

export default function CheckoutTab({ products }: { products: Product[] }) {
  const [ticket, setTicket] = useState<CartLine[]>([]);
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("shop");
  // The ambassador code on this sale, once staff have entered one and the
  // server has confirmed it belongs to somebody. Null until then, so an
  // unrecognised code can never quietly reach the charge.
  const [promo, setPromo] = useState<{ code: string; name: string } | null>(null);
  // What Square says this ticket costs with the code on it.
  //
  // The till's own running total is a plain sum of the lines, which is
  // right until a discount exists and then stops being right, so once a
  // code is applied the figures come from Square's pricing engine
  // instead of arithmetic here -- the same reason /checkout quotes
  // rather than guessing.
  //
  // Stamped with the basket and code it was priced for. A quote that
  // arrives after the ticket has moved on no longer matches and is
  // ignored during render, so no staff member can ever be looking at a
  // total for a basket that is not the one in front of them.
  const [quote, setQuote] = useState<{
    key: string;
    failed?: boolean;
    subtotalCents: number;
    discountCents: number;
    totalCents: number;
  } | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, query]);

  const lineTotalCents = ticket.reduce((sum, line) => sum + line.priceCents * line.quantity, 0);
  const itemCount = ticket.reduce((sum, line) => sum + line.quantity, 0);

  const quoteKey = promo
    ? `${promo.code}|${ticket.map((l) => `${l.variationId}x${l.quantity}`).join(",")}`
    : "";
  const current = quote && quote.key === quoteKey ? quote : null;
  const discounted = current && !current.failed ? current : null;
  // Told apart so the panel can say "still working it out" and "could not
  // reach Square" differently, without either being written into state
  // synchronously from the effect below.
  const pricing = Boolean(quoteKey) && !current;

  useEffect(() => {
    if (!quoteKey) return;
    let live = true;
    void quoteCheckoutAction(ticket, undefined, "pickup", promo?.code ?? null)
      .then((q) => {
        if (!live) return;
        setQuote(
          q
            ? {
                key: quoteKey,
                subtotalCents: q.subtotalCents,
                discountCents: q.discountCents,
                totalCents: q.totalCents,
              }
            // Null means Square could not be reached. Recorded as a
            // failure against this exact basket rather than left to look
            // like a basket with no discount on it.
            : { key: quoteKey, failed: true, subtotalCents: 0, discountCents: 0, totalCents: 0 },
        );
      })
      .catch(() => {
        if (live) {
          setQuote({ key: quoteKey, failed: true, subtotalCents: 0, discountCents: 0, totalCents: 0 });
        }
      });
    return () => {
      live = false;
    };
  }, [quoteKey, ticket, promo]);

  // What the buttons say and what gets charged: Square's figure whenever
  // there is one, the line sum otherwise.
  const totalCents = discounted?.totalCents ?? lineTotalCents;

  function addLine(product: Product, variation: Product["variations"][number]) {
    setExpandedId(null);
    setTicket((lines) => {
      const existing = lines.find((l) => l.variationId === variation.id);
      if (existing) {
        return lines.map((l) =>
          l.variationId === variation.id ? { ...l, quantity: l.quantity + 1 } : l,
        );
      }
      return [
        ...lines,
        {
          variationId: variation.id,
          productId: product.id,
          productName: product.name,
          variationName: variation.name,
          priceCents: variation.priceCents,
          quantity: 1,
          imageUrl: product.imageUrl,
        },
      ];
    });
  }

  function handleProductTap(product: Product) {
    if (product.variations.length === 0) return;
    if (product.variations.length === 1) {
      addLine(product, product.variations[0]);
      return;
    }
    setExpandedId((id) => (id === product.id ? null : product.id));
  }

  function setQuantity(variationId: string, quantity: number) {
    setTicket((lines) =>
      quantity <= 0
        ? lines.filter((l) => l.variationId !== variationId)
        : lines.map((l) => (l.variationId === variationId ? { ...l, quantity } : l)),
    );
  }

  function resetTicket() {
    setTicket([]);
    setStep("shop");
    // The next customer in the queue is not on the last one's code.
    setPromo(null);
    setQuote(null);
  }

  return (
    <div className="grid flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[1fr_380px]">
      <div className="border-border overflow-y-auto border-b p-6 lg:border-r lg:border-b-0">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products…"
          className="w-full max-w-sm rounded-lg border border-border-strong bg-surface-raised px-4 py-2.5 text-sm outline-none focus:border-flame-2"
        />

        {filtered.length === 0 ? (
          <p className="mt-10 text-sm text-muted">No products match.</p>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {filtered.map((product) => {
              const prices = product.variations.map((v) => v.priceCents);
              const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
              const totalStock = product.variations.reduce((sum, v) => sum + (v.inStock ?? 1), 0);
              const soldOut = product.variations.length > 0 && totalStock <= 0;
              const expanded = expandedId === product.id;

              return (
                <div key={product.id} className="flex flex-col gap-2">
                  <button
                    type="button"
                    disabled={soldOut}
                    onClick={() => handleProductTap(product)}
                    className={`card-surface flex flex-col overflow-hidden rounded-xl border text-left transition-colors ${
                      expanded ? "border-flame-2" : "border-border"
                    } ${soldOut ? "cursor-not-allowed opacity-40" : "hover:border-flame-2/60"}`}
                  >
                    <div className="bg-surface-raised aspect-square w-full overflow-hidden">
                      {product.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[0.65rem] text-muted">
                          WHOA
                        </div>
                      )}
                    </div>
                    <div className="p-2.5">
                      <p className="truncate text-xs font-semibold">{product.name}</p>
                      <p className="text-flame text-xs">
                        {soldOut ? "Sold out" : formatCents(minPrice)}
                      </p>
                    </div>
                  </button>

                  {expanded && (
                    <div className="flex flex-col gap-1.5 rounded-xl border border-border-strong p-2">
                      {product.variations.map((v) => {
                        const varSoldOut = v.inStock !== null && v.inStock <= 0;
                        return (
                          <button
                            key={v.id}
                            type="button"
                            disabled={varSoldOut}
                            onClick={() => addLine(product, v)}
                            className="flex items-center justify-between rounded-lg px-2 py-1.5 text-xs font-medium hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <span>{v.name}</span>
                            <span className="text-muted">
                              {varSoldOut ? "Sold out" : formatCents(v.priceCents)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex flex-col overflow-y-auto p-6">
        {step === "shop" && (
          <TicketPanel
            ticket={ticket}
            lineTotalCents={lineTotalCents}
            totalCents={totalCents}
            discounted={discounted}
            pricing={pricing}
            itemCount={itemCount}
            promo={promo}
            onApplyPromo={setPromo}
            setQuantity={setQuantity}
            onCharge={() => setStep("pay")}
          />
        )}

        {step === "pay" && (
          <PaymentPanel
            ticket={ticket}
            totalCents={totalCents}
            promoCode={promo?.code ?? null}
            onBack={() => setStep("shop")}
            onComplete={() => setStep("done")}
          />
        )}

        {step === "done" && <SuccessPanel totalCents={totalCents} onNewSale={resetTicket} />}
      </div>
    </div>
  );
}

function TicketPanel({
  ticket,
  lineTotalCents,
  totalCents,
  discounted,
  pricing,
  itemCount,
  promo,
  onApplyPromo,
  setQuantity,
  onCharge,
}: {
  ticket: CartLine[];
  lineTotalCents: number;
  totalCents: number;
  discounted: { subtotalCents: number; discountCents: number; totalCents: number } | null;
  pricing: boolean;
  itemCount: number;
  promo: { code: string; name: string } | null;
  onApplyPromo: (promo: { code: string; name: string } | null) => void;
  setQuantity: (variationId: string, quantity: number) => void;
  onCharge: () => void;
}) {
  const [entry, setEntry] = useState("");
  const [checking, setChecking] = useState(false);
  const [rejected, setRejected] = useState<string | null>(null);

  async function applyCode() {
    const typed = entry.trim();
    if (!typed || checking) return;
    setChecking(true);
    setRejected(null);
    const result = await lookupPromoCodeAction(typed).catch(() => ({ ok: false }) as const);
    setChecking(false);
    if (!result.ok) {
      // Named in the message, because at a busy till the field may
      // already have been cleared and retyped by the time anyone reads
      // it, and "that code" is no help in telling staff which one.
      setRejected(typed.toUpperCase());
      return;
    }
    onApplyPromo({ code: result.code, name: result.name });
    setEntry("");
  }

  return (
    <>
      <h2 className="font-display text-2xl">Current sale</h2>
      {ticket.length === 0 ? (
        <p className="mt-4 text-sm text-muted">Tap a product to add it to the sale.</p>
      ) : (
        <div className="mt-4 flex flex-1 flex-col gap-3">
          {ticket.map((line) => (
            <div key={line.variationId} className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{line.productName}</p>
                <p className="text-xs text-muted">
                  {line.variationName} · {formatCents(line.priceCents)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQuantity(line.variationId, line.quantity - 1)}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-border-strong text-sm hover:text-flame-2"
                >
                  −
                </button>
                <span className="w-4 text-center text-sm">{line.quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity(line.variationId, line.quantity + 1)}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-border-strong text-sm hover:text-flame-2"
                >
                  +
                </button>
              </div>
              <span className="w-16 shrink-0 text-right text-sm font-semibold">
                {formatCents(line.priceCents * line.quantity)}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 border-t border-border pt-4">
        {promo ? (
          <div className="mb-4 rounded-lg border border-flame-2/40 bg-flame-2/10 px-3 py-2">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono-code truncate text-sm text-flame">{promo.code}</p>
                <p className="truncate text-xs text-muted">{promo.name}</p>
              </div>
              <button
                type="button"
                onClick={() => onApplyPromo(null)}
                className="shrink-0 text-xs font-medium text-muted underline underline-offset-2 hover:text-flame-1"
              >
                Remove
              </button>
            </div>
            {/* A code is on the sale but Square would not price it, so the
                till has no discounted figure to show. Say so rather than
                print the full total under an applied code, which reads as
                the discount having been refused. */}
            {pricing && <p className="mt-1 text-xs text-muted">Working out the total…</p>}
            {!pricing && !discounted && (
              <p className="mt-1 text-xs text-flame-3">
                Couldn&apos;t reach Square to price this. The discount still
                applies when you charge.
              </p>
            )}
          </div>
        ) : (
          <div className="mb-4">
            <label htmlFor="pos-promo" className="text-xs text-muted">
              Ambassador code
            </label>
            <div className="mt-1.5 flex gap-2">
              <input
                id="pos-promo"
                value={entry}
                onChange={(e) => {
                  setEntry(e.target.value);
                  setRejected(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void applyCode();
                  }
                }}
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                placeholder="If they have one"
                className="font-mono-code border-border-strong bg-surface-raised min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm uppercase outline-none focus:border-flame-2"
              />
              <button
                type="button"
                onClick={() => void applyCode()}
                disabled={!entry.trim() || checking}
                className="border-border-strong shrink-0 rounded-lg border px-3 py-2 text-sm font-medium transition-colors hover:bg-surface disabled:opacity-50"
              >
                {checking ? "…" : "Apply"}
              </button>
            </div>
            {rejected && (
              <p className="mt-1.5 text-xs text-flame-3">{rejected} isn&apos;t a code we know.</p>
            )}
          </div>
        )}

        <div className="flex justify-between text-sm text-muted">
          <span>{itemCount} item{itemCount === 1 ? "" : "s"}</span>
          <span>{formatCents(discounted?.subtotalCents ?? lineTotalCents)}</span>
        </div>
        {discounted && discounted.discountCents > 0 && (
          <div className="mt-1 flex justify-between text-sm text-flame-3">
            <span>Ambassador discount</span>
            <span>−{formatCents(discounted.discountCents)}</span>
          </div>
        )}
        <div className="mt-1 flex justify-between text-lg font-semibold">
          <span>Total</span>
          <span>{formatCents(totalCents)}</span>
        </div>

        <button
          type="button"
          disabled={ticket.length === 0}
          onClick={onCharge}
          className="btn-flame mt-4 w-full rounded-full px-6 py-4 text-base disabled:cursor-not-allowed disabled:opacity-50"
        >
          Charge {formatCents(totalCents)}
        </button>
      </div>
    </>
  );
}

function PaymentPanel({
  ticket,
  totalCents,
  promoCode,
  onBack,
  onComplete,
}: {
  ticket: CartLine[];
  totalCents: number;
  /** Null, not undefined, when there is no code: see resolveReferral. A
   *  till sale must never pick up a referral cookie left on the device. */
  promoCode: string | null;
  onBack: () => void;
  onComplete: () => void;
}) {
  const cardRef = useRef<SquareCard | null>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [cardReady, setCardReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

  useEffect(() => {
    if (!scriptReady || cardRef.current) return;
    if (!window.Square || !APPLICATION_ID || !LOCATION_ID) return;

    let cancelled = false;

    (async () => {
      const payments = await window.Square!.payments(APPLICATION_ID, LOCATION_ID);
      const card = await payments.card({ style: SQUARE_CARD_STYLE });
      await card.attach("#pos-card-container");
      if (cancelled) {
        await card.destroy();
        return;
      }
      cardRef.current = card;
      setCardReady(true);
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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!cardRef.current) return;

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
      lines: ticket,
      customerName: customerName.trim() || "Walk-in",
      customerEmail: customerEmail.trim(),
      // Resolved again on the server, so this is a lookup key and not a
      // claim about what the sale is worth. Always sent, null included.
      promoCode,
    });

    if (!outcome.ok) {
      setError(outcome.error ?? "Something went wrong.");
      setSubmitting(false);
      return;
    }

    onComplete();
  }

  if (!APPLICATION_ID || !LOCATION_ID) {
    return (
      <div>
        <button type="button" onClick={onBack} className="text-sm text-muted hover:text-foreground">
          ← Back
        </button>
        <p className="mt-6 rounded-lg border border-flame-1/40 bg-flame-1/10 px-4 py-3 text-sm text-flame-3">
          Card payments aren&apos;t configured yet — Square credentials are missing.
        </p>
      </div>
    );
  }

  return (
    <div>
      <Script src={SQUARE_JS_SRC} onLoad={() => setScriptReady(true)} strategy="afterInteractive" />

      <button type="button" onClick={onBack} className="text-sm text-muted hover:text-foreground">
        ← Back to sale
      </button>

      <h2 className="font-display mt-3 text-2xl">Charge {formatCents(totalCents)}</h2>
      <p className="mt-1 text-xs text-muted">This runs a real charge on your live Square account.</p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <div>
          <label htmlFor="pos-name" className="text-sm font-medium">
            Customer name <span className="font-normal text-muted">(optional)</span>
          </label>
          <input
            id="pos-name"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="mt-2 w-full rounded-lg border border-border-strong bg-surface-raised px-4 py-3 text-sm outline-none focus:border-flame-2"
          />
        </div>

        <div>
          <label htmlFor="pos-email" className="text-sm font-medium">
            Email for receipt <span className="font-normal text-muted">(optional)</span>
          </label>
          <input
            id="pos-email"
            type="email"
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
            className="mt-2 w-full rounded-lg border border-border-strong bg-surface-raised px-4 py-3 text-sm outline-none focus:border-flame-2"
          />
        </div>

        <div>
          <span className="text-sm font-medium">Card</span>
          <div
            id="pos-card-container"
            className="mt-2 rounded-lg border border-border-strong bg-surface-raised px-4 py-3"
          />
        </div>

        {error && (
          <p className="rounded-lg border border-flame-1/40 bg-flame-1/10 px-4 py-3 text-sm text-flame-3">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!cardReady || submitting}
          className="btn-flame rounded-full px-6 py-4 text-base disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Processing…" : `Charge ${formatCents(totalCents)}`}
        </button>
      </form>
    </div>
  );
}

function SuccessPanel({ totalCents, onNewSale }: { totalCents: number; onNewSale: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <span className="text-4xl" aria-hidden>
        ✓
      </span>
      <h2 className="font-display mt-3 text-3xl">Sale complete</h2>
      <p className="mt-1 text-muted">{formatCents(totalCents)} charged</p>
      <button
        type="button"
        onClick={onNewSale}
        className="btn-flame mt-6 rounded-full px-8 py-4 text-base"
      >
        New sale
      </button>
    </div>
  );
}
