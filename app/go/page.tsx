import type { Metadata } from "next";
import GoGate from "@/components/go/GoGate";
import SsbdExperience from "@/components/go/SsbdExperience";
import { getSessionAmbassadorCode } from "@/lib/auth";
import { getCardState } from "@/lib/scavenger";

/**
 * /go — the SSBD EXPERIENCE, and the URL printed on every scavenger
 * sticker in Creation Station.
 *
 * An account is the key: anyone without a session gets the door, and the
 * four elements are only on the other side of it. The check is here on
 * the server rather than in the browser, so the experience can't be
 * reached by flipping a flag in devtools.
 *
 * Because every flyer points here, a scan and a plain visit are the same
 * request. So nothing is stamped on arrival — the four doors come up,
 * with a stamp offered above them while a card is still unfilled.
 */
export const metadata: Metadata = {
  // Not indexed: behind a sign-up gate, so a crawler only ever sees the door.
  // follow stays true — it shouldn't rank, but the links off it still
  // pass signal to pages that should.
  robots: { index: false, follow: true },
  title: "The SSBD Experience",
  description: "Step through the portal and pick your element — fire, air, earth or water.",
};

export default async function GoPage() {
  const code = await getSessionAmbassadorCode().catch(() => null);
  if (!code) return <GoGate />;

  const card = await getCardState(code);

  return <SsbdExperience card={card} />;
}
