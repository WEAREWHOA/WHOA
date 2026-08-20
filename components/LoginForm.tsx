import Link from "next/link";
import { loginAction } from "@/lib/actions";

const errorMessages: Record<string, string> = {
  missing: "Enter your ambassador code (or email) and your password.",
  notfound: "We couldn't find an ambassador with that code or email.",
  invalid: "Incorrect password.",
  exists: "An account with that email already exists — log in below.",
};

export default function LoginForm({
  from,
  error,
}: {
  from: string;
  error?: string;
}) {
  const message = error ? errorMessages[error] : undefined;

  return (
    <div className="card-surface w-full max-w-md rounded-2xl p-8 sm:p-10">
      <span className="text-xs font-semibold tracking-[0.2em] text-muted uppercase">
        Ambassador login
      </span>
      <h1 className="font-display mt-3 text-4xl tracking-wide">
        Welcome <span className="text-flame">back</span>
      </h1>
      <p className="mt-3 text-sm text-muted">
        Log in with your ambassador code (or email) and your password.
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

      <p className="mt-6 text-center text-sm text-muted">
        Not an ambassador yet?{" "}
        <Link href="/apply" className="text-flame font-medium">
          Apply
        </Link>
      </p>
    </div>
  );
}
