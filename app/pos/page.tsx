import { listProducts } from "@/lib/catalog";
import PosPinGate from "@/components/pos/PosPinGate";
import PosTerminal from "@/components/pos/PosTerminal";

// Staff need accurate live stock while ringing up sales — always fetch
// fresh rather than serving a cached snapshot.
export const dynamic = "force-dynamic";

export default async function PosPage() {
  let products: Awaited<ReturnType<typeof listProducts>> = [];
  let error: string | null = null;

  try {
    products = await listProducts();
  } catch {
    error = "The register is temporarily unavailable. Check back soon.";
  }

  return (
    <section className="flex flex-1 flex-col">
      <PosPinGate>
        {error ? (
          <p className="m-6 rounded-lg border border-flame-1/40 bg-flame-1/10 px-4 py-3 text-sm text-flame-3">
            {error}
          </p>
        ) : (
          <PosTerminal products={products} />
        )}
      </PosPinGate>
    </section>
  );
}
