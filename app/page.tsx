import type { Metadata } from "next";
import PsychedelicBackground from "@/components/home/PsychedelicBackground";
import SolarSystem from "@/components/home/SolarSystem";
import RocketTrail from "@/components/home/RocketTrail";

export const metadata: Metadata = {
  // Self-canonical, so the ?cfa=gpl / ?si=true tracking variants
  // Square Online sprayed around consolidate here instead of
  // competing as separate pages.
  alternates: { canonical: "/" },
  title: "WHOA",
  description:
    "The WHOA universe — shop the WHOADEGA, catch an event, join the crew, and meet the artists and musicians behind it all.",
};

/**
 * Nothing on this page reads the catalogue any more, so it could be
 * static. Kept on a revalidate anyway: the rocket below links at a
 * planet that is not open yet, and when it opens this page should pick
 * that up without waiting for an unrelated deploy.
 */
export const revalidate = 300;

export default function Home() {
  return (
    <>
      {/* min-h-screen on its own put a whole screen between arriving and
          seeing anything to buy. Still full height on a desktop, where
          the solar system is the point; on a phone it gives the rail
          below it room to peek, which is what says keep scrolling. */}
      <section className="relative flex min-h-[78vh] flex-col items-center justify-center overflow-hidden px-6 py-16 text-center sm:min-h-screen">
        <PsychedelicBackground />
        <SolarSystem />
      </section>

      {/* Follow the smoke. The trail draws itself as the page moves, so
          there is always a little more of it below where you are. */}
      <RocketTrail />
    </>
  );
}
