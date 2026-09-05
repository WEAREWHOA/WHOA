import Link from "next/link";
import type { Metadata } from "next";
import { applyMusicAction } from "./actions";

export const metadata: Metadata = {
  title: "Join the Music Collective",
  description: "Apply to join the WHOA Music Collective.",
};

const errorMessages: Record<string, string> = {
  missing: "Enter your name, a valid email, and your artist name to continue.",
  "weak-password": "Password must be at least 8 characters.",
  "password-mismatch": "Passwords don't match.",
  server: "Something went wrong submitting your application — please try again.",
};

export default async function MusicCollectiveApplyPage(props: PageProps<"/music-collective/apply">) {
  const params = await props.searchParams;
  const error = typeof params?.error === "string" ? params.error : undefined;
  const message = error ? errorMessages[error] : undefined;

  return (
    <section className="bg-flame-radial flex flex-1 items-center justify-center px-6 py-20">
      <div className="card-surface w-full max-w-md rounded-2xl p-8 sm:p-10">
        <span className="text-xs font-semibold tracking-[0.2em] text-muted uppercase">
          Music Collective
        </span>
        <h1 className="font-display mt-3 text-4xl tracking-wide">
          Join the <span className="text-flame">collective</span>
        </h1>
        <p className="mt-3 text-sm text-muted">
          Tell us about your sound. We&apos;ll review your application and follow up by email —
          once approved, you&apos;ll get a Music tab in your portal to manage your bio and links
          any time.
        </p>

        {message && (
          <p className="mt-6 rounded-lg border border-flame-1/40 bg-flame-1/10 px-4 py-3 text-sm text-flame-3">
            {message}
          </p>
        )}

        <form action={applyMusicAction} className="mt-8 flex flex-col gap-5">
          <div>
            <label htmlFor="name" className="text-sm font-medium">
              Your name
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
            <label htmlFor="artistName" className="text-sm font-medium">
              Artist / stage name
            </label>
            <input
              id="artistName"
              name="artistName"
              type="text"
              required
              placeholder="Kaleidosonic"
              className="mt-2 w-full rounded-lg border border-border-strong bg-surface-raised px-4 py-3 text-sm outline-none focus:border-flame-2"
            />
          </div>

          <div>
            <label htmlFor="subgenre" className="text-sm font-medium">
              Genre <span className="font-normal text-muted">(optional)</span>
            </label>
            <input
              id="subgenre"
              name="subgenre"
              type="text"
              placeholder="Bass / Dubstep"
              className="mt-2 w-full rounded-lg border border-border-strong bg-surface-raised px-4 py-3 text-sm outline-none focus:border-flame-2"
            />
          </div>

          <div>
            <label htmlFor="tagline" className="text-sm font-medium">
              Tagline <span className="font-normal text-muted">(optional)</span>
            </label>
            <input
              id="tagline"
              name="tagline"
              type="text"
              placeholder="One line that sums up your sound"
              className="mt-2 w-full rounded-lg border border-border-strong bg-surface-raised px-4 py-3 text-sm outline-none focus:border-flame-2"
            />
          </div>

          <div>
            <label htmlFor="bio" className="text-sm font-medium">
              Bio <span className="font-normal text-muted">(optional)</span>
            </label>
            <textarea
              id="bio"
              name="bio"
              rows={3}
              placeholder="Who you are, what you play, where you've played it"
              className="mt-2 w-full resize-none rounded-lg border border-border-strong bg-surface-raised px-4 py-3 text-sm outline-none focus:border-flame-2"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="linkSpotify" className="text-xs text-muted">
                Spotify
              </label>
              <input
                id="linkSpotify"
                name="linkSpotify"
                type="url"
                placeholder="https://"
                className="mt-1 w-full rounded-lg border border-border-strong bg-surface-raised px-4 py-2.5 text-sm outline-none focus:border-flame-2"
              />
            </div>
            <div>
              <label htmlFor="linkSoundCloud" className="text-xs text-muted">
                SoundCloud
              </label>
              <input
                id="linkSoundCloud"
                name="linkSoundCloud"
                type="url"
                placeholder="https://"
                className="mt-1 w-full rounded-lg border border-border-strong bg-surface-raised px-4 py-2.5 text-sm outline-none focus:border-flame-2"
              />
            </div>
            <div>
              <label htmlFor="linkInstagram" className="text-xs text-muted">
                Instagram
              </label>
              <input
                id="linkInstagram"
                name="linkInstagram"
                type="url"
                placeholder="https://"
                className="mt-1 w-full rounded-lg border border-border-strong bg-surface-raised px-4 py-2.5 text-sm outline-none focus:border-flame-2"
              />
            </div>
            <div>
              <label htmlFor="linkYouTube" className="text-xs text-muted">
                YouTube
              </label>
              <input
                id="linkYouTube"
                name="linkYouTube"
                type="url"
                placeholder="https://"
                className="mt-1 w-full rounded-lg border border-border-strong bg-surface-raised px-4 py-2.5 text-sm outline-none focus:border-flame-2"
              />
            </div>
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
