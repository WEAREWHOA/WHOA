import PasswordGate from "@/components/ssbd/PasswordGate";
import WelcomeGuide from "@/components/ssbd/WelcomeGuide";

export default function WelcomeGuidePage() {
  return (
    <section className="mx-auto w-full max-w-4xl flex-1 px-6 py-16">
      <PasswordGate>
        <WelcomeGuide />
      </PasswordGate>
    </section>
  );
}
