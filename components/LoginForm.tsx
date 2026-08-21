import Link from "next/link";
import { loginAction, registerAction } from "@/lib/actions";

const loginErrors: Record<string, string> = {
  missing: "Enter your ambassador code (or email) and your password.",
  notfound: "We couldn't find an ambassador with that code or email.",
  invalid: "Incorrect password.",
  exists: "An account with that email already exists — log in below.",
  server: "Something went wrong on our end — please try again.",
};

const signupErrors: Record<string, string> = {
  missing: "Enter a valid email to continue.",
  "weak-password": "Password must be at least 8 characters.",
  exists: "An account with that email already exists — log in instead.",
  server: "Something went wrong creating your account — please try again.",
};

export default function LoginForm({
  from,
  mode = "login",
  error,
}: {
  from: string;
  mode?: "login" | "signup";
  error?: string;
}) {
  const isSignup = mode === "signup";
  const message = error ? (isSignup ? signupErrors[error] : loginErrors[error]) : undefined;

  return (
    <div className="card-surface w-full max-w-md rounded-2xl p-8 sm:p-10">
      <span className="text-xs font-semibold tracking-[0.2em] text-muted uppercase">
        WHOA dashboard login
      </span>

      <div className="mt-4 flex gap-2">
        <Link
          href="/login"
          className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
            !isSignup ? "btn-flame" : "border border-border-strong text-muted hover:text-foreground"
          }`}
        >
          Log In
        </Link>
        <Link
          href="/login?mode=signup"
          className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
            isSignup ? "btn-flame" : "border border-border-strong text-muted hover:text-foreground"
          }`}
        >
          Sign Up
        </Link>
      </div>

      {isSignup ? (
        <>
          <h1 className="font-display mt-5 text-4xl tracking-wide">
            Create your <span className="text-flame">account</span>
          </h1>
          <p className="mt-3 text-sm text-muted">
            Just an email and a password — you&apos;re in instantly, no confirmation email. You&apos;ll
            land on your dashboard with every tab unlocked.
          </p>

          {message && (
            <p className="mt-6 rounded-lg border border-flame-1/40 bg-flame-1/10 px-4 py-3 text-sm text-flame-3">
              {message}
            </p>
          )}

          <form action={registerAction} className="mt-8 flex flex-col gap-5">
            <div>
              <label htmlFor="signup-email" className="text-sm font-medium">
                Email
              </label>
              <input
                id="signup-email"
                name="email"
                type="email"
                required
                placeholder="you@example.com"
                className="mt-2 w-full rounded-lg border border-border-strong bg-surface-raised px-4 py-3 text-sm outline-none focus:border-flame-2"
              />
            </div>

            <div>
              <label htmlFor="signup-password" className="text-sm font-medium">
                Password
              </label>
              <input
                id="signup-password"
                name="password"
                type="password"
                required
                minLength={8}
                placeholder="At least 8 characters"
                className="mt-2 w-full rounded-lg border border-border-strong bg-surface-raised px-4 py-3 text-sm outline-none focus:border-flame-2"
              />
            </div>

            <button type="submit" className="btn-flame mt-2 rounded-full px-8 py-4 text-base">
              Create account
            </button>
          </form>
        </>
      ) : (
        <>
          <h1 className="font-display mt-5 text-4xl tracking-wide">
            Welcome <span className="text-flame">back</span>
          </h1>
          <p className="mt-3 text-sm text-muted">
            One login for everything — ambassador tools, purchases, vendor sales, and SSBD. Log in
            with your code (or email) and your password.
          </p>

          {message && (
            <p className="mt-6 rounded-lg border border-flame-1/40 bg-flame-1/10 px-4 py-3 text-sm text-flame-3">
              {message}
            </p>
          )}

          <form action={loginAction} className="mt-8 flex flex-col gap-5">
            <input type="hidden" name="from" value={from} />

            <div>
              <label htmlFor="identifier" className="text-sm font-medium">
                Code or email
              </label>
              <input
                id="identifier"
                name="identifier"
                type="text"
                required
                placeholder="WHOA-DEMO15"
                className="font-mono-code mt-2 w-full rounded-lg border border-border-strong bg-surface-raised px-4 py-3 text-sm outline-none focus:border-flame-2"
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
                placeholder="••••••••"
                className="mt-2 w-full rounded-lg border border-border-strong bg-surface-raised px-4 py-3 text-sm outline-none focus:border-flame-2"
              />
            </div>

            <button type="submit" className="btn-flame mt-2 rounded-full px-8 py-4 text-base">
              Log in
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-muted">
            Try the demo: <span className="font-mono-code">WHOA-DEMO15</span> /{" "}
            <span className="font-mono-code">whoa-demo-2026</span>
          </p>
        </>
      )}

      <p className="mt-6 text-center text-sm text-muted">
        {isSignup ? "Want the full ambassador application instead?" : "Not an ambassador yet?"}{" "}
        <Link href="/apply" className="text-flame font-medium">
          Apply
        </Link>
      </p>
    </div>
  );
}
