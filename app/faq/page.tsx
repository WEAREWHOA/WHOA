import type { Metadata } from "next";
import PsychedelicBackground from "@/components/home/PsychedelicBackground";
import FaqAccordion from "@/components/faq/FaqAccordion";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Answers to common questions about WHOA, WHOADEGA, shipping, returns, and the ambassador program.",
};

export default function FaqPage() {
  return (
    <section className="relative flex flex-1 flex-col items-center overflow-hidden px-6 py-20">
      <PsychedelicBackground />

      <div className="relative z-10 text-center">
        <span className="text-xs font-semibold tracking-[0.3em] text-white/70 uppercase">
          Good to know
        </span>
        <h1 className="text-psychedelic font-display mt-3 text-5xl tracking-wide sm:text-6xl">
          FAQ
        </h1>
        <p className="mt-3 max-w-md text-sm text-white/60">
          Common questions about WHOA, WHOADEGA, shipping, returns, and the ambassador program.
        </p>
      </div>

      <div className="relative z-10 mt-10 w-full max-w-2xl">
        <FaqAccordion />
      </div>
    </section>
  );
}
