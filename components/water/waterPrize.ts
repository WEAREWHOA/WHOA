"use client";

import { useSyncExternalStore } from "react";

/**
 * The one spin a bottle gets.
 *
 * The spin is stored per device, because the person scanning a QR on a
 * bottle usually isn't signed in and making them log in before they can
 * play would lose most of them at the first tap. Clearing site data buys
 * another spin, and that's fine — the spin isn't the prize.
 *
 * The *prize* is a different matter: a win only becomes a code once
 * there's an account behind it (see app/water/actions.ts), and the code
 * is issued and stored server-side against that account. So however many
 * times someone re-spins, one person still gets one sticker.
 */

const STORAGE_KEY = "whoa_water_spin";

export interface WaterSpin {
  /** true = free sticker, pending a claim. */
  won: boolean;
  /** ISO date of the spin. */
  spunAt: string;
  /**
   * The server-issued claim code, once an account has claimed it. Absent
   * on a fresh win — that's what tells the page to ask them to sign up.
   */
  code?: string;
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
    if (typeof parsed.won === "boolean") {
      spin = {
        won: parsed.won,
        spunAt: parsed.spunAt ?? "",
        code: typeof parsed.code === "string" ? parsed.code : undefined,
      };
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

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(spin));
  } catch {
    // Private browsing — the result still shows for this visit, it just
    // won't survive a reload.
  }
}

export function recordWaterSpin(won: boolean): WaterSpin {
  hydrateFromStorage();
  // Already spun — hand back the original result rather than overwriting
  // it. One chance means one chance, including on a double-tap.
  if (spin) return spin;

  spin = { won, spunAt: new Date().toISOString() };
  persist();
  notify();
  return spin;
}

/** Remembers the code the server issued, so it survives a reload. */
export function saveWaterCode(code: string) {
  hydrateFromStorage();
  if (!spin) return;
  spin = { ...spin, code };
  persist();
  notify();
}
