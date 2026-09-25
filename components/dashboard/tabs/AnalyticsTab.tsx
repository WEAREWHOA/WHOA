"use client";

import { useMemo, useState } from "react";
import { loadAnalyticsAction } from "@/app/analytics/actions";
import {
  FunnelChart,
  Heatmap,
  RankedBars,
  SplitBar,
  TimeSeries,
} from "@/components/dashboard/analytics/charts";
import type { AnalyticsSnapshot } from "@/lib/kpiReport";

/**
 * ANALYTICS — everything the database can honestly report, in one tab.
 *
 * The search box filters KPIs and panels alike, because "where do I find
 * check-ins" shouldn't depend on knowing whether check-ins are a number
 * or a chart. Each item carries its own keywords so someone can type what
 * they mean ("how many people scanned") rather than what we named it.
 */
const PERIODS = [7, 30, 90];

const MONEY = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

interface Panel {
  id: string;
  title: string;
  group: string;
  keywords: string;
  wide?: boolean;
  body: React.ReactNode;
}

export default function AnalyticsTab({ initial }: { initial: AnalyticsSnapshot }) {
  const [snapshot, setSnapshot] = useState(initial);
  const [period, setPeriod] = useState(initial.periodDays);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");

  function choosePeriod(days: number) {
    if (days === period || loading) return;
    setLoading(true);
    setPeriod(days);
    loadAnalyticsAction(days)
      .then((next) => {
        if (next) setSnapshot(next);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  const panels: Panel[] = useMemo(
    () => [
      {
        id: "views-day", title: "Page views by day", group: "Traffic", wide: true,
        keywords: "traffic views daily trend chart visits",
        body: <TimeSeries points={snapshot.viewsByDay} />,
      },
      {
        id: "heatmap", title: "When the site is busy", group: "Traffic", wide: true,
        keywords: "heatmap hour weekday busy peak time traffic when",
        body: <Heatmap grid={snapshot.heatmap} />,
      },
      {
        id: "top-pages", title: "Top pages", group: "Traffic",
        keywords: "pages popular traffic paths most viewed",
        body: <RankedBars points={snapshot.topPages} />,
      },
      {
        id: "entry-pages", title: "Where visits start", group: "Traffic",
        keywords: "entry landing first page traffic qr scan",
        body: <RankedBars points={snapshot.entryPages} accent="var(--an-series-7)" />,
      },
      {
        id: "referrers", title: "Referrers", group: "Traffic",
        keywords: "referrer source instagram social traffic where from",
        body: <RankedBars points={snapshot.referrers} accent="var(--an-series-5)" />,
      },
      {
        id: "devices", title: "Devices", group: "Traffic",
        keywords: "device mobile desktop tablet phone traffic",
        body: <SplitBar points={snapshot.devices} />,
      },
      {
        id: "countries", title: "Countries", group: "Traffic",
        keywords: "country geography location traffic international",
        body: <RankedBars points={snapshot.countries} accent="var(--an-series-1)" />,
      },
      {
        id: "revenue-day", title: "Revenue by day", group: "Commerce", wide: true,
        keywords: "revenue sales money daily trend shop chart",
        body: <TimeSeries points={snapshot.revenueByDay} format={MONEY} accent="var(--an-series-2)" />,
      },
      {
        id: "products-revenue", title: "Top products by revenue", group: "Commerce",
        keywords: "products best sellers revenue money shop items",
        body: <RankedBars points={snapshot.topProductsByRevenue} format={MONEY} accent="var(--an-series-2)" />,
      },
      {
        id: "products-units", title: "Top products by units", group: "Commerce",
        keywords: "products best sellers units quantity shop items",
        body: <RankedBars points={snapshot.topProductsByUnits} accent="var(--an-series-4)" />,
      },
      {
        id: "ambassadors", title: "Ambassador leaderboard", group: "Ambassadors",
        keywords: "ambassador referral leaderboard sales attribution top",
        body: <RankedBars points={snapshot.ambassadorBoard} format={MONEY} accent="var(--an-series-3)" />,
      },
      {
        id: "events", title: "Tickets by event", group: "Events",
        keywords: "events tickets rsvp sold breakdown",
        body: <RankedBars points={snapshot.eventBoard} accent="var(--an-series-8)" />,
      },
      {
        id: "stamps-day", title: "Scavenger stamps by day", group: "SSBD", wide: true,
        keywords: "scavenger stamps ssbd go daily chart flyer",
        body: <TimeSeries points={snapshot.stampsByDay} accent="var(--an-series-6)" />,
      },
      {
        id: "signups-day", title: "New accounts by day", group: "Community", wide: true,
        keywords: "signups accounts members growth daily chart",
        body: <TimeSeries points={snapshot.signupsByDay} accent="var(--an-series-7)" />,
      },
      ...snapshot.funnels.map((funnel) => ({
        id: `funnel-${funnel.id}`,
        title: `${funnel.title} funnel`,
        group: "Funnels",
        keywords: `funnel journey conversion dropoff ${funnel.title} ${funnel.blurb}`,
        body: <FunnelChart funnel={funnel} />,
      })),
    ],
    [snapshot],
  );

  const needle = query.trim().toLowerCase();
  const match = (haystack: string) => !needle || haystack.toLowerCase().includes(needle);

  const kpis = snapshot.kpis.filter((k) =>
    match(`${k.label} ${k.keywords} ${k.group} ${k.hint ?? ""}`),
  );
  const shown = panels.filter((p) => match(`${p.title} ${p.keywords} ${p.group}`));
  const nothing = !kpis.length && !shown.length;

  return (
    <div className={`an-root ${loading ? "an-loading" : ""}`}>
      <header className="an-head">
        <div>
          <h2 className="font-display an-title">ANALYTICS</h2>
          <p className="an-sub">
            Measured from our own database — every number here is first-party.
            {snapshot.truncated && " Showing a capped sample: this window is unusually large."}
          </p>
        </div>

        <div className="an-periods" role="group" aria-label="Time period">
          {PERIODS.map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => choosePeriod(days)}
              className={`an-period ${period === days ? "an-period-on" : ""}`}
            >
              {days}d
            </button>
          ))}
        </div>
      </header>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search KPIs — try “revenue”, “scan”, “check-in”, “funnel”"
        aria-label="Search KPIs"
        className="an-search"
      />

      {nothing ? (
        <p className="an-empty an-empty-big">
          Nothing matches “{query}”. Try a word like revenue, traffic, scan, ticket or prize.
        </p>
      ) : (
        <>
          {kpis.length > 0 && (
            <div className="an-kpis">
              {kpis.map((kpi) => (
                <article key={kpi.id} className="an-kpi">
                  <p className="an-kpi-group">{kpi.group}</p>
                  <p className="an-kpi-value">{kpi.value}</p>
                  <p className="an-kpi-label">{kpi.label}</p>
                  {kpi.hint && <p className="an-kpi-hint">{kpi.hint}</p>}
                  {kpi.note && <p className="an-kpi-note">{kpi.note}</p>}
                </article>
              ))}
            </div>
          )}

          {shown.length > 0 && (
            <div className="an-panels">
              {shown.map((panel) => (
                <section
                  key={panel.id}
                  className={`an-panel ${panel.wide ? "an-panel-wide" : ""}`}
                >
                  <header className="an-panel-head">
                    <h3 className="an-panel-title">{panel.title}</h3>
                    <span className="an-panel-group">{panel.group}</span>
                  </header>
                  {panel.body}
                </section>
              ))}
            </div>
          )}
        </>
      )}

      <p className="an-foot">
        {snapshot.periodDays}-day window · times in Pacific · generated{" "}
        {new Date(snapshot.generatedAt).toLocaleString("en-US", {
          timeZone: "America/Los_Angeles",
          dateStyle: "medium",
          timeStyle: "short",
        })}
      </p>
    </div>
  );
}
