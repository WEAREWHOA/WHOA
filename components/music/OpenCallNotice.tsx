import Link from "next/link";
import { LockIcon } from "@/components/LockedBadge";
import { MUSIC_CLOSED_BLURB, MUSIC_CLOSED_CTA, MUSIC_CLOSED_LABEL } from "@/lib/musicOpenCall";

/**
 * The shut door, said once and reused.
 *
 * Shown wherever a way in used to be. It explains rather than just
 * refusing: somebody who reads why the collective is small is more
 * likely to come back for the next call than somebody who meets a
 * padlock and nothing else.
 */
export default function OpenCallNotice({
  tone = "light",
  showLabel = true,
  className = "",
}: {
  /** "light" sits on the dark art-directed pages; "surface" on a card. */
  tone?: "light" | "surface";
  /**
   * Off where the heading above already says it. A page titled
   * "Applications are closed" with "APPLICATIONS CLOSED" under it is a
   * stutter, not emphasis.
   */
  showLabel?: boolean;
  className?: string;
}) {
  const muted = tone === "light" ? "text-white/60" : "text-muted";
  const strong = tone === "light" ? "text-white" : "text-foreground";
  const border = tone === "light" ? "border-white/15" : "border-border";

  return (
    <div className={`rounded-2xl border ${border} p-6 text-center ${className}`}>
      {showLabel && (
        <p
          className={`inline-flex items-center gap-2 text-xs font-semibold tracking-[0.18em] uppercase ${strong}`}
        >
          <LockIcon className="h-3.5 w-3.5 shrink-0" />
          {MUSIC_CLOSED_LABEL}
        </p>
      )}
      <p className={`mx-auto max-w-md text-sm leading-relaxed ${showLabel ? "mt-3" : ""} ${muted}`}>
        {MUSIC_CLOSED_BLURB}
      </p>
      <Link
        href={MUSIC_CLOSED_CTA.href}
        className="btn-flame mt-5 inline-flex rounded-full px-6 py-3 text-sm font-semibold"
      >
        {MUSIC_CLOSED_CTA.label}
      </Link>
    </div>
  );
}
