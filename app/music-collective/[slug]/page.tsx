import Image from "next/image";
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

        {/* Every block below renders only when the artist has that kind of
            material, so a roster entry with nothing but a bio reads
            exactly as it did before any of this existed. */}
        {musician.story?.map((paragraph, i) => (
          <p key={i} className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
            {paragraph}
          </p>
        ))}

        {musician.photos && musician.photos.length > 0 && (
          // next/image rather than a plain <img>: these are 2400px
          // originals straight off a camera, and seven of them unresized
          // is several megabytes for a page someone opened to read a bio.
          // Local files need no remotePatterns config to be optimised.
          //
          // One aspect ratio for the whole grid, with object-cover, so a
          // square press shot and a 2:3 live photo still line up in rows.
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {musician.photos.map((src) => (
              <div
                key={src}
                className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-border"
              >
                <Image
                  src={src}
                  alt={`${musician.name}`}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        )}

        {musician.funFacts && musician.funFacts.length > 0 && (
          <>
            <h2 className="font-display mt-14 text-3xl tracking-wide">Fun facts</h2>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {musician.funFacts.map((fact) => (
                <li
                  key={fact}
                  className="card-surface rounded-2xl border border-border p-5 text-sm leading-relaxed text-muted"
                >
                  {fact}
                </li>
              ))}
            </ul>
          </>
        )}

        {musician.pastShows && musician.pastShows.length > 0 && (
          <>
            <h2 className="font-display mt-14 text-3xl tracking-wide">Past shows</h2>
            <ul className="mt-6 flex flex-col gap-2">
              {musician.pastShows.map((show) => (
                <li
                  key={`${show.name}${show.location ?? ""}`}
                  className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border pb-2 text-sm"
                >
                  <span className="font-medium">{show.name}</span>
                  <span className="text-muted">{show.location ?? show.years ?? ""}</span>
                </li>
              ))}
            </ul>
          </>
        )}

        {musician.bookingEmail && (
          <>
            <h2 className="font-display mt-14 text-3xl tracking-wide">Booking</h2>
            <a
              href={`mailto:${musician.bookingEmail}`}
              style={{ borderColor: musician.accent, "--accent": musician.accent } as React.CSSProperties}
              className="mt-6 inline-flex items-center gap-2 rounded-full border-2 px-5 py-2.5 text-sm font-semibold tracking-wide uppercase transition-shadow hover:shadow-[0_0_30px_-8px_var(--accent)]"
            >
              {musician.bookingEmail}
            </a>
          </>
        )}

        <h2 className="font-display mt-14 text-3xl tracking-wide">Listen & Follow</h2>
        <div className="mt-6 flex flex-wrap gap-3">
          {musician.links.map((link) => (
            <a
              key={link.label}
              href={link.url}
              // "Shop WHOA" is on this site; only off-site links open a new tab.
              target={link.url.startsWith("/") ? undefined : "_blank"}
              rel={link.url.startsWith("/") ? undefined : "noreferrer"}
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
