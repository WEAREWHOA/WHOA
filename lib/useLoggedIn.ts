"use client";

import { useSyncExternalStore } from "react";

// Reads the non-httpOnly whoa_logged_in cookie (set alongside the real,
// httpOnly session cookie by lib/auth.ts's createSession/destroySession).
// Client-only and deliberately not read in any Server Component — doing
// that in the root layout would force the entire site into dynamic
// rendering just to highlight a nav tab. useSyncExternalStore (rather than
// a useState+useEffect pair) is the React-sanctioned way to read a mutable
// value that only exists on the client without a hydration mismatch:
// getServerSnapshot returns false to match the server-rendered HTML, and
// the real value is read after hydration.
function subscribe(): () => void {
  return () => {};
}

function getSnapshot(): boolean {
  return document.cookie.split("; ").some((c) => c === "whoa_logged_in=1");
}

function getServerSnapshot(): boolean {
  return false;
}

export function useLoggedIn(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
