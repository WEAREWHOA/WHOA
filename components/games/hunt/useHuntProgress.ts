"use client";

import { useSyncExternalStore } from "react";
import { HUNT_STORAGE_KEY } from "@/lib/games/scavengerHunt";

const EMPTY: string[] = [];

let found: string[] = EMPTY;
let hydrated = false;
const listeners = new Set<() => void>();

function hydrate() {
  if (hydrated) return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(HUNT_STORAGE_KEY);
    found = raw ? (JSON.parse(raw) as string[]) : EMPTY;
  } catch {
    found = EMPTY;
  }
}

function notify() {
  listeners.forEach((l) => l());
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot() {
  hydrate();
  return found;
}

function getServerSnapshot() {
  return EMPTY;
}

export function markBranchFound(slug: string) {
  hydrate();
  if (found.includes(slug)) return;
  found = [...found, slug];
  try {
    localStorage.setItem(HUNT_STORAGE_KEY, JSON.stringify(found));
  } catch {
    // ignore write failures
  }
  notify();
}

export function useHuntProgress(): string[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
