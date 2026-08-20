import PsychedelicBackground from "@/components/home/PsychedelicBackground";
import AdventureGame from "@/components/adventure/AdventureGame";

export default function SameSameButWhoaPage() {
  return (
    <section className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-20">
      <PsychedelicBackground />
      <AdventureGame />
    </section>
  );
}
