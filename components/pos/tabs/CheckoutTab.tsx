"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Script from "next/script";
import { checkoutAction } from "@/app/checkout/actions";
import { formatCents } from "@/lib/money";
import type { CartLine, Product } from "@/lib/types";

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

type Step = "shop" | "pay" | "done";

export default function CheckoutTab({ products }: { products: Product[] }) {
  const [ticket, setTicket] = useState<CartLine[]>([]);
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("shop");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, query]);

  const totalCents = ticket.reduce((sum, line) => sum + line.priceCents * line.quantity, 0);
  const itemCount = ticket.reduce((sum, line) => sum + line.quantity, 0);

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
            totalCents={totalCents}
            itemCount={itemCount}
            setQuantity={setQuantity}
            onCharge={() => setStep("pay")}
          />
        )}

        {step === "pay" && (
          <PaymentPanel
            ticket={ticket}
            totalCents={totalCents}
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
  totalCents,
  itemCount,
  setQuantity,
  onCharge,
}: {
  ticket: CartLine[];
  totalCents: number;
  itemCount: number;
  setQuantity: (variationId: string, quantity: number) => void;
  onCharge: () => void;
}) {
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
        <div className="flex justify-between text-sm text-muted">
          <span>{itemCount} item{itemCount === 1 ? "" : "s"}</span>
          <span>{formatCents(totalCents)}</span>
        </div>
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
  onBack,
  onComplete,
}: {
  ticket: CartLine[];
  totalCents: number;
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
      const card = await payments.card();
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
