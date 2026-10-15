"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { TURNSTILE_SITE_KEY } from "@/lib/turnstileWeb";

/**
 * The three hidden halves of lib/humanCheck.ts, as one component.
 *
 * Dropped inside any form. It renders:
 *
 *   a honeypot input, which a person never sees and so never fills in;
 *   a timestamp, so the server can tell a typed form from an instant one;
 *   Cloudflare's Turnstile widget, when a site key is configured.
 *
 * Two kinds of form use it, so it serves both. A plain
 * `<form action={serverAction}>` needs nothing but this component:
 * Turnstile injects its own `cf-turnstile-response` field and the rest
 * are ordinary inputs, so they all arrive in the FormData. A client
 * form that calls an action with a typed object passes `onChange` and
 * forwards the value it receives.
 */

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
          theme?: "auto" | "light" | "dark";
          appearance?: "always" | "execute" | "interaction-only";
        },
      ) => string | undefined;
      reset: (id?: string) => void;
    };
  }
}

export interface HumanCheckValue {
  turnstileToken: string | null;
  trap: string;
  renderedAt: number;
}

/** The honeypot's name. Plausible enough that a form-filling bot wants
 *  it, and not a field any real form here asks for. */
const TRAP_FIELD = "company_website";

export default function HumanCheck({
  onChange,
  className,
}: {
  /** For forms that call a server action with an object rather than
   *  posting FormData. */
  onChange?: (value: HumanCheckValue) => void;
  className?: string;
}) {
  const widgetRef = useRef<HTMLDivElement>(null);
  const renderedWidget = useRef(false);
  // Fixed once, on mount, rather than read at submit time -- the gap
  // between the two IS the measurement.
  const [renderedAt] = useState(() => Date.now());
  const [token, setToken] = useState<string | null>(null);
  const [trap, setTrap] = useState("");
  const [scriptReady, setScriptReady] = useState(false);

  // Kept in a ref so the effect below doesn't re-run (and re-render the
  // widget) every time the parent passes a new closure. Assigned in an
  // effect rather than during render, which React forbids: declared
  // first, so it has already run by the time the one below fires.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  useEffect(() => {
    onChangeRef.current?.({ turnstileToken: token, trap, renderedAt });
  }, [token, trap, renderedAt]);

  // Explicit rendering rather than Turnstile's automatic class scan:
  // React mounts and unmounts this subtree on its own schedule, and the
  // automatic mode renders whatever it finds at script load, which in a
  // client-navigated app is often nothing.
  useEffect(() => {
    if (!scriptReady || !TURNSTILE_SITE_KEY) return;
    if (renderedWidget.current || !widgetRef.current || !window.turnstile) return;

    renderedWidget.current = true;
    window.turnstile.render(widgetRef.current, {
      sitekey: TURNSTILE_SITE_KEY,
      theme: "dark",
      callback: (value) => setToken(value),
      // A token lasts five minutes. Somebody filling in a long
      // application will outlast one, so clearing it here lets the
      // widget hand over a fresh one rather than the form failing on a
      // token that quietly went stale.
      "expired-callback": () => setToken(null),
      "error-callback": () => setToken(null),
    });
  }, [scriptReady]);

  return (
    <div className={className}>
      {/* Not type="hidden": a bot reading the DOM skips hidden inputs,
          and the point is that it should fill this one in. Hidden from
          people with position, from assistive tech with aria-hidden,
          and from the keyboard with tabIndex. */}
      <div
        aria-hidden="true"
        style={{ position: "absolute", left: "-9999px", width: 1, height: 1, overflow: "hidden" }}
      >
        <label htmlFor={TRAP_FIELD}>Company website</label>
        <input
          id={TRAP_FIELD}
          name={TRAP_FIELD}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={trap}
          onChange={(e) => setTrap(e.target.value)}
        />
      </div>

      <input type="hidden" name="renderedAt" value={renderedAt} />
      {/* Mirrors Turnstile's own injected field, so a form that posts
          FormData carries the token whichever way it was captured. */}
      <input type="hidden" name="turnstileToken" value={token ?? ""} />

      {TURNSTILE_SITE_KEY && (
        <>
          <Script
            src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
            strategy="afterInteractive"
            onReady={() => setScriptReady(true)}
          />
          <div ref={widgetRef} className="mt-2" />
        </>
      )}
    </div>
  );
}
