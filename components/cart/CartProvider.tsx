"use client";

import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";
import type { CartLine } from "@/lib/types";

const CART_STORAGE_KEY = "whoa_cart";

let cart: CartLine[] = [];
let hydrated = false;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function hydrateFromStorage() {
  if (hydrated) return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (raw) cart = JSON.parse(raw);
  } catch {
    // corrupt or unavailable storage — start with an empty cart
  }
}

function persist() {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  } catch {
    // storage unavailable — cart just won't persist across reloads
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): CartLine[] {
  hydrateFromStorage();
  return cart;
}

function getServerSnapshot(): CartLine[] {
  return [];
}

function setCart(next: CartLine[]) {
  cart = next;
  persist();
  notify();
}

interface CartContextValue {
  lines: CartLine[];
  addLine: (line: Omit<CartLine, "quantity">, quantity?: number) => void;
  removeLine: (variationId: string) => void;
  setQuantity: (variationId: string, quantity: number) => void;
  clear: () => void;
  totalCents: number;
  itemCount: number;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const lines = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function addLine(line: Omit<CartLine, "quantity">, quantity = 1) {
    const existing = cart.find((l) => l.variationId === line.variationId);
    if (existing) {
      setCart(
        cart.map((l) =>
          l.variationId === line.variationId ? { ...l, quantity: l.quantity + quantity } : l,
        ),
      );
    } else {
      setCart([...cart, { ...line, quantity }]);
    }
  }

  function removeLine(variationId: string) {
    setCart(cart.filter((l) => l.variationId !== variationId));
  }

  function setQuantity(variationId: string, quantity: number) {
    if (quantity <= 0) {
      removeLine(variationId);
      return;
    }
    setCart(cart.map((l) => (l.variationId === variationId ? { ...l, quantity } : l)));
  }

  function clear() {
    setCart([]);
  }

  const totalCents = lines.reduce((sum, l) => sum + l.priceCents * l.quantity, 0);
  const itemCount = lines.reduce((sum, l) => sum + l.quantity, 0);

  return (
    <CartContext.Provider
      value={{ lines, addLine, removeLine, setQuantity, clear, totalCents, itemCount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
