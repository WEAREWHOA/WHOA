"use client";

import { useHuntProgress } from "@/components/games/hunt/useHuntProgress";
import { HUNT_BRANCHES, HUNT_REWARD_CODE } from "@/lib/games/scavengerHunt";

export default function HuntProgress() {
  const found = useHuntProgress();
  const complete = found.length === HUNT_BRANCHES.length;

  return (
    <div className="w-full max-w-lg">
      <p className="text-sm text-muted">
        {found.length} of {HUNT_BRANCHES.length} pieces found
      </p>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="bg-flame h-full rounded-full transition-all"
          style={{ width: `${(found.length / HUNT_BRANCHES.length) * 100}%` }}
        />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {HUNT_BRANCHES.map((branch) => {
          const isFound = found.includes(branch.slug);
          return (
            <div
              key={branch.slug}
              className={`card-surface rounded-xl border p-4 text-center transition-opacity ${
                isFound ? "opacity-100" : "opacity-40"
              }`}
              style={{ borderColor: isFound ? branch.accent : undefined }}
            >
              <span className="text-2xl" aria-hidden>
                {isFound ? "🧩" : "❔"}
              </span>
              <p className="mt-1 text-xs font-semibold">{branch.label}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-8 rounded-2xl border border-border-strong p-6 text-center">
        {complete ? (
          <>
            <p className="text-flame-2 text-xs font-semibold tracking-wide uppercase">
              All six found
            </p>
            <p className="font-mono-code font-display mt-2 text-3xl tracking-wide">
              {HUNT_REWARD_CODE}
            </p>
            <p className="mt-2 text-xs text-muted">Show this at the booth to claim your prize.</p>
          </>
        ) : (
          <p className="text-sm text-muted">
            Find all six pieces around the space to unlock a prize code.
          </p>
        )}
      </div>
    </div>
  );
}
