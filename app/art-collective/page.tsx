import PsychedelicBackground from "@/components/home/PsychedelicBackground";
import ArtistCard from "@/components/artcollective/ArtistCard";
import { ARTISTS } from "@/lib/artists";

export default function ArtCollectivePage() {
  return (
    <section className="relative flex flex-1 flex-col items-center overflow-hidden px-6 py-20">
      <PsychedelicBackground />

      <div className="relative z-10 text-center">
        <span className="text-xs font-semibold tracking-[0.3em] text-white/70 uppercase">
          The WHOA collective
        </span>
        <h1 className="text-psychedelic font-display mt-3 text-5xl tracking-wide sm:text-6xl">
          Art Collective
        </h1>
        <p className="mt-3 max-w-md text-sm text-white/60">
          Click an artist to step into their shop.
        </p>
      </div>

      <div className="relative z-10 mt-14 flex w-full max-w-6xl flex-wrap items-start justify-center gap-x-8 gap-y-14">
        {ARTISTS.map((artist, i) => (
          <ArtistCard key={artist.slug} artist={artist} delay={i * 0.45} />
        ))}
      </div>
    </section>
  );
}
