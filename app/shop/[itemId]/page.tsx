import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProduct } from "@/lib/catalog";
import AddToCart from "@/components/shop/AddToCart";
import ProductGallery from "@/components/shop/ProductGallery";
import { formatCents } from "@/lib/money";

export const revalidate = 60;

export async function generateMetadata(props: PageProps<"/shop/[itemId]">): Promise<Metadata> {
  const { itemId } = await props.params;
  const product = await getProduct(itemId).catch(() => undefined);
  if (!product) return {};

  return {
    title: product.name,
    description: product.description || `Shop ${product.name} on WHOA.`,
    openGraph: product.imageUrl ? { images: [product.imageUrl] } : undefined,
  };
}

export default async function ProductPage(props: PageProps<"/shop/[itemId]">) {
  const { itemId } = await props.params;

  let product: Awaited<ReturnType<typeof getProduct>>;
  try {
    product = await getProduct(itemId);
  } catch (err) {
    console.error(`Failed to load product ${itemId} for /shop/[itemId]:`, err);
    return (
      <section className="mx-auto w-full max-w-2xl px-6 py-16">
        <p className="rounded-lg border border-flame-1/40 bg-flame-1/10 px-4 py-3 text-sm text-flame-3">
          The shop is temporarily unavailable. Check back soon.
        </p>
      </section>
    );
  }

  if (!product) notFound();

  const prices = product.variations.map((v) => v.priceCents);
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;

  return (
    <section className="mx-auto grid w-full max-w-5xl gap-10 px-6 py-16 lg:grid-cols-2">
      <ProductGallery name={product.name} imageUrls={product.imageUrls} />

      <div>
        {product.categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {product.categories.map((category) => (
              <Link
                key={category.id}
                href={`/shop?category=${encodeURIComponent(category.id)}`}
                className="rounded-full border border-border-strong px-3 py-1 text-xs font-semibold tracking-wide text-muted uppercase transition-colors hover:border-flame-2/50 hover:text-foreground"
              >
                {category.name}
              </Link>
            ))}
          </div>
        )}
        <h1 className="font-display mt-3 text-4xl tracking-wide sm:text-5xl">{product.name}</h1>
        <p className="text-flame mt-3 text-lg">{formatCents(minPrice)}</p>
        {product.description && (
          <p className="mt-6 whitespace-pre-line text-sm leading-relaxed text-muted">
            {product.description}
          </p>
        )}
        <div className="mt-8">
          <AddToCart product={product} />
        </div>
      </div>
    </section>
  );
}
