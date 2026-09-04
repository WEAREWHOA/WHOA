import Link from "next/link";

export default async function OrderConfirmedPage(props: PageProps<"/order-confirmed">) {
  const params = await props.searchParams;
  const orderId = typeof params?.order === "string" ? params.order : undefined;
  const account = typeof params?.account === "string" ? params.account : undefined;

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <span className="text-xs font-semibold tracking-[0.2em] text-muted uppercase">Order confirmed</span>
      <h1 className="font-display mt-3 text-4xl tracking-wide sm:text-5xl">
        Thanks for the <span className="text-flame">order</span>
      </h1>
      <p className="mt-4 text-sm text-muted">
        Your payment went through and your order is in. You&apos;ll get a confirmation from us
        shortly.
      </p>
      {orderId && <p className="font-mono-code mt-4 text-xs text-muted">Order {orderId}</p>}
      {account === "created" && (
        <p className="text-flame-3 mt-4 text-sm">
          We also created an account for you, and you&apos;re signed in — track this order and
          check out faster next time from your portal.
        </p>
      )}
      {account === "signedin" && (
        <p className="text-flame-3 mt-4 text-sm">You&apos;re signed in to your account.</p>
      )}
      <Link href="/shop" className="btn-flame mt-8 rounded-full px-8 py-4 text-base">
        Keep shopping
      </Link>
    </section>
  );
}
