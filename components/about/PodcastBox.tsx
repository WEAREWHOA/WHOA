import AboutCard from "@/components/about/AboutCard";
import { PODCAST_INTRO, playableEpisodes } from "@/lib/podcast";

/**
 * The podcast's entry on the About page: a summary card in the same shape as
 * the tiles next to it, opening onto /podcast where the episodes actually
 * live.
 *
 * A summary rather than the episodes themselves because six lazy-loaded
 * YouTube players is a lot of page for someone who came to read about WHOA —
 * and because the old site's /podcast URL is still linked from the outside,
 * so the episodes deserve a page that URL can point at.
 *
 * A component of its own rather than another AboutCard inline on the page,
 * only because of the count below.
 */
export default function PodcastBox() {
  const count = playableEpisodes().length;

  return (
    <AboutCard
      href="/podcast"
      title="The WHOA Podcast"
      // The count comes from the episode list, so it can't drift out of
      // date the way a hand-written "six episodes" would. Silent when
      // there's nothing to count rather than promising "0 episodes".
      cta={count > 0 ? `Watch all ${count} episodes` : "Watch the episodes"}
    >
      {PODCAST_INTRO}
    </AboutCard>
  );
}
