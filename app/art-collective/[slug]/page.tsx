import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ARTISTS, getArtist } from "@/lib/artists";
import { getVendorProducts } from "@/lib/vendor";
import { formatCents } from "@/lib/money";

export function generateStaticParams() {
  return ARTISTS.map((artist) => ({ slug: artist.slug }));
}

export async function generateMetadata(
  props: PageProps<"/art-collective/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const artist = getArtist(slug);
  if (!artist) return {};

  return {
    title: artist.name,
    description: artist.tagline || artist.bio,
  };
}

// Product data is live from Square (via the sync), not static — always
// fetch fresh rather than caching a stale price/stock snapshot at build time.
export const dynamic = "force-dynamic";

export default async function ArtistPage(props: PageProps<"/art-collective/[slug]">) {
  const { slug } = await props.params;
  const artist = getArtist(slug);
  if (!artist) notFound();

  const products = await getVendorProducts(slug).catch(() => []);
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

        {products.length === 0 ? (
          <p className="mt-1 text-sm text-muted">
            Products from this vendor are being synced from our shop — check back soon, or{" "}
            <Link href="/shop" className="text-flame font-medium">
              browse everything in the meantime
            </Link>
            .
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted">
            Live from the WHOADEGA and online store — same stock, same prices.
          </p>
        )}

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          {products.map((product) => {
            const soldOut = product.variations.length > 0 && product.totalStock <= 0;
            return (
              <Link
                key={product.id}
                href={`/shop/${product.id}`}
                className="card-surface group overflow-hidden rounded-2xl border border-border transition-colors hover:border-flame-2/50"
              >
                <div className="relative h-40 w-full overflow-hidden" aria-hidden>
                  {product.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div
                      className="flex h-full w-full items-center justify-center"
                      style={{ background: `linear-gradient(135deg, ${c2}, ${c3})` }}
                    >
                      <div className="event-card-noise absolute inset-0" />
                      <span className="text-psychedelic font-display relative text-xl">WHOA</span>
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-display text-xl">{product.name}</h3>
                    <span className="text-flame-2 shrink-0 font-display text-lg">
                      {formatCents(product.minPriceCents)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {soldOut ? "Sold out" : `${product.totalStock} in stock`}
                  </p>
                  {product.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-foreground/85">{product.description}</p>
                  )}
                  <span className="btn-flame mt-4 inline-block rounded-full px-5 py-2.5 text-xs font-semibold tracking-wide uppercase">
                    Shop this piece
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
