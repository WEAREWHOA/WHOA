"use client";

import { useState } from "react";

import AudienceView from "@/components/dashboard/email/AudienceView";
import CampaignsView from "@/components/dashboard/email/CampaignsView";
import ImportView from "@/components/dashboard/email/ImportView";
import TextsView from "@/components/dashboard/email/TextsView";
import { exportAudienceAction, loadAudienceAction } from "@/app/email/actions";
import type { Audience } from "@/lib/audience";

/**
 * EMAIL/TEXT - the marketing tab.
 *
 * Four views over one audience: who is on the list, what has been sent
 * to them, the text side, and bringing a list in from somewhere else.
 *
 * The numbers across the top are the ones that decide whether a send is
 * a good idea, so they stay visible whichever view is open. "Mailable"
 * rather than "subscribers" on purpose: the useful number is how many
 * people a campaign would actually reach, which is always smaller than
 * how many addresses are held.
 */

type View = "audience" | "campaigns" | "texts" | "import";

const VIEWS: { id: View; label: string }[] = [
  { id: "audience", label: "AUDIENCE" },
  { id: "campaigns", label: "CAMPAIGNS" },
  { id: "texts", label: "TEXTS" },
  { id: "import", label: "IMPORT" },
];

function download(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function EmailTextTab({ initial }: { initial: Audience }) {
  const [audience, setAudience] = useState(initial);
  const [view, setView] = useState<View>("audience");
  const [busy, setBusy] = useState(false);

  function refresh() {
    setBusy(true);
    loadAudienceAction()
      .then((next) => next && setAudience(next))
      .catch(() => undefined)
      .finally(() => setBusy(false));
  }

  async function exportCsv() {
    const csv = await exportAudienceAction().catch(() => null);
    if (csv) download(`whoa-audience-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  }

  if (!audience.configured) {
    return (
      <div className="an-root">
        <header className="an-head">
          <div>
            <h2 className="an-title">EMAIL/TEXT</h2>
            <p className="an-sub">Not set up yet.</p>
          </div>
        </header>
        <p className="ba-caution">
          This needs <code className="font-mono-code">RESEND_API_KEY</code> and{" "}
          <code className="font-mono-code">RESEND_AUDIENCE_ID</code> in the environment. The second
          is the id Resend shows for your list under Audiences.
        </p>
      </div>
    );
  }

  return (
    <div className={`an-root ${busy ? "an-loading" : ""}`}>
      <header className="an-head">
        <div>
          <h2 className="an-title">EMAIL/TEXT</h2>
          <p className="an-sub">Everyone who hears from WHOA, and everything sent to them.</p>
        </div>
        <button type="button" className="ba-btn" disabled={busy} onClick={refresh}>
          {busy ? "REFRESHING…" : "REFRESH"}
        </button>
      </header>

      {audience.needsMigration && (
        <p className="ba-caution">
          Tags, phone numbers and status are empty because migration{" "}
          <code className="font-mono-code">0040_email_text.sql</code> has not been run yet. Nothing
          else is affected, and the list below is still correct.
        </p>
      )}
      {audience.resendError && <p className="ba-caution">{audience.resendError}</p>}

      <div className="an-kpis">
        <article className="an-kpi">
          <p className="an-kpi-value">{audience.mailable.toLocaleString()}</p>
          <p className="an-kpi-label">Mailable</p>
          <p className="an-kpi-hint">a campaign would reach these</p>
        </article>
        <article className="an-kpi">
          <p className="an-kpi-value">{audience.total.toLocaleString()}</p>
          <p className="an-kpi-label">Contacts</p>
          <p className="an-kpi-hint">everyone on file</p>
        </article>
        <article className="an-kpi">
          <p className="an-kpi-value">{audience.textable.toLocaleString()}</p>
          <p className="an-kpi-label">Textable</p>
          <p className="an-kpi-hint">number plus consent</p>
        </article>
        <article className="an-kpi">
          <p className="an-kpi-value">{audience.noOptinRecord.toLocaleString()}</p>
          <p className="an-kpi-label">No opt-in record</p>
          <p className="an-kpi-hint">mailable, but never signed up</p>
        </article>
      </div>

      <div className="an-periods" role="tablist" aria-label="View">
        {VIEWS.map(({ id, label }) => (
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

      {view === "audience" && <AudienceView audience={audience} onExport={exportCsv} />}
      {view === "campaigns" && <CampaignsView />}
      {view === "texts" && <TextsView audience={audience} />}
      {view === "import" && <ImportView onImported={refresh} />}
    </div>
  );
}
