"use client";

import { useEffect } from "react";
import Link from "next/link";
import { markBranchFound } from "@/components/games/hunt/useHuntProgress";
import type { HuntBranch } from "@/lib/games/scavengerHunt";

export default function HuntFoundCard({ branch }: { branch: HuntBranch }) {
  useEffect(() => {
    markBranchFound(branch.slug);
  }, [branch.slug]);

  return (
    <div
      className="flex flex-col items-center rounded-3xl border-2 p-10 text-center"
      style={{ borderColor: branch.accent }}
    >
      <span className="text-5xl" aria-hidden>
        🧩
      </span>
      <p className="mt-3 text-xs font-semibold tracking-wide text-muted uppercase">Piece found</p>
      <h1 className="font-display mt-1 text-3xl tracking-wide" style={{ color: branch.accent }}>
        {branch.label}
      </h1>
      <p className="mt-2 text-sm text-muted">{branch.description}</p>

      <Link href="/games/hunt" className="btn-flame mt-6 rounded-full px-8 py-3 text-sm">
        See my progress
      </Link>
    </div>
  );
}
