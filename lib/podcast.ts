/**
 * The WHOA podcast, as it appeared on the old site: a few embedded YouTube
 * conversations and a line about what they are.
 *
 * Episodes are data rather than markup so adding one is pasting a link into
 * the array below — no JSX, no embed codes, no chance of a malformed
 * iframe. `youtube` accepts whatever form YouTube hands you when you hit
 * Share: a watch URL, a youtu.be short link, an /embed/ or /shorts/ URL,
 * or a bare video id.
 */
export interface PodcastEpisode {
  /** Any YouTube URL, or the bare 11-character video id. */
  youtube: string;
  /**
   * Optional. Without one the card is just the player, which already
   * shows YouTube's own title — better than a made-up one, and better
   * than a row of "Episode 1, Episode 2".
   */
  title?: string;
  /** One line on who's in it and what it's about. Optional. */
  blurb?: string;
}

export const PODCAST_INTRO =
  "Conversations with the artists, musicians and makers in the WHOA world — how they got here, what they're building, and what they're making next.";

export const PODCAST_EPISODES: PodcastEpisode[] = [
  // Titles and blurbs can be filled in any time — add `title: "..."` to a
  // line and it appears under that player. The timestamps some of these
  // links carried (&t=1007s) are dropped on purpose: an episode listing
  // should start an episode at the beginning.
  { youtube: "https://www.youtube.com/watch?v=UltX0q0yUIA" },
  { youtube: "https://www.youtube.com/watch?v=fC7DCycgkw4&t=1007s" },
  { youtube: "https://www.youtube.com/watch?v=qb3_-c1DTpc&t=1s" },
  { youtube: "https://www.youtube.com/watch?v=AFXJaH6yj1I" },
  { youtube: "https://www.youtube.com/watch?v=mAe10CCJmjs" },
  { youtube: "https://www.youtube.com/watch?v=BpcKNoaz7XE" },
];

/**
 * Pulls the video id out of any shape of YouTube link.
 *
 * Deliberately strict about the id itself (exactly 11 of YouTube's
 * alphabet) rather than "whatever followed the slash": a typo'd link should
 * come back undefined and be skipped, not rendered as an iframe pointing at
 * nothing.
 */
export function youTubeId(input: string): string | undefined {
  const text = input.trim();
  if (!text) return undefined;

  const ID = /^[A-Za-z0-9_-]{11}$/;
  if (ID.test(text)) return text;

  // ?v= on any host, then the path-style forms: youtu.be/<id>,
  // /embed/<id>, /shorts/<id>, /live/<id>, /v/<id>.
  const patterns = [
    /[?&]v=([A-Za-z0-9_-]{11})/,
    /youtu\.be\/([A-Za-z0-9_-]{11})/,
    /\/(?:embed|shorts|live|v)\/([A-Za-z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1];
  }

  return undefined;
}

/**
 * The privacy-preserving embed host. youtube-nocookie.com sets no tracking
 * cookie until someone actually presses play, which keeps a handful of
 * embeds on the About page from quietly following every visitor around.
 */
export function youTubeEmbedUrl(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0`;
}

/** The episodes that actually resolve to a video, ready to render. */
export function playableEpisodes(): (PodcastEpisode & { videoId: string })[] {
  return PODCAST_EPISODES.flatMap((episode) => {
    const videoId = youTubeId(episode.youtube);
    if (!videoId) {
      console.warn(`Skipping podcast episode with an unreadable YouTube link: ${episode.youtube}`);
      return [];
    }
    return [{ ...episode, videoId }];
  });
}
