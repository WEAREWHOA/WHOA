import { updatePayoutAction } from "@/lib/actions";
import type { PayoutSettings as PayoutSettingsType } from "@/lib/types";

const methods: { id: PayoutSettingsType["method"]; label: string }[] = [
  { id: "paypal", label: "PayPal" },
  { id: "venmo", label: "Venmo" },
  { id: "bank", label: "Bank transfer" },
];

export default function PayoutSettings({
  code,
  payout,
  saved,
}: {
  code: string;
  payout: PayoutSettingsType | null;
  saved?: boolean;
}) {
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
            {methods.map((method) => (
              <label
                key={method.id}
                className="flex items-center gap-2 rounded-lg border border-border-strong bg-surface-raised px-4 py-2 text-sm has-[:checked]:border-flame-2"
              >
                <input
                  type="radio"
                  name="method"
                  value={method.id}
                  defaultChecked={payout?.method === method.id || method.id === "paypal"}
                  className="accent-[var(--flame-2)]"
                />
                {method.label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="destination" className="text-sm font-medium">
            PayPal / Venmo handle or account details
          </label>
          <input
            id="destination"
            name="destination"
            type="text"
            required
            defaultValue={payout?.destination ?? ""}
            placeholder="you@example.com"
            className="mt-2 w-full rounded-lg border border-border-strong bg-surface-raised px-4 py-3 text-sm outline-none focus:border-flame-2"
          />
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
