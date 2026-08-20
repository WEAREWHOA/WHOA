import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="bg-flame-radial pointer-events-none absolute inset-0" />
      <div className="relative mx-auto flex w-full max-w-6xl flex-col items-start px-6 py-24 sm:py-32">
        <span className="mb-6 rounded-full border border-border-strong px-4 py-1.5 text-xs font-semibold tracking-[0.2em] text-muted uppercase">
          WHOA Ambassador Program
        </span>
        <h1 className="font-display text-5xl leading-[0.95] tracking-wide sm:text-7xl lg:text-8xl">
          Wear it.
          <br />
          Share it.
          <br />
          <span className="text-flame animate-flicker">Get paid.</span>
        </h1>
        <p className="mt-8 max-w-xl text-lg text-muted sm:text-xl">
          Get your own code and link. Your people get{" "}
          <span className="text-foreground font-semibold">15% off</span>.
          You earn a flat{" "}
          <span className="text-foreground font-semibold">10% commission</span>{" "}
          on every sale — no caps, no tiers on the rate, just on the perks.
        </p>
        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <Link href="/apply" className="btn-flame rounded-full px-8 py-4 text-center text-base">
            Apply — instant approval
          </Link>
          <Link
            href="/login"
            className="rounded-full border border-border-strong px-8 py-4 text-center text-base font-medium transition-colors hover:bg-surface"
          >
            I already have a code
          </Link>
        </div>
      </div>
    </section>
  );
}
