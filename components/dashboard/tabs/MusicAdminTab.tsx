import Link from "next/link";
import type { MusicianApplication } from "@/lib/musicianProfiles";
import {
  reviewMusicianAction,
  saveMusicianProfileAsAdminAction,
} from "@/app/music-admin/actions";

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
  invalid: "That decision didn't come through — try again.",
  missing: "An artist name is required.",
  server: "Something went wrong — try again.",
};

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/**
 * The links an applicant gave, as links.
 *
 * This is the "check out their music" half of the tab: the decision is
 * made by listening, so Spotify and SoundCloud have to be one click from
 * the Approve button rather than copy-paste jobs. rel="noreferrer"
 * because these are URLs typed in by a stranger.
 */
function ProfileLinks({ artist }: { artist: MusicianApplication }) {
  if (artist.links.length === 0) {
    return <p className="mt-2 text-xs text-muted">No links given.</p>;
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {artist.links.map((link) => (
        <a
          key={`${link.label}-${link.url}`}
          href={link.url}
          target="_blank"
          rel="noreferrer nofollow"
          className="rounded-full border border-border-strong px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:text-foreground"
        >
          {link.label} ↗
        </a>
      ))}
    </div>
  );
}

function DecisionButton({
  code,
  decision,
  label,
  primary,
}: {
  code: string;
  decision: "approved" | "declined";
  label: string;
  primary?: boolean;
}) {
  return (
    <form action={reviewMusicianAction}>
      <input type="hidden" name="code" value={code} />
      <input type="hidden" name="decision" value={decision} />
      <button
        type="submit"
        className={
          primary
            ? "bg-tier-icon text-background rounded-full px-4 py-2 text-xs font-semibold tracking-wide uppercase"
            : "rounded-full border border-border-strong px-4 py-2 text-xs font-semibold tracking-wide text-muted uppercase hover:text-foreground"
        }
      >
        {label}
      </button>
    </form>
  );
}

function Identity({ artist }: { artist: MusicianApplication }) {
  return (
    <div>
      <p className="text-sm font-semibold">
        {artist.artistName}
        {artist.subgenre && (
          <span className="ml-2 text-xs font-normal text-muted">{artist.subgenre}</span>
        )}
      </p>
      <p className="text-xs text-muted">
        {artist.accountName}
        {artist.accountEmail && (
          <>
            {" · "}
            <a href={`mailto:${artist.accountEmail}`} className="hover:text-foreground">
              {artist.accountEmail}
            </a>
          </>
        )}
        {" · "}
        {artist.ambassadorCode}
      </p>
    </div>
  );
}

/** One waiting application, with everything needed to decide on it. */
function PendingCard({ artist }: { artist: MusicianApplication }) {
  return (
    <div className="card-surface rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Identity artist={artist} />
        <div className="flex shrink-0 gap-2">
          <DecisionButton code={artist.ambassadorCode} decision="approved" label="Approve" primary />
          <DecisionButton code={artist.ambassadorCode} decision="declined" label="Decline" />
        </div>
      </div>

      {artist.tagline && <p className="mt-3 text-sm">{artist.tagline}</p>}
      {artist.bio && (
        <p className="mt-2 text-xs whitespace-pre-line text-muted">{artist.bio}</p>
      )}

      <ProfileLinks artist={artist} />

      <p className="mt-3 border-t border-border pt-3 text-xs text-muted">
        Applied {formatDate(artist.createdAt)}
      </p>
    </div>
  );
}

/**
 * An artist who is already in, and the form for managing them.
 *
 * The edit form writes to the same row the artist's own MUSIC tab writes
 * to, which is the point: staff fixing a dead link should not create a
 * second version of the profile that the artist can't see.
 */
function RosterCard({ artist }: { artist: MusicianApplication }) {
  const linkByLabel = new Map(artist.links.map((link) => [link.label, link.url]));

  return (
    <div className="card-surface rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Identity artist={artist} />
        <div className="flex shrink-0 items-center gap-2">
          {/* An approved row whose permission is somehow off can't edit
              their own profile, so it is worth showing rather than
              hiding behind a status word that says otherwise. */}
          {!artist.hasAccess && (
            <span className="text-flame-3 text-xs font-semibold tracking-wide uppercase">
              Tab locked
            </span>
          )}
          <DecisionButton
            code={artist.ambassadorCode}
            decision={artist.hasAccess ? "declined" : "approved"}
            label={artist.hasAccess ? "Remove" : "Restore"}
            primary={!artist.hasAccess}
          />
        </div>
      </div>

      {artist.tagline && <p className="mt-3 text-sm">{artist.tagline}</p>}
      <ProfileLinks artist={artist} />

      {/* Where the public meets them. Shown rather than described,
          because it is the thing to check after an edit. */}
      {artist.slug && (
        <p className="mt-3 text-xs">
          <a
            href={`/music-collective/${artist.slug}`}
            target="_blank"
            rel="noreferrer"
            className="text-flame hover:underline"
          >
            /music-collective/{artist.slug} ↗
          </a>
        </p>
      )}

      <details className="mt-3 border-t border-border pt-3">
        <summary className="cursor-pointer text-xs font-semibold tracking-wide text-muted uppercase">
          Edit their profile
        </summary>

        <form action={saveMusicianProfileAsAdminAction} className="mt-4 flex flex-col gap-3">
          <input type="hidden" name="code" value={artist.ambassadorCode} />

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor={`artistName-${artist.ambassadorCode}`}
                className="text-xs text-muted"
              >
                Artist / stage name
              </label>
              <input
                id={`artistName-${artist.ambassadorCode}`}
                name="artistName"
                type="text"
                required
                defaultValue={artist.artistName}
                className="mt-1 w-full rounded-lg border border-border-strong bg-surface-raised px-4 py-2.5 text-sm outline-none focus:border-flame-2"
              />
            </div>
            <div>
              <label htmlFor={`subgenre-${artist.ambassadorCode}`} className="text-xs text-muted">
                Genre
              </label>
              <input
                id={`subgenre-${artist.ambassadorCode}`}
                name="subgenre"
                type="text"
                defaultValue={artist.subgenre ?? ""}
                className="mt-1 w-full rounded-lg border border-border-strong bg-surface-raised px-4 py-2.5 text-sm outline-none focus:border-flame-2"
              />
            </div>
          </div>

          <div>
            <label htmlFor={`tagline-${artist.ambassadorCode}`} className="text-xs text-muted">
              Tagline
            </label>
            <input
              id={`tagline-${artist.ambassadorCode}`}
              name="tagline"
              type="text"
              defaultValue={artist.tagline ?? ""}
              className="mt-1 w-full rounded-lg border border-border-strong bg-surface-raised px-4 py-2.5 text-sm outline-none focus:border-flame-2"
            />
          </div>

          <div>
            <label htmlFor={`bio-${artist.ambassadorCode}`} className="text-xs text-muted">
              Bio
            </label>
            <textarea
              id={`bio-${artist.ambassadorCode}`}
              name="bio"
              rows={4}
              defaultValue={artist.bio ?? ""}
              className="mt-1 w-full resize-none rounded-lg border border-border-strong bg-surface-raised px-4 py-2.5 text-sm outline-none focus:border-flame-2"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {LINK_FIELDS.map(({ label, field }) => (
              <div key={field}>
                <label
                  htmlFor={`${field}-${artist.ambassadorCode}`}
                  className="text-xs text-muted"
                >
                  {label}
                </label>
                <input
                  id={`${field}-${artist.ambassadorCode}`}
                  name={field}
                  type="url"
                  placeholder="https://"
                  defaultValue={linkByLabel.get(label) ?? ""}
                  className="mt-1 w-full rounded-lg border border-border-strong bg-surface-raised px-4 py-2 text-sm outline-none focus:border-flame-2"
                />
              </div>
            ))}
          </div>

          <button
            type="submit"
            className="self-start rounded-full border border-border-strong px-5 py-2 text-xs font-semibold tracking-wide uppercase transition-colors hover:bg-surface"
          >
            Save profile
          </button>
        </form>
      </details>
    </div>
  );
}

function DeclinedRow({ artist }: { artist: MusicianApplication }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-3 last:border-0">
      <div>
        <Identity artist={artist} />
        {artist.reviewNote && (
          <p className="mt-1 text-xs text-muted">&ldquo;{artist.reviewNote}&rdquo;</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {artist.reviewedAt && (
          <span className="text-xs text-muted">Declined {formatDate(artist.reviewedAt)}</span>
        )}
        <DecisionButton code={artist.ambassadorCode} decision="approved" label="Approve" />
      </div>
    </div>
  );
}

export default function MusicAdminTab({
  artists,
  reviewed,
  saved,
  error,
}: {
  artists: MusicianApplication[];
  /** "approved" or "declined" — which banner to show after a decision. */
  reviewed?: string;
  saved?: boolean;
  error?: string;
}) {
  const pending = artists.filter((a) => a.status === "pending");
  const roster = artists.filter((a) => a.status === "approved");
  const declined = artists.filter((a) => a.status === "declined");
  const errorMessage = error ? (ERROR_MESSAGES[error] ?? ERROR_MESSAGES.server) : null;

  return (
    <div>
      <span className="text-xs font-semibold tracking-[0.2em] text-muted uppercase">
        Music Admin
      </span>
      <h3 className="font-display mt-1 text-2xl">Music Collective applications</h3>
      <p className="mt-1 text-sm text-muted">
        Listen first — every link an applicant gave is below their bio. Approving puts them on{" "}
        <Link href="/music-collective" className="text-flame hover:underline">
          the public Music Collective page
        </Link>{" "}
        with their own artist page and sitemap entry, unlocks their MUSIC tab, emails them, and lets
        them submit vinyl, tapes and merch to the shop. Those product submissions are reviewed in{" "}
        <Link href="/portal/art-admin" className="text-flame hover:underline">
          ART ADMIN
        </Link>
        , which is the same queue for every seller.
      </p>

      {reviewed === "approved" && (
        <p className="border-flame-2/40 bg-flame-2/10 text-flame-3 mt-4 rounded-lg border px-4 py-2 text-sm">
          Approved — they are on the public Music Collective page, their MUSIC tab is unlocked, and
          they have been emailed.
        </p>
      )}
      {reviewed === "declined" && (
        <p className="mt-4 rounded-lg border border-border px-4 py-2 text-sm text-muted">
          Declined — they have been emailed, their MUSIC tab is locked, and they are not on the
          public page.
        </p>
      )}
      {saved && (
        <p className="border-flame-2/40 bg-flame-2/10 text-flame-3 mt-4 rounded-lg border px-4 py-2 text-sm">
          Profile saved.
        </p>
      )}
      {errorMessage && (
        <p className="border-flame-1/40 bg-flame-1/10 text-flame-3 mt-4 rounded-lg border px-4 py-3 text-sm">
          {errorMessage}
        </p>
      )}

      <h4 className="mt-8 text-sm font-semibold tracking-wide uppercase">
        Waiting on you
        {pending.length > 0 && (
          <span className="text-flame-3 ml-2 font-normal">{pending.length}</span>
        )}
      </h4>
      <div className="mt-3">
        {pending.length === 0 ? (
          <p className="rounded-xl border border-border px-5 py-4 text-sm text-muted">
            No applications waiting.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {pending.map((artist) => (
              <PendingCard key={artist.ambassadorCode} artist={artist} />
            ))}
          </div>
        )}
      </div>

      <h4 className="mt-10 text-sm font-semibold tracking-wide uppercase">
        The collective
        {roster.length > 0 && <span className="ml-2 font-normal text-muted">{roster.length}</span>}
      </h4>
      <p className="mt-1 text-xs text-muted">
        Removing an artist takes them off the public page, locks their MUSIC tab and emails them.
        Nothing they have sold or submitted is deleted, and Restore puts them straight back.
      </p>
      <div className="mt-3">
        {roster.length === 0 ? (
          <p className="rounded-xl border border-border px-5 py-4 text-sm text-muted">
            Nobody has been approved yet.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {roster.map((artist) => (
              <RosterCard key={artist.ambassadorCode} artist={artist} />
            ))}
          </div>
        )}
      </div>

      {declined.length > 0 && (
        <>
          <h4 className="mt-10 text-sm font-semibold tracking-wide uppercase">
            Declined
            <span className="ml-2 font-normal text-muted">{declined.length}</span>
          </h4>
          <p className="mt-1 text-xs text-muted">
            Kept so the same application does not come back around as new. If they apply again with
            fresh work, they return to the top of the queue.
          </p>
          <div className="card-surface mt-3 rounded-xl border border-border px-4">
            {declined.map((artist) => (
              <DeclinedRow key={artist.ambassadorCode} artist={artist} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
