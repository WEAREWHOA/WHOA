import { redirect } from "next/navigation";
import { getSessionAmbassadorCode } from "@/lib/auth";
import { getByCode } from "@/lib/store";
import WelcomeGuide from "@/components/eventSales/WelcomeGuide";

export default async function EventSalesWelcomeGuidePage() {
  const code = await getSessionAmbassadorCode();
  if (!code) redirect("/login");

  const account = await getByCode(code);
  if (!account?.permissions.eventSales) redirect(`/portal/${code}`);

  return (
    <section className="mx-auto w-full max-w-4xl flex-1 px-6 py-16">
      <WelcomeGuide />
    </section>
  );
}
