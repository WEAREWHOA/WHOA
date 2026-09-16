import Link from "next/link";
import { PODCAST_INTRO, playableEpisodes } from "@/lib/podcast";

/**
 * The podcast's entry on the About page: a summary card in the same shape as
 * the Story and Contact cards next to it, opening onto /podcast where the
 * episodes actually live.
 *
 * A summary rather than the episodes themselves because six lazy-loaded
 * YouTube players is a lot of page for someone who came to read about WHOA —
 * and because the old site's /podcast URL is still linked from the outside,
 * so the episodes deserve a page that URL can point at.
 */
export default function PodcastBox() {
  const count = playableEpisodes().length;

  return (
    <Link
      href="/podcast"
      className="card-surface group rounded-2xl border border-border p-6 transition-colors hover:border-flame-2/50"
    >
      <h2 className="font-display text-2xl">The WHOA Podcast</h2>
      <p className="mt-2 text-sm text-muted">{PODCAST_INTRO}</p>
      <span className="text-flame mt-4 inline-block text-xs font-semibold tracking-wide uppercase">
        {/* The count comes from the episode list, so it can't drift out of
            date the way a hand-written "six episodes" would. Silent when
            there's nothing to count rather than promising "0 episodes". */}
        {count > 0 ? `Watch all ${count} episodes →` : "Watch the episodes →"}
      </span>
    </Link>
  );
}
