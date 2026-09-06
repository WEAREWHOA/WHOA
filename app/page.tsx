import type { Metadata } from "next";
import PsychedelicBackground from "@/components/home/PsychedelicBackground";
import SolarSystem from "@/components/home/SolarSystem";

export const metadata: Metadata = {
  title: "WHOA",
  description:
    "The WHOA universe — shop the WHOADEGA, catch an event, join the crew, and meet the artists and musicians behind it all.",
};

export default function Home() {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-16 text-center">
      <PsychedelicBackground />
      <SolarSystem />
    </section>
  );
}
