import PasswordGate from "@/components/ssbd/PasswordGate";
import SsbdDashboard from "@/components/ssbd/SsbdDashboard";

export default function SsbdAdminPage() {
  return (
    <section className="mx-auto w-full max-w-5xl flex-1 px-6 py-16">
      <PasswordGate>
        <SsbdDashboard />
      </PasswordGate>
    </section>
  );
}
