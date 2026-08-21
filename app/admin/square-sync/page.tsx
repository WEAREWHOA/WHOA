"use client";

import { useState } from "react";

type StepState = {
  loading: boolean;
  result: string | null;
  error: string | null;
};

const IDLE: StepState = { loading: false, result: null, error: null };

async function callAdminRoute(path: string, secret: string): Promise<string> {
  const res = await fetch(path, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
  });

  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = text;
  }

  if (!res.ok) {
    const message =
      typeof parsed === "object" && parsed && "error" in parsed
        ? String((parsed as { error: unknown }).error)
        : `${res.status} ${res.statusText}`;
    throw new Error(message);
  }

  return JSON.stringify(parsed, null, 2);
}

export default function SquareSyncAdminPage() {
  const [secret, setSecret] = useState("");
  const [webhookState, setWebhookState] = useState<StepState>(IDLE);
  const [backfillState, setBackfillState] = useState<StepState>(IDLE);

  async function handleRegisterWebhook() {
    setWebhookState({ loading: true, result: null, error: null });
    try {
      const result = await callAdminRoute("/api/admin/square/register-webhook", secret);
      setWebhookState({ loading: false, result, error: null });
    } catch (err) {
      setWebhookState({ loading: false, result: null, error: (err as Error).message });
    }
  }

  async function handleBackfill() {
    setBackfillState({ loading: true, result: null, error: null });
    try {
      const result = await callAdminRoute("/api/admin/square/backfill", secret);
      setBackfillState({ loading: false, result, error: null });
    } catch (err) {
      setBackfillState({ loading: false, result: null, error: (err as Error).message });
    }
  }

  const canRun = secret.trim().length > 0;

  return (
    <section className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <span className="text-xs font-semibold tracking-[0.2em] text-muted uppercase">
        One-time setup
      </span>
      <h1 className="font-display mt-2 text-4xl tracking-wide">
        Square <span className="text-flame">sync setup</span>
      </h1>
      <p className="mt-3 max-w-lg text-sm text-muted">
        Two buttons, run once, in order. This page just calls the same setup endpoints the README
        describes — it exists so you don&apos;t need a terminal.
      </p>

      <div className="card-surface mt-8 rounded-2xl p-6">
        <label htmlFor="secret" className="text-sm font-medium">
          Admin secret
        </label>
        <p className="mt-1 text-xs text-muted">
          The same value you set as <code className="font-mono-code">SQUARE_ADMIN_SECRET</code> in
          Vercel. Nothing is saved anywhere — it&apos;s only used to authorize the two calls below.
        </p>
        <input
          id="secret"
          type="password"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder="Paste your SQUARE_ADMIN_SECRET value"
          className="mt-3 w-full rounded-lg border border-border-strong bg-surface-raised px-4 py-3 text-sm outline-none focus:border-flame-2"
        />
      </div>

      <div className="card-surface mt-6 rounded-2xl p-6">
        <h2 className="font-display text-2xl">Step 1 — Register the webhook</h2>
        <p className="mt-2 text-sm text-muted">
          Tells Square where to send updates. The response includes a{" "}
          <code className="font-mono-code">signatureKey</code> — copy that into Vercel as{" "}
          <code className="font-mono-code">SQUARE_WEBHOOK_SIGNATURE_KEY</code> and redeploy before
          moving on.
        </p>
        <button
          type="button"
          disabled={!canRun || webhookState.loading}
          onClick={handleRegisterWebhook}
          className="btn-flame mt-4 rounded-full px-6 py-3 text-sm font-semibold tracking-wide uppercase disabled:cursor-not-allowed disabled:opacity-50"
        >
          {webhookState.loading ? "Registering…" : "Register webhook"}
        </button>

        {webhookState.error && (
          <p className="mt-4 rounded-lg border border-flame-1/40 bg-flame-1/10 px-4 py-3 text-sm text-flame-3">
            {webhookState.error}
          </p>
        )}
        {webhookState.result && (
          <pre className="mt-4 overflow-x-auto rounded-lg border border-border-strong bg-surface-raised p-4 text-xs">
            {webhookState.result}
          </pre>
        )}
      </div>

      <div className="card-surface mt-6 rounded-2xl p-6">
        <h2 className="font-display text-2xl">Step 2 — Backfill existing data</h2>
        <p className="mt-2 text-sm text-muted">
          Pulls your full existing catalog, inventory, and order history in. Only do this after
          Step 1&apos;s signature key is set in Vercel and redeployed. Can take a while — safe to
          click again if it times out.
        </p>
        <button
          type="button"
          disabled={!canRun || backfillState.loading}
          onClick={handleBackfill}
          className="btn-flame mt-4 rounded-full px-6 py-3 text-sm font-semibold tracking-wide uppercase disabled:cursor-not-allowed disabled:opacity-50"
        >
          {backfillState.loading ? "Running…" : "Run backfill"}
        </button>

        {backfillState.error && (
          <p className="mt-4 rounded-lg border border-flame-1/40 bg-flame-1/10 px-4 py-3 text-sm text-flame-3">
            {backfillState.error}
          </p>
        )}
        {backfillState.result && (
          <pre className="mt-4 overflow-x-auto rounded-lg border border-border-strong bg-surface-raised p-4 text-xs">
            {backfillState.result}
          </pre>
        )}
      </div>
    </section>
  );
}
