import PsychedelicBackground from "@/components/home/PsychedelicBackground";
import HubButton from "@/components/home/HubButton";

const buttons = [
  { label: "BRAND AMBASSADORS", href: "/ambassadors", accent: "#ff2fb0", rotate: -4 },
  { label: "SAME SAME BUT WHOA", href: "/same-same-but-whoa", accent: "#7b2ff7", rotate: 3 },
  { label: "SHOP THE WHOADEGA", href: "/shop", accent: "#29e6ff", rotate: -2, big: true },
  { label: "MUSIC COLLECTIVE", href: "/music-collective", accent: "#baff29", rotate: 5 },
  { label: "ART COLLECTIVE", href: "/art-collective", accent: "#fff229", rotate: -5 },
  { label: "EVENTS", href: "/events", accent: "#ff8a29", rotate: 4 },
  { label: "WHOA", href: "/whoa", accent: "#ffffff", rotate: 0, big: true },
];

export default function HomeHub() {
  return (
    <section className="relative flex min-h-[90vh] flex-col items-center justify-center overflow-hidden px-6 py-20 text-center">
      <PsychedelicBackground />

      <span className="text-xs font-semibold tracking-[0.3em] text-white/70 uppercase">
        Welcome to the WHOA universe
      </span>

      <h1 className="text-psychedelic font-display mt-4 text-6xl leading-[0.9] tracking-wide sm:text-8xl lg:text-9xl">
        WHOA.
      </h1>

      <p className="mt-6 max-w-md text-sm text-white/60">Pick your path.</p>

      <div className="mt-14 flex max-w-4xl flex-wrap items-center justify-center gap-5 sm:gap-6">
        {buttons.map((btn, i) => (
          <HubButton key={btn.href} {...btn} delay={i * 0.35} />
        ))}
      </div>
    </section>
  );
}
