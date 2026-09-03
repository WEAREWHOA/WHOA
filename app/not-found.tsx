import Link from "next/link";

// Next.js 16 handles unmatched URLs (and thrown notFound()) at the routing
// level now — a `metadata` export here doesn't reach the response, so the
// page just inherits the root layout's title. 404 responses get an
// automatic `noindex` regardless, so this has no SEO impact.
export default function NotFound() {
  return (
    <section className="mx-auto flex min-h-[60vh] w-full max-w-2xl flex-col items-center justify-center px-6 py-24 text-center">
      <span className="text-flame font-display text-7xl tracking-wide sm:text-8xl">404</span>
      <h1 className="font-display mt-4 text-3xl tracking-wide sm:text-4xl">Page not found</h1>
      <p className="mt-3 text-sm text-muted">
        Whatever you were looking for isn&apos;t here — it may have moved, or never existed.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn-flame rounded-full px-6 py-3 text-sm font-semibold tracking-wide uppercase">
          Back home
        </Link>
        <Link
          href="/shop"
          className="rounded-full border border-border-strong px-6 py-3 text-sm font-semibold tracking-wide uppercase hover:border-flame-2/50"
        >
          Shop WHOA
        </Link>
      </div>
    </section>
  );
}
