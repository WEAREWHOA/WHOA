"use client";

import { useState } from "react";

export default function CopyField({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — no-op
    }
  }

  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <div className="mt-2 flex items-center gap-2 rounded-lg border border-border-strong bg-surface-raised px-4 py-3">
        <span
          className={`flex-1 truncate text-sm ${mono ? "font-mono-code text-flame" : ""}`}
        >
          {value}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="shrink-0 rounded-md border border-border-strong px-3 py-1.5 text-xs font-medium transition-colors hover:bg-surface"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
