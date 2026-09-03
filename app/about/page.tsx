import type { Metadata } from "next";
import Link from "next/link";
import PsychedelicBackground from "@/components/home/PsychedelicBackground";

export const metadata: Metadata = {
  title: "About",
  description:
    "Collector's fashion brand blending streetwear & art, offering rare 1-of-1 pieces, bold apparel & immersive retail experiences.",
};

export default function AboutPage() {
  return (
    <section className="relative flex flex-1 flex-col items-center overflow-hidden px-6 py-20">
      <PsychedelicBackground />

      <div className="relative z-10 max-w-2xl text-center">
        <span className="text-xs font-semibold tracking-[0.3em] text-white/70 uppercase">
          A common reaction
        </span>
        <h1 className="text-psychedelic font-display mt-3 text-5xl tracking-wide sm:text-6xl">
          About WHOA
        </h1>

        <div className="card-surface mt-10 rounded-2xl p-6 text-left sm:p-8">
          <p className="text-lg leading-relaxed text-foreground/90">
            Impressed? Excited? Confused? Surprised? &ldquo;WHOA&rdquo; is the word we use when
            we&apos;re so enamored we can&apos;t even formulate words — and that&apos;s how people
            feel when they look at you, and all the unique traits that set you apart from
            everybody else.
          </p>
          <p className="mt-5 text-sm leading-relaxed text-muted">
            Just like you, WHOA designs are one-of-a-kind. No two pieces are ever the same — every
            piece has its own unique energy. Different patterns, different dyes, different
            fabrics, different shades of color. That&apos;s what makes each one special. It&apos;s
            time to celebrate that individuality of yours.
          </p>
          <p className="text-flame mt-5 font-display text-2xl tracking-wide">
            Ready, set, WHOA with the flow.
          </p>
        </div>

        <div className="card-surface mt-6 rounded-2xl p-6 text-left sm:p-8">
          <h2 className="font-display text-2xl tracking-wide">Giving back</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            As an investment in our future, the future of our planet, and future generations to
            come, we&apos;ve donated{" "}
            <span className="font-semibold text-foreground">$888</span> to{" "}
            <a
              href="https://www.surfrider.org/"
              target="_blank"
              rel="noreferrer"
              className="text-flame font-medium hover:underline"
            >
              The Surfrider Foundation USA
            </a>{" "}
            and <span className="font-semibold text-foreground">$500</span> to{" "}
            <a
              href="https://www.children.org/"
              target="_blank"
              rel="noreferrer"
              className="text-flame font-medium hover:underline"
            >
              Children International
            </a>
            . As the world of WHOA grows with your help, it continues to make an impact around the
            world — thank you for supporting independent artists and small businesses.
          </p>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/shop"
            className="btn-flame rounded-full px-6 py-3 text-sm font-semibold tracking-wide uppercase"
          >
            Shop WHOA
          </Link>
          <Link
            href="/contact"
            className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold tracking-wide text-white/80 uppercase transition-colors hover:border-flame-2/60 hover:text-white"
          >
            Get in touch
          </Link>
        </div>
      </div>
    </section>
  );
}
