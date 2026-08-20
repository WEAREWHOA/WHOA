import PsychedelicBackground from "@/components/home/PsychedelicBackground";
import OrbitField from "@/components/home/OrbitField";

export default function HomeHub() {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-16 text-center">
      <PsychedelicBackground />
      <OrbitField />
    </section>
  );
}
