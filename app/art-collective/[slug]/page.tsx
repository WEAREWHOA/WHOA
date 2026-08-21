import Link from "next/link";
import { notFound } from "next/navigation";
import { ARTISTS, getArtist } from "@/lib/artists";

export function generateStaticParams() {
  return ARTISTS.map((artist) => ({ slug: artist.slug }));
}

export default async function ArtistPage(props: PageProps<"/art-collective/[slug]">) {
  const { slug } = await props.params;
  const artist = getArtist(slug);
  if (!artist) notFound();

  const [c1, c2, c3] = artist.gradient;

  return (
    <section className="flex-1">
      <div
        className="relative flex h-64 w-full items-end overflow-hidden sm:h-72"
        style={{ background: `linear-gradient(160deg, ${c1}, ${c2} 55%, ${c3})` }}
      >
        <div className="event-card-noise absolute inset-0" aria-hidden />
        <div className="relative z-10 mx-auto w-full max-w-4xl px-6 pb-8">
          <Link
            href="/art-collective"
            className="text-xs font-semibold tracking-wide text-white/80 uppercase hover:text-white"
          >
            ← Art Collective
          </Link>
          <span className="mt-3 block text-xs font-semibold tracking-[0.25em] text-white/80 uppercase">
            {artist.medium}
          </span>
          <h1 className="font-display mt-1 text-4xl text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)] sm:text-6xl">
            {artist.name}
          </h1>
        </div>
      </div>

      <div className="mx-auto w-full max-w-4xl px-6 py-12">
        <p className="max-w-2xl text-lg text-foreground/90">{artist.tagline}</p>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">{artist.bio}</p>

        {artist.instagram && (
          <a
            href={artist.instagram}
            target="_blank"
            rel="noreferrer"
            style={{ borderColor: artist.accent, "--accent": artist.accent } as React.CSSProperties}
            className="mt-6 inline-flex items-center gap-2 rounded-full border-2 px-5 py-2.5 text-sm font-semibold tracking-wide uppercase transition-shadow hover:shadow-[0_0_30px_-8px_var(--accent)]"
          >
            Follow on Instagram
          </a>
        )}

        <h2 className="font-display mt-14 text-3xl tracking-wide">Shop {artist.name}</h2>

        {artist.pieces.length === 0 ? (
          <p className="mt-1 text-sm text-muted">
            Products from this vendor are being synced from our shop — check back soon, or{" "}
            <Link href="/shop" className="text-flame font-medium">
              browse everything in the meantime
            </Link>
            .
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted">
            Every piece is one-of-one. DM the artist on Instagram to inquire or arrange pickup at the WHOADEGA.
          </p>
        )}

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          {artist.pieces.map((piece) => (
            <div key={piece.id} className="card-surface overflow-hidden rounded-2xl border border-border">
              <div
                className="relative h-40 w-full"
                style={{ background: `linear-gradient(135deg, ${c2}, ${c3})` }}
                aria-hidden
              >
                <div className="event-card-noise absolute inset-0" />
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-display text-xl">{piece.title}</h3>
                  <span className="text-flame-2 shrink-0 font-display text-lg">{piece.price}</span>
                </div>
                <p className="mt-1 text-xs text-muted">{piece.medium}</p>
                <p className="mt-2 text-sm text-foreground/85">{piece.blurb}</p>
                <a
                  href={artist.instagram}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-flame mt-4 inline-block rounded-full px-5 py-2.5 text-xs font-semibold tracking-wide uppercase"
                >
                  Inquire about this piece
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
