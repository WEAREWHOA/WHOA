import Link from "next/link";
import { saveMusicianProfileAction } from "@/lib/actions";
import type { MusicianProfile } from "@/lib/musicianProfiles";

const LINK_FIELDS: { label: string; field: string }[] = [
  { label: "Spotify", field: "linkSpotify" },
  { label: "Apple Music", field: "linkAppleMusic" },
  { label: "SoundCloud", field: "linkSoundCloud" },
  { label: "YouTube", field: "linkYouTube" },
  { label: "TikTok", field: "linkTikTok" },
  { label: "Instagram", field: "linkInstagram" },
  { label: "Website", field: "linkWebsite" },
];

const ERROR_MESSAGES: Record<string, string> = {
  missing: "Artist name is required.",
  server: "Something went wrong saving your profile — try again.",
};

export default function MusicTab({
  code,
  hasMusicAccess,
  profile,
  saved,
  error,
}: {
  code: string;
  hasMusicAccess: boolean;
  profile?: MusicianProfile;
  saved?: boolean;
  error?: string;
}) {
  if (!hasMusicAccess) {
    if (profile) {
      return (
        <div className="border-flame-2/40 bg-flame-2/10 rounded-xl border px-5 py-4 text-sm text-muted">
          Your Music Collective application for <span className="text-foreground font-semibold">{profile.artistName}</span>{" "}
          is in — we&apos;ll follow up by email once it&apos;s reviewed. This tab unlocks the
          moment it&apos;s approved.
        </div>
      );
    }

    return (
      <div className="border-flame-2/40 bg-flame-2/10 rounded-xl border px-5 py-4 text-sm text-muted">
        Join the WHOA Music Collective to get a Music tab here — bio, links, and everything else,
        editable any time.{" "}
        <Link href="/music-collective/apply" className="text-flame font-medium hover:underline">
          Apply to join
        </Link>
        .
      </div>
    );
  }

  const errorMessage = error ? (ERROR_MESSAGES[error] ?? ERROR_MESSAGES.server) : null;
  const linkByLabel = new Map((profile?.links ?? []).map((link) => [link.label, link.url]));

  return (
    <div className="card-surface rounded-xl p-6">
      <h3 className="font-semibold">Your Music Collective profile</h3>
      <p className="mt-1 text-sm text-muted">
        This is what shows on your artist page — keep it up to date any time.
      </p>

      {saved && (
        <p className="mt-4 rounded-lg border border-flame-2/40 bg-flame-2/10 px-4 py-2 text-sm text-flame-3">
          Profile saved.
        </p>
      )}
      {errorMessage && (
        <p className="mt-4 rounded-lg border border-flame-1/40 bg-flame-1/10 px-4 py-3 text-sm text-flame-3">
          {errorMessage}
        </p>
      )}

      <form action={saveMusicianProfileAction} className="mt-4 flex flex-col gap-4">
        <input type="hidden" name="code" value={code} />

        <div>
          <label htmlFor="artistName" className="text-sm font-medium">
            Artist / stage name
          </label>
          <input
            id="artistName"
            name="artistName"
            type="text"
            required
            defaultValue={profile?.artistName ?? ""}
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
            defaultValue={profile?.subgenre ?? ""}
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
            defaultValue={profile?.tagline ?? ""}
            className="mt-2 w-full rounded-lg border border-border-strong bg-surface-raised px-4 py-3 text-sm outline-none focus:border-flame-2"
          />
        </div>

        <div>
          <label htmlFor="bio" className="text-sm font-medium">
            Bio
          </label>
          <textarea
            id="bio"
            name="bio"
            rows={4}
            defaultValue={profile?.bio ?? ""}
            className="mt-2 w-full resize-none rounded-lg border border-border-strong bg-surface-raised px-4 py-3 text-sm outline-none focus:border-flame-2"
          />
        </div>

        <div>
          <span className="text-sm font-medium">Links</span>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {LINK_FIELDS.map(({ label, field }) => (
              <div key={field}>
                <label htmlFor={field} className="text-xs text-muted">
                  {label}
                </label>
                <input
                  id={field}
                  name={field}
                  type="url"
                  placeholder="https://"
                  defaultValue={linkByLabel.get(label) ?? ""}
                  className="mt-1 w-full rounded-lg border border-border-strong bg-surface-raised px-4 py-2.5 text-sm outline-none focus:border-flame-2"
                />
              </div>
            ))}
          </div>
        </div>

        <button
          type="submit"
          className="self-start rounded-full border border-border-strong px-6 py-2.5 text-sm font-medium transition-colors hover:bg-surface"
        >
          Save profile
        </button>
      </form>
    </div>
  );
}
