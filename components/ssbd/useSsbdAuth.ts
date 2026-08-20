"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "whoa_ssbd_admin_unlocked";

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

export function unlockSsbdAdmin() {
  hydrateFromStorage();
  unlocked = true;
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // ignore write failures
  }
  notify();
}

export function useSsbdUnlocked() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
