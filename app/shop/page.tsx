import { listProducts } from "@/lib/catalog";
import ProductCard from "@/components/shop/ProductCard";

export const revalidate = 60;

export default async function ShopPage() {
  let products: Awaited<ReturnType<typeof listProducts>> = [];
  let error: string | null = null;

  try {
    products = await listProducts();
  } catch {
    error = "The shop is temporarily unavailable. Check back soon.";
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-16">
      <span className="text-xs font-semibold tracking-[0.2em] text-muted uppercase">Shop</span>
      <h1 className="font-display mt-2 text-4xl tracking-wide sm:text-5xl">
        Wear <span className="text-flame">WHOA</span>
      </h1>

      {error && (
        <p className="mt-10 rounded-lg border border-flame-1/40 bg-flame-1/10 px-4 py-3 text-sm text-flame-3">
          {error}
        </p>
      )}

      {!error && products.length === 0 && (
        <p className="mt-10 text-sm text-muted">No products are available right now.</p>
      )}

      {!error && products.length > 0 && (
        <div className="mt-10 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </section>
  );
}
