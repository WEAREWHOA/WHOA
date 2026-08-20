import Link from "next/link";

export default function ApplyCta() {
  return (
    <section className="border-t border-border py-24">
      <div className="bg-flame-radial mx-auto flex w-full max-w-6xl flex-col items-start rounded-3xl border border-border-strong px-8 py-16 sm:px-16">
        <h2 className="font-display max-w-2xl text-4xl leading-[0.95] tracking-wide sm:text-6xl">
          Ready to <span className="text-flame">get paid</span> for what you
          already share?
        </h2>
        <p className="mt-6 max-w-lg text-muted">
          Applications are approved instantly. Your code and link are ready
          before you finish reading this sentence.
        </p>
        <Link href="/apply" className="btn-flame mt-8 rounded-full px-8 py-4 text-base">
          Apply now
        </Link>
      </div>
    </section>
  );
}
