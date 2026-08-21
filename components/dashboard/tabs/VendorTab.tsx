export default function VendorTab() {
  return (
    <div className="relative min-h-[420px] overflow-hidden rounded-2xl border border-border-strong">
      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/85 px-6 text-center backdrop-blur-sm">
        <span className="text-3xl" aria-hidden>
          🔒
        </span>
        <h3 className="font-display text-2xl">Vendor Sales — Not Activated</h3>
        <p className="max-w-sm text-sm text-muted">
          Once your vendor account is approved, this tab unlocks live sales totals,
          best-selling items, and payout history from what you sell at the WHOADEGA and
          festival booths.
        </p>
        <button
          type="button"
          disabled
          className="mt-2 cursor-not-allowed rounded-full border border-border-strong px-5 py-2.5 text-sm font-semibold text-muted"
        >
          Request access — coming soon
        </button>
      </div>

      <div aria-hidden className="grid gap-4 p-8 opacity-40 sm:grid-cols-3">
        <div className="card-surface rounded-xl border border-border p-5">
          <p className="text-xs text-muted uppercase">Total sales</p>
          <p className="font-display mt-1 text-3xl">$0</p>
        </div>
        <div className="card-surface rounded-xl border border-border p-5">
          <p className="text-xs text-muted uppercase">Items sold</p>
          <p className="font-display mt-1 text-3xl">0</p>
        </div>
        <div className="card-surface rounded-xl border border-border p-5">
          <p className="text-xs text-muted uppercase">Next payout</p>
          <p className="font-display mt-1 text-3xl">—</p>
        </div>
      </div>
    </div>
  );
}
