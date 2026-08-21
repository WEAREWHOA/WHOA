import PsychedelicBackground from "@/components/home/PsychedelicBackground";
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
    <section className="relative flex flex-1 flex-col items-center overflow-hidden px-6 py-20">
      <PsychedelicBackground />

      <div className="relative z-10 text-center">
        <span className="text-xs font-semibold tracking-[0.3em] text-white/70 uppercase">
          WHOADEGA & online store
        </span>
        <h1 className="text-psychedelic font-display mt-3 text-5xl tracking-wide sm:text-6xl">
          Shop WHOA
        </h1>
        <p className="mt-3 max-w-md text-sm text-white/60">
          Same stock, same prices, whether you&apos;re here or at the booth.
        </p>
      </div>

      {error && (
        <p className="relative z-10 mt-10 rounded-lg border border-flame-1/40 bg-flame-1/10 px-4 py-3 text-sm text-flame-3">
          {error}
        </p>
      )}

      {!error && products.length === 0 && (
        <p className="relative z-10 mt-10 text-sm text-white/60">No products are available right now.</p>
      )}

      {!error && products.length > 0 && (
        <div className="relative z-10 mt-14 flex w-full max-w-6xl flex-wrap items-start justify-center gap-x-8 gap-y-14">
          {products.map((product, i) => (
            <ProductCard key={product.id} product={product} delay={i * 0.35} />
          ))}
        </div>
      )}
    </section>
  );
}
