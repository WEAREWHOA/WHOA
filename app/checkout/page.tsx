import { cookies } from "next/headers";
import { getByCode } from "@/lib/store";
import { REF_COOKIE } from "@/lib/attribution";
import CheckoutForm from "@/components/checkout/CheckoutForm";

export default async function CheckoutPage() {
  const store = await cookies();
  const refCode = store.get(REF_COOKIE)?.value;
  const ambassador = refCode ? await getByCode(refCode) : undefined;

  return (
    <section className="mx-auto w-full max-w-2xl px-6 py-16">
      <span className="text-xs font-semibold tracking-[0.2em] text-muted uppercase">Checkout</span>
      <h1 className="font-display mt-2 text-4xl tracking-wide sm:text-5xl">
        Almost <span className="text-flame">there</span>
      </h1>

      <CheckoutForm ambassadorCode={ambassador?.code ?? null} />
    </section>
  );
}
