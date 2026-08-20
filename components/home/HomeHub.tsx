import PsychedelicBackground from "@/components/home/PsychedelicBackground";
import OrbitField from "@/components/home/OrbitField";

export default function HomeHub() {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-16 text-center">
      <PsychedelicBackground />
      <OrbitField />

      <span className="relative text-xs font-semibold tracking-[0.3em] text-white/70 uppercase">
        Welcome to the WHOA universe
      </span>

      <h1 className="text-psychedelic font-display relative mt-4 text-6xl leading-[0.9] tracking-wide sm:text-8xl lg:text-9xl">
        WHOA.
      </h1>

      <p className="relative mt-4 max-w-md text-sm text-white/60">Pick your path.</p>
    </section>
  );
}
