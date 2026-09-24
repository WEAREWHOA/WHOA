import type { Metadata } from "next";
import { redirect } from "next/navigation";
import ScavengerCard from "@/components/go/ScavengerCard";
import { getSessionAmbassadorCode } from "@/lib/auth";
import { getCardState } from "@/lib/scavenger";

export const metadata: Metadata = {
  title: "The Scavenger",
  description: "Scan the flyers around Creation Station and fill your card.",
};

/**
 * The card. Reached from the SCAVENGER door and from the stamp strip on
 * /go, which is where a flyer scan lands.
 *
 * Signed out, /go shows the sign-in door instead, so anyone arriving here
 * without a session is sent back to pick the card up afterwards — a card
 * belongs to a person, not to a browser.
 */
export default async function ScavengerPage() {
  const code = await getSessionAmbassadorCode().catch(() => null);
  if (!code) redirect("/go");

  const card = await getCardState(code);

  return <ScavengerCard card={card} />;
}
