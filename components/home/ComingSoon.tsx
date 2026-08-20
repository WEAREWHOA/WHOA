import Link from "next/link";

export default function ComingSoon({ title, accent }: { title: string; accent: string }) {
  return (
    <section className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <span className="text-xs font-semibold tracking-[0.3em] text-muted uppercase">
        Coming soon
      </span>
      <h1 className="font-display mt-3 text-5xl tracking-wide sm:text-7xl" style={{ color: accent }}>
        {title}
      </h1>
      <p className="mt-4 max-w-md text-sm text-muted">
        This part of the WHOA universe is still being built. Check back soon.
      </p>
      <Link href="/" className="btn-flame mt-8 rounded-full px-8 py-4 text-base">
        Back to WHOA
      </Link>
    </section>
  );
}
