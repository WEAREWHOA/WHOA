"use client";

import { useMemo, useState } from "react";

import type { Audience } from "@/lib/audience";

/**
 * The text side.
 *
 * There is no SMS provider connected to this app, so this does not
 * pretend to send anything. What it does is the part that has to be
 * right before any provider is worth connecting: who has a number we can
 * actually dial, and which of them agreed to be texted.
 *
 * Those are different questions, and the second one is the law. Texting
 * somebody who gave you their number to take an order is a TCPA problem,
 * not a marketing decision, and the penalty is per message. So consent
 * is counted separately from possession, and the export only ever
 * contains the people who consented.
 */
export default function TextsView({ audience }: { audience: Audience }) {
  const [copied, setCopied] = useState(false);

  const { withNumber, consenting } = useMemo(() => {
    const live = audience.contacts.filter((c) => c.status !== "cleaned");
    const withNumber = live.filter((c) => c.phoneE164);
    return { withNumber, consenting: withNumber.filter((c) => c.smsConsent) };
  }, [audience.contacts]);

  function copyNumbers() {
    const text = consenting.map((c) => c.phoneE164).join("\n");
    navigator.clipboard?.writeText(text).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => undefined,
    );
  }

  return (
    <>
      <div className="an-kpis">
        <article className="an-kpi">
          <p className="an-kpi-value">{consenting.length.toLocaleString()}</p>
          <p className="an-kpi-label">Can be texted</p>
          <p className="an-kpi-hint">a number, and said yes</p>
        </article>
        <article className="an-kpi">
          <p className="an-kpi-value">{withNumber.length.toLocaleString()}</p>
          <p className="an-kpi-label">Numbers on file</p>
          <p className="an-kpi-hint">having one is not permission</p>
        </article>
        <article className="an-kpi">
          <p className="an-kpi-value">
            {(withNumber.length - consenting.length).toLocaleString()}
          </p>
          <p className="an-kpi-label">Number, no consent</p>
          <p className="an-kpi-hint">ask before texting these</p>
        </article>
      </div>

      <p className="ba-caution">
        No text provider is connected, so nothing here can send a message. This is the audience
        side, which is the part worth getting right first.
      </p>

      <section className="an-panel">
        <header className="an-panel-head">
          <h3 className="an-panel-title">Who said yes</h3>
          <button
            type="button"
            className="ba-btn"
            onClick={copyNumbers}
            disabled={consenting.length === 0}
          >
            {copied ? "COPIED" : "COPY NUMBERS"}
          </button>
        </header>

        {consenting.length === 0 ? (
          <p className="an-empty">
            Nobody has agreed to be texted yet. The Mailchimp list carries one &quot;Text
            Subscribers&quot; tag, so almost nobody on it ever opted in to messages, whatever their
            number says.
          </p>
        ) : (
          <table className="an-table ba-table">
            <thead>
              <tr>
                <th>Number</th>
                <th>Name</th>
                <th>Email</th>
              </tr>
            </thead>
            <tbody>
              {consenting.slice(0, 500).map((c) => (
                <tr key={c.email}>
                  <td className="an-table-path">{c.phoneE164}</td>
                  <td>{[c.firstName, c.lastName].filter(Boolean).join(" ") || "no name"}</td>
                  <td className="an-journey-meta">{c.email}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <p className="ba-note">
        To start texting properly you need a provider and a number, and every message has to carry
        a way to stop. The honest way to build the list is to ask for it: a tick box at checkout
        and at the register, worded so it is obvious what someone is agreeing to. That is a change
        to the checkout, not to this tab, and it is worth doing before buying a provider rather
        than after.
      </p>
    </>
  );
}
