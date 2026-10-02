"use client";

import { useMemo, useState } from "react";

import { loadNewsletterListAction } from "@/app/newsletter/actions";
import {
  SIGNUP_SOURCE_LABELS,
  type NewsletterList,
  type SignupSource,
  type Subscriber,
} from "@/lib/newsletter";

/**
 * NEWSLETTER - who is on the list, and where they came from.
 *
 * Subscribed status comes from Resend on every load rather than from our
 * own table, because Resend is the only thing that sees the unsubscribe
 * link at the bottom of a broadcast. Anyone shown as unsubscribed here is
 * unsubscribed in the only place that counts.
 */

const shortDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("en-US", {
        timeZone: "America/Los_Angeles",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

type Filter = "subscribed" | "all" | "unsubscribed";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "subscribed", label: "SUBSCRIBED" },
  { id: "all", label: "EVERYONE" },
  { id: "unsubscribed", label: "UNSUBSCRIBED" },
];

function haystack(s: Subscriber): string {
  return [s.email, s.firstName, s.lastName, s.accountCode, s.source]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export default function NewsletterTab({ initial }: { initial: NewsletterList }) {
  const [data, setData] = useState(initial);
  const [query, setQuery] = useState("");
  // Subscribed first: it's the number that matters and the list you'd
  // actually send to.
  const [filter, setFilter] = useState<Filter>("subscribed");
  const [busy, setBusy] = useState(false);

  const searchable = useMemo(() => data.subscribers.map((s) => ({ s, text: haystack(s) })), [data.subscribers]);

  const filtered = useMemo(() => {
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return searchable
      .filter(({ s }) => {
        if (filter === "subscribed") return !s.unsubscribed;
        if (filter === "unsubscribed") return s.unsubscribed;
        return true;
      })
      .filter(({ text }) => terms.every((t) => text.includes(t)))
      .map(({ s }) => s);
  }, [searchable, filter, query]);

  const bySource = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of data.subscribers) {
      if (s.unsubscribed) continue;
      const key = s.source ?? "unknown";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [data.subscribers]);

  function refresh() {
    setBusy(true);
    loadNewsletterListAction()
      .then((fresh) => {
        if (fresh) setData(fresh);
        setBusy(false);
      })
      .catch(() => setBusy(false));
  }

  if (!data.configured) {
    return (
      <div className="an-root">
        <header className="an-head">
          <div>
            <h2 className="an-title">NEWSLETTER</h2>
            <p className="an-sub">Not set up yet.</p>
          </div>
        </header>
        <p className="ba-caution">
          The newsletter needs <code className="font-mono-code">RESEND_API_KEY</code> and{" "}
          <code className="font-mono-code">RESEND_AUDIENCE_ID</code> set in the environment. The
          audience id is the one Resend shows for your list under Audiences.
        </p>
      </div>
    );
  }

  return (
    <div className={`an-root ${busy ? "an-loading" : ""}`}>
      <header className="an-head">
        <div>
          <h2 className="an-title">NEWSLETTER</h2>
          <p className="an-sub">
            Everyone who asked to hear from WHOA, and where they signed up.
          </p>
        </div>
        <button type="button" className="ba-btn" disabled={busy} onClick={refresh}>
          {busy ? "REFRESHING…" : "REFRESH"}
        </button>
      </header>

      {data.resendError && <p className="ba-caution">{data.resendError}</p>}

      <div className="an-kpis">
        {[
          ["Subscribed", data.subscribedCount.toLocaleString(), "will receive a campaign"],
          ["Unsubscribed", data.unsubscribedCount.toLocaleString(), "never emailed again"],
          ["Ever signed up", data.total.toLocaleString(), "all time"],
        ].map(([label, value, hint]) => (
          <article key={label} className="an-kpi">
            <p className="an-kpi-value">{value}</p>
            <p className="an-kpi-label">{label}</p>
            <p className="an-kpi-hint">{hint}</p>
          </article>
        ))}
      </div>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search name, email, account code…"
        aria-label="Search subscribers"
        className="an-search"
      />

      <div className="an-periods" role="tablist" aria-label="Filter">
        {FILTERS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={filter === id}
            onClick={() => setFilter(id)}
            className={`an-period ${filter === id ? "an-period-on" : ""}`}
          >
            {label}
          </button>
        ))}
      </div>

      {bySource.length > 0 && (
        <section className="an-panel">
          <header className="an-panel-head">
            <h3 className="an-panel-title">Where they came from</h3>
            <span className="an-panel-group">subscribed only</span>
          </header>
          <div className="mt-4 flex flex-wrap gap-3">
            {bySource.map(([source, count]) => (
              <span key={source} className="ba-tier">
                {SIGNUP_SOURCE_LABELS[source as SignupSource] ?? "Unknown"} · {count}
              </span>
            ))}
          </div>
        </section>
      )}

      <section className="an-panel">
        <header className="an-panel-head">
          <h3 className="an-panel-title">
            {filtered.length.toLocaleString()}
            {filtered.length === data.total ? " subscribers" : ` of ${data.total.toLocaleString()}`}
          </h3>
          <span className="an-panel-group">newest first</span>
        </header>

        {filtered.length === 0 ? (
          <p className="an-empty">
            {data.total === 0 ? "Nobody has signed up yet." : "Nobody matches that search."}
          </p>
        ) : (
          <table className="an-table ba-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Name</th>
                <th>Came from</th>
                <th>Signed up</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 500).map((s) => (
                <tr key={s.email}>
                  <td className="an-table-path">{s.email}</td>
                  <td>
                    {[s.firstName, s.lastName].filter(Boolean).join(" ") || "—"}
                    {s.accountCode && <span className="an-journey-meta"> · {s.accountCode}</span>}
                  </td>
                  <td className="an-journey-meta">
                    {s.source ? (SIGNUP_SOURCE_LABELS[s.source] ?? s.source) : "—"}
                  </td>
                  <td className="an-journey-meta">{shortDate(s.subscribedAt)}</td>
                  <td className={s.unsubscribed ? "ba-warn" : "ba-strong"}>
                    {s.unsubscribed ? "Unsubscribed" : "Subscribed"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {filtered.length > 500 && (
          <p className="ba-note">
            Showing the first 500. Narrow the search to see the rest; every one of the{" "}
            {filtered.length.toLocaleString()} matches is searchable, only the table is capped.
          </p>
        )}
      </section>
    </div>
  );
}
