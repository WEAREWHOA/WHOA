"use client";

import { useEffect, useState } from "react";

import {
  cancelCampaignAction,
  deleteCampaignAction,
  loadCampaignAction,
  loadCampaignsAction,
  saveCampaignAction,
  sendCampaignAction,
  sendTestAction,
  type CampaignsState,
} from "@/app/email/actions";
import type { Campaign, CampaignStats } from "@/lib/campaigns";

/**
 * Campaigns: write one, test it on yourself, send it or schedule it.
 *
 * Resend owns all of this. Nothing is mirrored, so the list here is
 * whatever Resend actually holds rather than a local idea of it that can
 * drift. The only thing this component adds is the order of operations:
 * a draft exists before it can be tested, and a test exists before
 * anything is sent to two thousand people.
 */

const when = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("en-US", {
        timeZone: "America/Los_Angeles",
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "not yet";

const STATUS_LABEL: Record<Campaign["status"], string> = {
  draft: "Draft",
  queued: "Scheduled",
  sent: "Sent",
};

function Stat({ label, value, capped }: { label: string; value: number; capped: boolean }) {
  return (
    <article className="an-kpi">
      <p className="an-kpi-value">
        {value.toLocaleString()}
        {capped ? "+" : ""}
      </p>
      <p className="an-kpi-label">{label}</p>
      {capped && <p className="an-kpi-hint">counted to the first thousand</p>}
    </article>
  );
}

function Composer({
  segments,
  from,
  editing,
  onDone,
  onCancel,
}: {
  segments: { id: string; name: string }[];
  from: string;
  editing: Campaign | null;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(editing?.name ?? "");
  const [subject, setSubject] = useState(editing?.subject ?? "");
  const [previewText, setPreviewText] = useState(editing?.previewText ?? "");
  const [html, setHtml] = useState(editing?.html ?? "");
  const [segmentId, setSegmentId] = useState(editing?.segmentId ?? segments[0]?.id ?? "");
  const [testTo, setTestTo] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [savedId, setSavedId] = useState<string | null>(editing?.id ?? null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmSend, setConfirmSend] = useState(false);

  const ready = name.trim() && subject.trim() && html.trim() && segmentId;

  async function save(): Promise<string | null> {
    setBusy("save");
    setError(null);
    const result = await saveCampaignAction({
      id: savedId ?? undefined,
      name: name.trim(),
      subject: subject.trim(),
      previewText: previewText.trim() || undefined,
      html,
      segmentId,
    });
    setBusy(null);
    if (!result.ok) {
      setError(result.error ?? "Couldn't save that.");
      return null;
    }
    const id = result.id ?? savedId;
    setSavedId(id ?? null);
    setMessage("Draft saved.");
    return id ?? null;
  }

  async function test() {
    if (!testTo.trim()) return;
    setBusy("test");
    setError(null);
    const result = await sendTestAction({ to: testTo.trim(), subject: subject.trim(), html });
    setBusy(null);
    if (result.ok) setMessage(`Test sent to ${testTo.trim()}.`);
    else setError(result.error ?? "Couldn't send the test.");
  }

  async function send() {
    const id = savedId ?? (await save());
    if (!id) return;
    setBusy("send");
    setError(null);
    const result = await sendCampaignAction(id, scheduledAt || undefined);
    setBusy(null);
    if (result.ok) onDone();
    else setError(result.error ?? "Couldn't send that.");
  }

  return (
    <section className="an-panel">
      <header className="an-panel-head">
        <h3 className="an-panel-title">{editing ? "Edit campaign" : "New campaign"}</h3>
        <span className="an-panel-group">from {from}</span>
      </header>

      <div className="mt-4 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-xs font-semibold tracking-wide uppercase">
          Internal name
          <input value={name} onChange={(e) => setName(e.target.value)} className="an-search" placeholder="October drop" />
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold tracking-wide uppercase">
          Subject line
          <input value={subject} onChange={(e) => setSubject(e.target.value)} className="an-search" />
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold tracking-wide uppercase">
          Preview text
          <input
            value={previewText}
            onChange={(e) => setPreviewText(e.target.value)}
            className="an-search"
            placeholder="The line shown under the subject in an inbox"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold tracking-wide uppercase">
          Send to
          <select value={segmentId} onChange={(e) => setSegmentId(e.target.value)} className="an-search">
            {segments.length === 0 && <option value="">No segments in Resend yet</option>}
            {segments.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold tracking-wide uppercase">
          Message (HTML)
          <textarea
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            rows={12}
            className="an-search font-mono-code"
            placeholder={"<h1>New drop</h1>\n<p>Hand bleached, one of one, live now.</p>"}
          />
        </label>

        {/* Resend adds the unsubscribe footer to a broadcast itself, so
            there is nothing to hand-write here, and hand-writing one is
            how a list ends up with a link that does not work. */}
        <p className="ba-note">
          Resend adds the unsubscribe link to every broadcast. Do not write your own: a broadcast
          whose unsubscribe link does nothing is the thing that gets a sender blocked.
        </p>

        {message && <p className="ba-strong text-sm">{message}</p>}
        {error && <p className="ba-caution">{error}</p>}

        <div className="ba-actions">
          <button type="button" className="ba-btn" disabled={!ready || busy !== null} onClick={save}>
            {busy === "save" ? "SAVING…" : "SAVE DRAFT"}
          </button>
          <button type="button" className="ba-btn" onClick={onCancel} disabled={busy !== null}>
            CLOSE
          </button>
        </div>

        <div className="border-t border-border pt-4">
          <h4 className="text-xs font-semibold tracking-[0.12em] uppercase text-muted">
            Send yourself a test first
          </h4>
          <div className="mt-2 flex flex-wrap gap-2">
            <input
              type="email"
              value={testTo}
              onChange={(e) => setTestTo(e.target.value)}
              placeholder="you@wearewhoa.com"
              className="an-search max-w-xs"
            />
            <button
              type="button"
              className="ba-btn"
              disabled={!testTo.trim() || !subject.trim() || !html.trim() || busy !== null}
              onClick={test}
            >
              {busy === "test" ? "SENDING…" : "SEND TEST"}
            </button>
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <h4 className="text-xs font-semibold tracking-[0.12em] uppercase text-muted">
            Then send it
          </h4>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="an-search max-w-xs"
              aria-label="Schedule for later"
            />
            <span className="text-xs text-muted">leave empty to send now</span>
          </div>

          <label className="mt-3 flex items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={confirmSend}
              onChange={(e) => setConfirmSend(e.target.checked)}
            />
            {/* A send cannot be recalled. The checkbox is the one thing
                standing between a typo and every customer reading it. */}
            I have sent myself a test and read it.
          </label>

          <button
            type="button"
            className="btn-flame mt-3 rounded-full px-6 py-3 text-xs font-bold tracking-wide uppercase disabled:opacity-50"
            disabled={!ready || !confirmSend || busy !== null}
            onClick={send}
          >
            {busy === "send" ? "SENDING…" : scheduledAt ? "SCHEDULE" : "SEND NOW"}
          </button>
        </div>
      </div>
    </section>
  );
}

function CampaignDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const [state, setState] = useState<{ campaign: Campaign; stats: CampaignStats | null } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    loadCampaignAction(id)
      .then((result) => {
        if (!live) return;
        if (result) setState(result);
        else setError("Couldn't load that campaign.");
      })
      .catch(() => live && setError("Couldn't load that campaign."));
    return () => {
      live = false;
    };
  }, [id]);

  if (error) return <p className="ba-caution">{error}</p>;
  if (!state) return <p className="an-empty">Loading…</p>;

  const { campaign, stats } = state;

  return (
    <section className="an-panel">
      <header className="an-panel-head">
        <h3 className="an-panel-title">{campaign.name}</h3>
        <button type="button" className="ba-btn" onClick={onBack}>
          BACK
        </button>
      </header>

      <p className="mt-2 text-sm text-muted">
        {campaign.subject} · {STATUS_LABEL[campaign.status]} ·{" "}
        {campaign.status === "sent" ? when(campaign.sentAt) : when(campaign.scheduledAt)}
      </p>

      {stats ? (
        <>
          <div className="an-kpis mt-4">
            <Stat label="Delivered" value={stats.delivered.count} capped={stats.delivered.capped} />
            <Stat label="Opened" value={stats.opened.count} capped={stats.opened.capped} />
            <Stat label="Clicked" value={stats.clicked.count} capped={stats.clicked.capped} />
            <Stat label="Bounced" value={stats.bounced.count} capped={stats.bounced.capped} />
            <Stat label="Unsubscribed" value={stats.unsubscribed.count} capped={stats.unsubscribed.capped} />
            <Stat label="Spam reports" value={stats.complained.count} capped={stats.complained.capped} />
          </div>

          {stats.links.length > 0 && (
            <>
              <h4 className="mt-6 text-xs font-semibold tracking-[0.12em] uppercase text-muted">
                Links clicked
              </h4>
              <table className="an-table ba-table mt-2">
                <thead>
                  <tr>
                    <th>URL</th>
                    <th>Clicks</th>
                    <th>People</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.links.map((l) => (
                    <tr key={l.url}>
                      <td className="an-table-path">{l.url}</td>
                      <td>{l.clicks.toLocaleString()}</td>
                      <td>{l.uniqueClicks.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </>
      ) : (
        <p className="an-empty">
          {campaign.status === "sent" ? "No results yet." : "Nothing to measure until it has been sent."}
        </p>
      )}
    </section>
  );
}

export default function CampaignsView() {
  const [state, setState] = useState<CampaignsState | null>(null);
  const [composing, setComposing] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function refresh() {
    loadCampaignsAction()
      .then((next) => next && setState(next))
      .catch(() => undefined);
  }

  useEffect(refresh, []);

  if (openId) return <CampaignDetail id={openId} onBack={() => setOpenId(null)} />;

  if (composing || editing) {
    return (
      <Composer
        segments={state?.segments ?? []}
        from={state?.from ?? ""}
        editing={editing}
        onDone={() => {
          setComposing(false);
          setEditing(null);
          refresh();
        }}
        onCancel={() => {
          setComposing(false);
          setEditing(null);
          refresh();
        }}
      />
    );
  }

  if (!state) return <p className="an-empty">Loading campaigns…</p>;

  return (
    <section className="an-panel">
      <header className="an-panel-head">
        <h3 className="an-panel-title">Campaigns</h3>
        <button type="button" className="ba-btn" onClick={() => setComposing(true)}>
          NEW CAMPAIGN
        </button>
      </header>

      {state.error && <p className="ba-caution">{state.error}</p>}

      {state.campaigns.length === 0 ? (
        <p className="an-empty">Nothing sent yet.</p>
      ) : (
        <table className="an-table ba-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Subject</th>
              <th>Status</th>
              <th>When</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {state.campaigns.map((c) => (
              <tr key={c.id}>
                <td>
                  <button type="button" className="hover:underline" onClick={() => setOpenId(c.id)}>
                    {c.name}
                  </button>
                </td>
                <td className="an-journey-meta">{c.subject ?? "no subject"}</td>
                <td className={c.status === "sent" ? "ba-strong" : "an-journey-meta"}>
                  {STATUS_LABEL[c.status]}
                </td>
                <td className="an-journey-meta">
                  {c.status === "sent" ? when(c.sentAt) : when(c.scheduledAt)}
                </td>
                <td>
                  <div className="flex flex-wrap gap-2">
                    {c.status === "draft" && (
                      <button type="button" className="ba-btn" onClick={() => setEditing(c)}>
                        EDIT
                      </button>
                    )}
                    {c.status === "queued" && (
                      <button
                        type="button"
                        className="ba-btn"
                        disabled={busyId === c.id}
                        onClick={async () => {
                          setBusyId(c.id);
                          await cancelCampaignAction(c.id);
                          setBusyId(null);
                          refresh();
                        }}
                      >
                        CANCEL SEND
                      </button>
                    )}
                    {c.status === "draft" && (
                      <button
                        type="button"
                        className="ba-btn"
                        disabled={busyId === c.id}
                        onClick={async () => {
                          setBusyId(c.id);
                          await deleteCampaignAction(c.id);
                          setBusyId(null);
                          refresh();
                        }}
                      >
                        DELETE
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
