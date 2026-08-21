"use client";

import { lockPos } from "@/components/pos/usePosAuth";
import type { PosTab } from "@/components/pos/PosApp";

function MenuRow({
  label,
  onClick,
  soon,
}: {
  label: string;
  onClick?: () => void;
  soon?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className="flex w-full items-center justify-between px-1 py-3.5 text-left text-sm font-medium disabled:cursor-default disabled:text-muted"
    >
      <span>{label}</span>
      {soon ? (
        <span className="text-xs text-muted uppercase tracking-wide">Coming soon</span>
      ) : (
        <span className="text-muted" aria-hidden>
          ›
        </span>
      )}
    </button>
  );
}

export default function MoreTab({ onNavigate }: { onNavigate: (tab: PosTab) => void }) {
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <h2 className="font-display text-2xl">More</h2>
      <p className="mt-1 text-sm text-muted">WHOADEGA</p>

      <div className="mt-6 flex flex-col divide-y divide-border rounded-xl border border-border bg-surface px-4">
        <MenuRow label="Orders" onClick={() => onNavigate("transactions")} />
        <MenuRow label="Items" onClick={() => onNavigate("inventory")} />
        <MenuRow label="Reports" soon />
        <MenuRow label="Settings" soon />
      </div>

      <button
        type="button"
        onClick={lockPos}
        className="mt-6 w-full rounded-full border border-border-strong px-6 py-3.5 text-sm font-semibold tracking-wide text-muted uppercase hover:text-foreground"
      >
        Lock register
      </button>
    </div>
  );
}
