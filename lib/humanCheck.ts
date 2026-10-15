import { headers } from "next/headers";

/**
 * Is there a person on the other end of this form?
 *
 * Three checks, cheapest first, because they fail for different reasons
 * and no single one of them is enough:
 *
 *   The honeypot. A field a human never sees and so never fills in.
 *   Costs nothing, adds no friction, needs no third party, and catches
 *   the great majority of drive-by bots, which fill every input they
 *   find. It is also the only check that still works when a script
 *   fails to load.
 *
 *   The clock. A form submitted a moment after it rendered was not
 *   typed into. The floor is deliberately low and configurable: a
 *   one-field newsletter box is genuinely filled in two seconds, an
 *   application form is not.
 *
 *   Turnstile. Cloudflare's challenge, which is what actually stops a
 *   determined script. Last because it is the only one that depends on
 *   a network call and on somebody having set two environment
 *   variables.
 *
 * SERVER ONLY. This module reads next/headers, so importing it from a
 * client component pulls that into the browser bundle and fails the
 * build. The site key the widget needs lives in lib/turnstileWeb.ts for
 * exactly that reason -- the same split as lib/square.ts and
 * lib/squareWeb.ts.
 *
 * INERT UNTIL CONFIGURED. With no TURNSTILE_SECRET_KEY, the token check
 * is skipped and the honeypot and clock still run. That is deliberate:
 * this ships before the keys exist, and a verification step that
 * rejected every submission the moment it was deployed would take the
 * contact form down rather than protect it. The same posture as the
 * optional permission columns in lib/store.ts -- a missing piece of
 * configuration costs a layer of defence, not the feature.
 */

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

function secretKey(): string {
  return process.env.TURNSTILE_SECRET_KEY ?? "";
}

export interface HumanCheckInput {
  /**
   * Cloudflare's token. Named for the field Turnstile injects into a
   * form by itself, so a plain `<form action={...}>` needs no wiring
   * beyond rendering the widget inside it.
   */
  turnstileToken?: string | null;
  /** The honeypot. Anything in here came from a script. */
  trap?: string | null;
  /** Epoch ms, written when the form rendered. */
  renderedAt?: string | number | null;
}

export interface HumanCheckResult {
  ok: boolean;
  /** For the log, never for the visitor: it tells a bot which check it tripped. */
  reason?: string;
}

/** What a rejected submission is told. Deliberately one message for every
 *  failure, so a script learns nothing from which one it hit. */
export const HUMAN_CHECK_ERROR =
  "We couldn't verify that submission came from a person. Please reload the page and try again.";

/** Reads the honeypot and the clock out of a FormData-based submission. */
export function humanCheckFromForm(formData: FormData): HumanCheckInput {
  return {
    // Turnstile names its own injected field; the explicit one is for
    // the client forms that pass a token they captured themselves.
    turnstileToken:
      String(formData.get("cf-turnstile-response") || "") ||
      String(formData.get("turnstileToken") || ""),
    trap: String(formData.get("company_website") || ""),
    renderedAt: String(formData.get("renderedAt") || ""),
  };
}

export async function verifyHuman(
  input: HumanCheckInput,
  options: { minSeconds?: number } = {},
): Promise<HumanCheckResult> {
  // 1. The honeypot, which costs nothing and needs nothing.
  if (input.trap && String(input.trap).trim().length > 0) {
    return { ok: false, reason: "honeypot" };
  }

  // 2. The clock. A missing timestamp is not a failure -- an older
  //    cached page, or a form this check was added to before its widget
  //    was, would have none -- so only a present-and-too-fast one is.
  const minSeconds = options.minSeconds ?? 2;
  const renderedAt = Number(input.renderedAt);
  if (Number.isFinite(renderedAt) && renderedAt > 0) {
    const elapsed = (Date.now() - renderedAt) / 1000;
    // A negative age means a clock that disagrees with ours rather than
    // a time traveller, and is not held against anybody.
    if (elapsed >= 0 && elapsed < minSeconds) {
      return { ok: false, reason: "too-fast" };
    }
  }

  // 3. Turnstile, if it is configured at all.
  const secret = secretKey();
  if (!secret) return { ok: true };

  const token = String(input.turnstileToken || "").trim();
  if (!token) return { ok: false, reason: "missing-token" };

  try {
    const body = new URLSearchParams({ secret, response: token });

    // Cloudflare uses the IP only to sharpen its own scoring. Sent when
    // the platform gives us one and omitted otherwise, rather than
    // guessing from a header a client can set.
    const forwarded = (await headers()).get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim();
    if (ip) body.set("remoteip", ip);

    const response = await fetch(VERIFY_URL, {
      method: "POST",
      body,
      // Never cached: a token is single-use, and a cached "yes" would
      // let one solved challenge authorise every later submission.
      cache: "no-store",
    });

    const result = (await response.json()) as { success?: boolean; "error-codes"?: string[] };
    if (result.success) return { ok: true };

    return { ok: false, reason: (result["error-codes"] ?? ["rejected"]).join(",") };
  } catch (err) {
    // Cloudflare being unreachable must not take the forms down with
    // it. The honeypot and the clock have already run, so a submission
    // that reaches here has passed the checks that do not need a
    // network -- letting it through is the lesser failure.
    console.error("Turnstile verification failed to complete:", err);
    return { ok: true, reason: "verify-unreachable" };
  }
}
