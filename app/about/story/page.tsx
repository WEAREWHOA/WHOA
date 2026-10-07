import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  // Self-canonical, so the ?cfa=gpl / ?si=true tracking variants
  // Square Online sprayed around consolidate here instead of
  // competing as separate pages.
  alternates: { canonical: "/about/story" },
  title: "The History of WHOA",
  description:
    "WHOA began in 2015 with a song and one hand-dyed t-shirt. Now a collector's brand of 1-of-1 hand-painted apparel, a shop in Ocean Beach, and pop-ups across San Diego.",
};

export default function AboutPage() {
  return (
    <section className="relative flex flex-1 flex-col items-center px-6 py-20">
      <div className="relative z-10 max-w-2xl text-center">
        <span className="text-xs font-semibold tracking-[0.3em] text-white/70 uppercase">
          Since 2015
        </span>
        <h1 className="text-psychedelic font-display mt-3 text-4xl tracking-wide uppercase sm:text-5xl lg:text-6xl">
          {/* Two blocks rather than one wrapping line, so the break lands
              after "Extraordinary" at every width instead of wherever the
              container happens to run out. */}
          <span className="block">The Extraordinary</span>
          <span className="block">History of WHOA</span>
        </h1>

        <div className="card-surface mt-10 rounded-2xl p-6 text-left sm:p-8">
          <p className="text-lg leading-relaxed text-foreground/90">
            WHOA started with a rhythm and a thread, under the Southern California sun. In 2015,
            WASANI and Reece dropped the official WHOA song and pressed their very first t-shirt.
            What began as a handful of hand-dyed tees has since rippled through the entire world.
            Today, that spark has evolved into a canvas for one-of-a-kind, hand-painted apparel,
            legendary pop-ups, and collaborative art. From our flagship shop in Ocean Beach to
            massive festival activations, WHOA isn&apos;t just a brand anymore, it&apos;s a
            movement born from expression.
          </p>
        </div>

        <div className="card-surface mt-6 rounded-2xl p-6 text-left sm:p-8">
          <h2 className="font-display text-2xl tracking-wide">What WHOA means</h2>
          <p className="mt-3 leading-relaxed text-foreground/90">
            Impressed? Excited? Confused? Surprised? &ldquo;WHOA&rdquo; is the word we use when
            we&apos;re so enamored we can&apos;t even formulate words, and that&apos;s how people
            feel when they look at you, and all the unique traits that set you apart from
            everybody else.
          </p>
          <p className="mt-5 text-sm leading-relaxed text-muted">
            Just like you, WHOA designs are one-of-a-kind. No two pieces are ever the same. Every
            piece has its own unique energy: different patterns, different dyes, different
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
            come, we donate to{" "}
            <a
              href="https://www.surfrider.org/"
              target="_blank"
              rel="noreferrer"
              className="text-flame font-medium hover:underline"
            >
              The Surfrider Foundation USA
            </a>{" "}
            and{" "}
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
