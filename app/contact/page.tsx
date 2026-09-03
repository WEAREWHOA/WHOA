import type { Metadata } from "next";
import PsychedelicBackground from "@/components/home/PsychedelicBackground";
import ContactForm from "@/components/contact/ContactForm";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with WHOA — pricing, wholesale orders, custom designs, or events.",
};

export default function ContactPage() {
  return (
    <section className="relative flex flex-1 flex-col items-center overflow-hidden px-6 py-20">
      <PsychedelicBackground />

      <div className="relative z-10 text-center">
        <span className="text-xs font-semibold tracking-[0.3em] text-white/70 uppercase">
          Say hi
        </span>
        <h1 className="text-psychedelic font-display mt-3 text-5xl tracking-wide sm:text-6xl">
          Get in touch
        </h1>
        <p className="mt-3 max-w-md text-sm text-white/60">
          Pricing, wholesale orders, custom designs, or events — send us a message below, call the
          store, email, or DM on Instagram.
        </p>
      </div>

      <div className="relative z-10 mt-6 flex flex-wrap items-center justify-center gap-3">
        <a
          href="mailto:info@wearewhoa.com"
          className="rounded-full border border-white/20 px-5 py-2.5 text-xs font-semibold tracking-wide text-white/80 uppercase transition-colors hover:border-flame-2/60 hover:text-white"
        >
          info@wearewhoa.com
        </a>
        <a
          href="tel:+16196309551"
          className="rounded-full border border-white/20 px-5 py-2.5 text-xs font-semibold tracking-wide text-white/80 uppercase transition-colors hover:border-flame-2/60 hover:text-white"
        >
          (619) 630-9551
        </a>
        <a
          href="https://instagram.com/wearewhoa.art"
          target="_blank"
          rel="noreferrer"
          className="rounded-full border border-white/20 px-5 py-2.5 text-xs font-semibold tracking-wide text-white/80 uppercase transition-colors hover:border-flame-2/60 hover:text-white"
        >
          @wearewhoa.art
        </a>
      </div>

      <div className="relative z-10 mt-10 w-full max-w-2xl">
        <ContactForm />
      </div>
    </section>
  );
}
