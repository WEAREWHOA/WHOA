"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Sends one beacon per page view, including client-side route changes,
 * which a server-side count would miss entirely on an App Router site.
 *
 * The session id lives in sessionStorage, not a cookie: it dies with the
 * tab, never leaves this origin and is never sent anywhere else, so it
 * can order pages within one visit without being an identity. That's the
 * whole reason this needs no consent banner.
 *
 * Campaign tags are read once, on the first view of a session, and the
 * whole visit is attributed to that — first-touch. Reading them on every
 * view would credit the last page someone happened to be on rather than
 * however they arrived, and utm_* only exists on the landing URL anyway.
 */
const SESSION_KEY = "whoa:sid";
const ENTRY_KEY = "whoa:entry";

function readSession(): { id: string; isEntry: boolean } | null {
  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing) {
      return { id: existing, isEntry: sessionStorage.getItem(ENTRY_KEY) !== "1" };
    }
    const fresh =
      typeof crypto?.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(SESSION_KEY, fresh);
    return { id: fresh, isEntry: true };
  } catch {
    // Private mode, blocked storage, an embedded webview — count nothing
    // rather than inventing an id per view and inflating every session
    // number in the dashboard.
    return null;
  }
}

function markEntrySent(): void {
  try {
    sessionStorage.setItem(ENTRY_KEY, "1");
  } catch {
    // If it can't be marked, the next view is treated as an entry too.
    // An over-counted entry is better than a lost one.
  }
}

export default function PageViewTracker() {
  const pathname = usePathname();
  // Guards React's development double-run, which would otherwise double
  // every view on every page in local testing.
  const lastSent = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || lastSent.current === pathname) return;
    lastSent.current = pathname;

    const session = readSession();
    if (!session) return;

    // Only on the entry view: utm_* lives on the landing URL and is gone
    // the moment someone navigates.
    let utmSource: string | null = null;
    let utmMedium: string | null = null;
    let utmCampaign: string | null = null;
    if (session.isEntry) {
      try {
        const params = new URLSearchParams(window.location.search);
        utmSource = params.get("utm_source");
        utmMedium = params.get("utm_medium");
        utmCampaign = params.get("utm_campaign");
      } catch {
        // A malformed query string is not worth losing the view over.
      }
    }

    const payload = JSON.stringify({
      path: pathname,
      sessionId: session.id,
      referrer: document.referrer || null,
      utmSource,
      utmMedium,
      utmCampaign,
      isEntry: session.isEntry,
    });

    if (session.isEntry) markEntrySent();

    try {
      // keepalive so the view still lands when the tap that caused it is
      // also navigating away.
      void fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    } catch {
      // Nothing to do and nobody to tell.
    }
  }, [pathname]);

  return null;
}
