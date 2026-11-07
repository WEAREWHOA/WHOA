import { cookies } from "next/headers";
import { getByCode } from "@/lib/store";
import { PROMO_COOKIE, REF_COOKIE } from "@/lib/attribution";
import { usableStorePromo } from "@/lib/storePromos";
import CheckoutForm from "@/components/checkout/CheckoutForm";

export default async function CheckoutPage(props: PageProps<"/checkout">) {
  const searchParams = await props.searchParams;

  const store = await cookies();
  const refCode = store.get(REF_COOKIE)?.value;
  // A referral-lookup hiccup should never block checkout itself — worst
  // case, this one customer just doesn't see the ambassador discount.
  const ambassador = refCode
    ? await getByCode(refCode).catch((err) => {
        console.error("Referral lookup failed on checkout page:", err);
        return undefined;
      })
    : undefined;

  // The store sale code, if they have typed one. Passed down so the
  // form can re-price when it changes: a promo lands in a cookie, not
  // in a prop the browser can see, so without this the quote effect
  // has nothing to notice and the customer sees a stale total.
  //
  // Re-checked rather than trusted from the cookie, because the sale
  // it belongs to may have ended since they typed it.
  const promo = await usableStorePromo(store.get(PROMO_COOKIE)?.value).catch((err) => {
    console.error("Store promo lookup failed on checkout page:", err);
    return null;
  });

  return (
    <section className="mx-auto w-full max-w-2xl px-6 py-16">
      <span className="text-xs font-semibold tracking-[0.2em] text-muted uppercase">Checkout</span>
      <h1 className="font-display mt-2 text-4xl tracking-wide sm:text-5xl">
        Almost <span className="text-flame">there</span>
      </h1>

      <CheckoutForm
        ambassadorCode={ambassador?.code ?? null}
        storePromoCode={promo?.code ?? null}
        promoApplied={searchParams?.promoApplied === "1"}
        promoError={searchParams?.promoError === "1"}
      />
    </section>
  );
}
