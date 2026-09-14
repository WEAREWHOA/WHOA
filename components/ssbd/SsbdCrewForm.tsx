import Link from "next/link";
import { ssbdJoinAction, ssbdLoginAction, ssbdSignupAction } from "@/app/ssbd/actions";

const ERRORS: Record<string, string> = {
  missing: "Fill in your name, email and a password to continue.",
  "weak-password": "Password must be at least 8 characters.",
  exists: "There's already an account with that email — log in instead.",
  notfound: "We couldn't find an account with that code or email.",
  invalid: "Incorrect password.",
  code: "That crew code isn't right — check with whoever sent you this link.",
  session: "Your session expired — log in again below.",
  server: "Something went wrong on our end — please try again.",
};

const FIELD =
  "mt-2 w-full rounded-lg border border-border-strong bg-surface-raised px-4 py-3 text-sm outline-none focus:border-flame-2";

/**
 * The crew invite form: make an account or log into an existing one, and
 * come out the other side already on the crew.
 *
 * Deliberately not the site's shared LoginForm. That one is the front door
 * to the whole portal and sends people to their dashboard; this one has a
 * single job, says so, and every path through it ends in the same place —
 * so the wording ("Join the crew", not "Log in") can tell the truth about
 * what pressing the button does.
 */
export default function SsbdCrewForm({
  mode,
  error,
  codeRequired,
  signedInAs,
}: {
  mode: "signup" | "login";
  error?: string;
  /** Only true when SSBD_CREW_CODE is set in the environment. */
  codeRequired: boolean;
  /** Set when someone's already logged in but not yet on this crew. */
  signedInAs?: { code: string; name: string };
}) {
  const message = error ? (ERRORS[error] ?? ERRORS.server) : undefined;
  const isSignup = mode === "signup";

  const crewCodeField = codeRequired ? (
    <div>
      <label htmlFor="crewCode" className="text-sm font-medium">
        Crew code
      </label>
      <input
        id="crewCode"
        name="crewCode"
        type="text"
        required
        placeholder="From whoever sent you this link"
        className={FIELD}
      />
    </div>
  ) : null;

  const errorBox = message ? (
    <p className="border-flame-1/40 bg-flame-1/10 text-flame-3 mt-6 rounded-lg border px-4 py-3 text-sm">
      {message}
    </p>
  ) : null;

  // Already signed in, just not on this crew yet. One button.
  if (signedInAs) {
    return (
      <div className="card-surface rounded-2xl p-8 sm:p-10">
        <h2 className="font-display text-2xl tracking-wide">
          Join the crew, <span className="text-flame">{signedInAs.name}</span>
        </h2>
        <p className="mt-3 text-sm text-muted">
          You&apos;re signed in already. This unlocks your EVENT SALES tab and puts you down to work
          Same Same But Different — no application, no waiting.
        </p>

        {errorBox}

        <form action={ssbdJoinAction} className="mt-8 flex flex-col gap-5">
          {crewCodeField}
          <button type="submit" className="btn-flame rounded-full px-8 py-4 text-base">
            Count me in
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          Not you?{" "}
          <Link href="/login" className="text-flame font-medium">
            Log in as someone else
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="card-surface rounded-2xl p-8 sm:p-10">
      <div className="flex gap-2">
        <Link
          href="/ssbd"
          className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
            isSignup ? "btn-flame" : "border border-border-strong text-muted hover:text-foreground"
          }`}
        >
          New here
        </Link>
        <Link
          href="/ssbd?mode=login"
          className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
            !isSignup ? "btn-flame" : "border border-border-strong text-muted hover:text-foreground"
          }`}
        >
          I have an account
        </Link>
      </div>

      <h2 className="font-display mt-5 text-3xl tracking-wide">
        {isSignup ? (
          <>
            Sign up to <span className="text-flame">work it</span>
          </>
        ) : (
          <>
            Log in and <span className="text-flame">join</span>
          </>
        )}
      </h2>
      <p className="mt-3 text-sm text-muted">
        One step. This makes your account, unlocks your EVENT SALES tab, and puts you down to work
        this event — no separate application, no waiting on approval.
      </p>

      {errorBox}

      {isSignup ? (
        <form action={ssbdSignupAction} className="mt-8 flex flex-col gap-5">
          {crewCodeField}

          <div>
            <label htmlFor="name" className="text-sm font-medium">
              Your name
            </label>
            {/* Required here, unlike the site's plain signup — this list is
                a crew roster and a shift schedule that staff read. */}
            <input id="name" name="name" type="text" required placeholder="First and last" className={FIELD} />
          </div>

          <div>
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              className={FIELD}
            />
          </div>

          <div>
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              placeholder="At least 8 characters"
              className={FIELD}
            />
          </div>

          <button type="submit" className="btn-flame mt-2 rounded-full px-8 py-4 text-base">
            Sign up &amp; join the crew
          </button>
        </form>
      ) : (
        <form action={ssbdLoginAction} className="mt-8 flex flex-col gap-5">
          {crewCodeField}

          <div>
            <label htmlFor="identifier" className="text-sm font-medium">
              Code or email
            </label>
            <input
              id="identifier"
              name="identifier"
              type="text"
              required
              placeholder="you@example.com"
              className={`font-mono-code ${FIELD}`}
            />
          </div>

          <div>
            <label htmlFor="login-password" className="text-sm font-medium">
              Password
            </label>
            <input
              id="login-password"
              name="password"
              type="password"
              required
              placeholder="••••••••"
              className={FIELD}
            />
          </div>

          <button type="submit" className="btn-flame mt-2 rounded-full px-8 py-4 text-base">
            Log in &amp; join the crew
          </button>
        </form>
      )}
    </div>
  );
}
