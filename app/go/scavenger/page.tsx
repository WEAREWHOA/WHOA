import type { Metadata } from "next";
import { redirect } from "next/navigation";
import ScavengerCard from "@/components/go/ScavengerCard";
import { getSessionAmbassadorCode } from "@/lib/auth";
import { getStampedSlotIds, slotForToken, type StampOutcome } from "@/lib/scavenger";

export const metadata: Metadata = {
  title: "The Scavenger",
  description: "Scan six different stickers around Creation Station to fill your card.",
};

/**
 * The card. Reached from the SCAVENGER door, and from every sticker: a
 * scan lands on /go?s=<token>, which records the stamp and sends the
 * scanner straight here.
 *
 * Signed out, /go shows the sign-in door instead, so anyone arriving here
 * without a session is sent back to pick the card up afterwards — a card
 * belongs to a person, not to a browser.
 */
export default async function ScavengerPage(props: PageProps<"/go/scavenger">) {
  const code = await getSessionAmbassadorCode().catch(() => null);
  if (!code) redirect("/go");

  const params = await props.searchParams;
  const stamped = await getStampedSlotIds(code);

  const outcomeParam = typeof params.outcome === "string" ? params.outcome : undefined;
  const outcome = (
    ["stamped", "already-had-it", "unknown-code", "failed"] as const
  ).find((value) => value === outcomeParam) as StampOutcome | undefined;

  const justStamped = slotForToken(typeof params.s === "string" ? params.s : undefined)?.id;

  return (
    <ScavengerCard stamped={[...stamped]} justStamped={justStamped} outcome={outcome} />
  );
}
