"use client";

import { useMemo, useState } from "react";

import { CONTACT_STATUS_LABELS, type ContactStatus } from "@/lib/mailchimpImport";
import type { Audience, AudienceContact } from "@/lib/audience";

/**
 * Who is on the list, and what can be done with each of them.
 *
 * Status is shown plainly rather than as "subscriber / not": a bounced
 * address and somebody who never opted in are both unmailable for
 * completely different reasons, and the difference decides whether it is
 * worth ever trying again.
 */

const STATUS_ORDER: ContactStatus[] = ["subscribed", "unsubscribed", "cleaned", "never"];

const STATUS_CLASS: Record<ContactStatus, string> = {
  subscribed: "ba-strong",
  unsubscribed: "ba-warn",
  cleaned: "ba-warn",
  never: "an-journey-meta",
};

const shortDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("en-US", {
        timeZone: "America/Los_Angeles",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "not recorded";

function haystack(c: AudienceContact): string {
  return [c.email, c.firstName, c.lastName, c.phoneE164, c.accountCode, c.source, ...c.tags]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export default function AudienceView({
  audience,
  onExport,
}: {
  audience: Audience;
  onExport: () => void;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ContactStatus | "all">("subscribed");
  const [tag, setTag] = useState<string | null>(null);

  const searchable = useMemo(
    () => audience.contacts.map((c) => ({ c, text: haystack(c) })),
    [audience.contacts],
  );

  const filtered = useMemo(() => {
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return searchable
      .filter(({ c }) => (status === "all" ? true : c.status === status))
      .filter(({ c }) => (tag ? c.tags.includes(tag) : true))
      .filter(({ text }) => terms.every((t) => text.includes(t)))
      .map(({ c }) => c);
  }, [searchable, status, tag, query]);

  return (
    <>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search name, email, phone, tag, account code…"
        aria-label="Search contacts"
        className="an-search"
      />

      <div className="an-periods" role="tablist" aria-label="Filter by status">
        <button
          type="button"
          role="tab"
          aria-selected={status === "all"}
          onClick={() => setStatus("all")}
          className={`an-period ${status === "all" ? "an-period-on" : ""}`}
        >
          EVERYONE ({audience.total.toLocaleString()})
        </button>
        {STATUS_ORDER.map((s) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={status === s}
            onClick={() => setStatus(s)}
            className={`an-period ${status === s ? "an-period-on" : ""}`}
          >
            {CONTACT_STATUS_LABELS[s].toUpperCase()} ({audience.counts[s].toLocaleString()})
          </button>
        ))}
      </div>

      {audience.tags.length > 0 && (
        <section className="an-panel">
          <header className="an-panel-head">
            <h3 className="an-panel-title">Tags</h3>
            <span className="an-panel-group">click to filter</span>
          </header>
          <div className="mt-4 flex flex-wrap gap-2">
            {tag && (
              <button type="button" onClick={() => setTag(null)} className="ba-btn">
                CLEAR TAG
              </button>
            )}
            {audience.tags.map(({ tag: name, count, mailable }) => (
              <button
                key={name}
                type="button"
                onClick={() => setTag(name === tag ? null : name)}
                aria-pressed={name === tag}
                className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                  name === tag
                    ? "border-flame-2 bg-flame-2/15 text-flame-3"
                    : "border-border-strong text-muted hover:border-flame-2/50 hover:text-foreground"
                }`}
                title={`${mailable} of ${count} can be mailed`}
              >
                {name} · {count}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="an-panel">
        <header className="an-panel-head">
          <h3 className="an-panel-title">
            {filtered.length.toLocaleString()}
            {filtered.length === audience.total ? " contacts" : ` of ${audience.total.toLocaleString()}`}
            {tag ? ` tagged ${tag}` : ""}
          </h3>
          <button type="button" className="ba-btn" onClick={onExport}>
            EXPORT CSV
          </button>
        </header>

        {filtered.length === 0 ? (
          <p className="an-empty">Nobody matches that.</p>
        ) : (
          <table className="an-table ba-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Name</th>
                <th>Phone</th>
                <th>Tags</th>
                <th>Added</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 500).map((c) => (
                <tr key={c.email}>
                  <td className="an-table-path">{c.email}</td>
                  <td>
                    {[c.firstName, c.lastName].filter(Boolean).join(" ") || "no name"}
                    {c.accountCode && <span className="an-journey-meta"> · {c.accountCode}</span>}
                  </td>
                  <td className="an-journey-meta">{c.phoneE164 ?? "none"}</td>
                  <td className="an-journey-meta">{c.tags.join(", ") || "none"}</td>
                  <td className="an-journey-meta">{shortDate(c.createdAt)}</td>
                  <td className={STATUS_CLASS[c.status]}>
                    {c.unsubscribed && c.status === "subscribed"
                      ? "Unsubscribed in Resend"
                      : CONTACT_STATUS_LABELS[c.status]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {filtered.length > 500 && (
          <p className="ba-note">
            Showing the first 500. Narrow the search to see the rest; all{" "}
            {filtered.length.toLocaleString()} are searchable and all of them are in the export.
          </p>
        )}
      </section>
    </>
  );
}
