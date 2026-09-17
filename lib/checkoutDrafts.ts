"use client";

import { useSyncExternalStore } from "react";

// A checkout in progress, parked in session storage.
//
// Cash App Pay on a phone hands the customer over to the Cash App and
// reloads the page they came from on the way back. Without somewhere to
// park the form, they'd land on a blank checkout — or, for a ticket, on a
// bare /events with no modal left — while Square's SDK is holding a
// payment token it needs to give back to a live checkout.
//
// These are read through useSyncExternalStore rather than an effect so the
// server render sees "no draft" and the client picks up the real one on
// hydration, the same way the cart and RSVP stores in this app work.

interface SessionDraftStore<T> {
  /** null until the browser is running and a draft is actually parked. */
  useDraft: () => T | null;
  save: (draft: T) => void;
  clear: () => void;
}

function createSessionDraftStore<T>(
  storageKey: string,
  parse: (raw: Record<string, unknown>) => T | null,
): SessionDraftStore<T> {
  let draft: T | null = null;
  let hydrated = false;
  const listeners = new Set<() => void>();

  function hydrateFromStorage() {
    if (hydrated) return;
    hydrated = true;
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw) draft = parse(JSON.parse(raw) as Record<string, unknown>);
    } catch {
      // Corrupt, or storage turned off — carry on with no draft.
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

  function getSnapshot() {
    hydrateFromStorage();
    return draft;
  }

  function getServerSnapshot(): T | null {
    return null;
  }

  return {
    useDraft: () => useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot),
    save(next: T) {
      hydrated = true;
      draft = next;
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // Storage unavailable — only the redirect round-trip is lost.
      }
      notify();
    },
    clear() {
      hydrated = true;
      draft = null;
      try {
        sessionStorage.removeItem(storageKey);
      } catch {
        // Nothing to clean up if storage was never available.
      }
      notify();
    },
  };
}

function readString(source: Record<string, unknown>, key: string): string {
  return typeof source[key] === "string" ? (source[key] as string) : "";
}

export interface ShopCheckoutDraft {
  name: string;
  email: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  referenceId: string;
}

export const shopCheckoutDraft = createSessionDraftStore<ShopCheckoutDraft>(
  "whoa-checkout-draft",
  // Deliberately no password field anywhere in here — a wallet redirect
  // isn't a reason to put one in session storage. Worst case, someone who
  // meant to create an account checks out as a guest.
  (raw) => ({
    name: readString(raw, "name"),
    email: readString(raw, "email"),
    line1: readString(raw, "line1"),
    line2: readString(raw, "line2"),
    city: readString(raw, "city"),
    state: readString(raw, "state"),
    zip: readString(raw, "zip"),
    phone: readString(raw, "phone"),
    referenceId: readString(raw, "referenceId"),
  }),
);

export interface EventCheckoutDraft {
  eventId: string;
  name: string;
  email: string;
  phone: string;
  quantity: number;
  selectedArtist: string;
  waiverAgreed: boolean;
  referenceId: string;
}

export const eventCheckoutDraft = createSessionDraftStore<EventCheckoutDraft>(
  "whoa-event-checkout-draft",
  (raw) => {
    const eventId = readString(raw, "eventId");
    // A draft with no event can't be reopened against anything.
    if (!eventId) return null;
    return {
      eventId,
      name: readString(raw, "name"),
      email: readString(raw, "email"),
      phone: readString(raw, "phone"),
      quantity: typeof raw.quantity === "number" && raw.quantity >= 1 ? raw.quantity : 1,
      selectedArtist: readString(raw, "selectedArtist"),
      waiverAgreed: raw.waiverAgreed === true,
      referenceId: readString(raw, "referenceId"),
    };
  },
);

/**
 * Cash App Pay matches a customer coming back from the Cash App to the
 * checkout they left by this id, so it has to survive the round trip.
 */
export function newReferenceId(prefix: string): string {
  return `whoa-${prefix}-${Date.now().toString(36)}`;
}
