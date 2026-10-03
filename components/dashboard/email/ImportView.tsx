"use client";

import { useState, type ChangeEvent } from "react";

import { applyImportAction, previewImportAction, type ImportPreview } from "@/app/email/actions";
import {
  CONTACT_STATUS_LABELS,
  DEFAULT_SMS_CONSENT_SOURCE,
  type ContactStatus,
} from "@/lib/mailchimpImport";

/**
 * Bringing the Mailchimp list over.
 *
 * Two steps on purpose. The preview reads the files and says exactly
 * what would happen, including who would NOT be mailable and why, and
 * nothing is written until that has been looked at. An import is the one
 * operation here that can quietly destroy a sending reputation, and it
 * is not the sort of thing to find out about after the fact.
 */

const STATUS_ORDER: ContactStatus[] = ["subscribed", "unsubscribed", "cleaned", "never"];

const STATUS_HINT: Record<ContactStatus, string> = {
  subscribed: "will receive campaigns",
  unsubscribed: "stored, never mailed",
  cleaned: "bounced or reported spam, never mailed",
  never: "gave an address for something else, never mailed",
};

export default function ImportView({ onImported }: { onImported: () => void }) {
  const [files, setFiles] = useState<{ name: string; text: string }[]>([]);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [busy, setBusy] = useState<"reading" | "previewing" | "importing" | null>(null);
  // Off unless somebody deliberately turns it on. Nothing in the export
  // can tell us this, so it is a statement by the person importing,
  // recorded as one.
  const [smsConsentForAll, setSmsConsentForAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const picked = [...(event.target.files ?? [])];
    if (picked.length === 0) return;

    setBusy("reading");
    setError(null);
    setPreview(null);
    setDone(null);

    const read = await Promise.all(
      picked.map(async (file) => ({ name: file.name, text: await file.text() })),
    );
    setFiles(read);

    await runPreview(read, smsConsentForAll);
  }

  async function runPreview(read: { name: string; text: string }[], sms: boolean) {
    setBusy("previewing");
    const result = await previewImportAction(read, { smsConsentForAll: sms }).catch(() => ({
      ok: false as const,
      error: "Couldn't read those files.",
    }));
    setBusy(null);

    if (result.ok) setPreview(result.preview);
    else setError(result.error);
  }

  function toggleSmsConsent(next: boolean) {
    setSmsConsentForAll(next);
    // Re-read rather than patch the numbers on screen: the count it
    // changes is the whole reason to tick it, and a stale one is worse
    // than none.
    if (files.length > 0) void runPreview(files, next);
  }

  async function runImport() {
    if (files.length === 0) return;
    setBusy("importing");
    setError(null);

    const result = await applyImportAction(files, { smsConsentForAll }).catch(() => ({
      ok: false as const,
      error: "The import failed.",
      storedLocally: 0,
      sentToResend: 0,
      warnings: [] as string[],
    }));
    setBusy(null);

    if (result.ok) {
      setDone(
        `${result.storedLocally.toLocaleString()} contacts saved, ${result.sentToResend.toLocaleString()} handed to Resend. Resend processes its side in the background, so the subscribed count here fills in over the next few minutes.`,
      );
      setPreview(null);
      setFiles([]);
      onImported();
    } else {
      setError(result.error ?? result.warnings.join(" ") ?? "The import failed.");
    }
  }

  return (
    <section className="an-panel">
      <header className="an-panel-head">
        <h3 className="an-panel-title">Import from Mailchimp</h3>
        <span className="an-panel-group">nothing is written until you say so</span>
      </header>

      <p className="ba-note">
        In Mailchimp: Audience, then All contacts, then Export Audience. It gives you four CSVs.
        Drop all four in at once. Which file somebody is in is the only record of whether they
        agreed to hear from you, so the four are kept apart rather than merged into one list.
      </p>

      {/* Above the picker, because it changes what the preview says
          rather than being a detail applied afterwards. */}
      <label className="mt-4 flex max-w-2xl items-start gap-3 text-sm text-muted">
        <input
          type="checkbox"
          checked={smsConsentForAll}
          onChange={(e) => toggleSmsConsent(e.target.checked)}
          className="mt-1"
        />
        <span>
          Everyone on this list also agreed to receive text messages.
          <span className="block text-xs">
            Only tick this if the form or the register actually asked about texts. Agreeing to
            emails is not agreeing to messages, and the penalty is per message rather than per
            campaign. Recorded against each contact as:{" "}
            <span className="font-mono-code">{DEFAULT_SMS_CONSENT_SOURCE}</span>
          </span>
        </span>
      </label>

      <label className="ba-btn mt-4 inline-block cursor-pointer">
        {busy === "reading" || busy === "previewing" ? "READING…" : "CHOOSE CSV FILES"}
        <input
          type="file"
          accept=".csv,text/csv"
          multiple
          className="hidden"
          onChange={handleFiles}
          disabled={busy !== null}
        />
      </label>

      {error && <p className="ba-caution mt-4">{error}</p>}
      {done && <p className="mt-4 rounded-xl border border-flame-2/40 bg-flame-2/10 px-4 py-3 text-sm">{done}</p>}

      {preview && (
        <div className="mt-6 flex flex-col gap-6">
          <div>
            <h4 className="text-xs font-semibold tracking-[0.12em] uppercase text-muted">Files read</h4>
            <ul className="mt-2 flex flex-col gap-1 text-sm text-muted">
              {preview.files.map((f) => (
                <li key={f.name}>
                  <span className="text-foreground">{f.rows.toLocaleString()}</span> ·{" "}
                  {CONTACT_STATUS_LABELS[f.kind as ContactStatus] ?? "Unrecognised"} · {f.name}
                  {f.skipped > 0 && <span className="ba-warn"> ({f.skipped} skipped)</span>}
                </li>
              ))}
            </ul>
          </div>

          <div className="an-kpis">
            {STATUS_ORDER.map((s) => (
              <article key={s} className="an-kpi">
                <p className="an-kpi-value">{preview.counts[s].toLocaleString()}</p>
                <p className="an-kpi-label">{CONTACT_STATUS_LABELS[s]}</p>
                <p className="an-kpi-hint">{STATUS_HINT[s]}</p>
              </article>
            ))}
          </div>

          <p className="text-sm text-muted">
            <span className="text-foreground">{preview.totalContacts.toLocaleString()}</span> people
            in total, of whom <span className="text-foreground">{preview.mailable.toLocaleString()}</span>{" "}
            can be emailed. {preview.withPhone.toLocaleString()} have a usable phone number, and{" "}
            {preview.smsConsenting.toLocaleString()} of those can be texted.
          </p>

          {preview.warnings.map((w) => (
            <p key={w} className="ba-caution">
              {w}
            </p>
          ))}

          {preview.tags.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold tracking-[0.12em] uppercase text-muted">
                Tags that come across
              </h4>
              <div className="mt-2 flex flex-wrap gap-2">
                {preview.tags.map(({ tag, count }) => (
                  <span key={tag} className="ba-tier">
                    {tag} · {count}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div>
            <h4 className="text-xs font-semibold tracking-[0.12em] uppercase text-muted">
              First few, as they would be saved
            </h4>
            <table className="an-table ba-table mt-2">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Tags</th>
                  <th>Phone</th>
                </tr>
              </thead>
              <tbody>
                {preview.samples.map((s) => (
                  <tr key={s.email}>
                    <td className="an-table-path">{s.email}</td>
                    <td>{s.name || "no name"}</td>
                    <td className="an-journey-meta">
                      {CONTACT_STATUS_LABELS[s.status as ContactStatus]}
                      {s.note && <span className="ba-warn"> · {s.note}</span>}
                    </td>
                    <td className="an-journey-meta">{s.tags.join(", ") || "none"}</td>
                    <td className="an-journey-meta">{s.phone ?? "none"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="ba-actions">
            <button type="button" className="ba-btn" disabled={busy !== null} onClick={runImport}>
              {busy === "importing"
                ? "IMPORTING…"
                : `IMPORT ${preview.totalContacts.toLocaleString()} CONTACTS`}
            </button>
            <button
              type="button"
              className="ba-btn"
              disabled={busy !== null}
              onClick={() => {
                setPreview(null);
                setFiles([]);
              }}
            >
              CANCEL
            </button>
          </div>

          <p className="ba-note">
            Only the subscribed and unsubscribed go to Resend, the second group marked unsubscribed
            so Resend refuses them. Bounced addresses and people who never opted in are kept here
            and never uploaded: sending to a hard bounce is how a sending domain stops being
            delivered anywhere.
          </p>
        </div>
      )}
    </section>
  );
}
