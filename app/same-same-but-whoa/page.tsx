import type { Metadata } from "next";
import PsychedelicBackground from "@/components/home/PsychedelicBackground";
import AdventureGame from "@/components/adventure/AdventureGame";

export const metadata: Metadata = {
  // Self-canonical, so the ?cfa=gpl / ?si=true tracking variants
  // Square Online sprayed around consolidate here instead of
  // competing as separate pages.
  alternates: { canonical: "/same-same-but-whoa" },
  title: "Same Same But WHOA",
  description: "Play WHOA's psychedelic point-and-click adventure.",
};

export default function SameSameButWhoaPage() {
  return (
    <section className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-20">
      <PsychedelicBackground />
      <AdventureGame />
    </section>
  );
}
