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
 */
const SESSION_KEY = "whoa:sid";

function sessionId(): string | null {
  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const fresh =
      typeof crypto?.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(SESSION_KEY, fresh);
    return fresh;
  } catch {
    // Private mode, blocked storage, an embedded webview — count nothing
    // rather than inventing an id per view and inflating every session
    // number in the dashboard.
    return null;
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

    const sid = sessionId();
    if (!sid) return;

    const payload = JSON.stringify({
      path: pathname,
      sessionId: sid,
      referrer: document.referrer || null,
    });

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
