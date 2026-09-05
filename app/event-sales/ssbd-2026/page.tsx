import { redirect } from "next/navigation";
import { getSessionAmbassadorCode } from "@/lib/auth";
import { getByCode } from "@/lib/store";
import { getSignupsForAccount } from "@/lib/eventSales";
import EventDetails from "@/components/eventSales/ssbd2026/EventDetails";

const EVENT_ID = "ssbd-2026";

export default async function Ssbd2026EventDetailsPage() {
  const code = await getSessionAmbassadorCode();
  if (!code) redirect("/login");

  const account = await getByCode(code);
  if (!account) redirect("/login");

  const signups = await getSignupsForAccount(code);
  const approvedForThisEvent = signups.some((s) => s.eventId === EVENT_ID && s.status === "approved");

  const allowed = account.isSuperAdmin || account.permissions.eventsAdmin || approvedForThisEvent;
  if (!allowed) redirect(`/portal/${code}`);

  return (
    <section className="mx-auto w-full max-w-5xl flex-1 px-6 py-16">
      <EventDetails code={code} />
    </section>
  );
}
