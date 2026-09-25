"use client";

import { useState } from "react";
import { findAccountsAction, getJourneyAction } from "@/app/analytics/actions";
import type { AccountMatch, JourneyEvent, JourneySummary } from "@/lib/customerJourney";

/**
 * One person's history, end to end.
 *
 * The orbit map answers "where does Instagram traffic go". This answers
 * the other half — what actually happened to this person — by merging
 * every table that carries an account code onto one timeline.
 *
 * Nobody is listed until they're searched for. A browsable directory of
 * customers with their page history attached is a different and much
 * worse thing than a lookup, and the difference is entirely in whether
 * you have to type a name first.
 */

const KIND_LABEL: Record<JourneyEvent["kind"], string> = {
  account: "Account",
  view: "Page",
  rsvp: "Ticket",
  checkin: "Door",
  stamp: "Scavenger",
  prize: "Prize",
  preorder: "Pre-order",
  referral: "Referral",
};

const KIND_COLOR: Record<JourneyEvent["kind"], string> = {
  account: "var(--an-series-7)",
  view: "rgba(247, 240, 230, 0.28)",
  rsvp: "var(--an-series-8)",
  checkin: "var(--an-series-3)",
  stamp: "var(--an-series-6)",
  prize: "var(--an-series-4)",
  preorder: "var(--an-series-5)",
  referral: "var(--an-series-1)",
};

function when(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "America/Los_Angeles",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function CustomerJourney() {
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<AccountMatch[] | null>(null);
  const [journey, setJourney] = useState<JourneySummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [hideViews, setHideViews] = useState(false);

  function search(e: React.FormEvent) {
    e.preventDefault();
    const clean = query.trim();
    if (clean.length < 2 || busy) return;
    setBusy(true);
    setJourney(null);
    findAccountsAction(clean)
      .then((found) => {
        setMatches(found);
        setBusy(false);
        // One hit is not an ambiguity — open it.
        if (found.length === 1) open(found[0].code);
      })
      .catch(() => {
        setMatches([]);
        setBusy(false);
      });
  }

  function open(code: string) {
    setBusy(true);
    getJourneyAction(code)
      .then((result) => {
        setJourney(result);
        setBusy(false);
      })
      .catch(() => setBusy(false));
  }

  const events = journey
    ? journey.events.filter((e) => !hideViews || e.kind !== "view")
    : [];

  return (
    <div>
      <form onSubmit={search} className="an-journey-search">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find someone by name, email or code"
          aria-label="Find a customer"
          className="an-search"
        />
        <button type="submit" disabled={busy || query.trim().length < 2} className="scav-btn">
          {busy ? "Looking…" : "Search"}
        </button>
      </form>

      {matches !== null && !journey && (
        matches.length ? (
          <ul className="an-journey-matches">
            {matches.map((m) => (
              <li key={m.code}>
                <button type="button" onClick={() => open(m.code)} className="an-journey-match">
                  <span className="an-journey-name">{m.name}</span>
                  <span className="an-journey-meta">{m.email}</span>
                  <span className="an-journey-meta">{m.code}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="an-empty">Nobody matches that.</p>
        )
      )}

      {journey && (
        <div className="an-journey">
          <header className="an-journey-head">
            <div>
              <p className="an-kpi-group">{journey.code}</p>
              <h4 className="an-journey-title">{journey.name}</h4>
              <p className="an-journey-meta">{journey.email}</p>
            </div>
            <button
              type="button"
              onClick={() => { setJourney(null); setMatches(null); setQuery(""); }}
              className="an-journey-clear"
            >
              Clear
            </button>
          </header>

          <div className="an-journey-stats">
            {[
              ["Found us via", journey.firstChannel ?? "—"],
              ["Sessions", journey.sessions.toLocaleString()],
              ["Pages", journey.views.toLocaleString()],
              ["Tickets", journey.tickets.toLocaleString()],
              ["Stamps", journey.stamps.toLocaleString()],
              ["Prizes", journey.prizes.toLocaleString()],
            ].map(([label, value]) => (
              <div key={label} className="an-journey-stat">
                <span className="an-journey-stat-value">{value}</span>
                <span className="an-journey-meta">{label}</span>
              </div>
            ))}
          </div>

          <label className="an-journey-toggle">
            <input
              type="checkbox"
              checked={hideViews}
              onChange={(e) => setHideViews(e.target.checked)}
            />
            Hide page views — show only what they did
          </label>

          {events.length ? (
            <ol className="an-timeline">
              {events.map((event, i) => (
                <li key={`${event.at}-${i}`} className="an-timeline-row">
                  <span className="an-timeline-dot" style={{ background: KIND_COLOR[event.kind] }} />
                  <span className="an-timeline-when">{when(event.at)}</span>
                  <span className="an-timeline-kind">{KIND_LABEL[event.kind]}</span>
                  <span className="an-timeline-what">
                    {event.label}
                    {event.detail && <span className="an-journey-meta"> · {event.detail}</span>}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="an-empty">Nothing recorded for this account yet.</p>
          )}

          {journey.trimmed && (
            <p className="an-journey-meta an-journey-trim">
              Showing their most recent pages only — the trail is longer than this.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
