import type { Metadata } from "next";
import Link from "next/link";
import PsychedelicBackground from "@/components/home/PsychedelicBackground";
import SsbdCrewForm from "@/components/ssbd/SsbdCrewForm";
import { getSessionAmbassadorCode } from "@/lib/auth";
import { EVENTS } from "@/lib/events";
import { getSignupsForAccount } from "@/lib/eventSales";
import { getByCode } from "@/lib/store";
import { SSBD_CREW_HUB, SSBD_EVENT_ID } from "@/lib/ssbdCrew";
import { ssbdCodeRequired } from "./actions";

export const metadata: Metadata = {
  title: "SSBD Crew Sign Up",
  description:
    "Join the WHOA crew working Same Same But Different, September 25–27, 2026 at Lake Perris, CA.",
  // A private-ish invite link handed to crew, not something to index.
  robots: { index: false, follow: false },
};

export default async function SsbdCrewPage(props: PageProps<"/ssbd">) {
  const params = await props.searchParams;
  const error = typeof params?.error === "string" ? params.error : undefined;
  const mode = params?.mode === "login" ? "login" : "signup";

  const event = EVENTS.find((e) => e.id === SSBD_EVENT_ID);
  const codeRequired = await ssbdCodeRequired();

  // Someone already signed in gets one button instead of a login form —
  // re-typing a password you just used is exactly the kind of step this
  // page exists to remove.
  const sessionCode = await getSessionAmbassadorCode();
  const account = sessionCode ? await getByCode(sessionCode) : undefined;
  const alreadyCrew = account
    ? (await getSignupsForAccount(account.code)).some(
        (s) => s.eventId === SSBD_EVENT_ID && s.status === "approved",
      )
    : false;

  return (
    <section className="relative flex flex-1 flex-col items-center overflow-hidden px-6 py-16">
      <PsychedelicBackground />

      <div className="relative z-10 w-full max-w-md text-center">
        <span className="text-xs font-semibold tracking-[0.3em] text-white/70 uppercase">
          Crew sign up
        </span>
        <h1 className="text-psychedelic font-display mt-3 text-4xl tracking-wide sm:text-5xl">
          {event?.title ?? "Same Same But Different"}
        </h1>
        <p className="mt-3 text-sm text-white/70">
          {event ? `${event.dateLabel} · ${event.timeLabel}` : "Sept 25 – 27, 2026 · WHOADEGA Art Gallery Experience"}
        </p>
        <p className="text-sm text-white/70">{event?.venue ?? "Lake Perris, CA"}</p>
      </div>

      <div className="relative z-10 mt-10 w-full max-w-md">
        {alreadyCrew ? (
          <div className="card-surface rounded-2xl p-8 text-center sm:p-10">
            <h2 className="font-display text-2xl tracking-wide">You&apos;re on the crew</h2>
            <p className="mt-3 text-sm text-muted">
              Your EVENT SALES tab is unlocked and you&apos;re down to work this one. Everything you
              need — schedule, training, load-in, contacts — is in the crew hub.
            </p>
            <Link href={SSBD_CREW_HUB} className="btn-flame mt-6 inline-block rounded-full px-8 py-3.5 text-sm">
              Open the crew hub
            </Link>
          </div>
        ) : (
          <SsbdCrewForm
            mode={mode}
            error={error}
            codeRequired={codeRequired}
            signedInAs={account ? { code: account.code, name: account.name } : undefined}
          />
        )}
      </div>
    </section>
  );
}
