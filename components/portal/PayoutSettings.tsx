"use client";

import { useState } from "react";
import { updatePayoutAction } from "@/lib/actions";
import type { PayoutSettings as PayoutSettingsType } from "@/lib/types";

const methods: { id: PayoutSettingsType["method"]; label: string }[] = [
  { id: "venmo", label: "Venmo" },
  { id: "zelle", label: "Zelle" },
];

// Venmo pays out to a @handle; Zelle pays out to whatever contact info is
// linked to it, email or phone — two different fields, not one generic
// "phone number" like the old copy assumed.
const DESTINATION_COPY: Record<PayoutSettingsType["method"], { label: string; placeholder: string; help: string }> = {
  venmo: {
    label: "Venmo username",
    placeholder: "@your-venmo",
    help: "Include the @ — e.g. @jane-doe123.",
  },
  zelle: {
    label: "Email or phone number linked to Zelle",
    placeholder: "you@example.com or (555) 123-4567",
    help: "Whatever you have Zelle set up with — email or phone both work.",
  },
};

export default function PayoutSettings({
  code,
  payout,
  saved,
}: {
  code: string;
  payout: PayoutSettingsType | null;
  saved?: boolean;
}) {
  const [method, setMethod] = useState<PayoutSettingsType["method"]>(payout?.method ?? "venmo");
  const copy = DESTINATION_COPY[method];

  return (
    <div className="card-surface rounded-xl p-6">
      <h3 className="font-semibold">Payout settings</h3>
      <p className="mt-1 text-sm text-muted">
        Choose how you want to get paid. Commission is settled from tracked orders.
      </p>

      {saved && (
        <p className="mt-4 rounded-lg border border-flame-2/40 bg-flame-2/10 px-4 py-2 text-sm text-flame-3">
          Payout details saved.
        </p>
      )}

      <form action={updatePayoutAction} className="mt-4 flex flex-col gap-4">
        <input type="hidden" name="code" value={code} />

        <div>
          <span className="text-sm font-medium">Method</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {methods.map((m) => (
              <label
                key={m.id}
                className="flex items-center gap-2 rounded-lg border border-border-strong bg-surface-raised px-4 py-2 text-sm has-[:checked]:border-flame-2"
              >
                <input
                  type="radio"
                  name="method"
                  value={m.id}
                  checked={method === m.id}
                  onChange={() => setMethod(m.id)}
                  className="accent-[var(--flame-2)]"
                />
                {m.label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="destination" className="text-sm font-medium">
            {copy.label}
          </label>
          <input
            id="destination"
            name="destination"
            type="text"
            required
            defaultValue={payout?.destination ?? ""}
            placeholder={copy.placeholder}
            className="mt-2 w-full rounded-lg border border-border-strong bg-surface-raised px-4 py-3 text-sm outline-none focus:border-flame-2"
          />
          <p className="mt-2 text-xs text-muted">{copy.help}</p>
        </div>

        <button
          type="submit"
          className="self-start rounded-full border border-border-strong px-6 py-2.5 text-sm font-medium transition-colors hover:bg-surface"
        >
          Save payout details
        </button>
      </form>
    </div>
  );
}
