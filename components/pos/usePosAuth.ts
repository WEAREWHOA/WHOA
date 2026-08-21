"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "whoa_pos_unlocked";

let unlocked = false;
let hydrated = false;
const listeners = new Set<() => void>();

function hydrateFromStorage() {
  if (hydrated) return;
  hydrated = true;
  try {
    unlocked = localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    // ignore unavailable storage
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
  return unlocked;
}

function getServerSnapshot() {
  return false;
}

export function unlockPos() {
  hydrateFromStorage();
  unlocked = true;
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // ignore write failures
  }
  notify();
}

export function lockPos() {
  hydrateFromStorage();
  unlocked = false;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore write failures
  }
  notify();
}

export function usePosUnlocked() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
