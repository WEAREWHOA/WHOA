import { notFound } from "next/navigation";
import { getProduct } from "@/lib/catalog";
import AddToCart from "@/components/shop/AddToCart";
import { formatCents } from "@/lib/money";

export const revalidate = 60;

export default async function ProductPage(props: PageProps<"/shop/[itemId]">) {
  const { itemId } = await props.params;

  let product: Awaited<ReturnType<typeof getProduct>>;
  try {
    product = await getProduct(itemId);
  } catch {
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
      <div className="card-surface aspect-square overflow-hidden rounded-2xl">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted">
            <span className="font-display text-3xl tracking-wide">WHOA</span>
          </div>
        )}
      </div>

      <div>
        <h1 className="font-display text-4xl tracking-wide sm:text-5xl">{product.name}</h1>
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
