"use client";

import { useSyncExternalStore } from "react";

/**
 * The one spin a bottle gets.
 *
 * Stored per device rather than per account, because the person scanning
 * the QR on an H2WHOA bottle is usually not signed in — asking them to log
 * in before they can spin would lose most of them at the first tap. The
 * trade-off is that this is a fun, low-stakes promo, not a controlled
 * voucher: clearing site data or using another phone gets another spin.
 * Worth knowing before the prize becomes anything more expensive than a
 * sticker — see the note in app/water/page.tsx.
 */

const STORAGE_KEY = "whoa_water_spin";

export interface WaterSpin {
  /** true = free sticker. */
  won: boolean;
  /** Shown at the WHOAdega so staff have something to read back. */
  code: string;
  /** ISO date, so staff can see how old a claim is. */
  spunAt: string;
}

let spin: WaterSpin | null = null;
let hydrated = false;
const listeners = new Set<() => void>();

function hydrateFromStorage() {
  if (hydrated) return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Partial<WaterSpin>;
    if (typeof parsed.won === "boolean" && typeof parsed.code === "string") {
      spin = { won: parsed.won, code: parsed.code, spunAt: parsed.spunAt ?? "" };
    }
  } catch {
    // Unreadable storage just means they get to spin — the friendlier miss.
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

function getSnapshot(): WaterSpin | null {
  hydrateFromStorage();
  return spin;
}

function getServerSnapshot(): WaterSpin | null {
  return null;
}

export function useWaterSpin(): WaterSpin | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** A short, readable code — staff read it off a screen, so no lookalikes. */
function makeCode(): string {
  const alphabet = "ACDEFHJKLMNPRTWXY3479";
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `H2W-${code}`;
}

export function recordWaterSpin(won: boolean): WaterSpin {
  hydrateFromStorage();
  // Already spun — hand back the original result rather than overwriting
  // it. One chance means one chance, including on a double-tap.
  if (spin) return spin;

  spin = { won, code: makeCode(), spunAt: new Date().toISOString() };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(spin));
  } catch {
    // Private browsing — the result still shows for this visit, it just
    // won't survive a reload.
  }
  notify();
  return spin;
}
