"use client";

import { useSyncExternalStore } from "react";

/**
 * The Oasis pre-order in progress.
 *
 * Deliberately its own store with its own storage key, sharing nothing
 * with the shop's CartProvider. The two carts must never merge: one is
 * Square catalog objects that get charged, the other is pre-order requests
 * that don't. Keeping them apart means neither can leak into the other's
 * checkout, however either changes later.
 */

const STORAGE_KEY = "whoa_oasis_order";

export interface OasisOrderLine {
  slug: string;
  name: string;
  /** null for an item with no size choice. */
  size: string | null;
  unitPriceCents: number;
  quantity: number;
}

let lines: OasisOrderLine[] = [];
let hydrated = false;
const listeners = new Set<() => void>();
const EMPTY: OasisOrderLine[] = [];

/** slug + size is what makes a line unique — two sizes are two lines. */
function keyOf(line: { slug: string; size: string | null }): string {
  return `${line.slug}::${line.size ?? ""}`;
}

function hydrateFromStorage() {
  if (hydrated) return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) lines = parsed as OasisOrderLine[];
    }
  } catch {
    // Corrupt or unavailable storage — start empty rather than break the page.
  }
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  } catch {
    // Private browsing or a full quota — the order just won't survive a reload.
  }
}

function notify() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): OasisOrderLine[] {
  hydrateFromStorage();
  return lines;
}

function getServerSnapshot(): OasisOrderLine[] {
  return EMPTY;
}

export function useOasisOrder(): OasisOrderLine[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function addToOasisOrder(line: OasisOrderLine) {
  hydrateFromStorage();
  const key = keyOf(line);
  const existing = lines.find((l) => keyOf(l) === key);
  lines = existing
    ? lines.map((l) => (keyOf(l) === key ? { ...l, quantity: l.quantity + line.quantity } : l))
    : [...lines, line];
  persist();
  notify();
}

export function setOasisLineQuantity(slug: string, size: string | null, quantity: number) {
  hydrateFromStorage();
  const key = keyOf({ slug, size });
  lines =
    quantity <= 0
      ? lines.filter((l) => keyOf(l) !== key)
      : lines.map((l) => (keyOf(l) === key ? { ...l, quantity } : l));
  persist();
  notify();
}

export function removeFromOasisOrder(slug: string, size: string | null) {
  setOasisLineQuantity(slug, size, 0);
}

export function clearOasisOrder() {
  hydrateFromStorage();
  lines = [];
  persist();
  notify();
}

export function oasisOrderTotalCents(order: OasisOrderLine[]): number {
  return order.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0);
}

export function oasisOrderCount(order: OasisOrderLine[]): number {
  return order.reduce((sum, line) => sum + line.quantity, 0);
}
