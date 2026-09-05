import Link from "next/link";
import type { Metadata } from "next";
import PsychedelicBackground from "@/components/home/PsychedelicBackground";
import MusicianCard from "@/components/musiccollective/MusicianCard";
import { MUSICIANS } from "@/lib/musicians";

export const metadata: Metadata = {
  title: "Music Collective",
  description: "The DJs and producers behind WHOA Wednesday and the WHOADEGA speaker stack.",
};

export default function MusicCollectivePage() {
  return (
    <section className="relative flex flex-1 flex-col items-center overflow-hidden px-6 py-20">
      <PsychedelicBackground />

      <div className="relative z-10 text-center">
        <span className="text-xs font-semibold tracking-[0.3em] text-white/70 uppercase">
          The WHOA collective
        </span>
        <h1 className="text-psychedelic font-display mt-3 text-5xl tracking-wide sm:text-6xl">
          Music Collective
        </h1>
        <p className="mt-3 max-w-md text-sm text-white/60">
          Click an artist to hear their sound.
        </p>
        <Link
          href="/music-collective/apply"
          className="btn-flame mt-6 inline-flex rounded-full px-6 py-3 text-sm"
        >
          Apply to join
        </Link>
      </div>

      <div className="relative z-10 mt-14 flex w-full max-w-6xl flex-wrap items-start justify-center gap-x-8 gap-y-14">
        {MUSICIANS.map((musician, i) => (
          <MusicianCard key={musician.slug} musician={musician} delay={i * 0.45} />
        ))}
      </div>
    </section>
  );
}
