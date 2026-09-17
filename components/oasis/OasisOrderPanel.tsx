"use client";

import { useEffect, useState, type FormEvent } from "react";
import { formatCents } from "@/lib/money";
import { getAccountAction } from "@/app/account/actions";
import { submitOasisPreorderAction } from "@/app/oasis/actions";
import {
  clearOasisOrder,
  oasisOrderTotalCents,
  removeFromOasisOrder,
  setOasisLineQuantity,
  useOasisOrder,
} from "@/components/oasis/oasisOrder";

export default function OasisOrderPanel({ onClose }: { onClose: () => void }) {
  const order = useOasisOrder();
  const total = oasisOrderTotalCents(order);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Accounts are the one thing the catalogue shares with the rest of the
  // site, so a signed-in visitor shouldn't retype what we already know.
  useEffect(() => {
    let cancelled = false;
    getAccountAction()
      .then((account) => {
        if (cancelled || !account) return;
        setName((prev) => prev || account.name);
        setEmail((prev) => prev || account.email);
      })
      .catch((err) => {
        console.error("Couldn't check the Oasis visitor's account:", err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await submitOasisPreorderAction({
      name,
      email,
      phone: phone || undefined,
      note: note || undefined,
      lines: order.map((line) => ({ slug: line.slug, size: line.size, quantity: line.quantity })),
    });

    if (!result.ok) {
      setError(result.error ?? "Something went wrong.");
      setSubmitting(false);
      return;
    }

    clearOasisOrder();
    setDone(true);
    setSubmitting(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div aria-hidden className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <aside
        className="oasis-panel relative z-10 flex h-full w-full max-w-md flex-col overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#f7f0e6]/10 px-6 py-5">
          <h2 className="font-display text-xl tracking-wide">Your order</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-2xl leading-none text-[#9a8b79] hover:text-[#f7f0e6]"
          >
            ×
          </button>
        </div>

        {done ? (
          <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
            <p className="text-xs font-semibold tracking-[0.2em] text-[#e8a33d] uppercase">
              Request received
            </p>
            <h3 className="font-display mt-3 text-3xl">We&apos;ll be in touch</h3>
            <p className="mt-3 text-sm text-[#c9b8a4]">
              Your pre-order is with us. Nothing has been charged — we&apos;ll confirm timing and
              payment with you at {email} before anything is made.
            </p>
            <button type="button" onClick={onClose} className="oasis-btn mt-8">
              Back to the catalogue
            </button>
          </div>
        ) : order.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
            <p className="text-sm text-[#9a8b79]">Your order is empty.</p>
            <button type="button" onClick={onClose} className="oasis-btn mt-6">
              Browse the catalogue
            </button>
          </div>
        ) : (
          <>
            <ul className="flex flex-col gap-4 px-6 py-5">
              {order.map((line) => (
                <li key={`${line.slug}::${line.size ?? ""}`} className="flex gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{line.name}</p>
                    {line.size && <p className="text-xs text-[#9a8b79]">Size {line.size}</p>}
                    <button
                      type="button"
                      onClick={() => removeFromOasisOrder(line.slug, line.size)}
                      className="mt-1 text-xs text-[#9a8b79] underline underline-offset-2 hover:text-[#e8a33d]"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="flex shrink-0 items-start gap-3">
                    <label className="sr-only" htmlFor={`qty-${line.slug}-${line.size ?? "one"}`}>
                      Quantity for {line.name}
                    </label>
                    <input
                      id={`qty-${line.slug}-${line.size ?? "one"}`}
                      type="number"
                      min={1}
                      max={20}
                      value={line.quantity}
                      onChange={(e) =>
                        setOasisLineQuantity(line.slug, line.size, Number(e.target.value))
                      }
                      className="oasis-input w-16 text-center"
                    />
                    <span className="w-20 text-right text-sm">
                      {formatCents(line.unitPriceCents * line.quantity)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>

            <div className="flex items-center justify-between border-t border-[#f7f0e6]/10 px-6 py-4">
              <span className="text-sm text-[#9a8b79]">Estimated total</span>
              <span className="font-display text-xl">{formatCents(total)}</span>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-6 pt-2 pb-8">
              <p className="text-xs leading-relaxed text-[#9a8b79]">
                This is a request, not a purchase. Nothing is charged now — we&apos;ll confirm
                availability, timing and payment with you first.
              </p>

              <div>
                <label htmlFor="oasis-name" className="text-sm font-medium">
                  Name
                </label>
                <input
                  id="oasis-name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="oasis-input mt-2 w-full"
                />
              </div>

              <div>
                <label htmlFor="oasis-email" className="text-sm font-medium">
                  Email
                </label>
                <input
                  id="oasis-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="oasis-input mt-2 w-full"
                />
              </div>

              <div>
                <label htmlFor="oasis-phone" className="text-sm font-medium">
                  Phone <span className="font-normal text-[#9a8b79]">(optional)</span>
                </label>
                <input
                  id="oasis-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="oasis-input mt-2 w-full"
                />
              </div>

              <div>
                <label htmlFor="oasis-note" className="text-sm font-medium">
                  Anything we should know?{" "}
                  <span className="font-normal text-[#9a8b79]">(optional)</span>
                </label>
                <textarea
                  id="oasis-note"
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="oasis-input mt-2 w-full resize-y"
                />
              </div>

              {error && (
                <p className="rounded-lg border border-[#ff6b4a]/40 bg-[#ff6b4a]/10 px-4 py-3 text-sm text-[#ff9b7a]">
                  {error}
                </p>
              )}

              <button type="submit" disabled={submitting} className="oasis-btn-lg">
                {submitting ? "Sending…" : "Send pre-order request"}
              </button>
            </form>
          </>
        )}
      </aside>
    </div>
  );
}
