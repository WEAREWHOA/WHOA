import type { Metadata } from "next";
import Link from "next/link";
import { PODCAST_INTRO, playableEpisodes, youTubeEmbedUrl } from "@/lib/podcast";

export const metadata: Metadata = {
  title: "Podcast",
  description: PODCAST_INTRO,
};

/**
 * Every episode, embedded. The old site's /podcast lived at this same path
 * and is still linked from the outside, so the URL is the one it always was.
 */
export default function PodcastPage() {
  const episodes = playableEpisodes();

  return (
    <section className="mx-auto w-full max-w-4xl flex-1 px-6 py-16">
      <span className="text-xs font-semibold tracking-[0.2em] text-muted uppercase">
        Conversations
      </span>
      <h1 className="font-display mt-2 text-4xl tracking-wide sm:text-5xl">
        The WHOA <span className="text-flame">Podcast</span>
      </h1>
      <p className="mt-4 max-w-2xl text-sm text-muted">{PODCAST_INTRO}</p>

      {episodes.length === 0 ? (
        <p className="mt-10 rounded-xl border border-border px-4 py-3 text-sm text-muted">
          Episodes are on their way back — check here soon.
        </p>
      ) : (
        <div className="mt-10 grid gap-8 md:grid-cols-2">
          {episodes.map((episode, index) => (
            <div key={episode.videoId}>
              {/* aspect-video rather than a fixed height, so the frame keeps
                  16:9 from a phone to a desktop instead of letterboxing.
                  Lazy — no reason to load six players for someone who will
                  watch one. */}
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
              {episode.title && <h2 className="font-display mt-3 text-lg">{episode.title}</h2>}
              {episode.blurb && <p className="mt-1 text-sm text-muted">{episode.blurb}</p>}
            </div>
          ))}
        </div>
      )}

      <div className="mt-14">
        <Link
          href="/about"
          className="rounded-full border border-border-strong px-5 py-2.5 text-xs font-semibold tracking-wide uppercase hover:border-flame-2/50"
        >
          ← Back to About
        </Link>
      </div>
    </section>
  );
}
