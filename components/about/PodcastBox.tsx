import { PODCAST_INTRO, playableEpisodes, youTubeEmbedUrl } from "@/lib/podcast";

/**
 * The podcast, back from the old site's /podcast page: the conversations,
 * embedded, with a line about what they are.
 *
 * Lives on About rather than a page of its own — a handful of episodes
 * doesn't carry a whole route, and putting them next to the story and the
 * partnerships is where someone reading about WHOA would look for them.
 *
 * Full width because a 16:9 video in half a column on a laptop is a
 * postage stamp.
 */
export default function PodcastBox() {
  const episodes = playableEpisodes();

  return (
    <div className="card-surface rounded-2xl border border-border p-6 sm:col-span-2">
      <h2 className="font-display text-2xl">The WHOA Podcast</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted">{PODCAST_INTRO}</p>

      {episodes.length === 0 ? (
        <p className="mt-4 rounded-xl border border-border px-4 py-3 text-sm text-muted">
          Episodes are on their way back — check here soon.
        </p>
      ) : (
        <div className="mt-5 grid gap-6 md:grid-cols-2">
          {episodes.map((episode, index) => (
            <div key={episode.videoId}>
              {/* aspect-video rather than a fixed height, so the frame keeps
                  16:9 from a phone to a desktop instead of letterboxing.
                  Lazy — several embeds on one page is a lot of player to
                  load for someone who came here to read the story. */}
              <div className="aspect-video overflow-hidden rounded-xl border border-border-strong bg-black">
                <iframe
                  src={youTubeEmbedUrl(episode.videoId)}
                  // A real title when there is one; otherwise something
                  // that still tells a screen reader what this frame is.
                  title={episode.title ?? `WHOA Podcast episode ${index + 1}`}
                  loading="lazy"
                  allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                  className="h-full w-full"
                />
              </div>
              {episode.title && <h3 className="font-display mt-3 text-lg">{episode.title}</h3>}
              {episode.blurb && <p className="mt-1 text-sm text-muted">{episode.blurb}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
