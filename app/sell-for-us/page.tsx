import Link from "next/link";
import type { Metadata } from "next";
import { applySellForUsAction } from "./actions";

export const metadata: Metadata = {
  title: "Sell For Us",
  description: "Join the WHOA events crew — sign up to work our events and festivals.",
};

const errorMessages: Record<string, string> = {
  missing: "Enter your name, a valid email, and phone number to continue.",
  "weak-password": "Password must be at least 8 characters.",
  "password-mismatch": "Passwords don't match.",
  server: "Something went wrong submitting your application — please try again.",
};

export default async function SellForUsPage(props: PageProps<"/sell-for-us">) {
  const params = await props.searchParams;
  const error = typeof params?.error === "string" ? params.error : undefined;
  const message = error ? errorMessages[error] : undefined;

  return (
    <section className="bg-flame-radial flex flex-1 items-center justify-center px-6 py-20">
      <div className="card-surface w-full max-w-md rounded-2xl p-8 sm:p-10">
        <span className="text-xs font-semibold tracking-[0.2em] text-muted uppercase">
          Sell For Us
        </span>
        <h1 className="font-display mt-3 text-4xl tracking-wide">
          Work our <span className="text-flame">events & festivals</span>
        </h1>
        <p className="mt-3 text-sm text-muted">
          Join the crew that sells and hosts at WHOA events — WHOA Wednesday, WHOADEGA pop ups,
          and festivals like Same Same But Different. Submit your info below; we&apos;ll review it
          and follow up by email.
        </p>

        {message && (
          <p className="mt-6 rounded-lg border border-flame-1/40 bg-flame-1/10 px-4 py-3 text-sm text-flame-3">
            {message}
          </p>
        )}

        <form action={applySellForUsAction} className="mt-8 flex flex-col gap-5">
          <div>
            <label htmlFor="name" className="text-sm font-medium">
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              placeholder="Jordan Rivera"
              className="mt-2 w-full rounded-lg border border-border-strong bg-surface-raised px-4 py-3 text-sm outline-none focus:border-flame-2"
            />
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
              className="mt-2 w-full rounded-lg border border-border-strong bg-surface-raised px-4 py-3 text-sm outline-none focus:border-flame-2"
            />
          </div>

          <div>
            <label htmlFor="phone" className="text-sm font-medium">
              Phone
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              required
              placeholder="(555) 123-4567"
              className="mt-2 w-full rounded-lg border border-border-strong bg-surface-raised px-4 py-3 text-sm outline-none focus:border-flame-2"
            />
          </div>

          <div>
            <label htmlFor="instagram" className="text-sm font-medium">
              Instagram <span className="font-normal text-muted">(optional)</span>
            </label>
            <input
              id="instagram"
              name="instagram"
              type="text"
              placeholder="@yourhandle"
              className="mt-2 w-full rounded-lg border border-border-strong bg-surface-raised px-4 py-3 text-sm outline-none focus:border-flame-2"
            />
          </div>

          <div>
            <label htmlFor="message" className="text-sm font-medium">
              Anything else we should know? <span className="font-normal text-muted">(optional)</span>
            </label>
            <textarea
              id="message"
              name="message"
              rows={3}
              placeholder="Availability, past event/sales experience, etc."
              className="mt-2 w-full resize-none rounded-lg border border-border-strong bg-surface-raised px-4 py-3 text-sm outline-none focus:border-flame-2"
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
              minLength={8}
              placeholder="At least 8 characters"
              className="mt-2 w-full rounded-lg border border-border-strong bg-surface-raised px-4 py-3 text-sm outline-none focus:border-flame-2"
            />
            <p className="mt-1 text-xs text-muted">
              Already have a WHOA account? Leave this blank — we&apos;ll match your application to
              it by email.
            </p>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="text-sm font-medium">
              Confirm password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              minLength={8}
              placeholder="Type it again"
              className="mt-2 w-full rounded-lg border border-border-strong bg-surface-raised px-4 py-3 text-sm outline-none focus:border-flame-2"
            />
          </div>

          <button type="submit" className="btn-flame mt-2 rounded-full px-8 py-4 text-base">
            Submit application
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          Already approved?{" "}
          <Link href="/login" className="text-flame font-medium">
            Log in
          </Link>
        </p>
      </div>
    </section>
  );
}
