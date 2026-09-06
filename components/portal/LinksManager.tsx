import { createLinkAction, deleteLinkAction } from "@/lib/actions";
import type { AmbassadorLink } from "@/lib/types";
import CopyField from "./CopyField";

export default function LinksManager({
  code,
  origin,
  links,
  added,
  deleted,
}: {
  code: string;
  origin: string;
  links: AmbassadorLink[];
  added?: boolean;
  deleted?: boolean;
}) {
  const sorted = [...links].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  return (
    <div className="card-surface rounded-xl p-6">
      <h3 className="font-semibold">Your links</h3>
      <p className="mt-1 text-sm text-muted">
        Tag a link per channel — bio, a specific post, a DM campaign — and
        see which one converts. Every link carries the same 15% code; only
        the tracking is separate.
      </p>

      {added && (
        <p className="mt-4 rounded-lg border border-flame-2/40 bg-flame-2/10 px-4 py-2 text-sm text-flame-3">
          Link created.
        </p>
      )}
      {deleted && (
        <p className="mt-4 rounded-lg border border-flame-2/40 bg-flame-2/10 px-4 py-2 text-sm text-flame-3">
          Link deleted.
        </p>
      )}

      <ul className="mt-4 flex flex-col gap-3">
        {sorted.map((link) => (
          <li key={link.id} className="rounded-lg border border-border bg-surface-raised p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">{link.label}</span>
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-xs text-muted">
                  {link.clicks} click{link.clicks === 1 ? "" : "s"}
                </span>
                <form action={deleteLinkAction}>
                  <input type="hidden" name="code" value={code} />
                  <input type="hidden" name="linkId" value={link.id} />
                  <button
                    type="submit"
                    aria-label={`Delete ${link.label}`}
                    className="text-xs font-medium text-muted underline underline-offset-2 transition-colors hover:text-flame-1"
                  >
                    Delete
                  </button>
                </form>
              </div>
            </div>
            <CopyField value={`${origin}/r/${link.slug}`} compact />
          </li>
        ))}
      </ul>

      <form action={createLinkAction} className="mt-5 flex gap-2">
        <input type="hidden" name="code" value={code} />
        <input
          name="label"
          type="text"
          required
          maxLength={40}
          placeholder="e.g. Instagram bio"
          className="flex-1 rounded-lg border border-border-strong bg-surface-raised px-4 py-2.5 text-sm outline-none focus:border-flame-2"
        />
        <button
          type="submit"
          className="shrink-0 rounded-lg border border-border-strong px-4 py-2.5 text-sm font-medium transition-colors hover:bg-surface"
        >
          Add link
        </button>
      </form>
    </div>
  );
}
