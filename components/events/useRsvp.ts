"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "whoa_rsvp_events";
const EMPTY_SET: ReadonlySet<string> = new Set();

let rsvped: ReadonlySet<string> = EMPTY_SET;
let hydrated = false;
const listeners = new Set<() => void>();

function hydrateFromStorage() {
  if (hydrated) return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) rsvped = new Set(JSON.parse(raw));
  } catch {
    // ignore malformed/unavailable storage
  }
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(rsvped)));
  } catch {
    // ignore write failures (private browsing, quota, etc.)
  }
}

function notify() {
  listeners.forEach((listener) => listener());
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot() {
  hydrateFromStorage();
  return rsvped;
}

function getServerSnapshot() {
  return EMPTY_SET;
}

// Used after a real backend RSVP/ticket purchase succeeds, where "already
// marked" must stay marked rather than flip off — this never removes.
export function markRsvped(id: string) {
  hydrateFromStorage();
  if (rsvped.has(id)) return;
  const next = new Set(rsvped);
  next.add(id);
  rsvped = next;
  persist();
  notify();
}

export function useRsvpSet() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
