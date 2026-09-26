"use client";

import { useMemo, useState } from "react";
import { loadBaAdminAction, recordPayRunAction, recordPayoutAction } from "@/app/ba-admin/actions";
import { payoutDueLabel, periodLabel, recentPeriods } from "@/lib/baPeriods";
import type { BaAdminData, BaRow } from "@/lib/baAdmin";

/**
 * BA ADMIN — every ambassador, what they earned, and what they're owed.
 *
 * Two distinct sets of numbers live here on purpose, and the layout
 * keeps them apart. Lifetime totals drive the leaderboard and tiers.
 * The pay run is scoped to one month, and it is the only thing anyone
 * should move money against — mixing the two is how someone gets paid
 * their lifetime commission by accident.
 */

const money = (cents: number) =>
  `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const shortDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("en-US", {
        timeZone: "America/Los_Angeles", month: "short", day: "numeric", year: "numeric",
      })
    : "—";

type SortKey = "sales" | "period" | "owed" | "name" | "orders";

export default function BaAdmin({ initial }: { initial: BaAdminData }) {
  const [data, setData] = useState(initial);
  const [period, setPeriod] = useState(initial.period);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("sales");
  const [view, setView] = useState<"run" | "roster" | "history">("run");
  const [flash, setFlash] = useState<string | null>(null);
  const [paying, setPaying] = useState<string | null>(null);

  // The active period is always in the list. Without this the select
  // silently falls back to its first option, so the dropdown can read
  // "August" while the table below it is September's — on a screen where
  // someone is about to send money against what they see.
  const periods = useMemo(() => {
    const recent = recentPeriods(12);
    return recent.includes(period) ? recent : [period, ...recent].sort().reverse();
  }, [period]);

  function choosePeriod(next: string) {
    if (next === period || busy) return;
    setBusy(true);
    setPeriod(next);
    setFlash(null);
    loadBaAdminAction(next)
      .then((fresh) => {
        if (fresh) setData(fresh);
        setBusy(false);
      })
      .catch(() => setBusy(false));
  }

  function refresh() {
    loadBaAdminAction(period)
      .then((fresh) => fresh && setData(fresh))
      .catch(() => {});
  }

  function payOne(row: BaRow) {
    if (busy) return;
    setBusy(true);
    setPaying(row.code);
    recordPayoutAction({
      code: row.code,
      period,
      amountCents: row.periodEarnedCents,
      method: row.payoutMethod ?? "other",
    })
      .then((result) => {
        setFlash(result.ok ? `Recorded ${money(row.periodEarnedCents)} to ${row.name}.` : (result.error ?? "Something went wrong."));
        if (result.ok) refresh();
        setBusy(false);
        setPaying(null);
      })
      .catch(() => { setBusy(false); setPaying(null); });
  }

  function payAll() {
    if (busy) return;
    setBusy(true);
    recordPayRunAction(period)
      .then((result) => {
        if (!result.ok) {
          setFlash(result.error ?? "Couldn't record the pay run.");
        } else {
          const parts = [`Recorded ${result.recorded} payout${result.recorded === 1 ? "" : "s"} totalling ${money(result.totalCents)}.`];
          if (result.skipped.length) {
            parts.push(`Skipped ${result.skipped.length}: ${result.skipped.map((s) => `${s.name} (${s.reason})`).join(", ")}.`);
          }
          setFlash(parts.join(" "));
          refresh();
        }
        setBusy(false);
      })
      .catch(() => setBusy(false));
  }

  const needle = query.trim().toLowerCase();
  const filtered = data.roster.filter(
    (r) => !needle || `${r.name} ${r.email} ${r.code} ${r.instagram ?? ""}`.toLowerCase().includes(needle),
  );

  const sorted = [...filtered].sort((a, b) => {
    switch (sort) {
      case "name": return a.name.localeCompare(b.name);
      case "orders": return b.orderCount - a.orderCount;
      case "owed": return b.owedCents - a.owedCents;
      case "period": return b.periodEarnedCents - a.periodEarnedCents;
      default: return b.salesCents - a.salesCents;
    }
  });

  const run = sorted.filter((r) => r.periodEarnedCents > 0);
  const o = data.overview;

  // Only people who can actually be paid. Someone with no payout details
  // is skipped by the run, so counting them in the button would promise
  // a number the run won't reach.
  const payable = data.roster.filter(
    (r) => r.periodEarnedCents > 0 && !r.periodPaid && r.payoutMethod && r.payoutDestination,
  );
  const payableCents = payable.reduce((sum, r) => sum + r.periodEarnedCents, 0);
  const blocked = data.roster.filter(
    (r) => r.periodEarnedCents > 0 && !r.periodPaid && (!r.payoutMethod || !r.payoutDestination),
  );

  return (
    <div className={`an-root ${busy ? "an-loading" : ""}`}>
      <header className="an-head">
        <div>
          <h2 className="font-display an-title">BA ADMIN</h2>
          <p className="an-sub">
            Every Brand Ambassador, what they earned, and what they&apos;re owed. Payouts run
            monthly — {periodLabel(period)} is paid on {payoutDueLabel(period)}.
          </p>
        </div>
        <label className="ba-period">
          <span className="sr-only">Pay period</span>
          <select value={period} onChange={(e) => choosePeriod(e.target.value)} className="an-search">
            {periods.map((p) => (
              <option key={p} value={p}>{periodLabel(p)}</option>
            ))}
          </select>
        </label>
      </header>

      <div className="an-kpis">
        {[
          ["Due this run", money(o.periodDueCents), `${o.periodUnpaid} unpaid of ${o.periodEarners}`],
          ["Earned in period", money(o.periodEarnedCents), `${money(o.periodSalesCents)} of sales`],
          ["Already settled", money(o.periodPaidCents), "this period"],
          ["Ambassadors", String(o.ambassadors), `${o.selling} have sold`],
          ["Lifetime sales", money(o.salesCents), `${o.orderCount} orders`],
          ["Lifetime commission", money(o.earnedCents), `${money(o.paidCents)} paid out`],
        ].map(([label, value, hint]) => (
          <article key={label} className="an-kpi">
            <p className="an-kpi-value">{value}</p>
            <p className="an-kpi-label">{label}</p>
            <p className="an-kpi-hint">{hint}</p>
          </article>
        ))}
      </div>

      {flash && <p className="ba-flash">{flash}</p>}

      <div className="an-periods" role="tablist" aria-label="View">
        {([["run", "PAY RUN"], ["roster", "ROSTER"], ["history", "PAYOUT HISTORY"]] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={view === id}
            onClick={() => setView(id)}
            className={`an-period ${view === id ? "an-period-on" : ""}`}
          >
            {label}
          </button>
        ))}
      </div>

      {view === "run" && (
        <section className="an-panel">
          <header className="an-panel-head">
            <h3 className="an-panel-title">{periodLabel(period)} pay run</h3>
            <span className="an-panel-group">{money(o.periodDueCents)} to send</span>
          </header>

          {run.length === 0 ? (
            <p className="an-empty">Nobody earned commission in {periodLabel(period)}.</p>
          ) : (
            <>
              <p className="an-panel-blurb">
                Amounts come straight from the orders dated in this month, Pacific time. Recording a
                payout is bookkeeping — Venmo and Zelle have no API to send from, so the transfers
                themselves are still made by hand.
              </p>

              <table className="an-table ba-table">
                <thead>
                  <tr>
                    <th>Ambassador</th><th>Orders</th><th>Sales</th><th>Commission</th>
                    <th>Send to</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {run.map((r) => (
                    <tr key={r.code}>
                      <td>
                        <span className="ba-name">{r.name}</span>
                        <span className="an-journey-meta">{r.code}</span>
                      </td>
                      <td>{r.periodOrderCount}</td>
                      <td>{money(r.periodSalesCents)}</td>
                      <td className="ba-strong">{money(r.periodEarnedCents)}</td>
                      <td className="an-table-path">
                        {r.payoutMethod
                          ? `${r.payoutMethod} · ${r.payoutDestination}`
                          : <span className="ba-warn">no payout details</span>}
                      </td>
                      <td>
                        {r.periodPaid ? (
                          <span className="ba-paid">
                            Paid {shortDate(r.periodPaid.paidAt)}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => payOne(r)}
                            disabled={busy || !r.payoutMethod}
                            className="scav-btn ba-pay"
                          >
                            {paying === r.code ? "Saving…" : "Mark paid"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {(payable.length > 0 || blocked.length > 0) && (
                <div className="ba-runall">
                  <button
                    type="button"
                    onClick={payAll}
                    disabled={busy || payable.length === 0}
                    className="prize-btn"
                  >
                    {busy
                      ? "Recording…"
                      : payable.length === 0
                        ? "Nobody can be paid yet"
                        : `Record all ${payable.length} — ${money(payableCents)}`}
                  </button>
                  <p className="an-journey-meta">
                    Records one payout each, at the exact commission earned.
                    {blocked.length > 0 && (
                      <>
                        {" "}
                        <span className="ba-warn">
                          {blocked.length === 1
                            ? `${blocked[0].name} is not included — no payout details on their account.`
                            : `${blocked.length} are not included — no payout details on their accounts: ${blocked.map((r) => r.name).join(", ")}.`}
                        </span>
                      </>
                    )}
                  </p>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {view === "roster" && (
        <section className="an-panel">
          <header className="an-panel-head">
            <h3 className="an-panel-title">Roster &amp; leaderboard</h3>
            <span className="an-panel-group">{data.roster.length} ambassadors</span>
          </header>

          <div className="ba-controls">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, email, code or Instagram"
              aria-label="Search ambassadors"
              className="an-search"
            />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              aria-label="Sort by"
              className="an-search ba-sort"
            >
              <option value="sales">Top sales</option>
              <option value="period">This period</option>
              <option value="owed">Most owed</option>
              <option value="orders">Most orders</option>
              <option value="name">Name</option>
            </select>
          </div>

          {sorted.length === 0 ? (
            <p className="an-empty">Nobody matches that.</p>
          ) : (
            <table className="an-table ba-table">
              <thead>
                <tr>
                  <th>#</th><th>Ambassador</th><th>Tier</th><th>Clicks</th><th>Orders</th>
                  <th>Sales</th><th>Earned</th><th>Paid</th><th>Owed</th><th>Last order</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r, i) => (
                  <tr key={r.code}>
                    <td className="an-journey-meta">{i + 1}</td>
                    <td>
                      <span className="ba-name">{r.name}</span>
                      <span className="an-journey-meta">{r.instagram ?? r.email}</span>
                    </td>
                    <td><span className="ba-tier">{r.tierLabel}</span></td>
                    <td>{r.clicks.toLocaleString()}</td>
                    <td>{r.orderCount}</td>
                    <td>{money(r.salesCents)}</td>
                    <td>{money(r.earnedCents)}</td>
                    <td>{money(r.paidCents)}</td>
                    <td className={r.owedCents > 0 ? "ba-strong" : ""}>{money(r.owedCents)}</td>
                    <td className="an-journey-meta">{shortDate(r.lastOrderAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      {view === "history" && (
        <section className="an-panel">
          <header className="an-panel-head">
            <h3 className="an-panel-title">Payout history</h3>
            <span className="an-panel-group">most recent first</span>
          </header>
          {data.recentPayouts.length === 0 ? (
            <p className="an-empty">No payouts recorded yet.</p>
          ) : (
            <table className="an-table ba-table">
              <thead>
                <tr><th>Paid</th><th>Ambassador</th><th>Period</th><th>Amount</th><th>Method</th><th>Recorded by</th></tr>
              </thead>
              <tbody>
                {data.recentPayouts.map((p) => (
                  <tr key={p.id}>
                    <td className="an-journey-meta">{shortDate(p.paidAt)}</td>
                    <td><span className="ba-name">{p.name}</span></td>
                    <td className="an-journey-meta">{p.period ? periodLabel(p.period) : "—"}</td>
                    <td className="ba-strong">{money(p.amountCents)}</td>
                    <td className="an-table-path">{p.method}{p.reference ? ` · ${p.reference}` : ""}</td>
                    <td className="an-journey-meta">{p.paidBy ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}
    </div>
  );
}
