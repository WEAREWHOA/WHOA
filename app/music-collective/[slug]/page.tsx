import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { MUSICIANS, getMusician } from "@/lib/musicians";

export function generateStaticParams() {
  return MUSICIANS.map((musician) => ({ slug: musician.slug }));
}

export async function generateMetadata(
  props: PageProps<"/music-collective/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const musician = getMusician(slug);
  if (!musician) return {};

  return {
    title: musician.name,
    description: musician.tagline || musician.bio,
  };
}

export default async function MusicianPage(props: PageProps<"/music-collective/[slug]">) {
  const { slug } = await props.params;
  const musician = getMusician(slug);
  if (!musician) notFound();

  const [c1, c2, c3] = musician.gradient;

  return (
    <section className="flex-1">
      <div
        className="relative flex h-64 w-full items-end overflow-hidden sm:h-72"
        style={{ background: `linear-gradient(160deg, ${c1}, ${c2} 55%, ${c3})` }}
      >
        <div className="event-card-noise absolute inset-0" aria-hidden />
        <div className="relative z-10 mx-auto w-full max-w-4xl px-6 pb-8">
          <Link
            href="/music-collective"
            className="text-xs font-semibold tracking-wide text-white/80 uppercase hover:text-white"
          >
            ← Music Collective
          </Link>
          <span className="mt-3 block text-xs font-semibold tracking-[0.25em] text-white/80 uppercase">
            {musician.subgenre}
          </span>
          <h1 className="font-display mt-1 text-4xl text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)] sm:text-6xl">
            {musician.name}
          </h1>
        </div>
      </div>

      <div className="mx-auto w-full max-w-4xl px-6 py-12">
        <p className="max-w-2xl text-lg text-foreground/90">{musician.tagline}</p>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">{musician.bio}</p>

        <h2 className="font-display mt-14 text-3xl tracking-wide">Listen & Follow</h2>
        <div className="mt-6 flex flex-wrap gap-3">
          {musician.links.map((link) => (
            <a
              key={link.label}
              href={link.url}
              target="_blank"
              rel="noreferrer"
              style={{ borderColor: musician.accent, "--accent": musician.accent } as React.CSSProperties}
              className="inline-flex items-center gap-2 rounded-full border-2 px-5 py-2.5 text-sm font-semibold tracking-wide uppercase transition-shadow hover:shadow-[0_0_30px_-8px_var(--accent)]"
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
