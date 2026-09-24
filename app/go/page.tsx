import type { Metadata } from "next";
import { redirect } from "next/navigation";
import GoGate from "@/components/go/GoGate";
import SsbdExperience from "@/components/go/SsbdExperience";
import { getSessionAmbassadorCode } from "@/lib/auth";
import { recordStamp } from "@/lib/scavenger";

/**
 * /go — the SSBD EXPERIENCE, and the landing point for every scavenger
 * sticker in Creation Station.
 *
 * An account is the key: anyone without a session gets the door, and the
 * four elements are only on the other side of it. The check is here on
 * the server rather than in the browser, so the experience can't be
 * reached by flipping a flag in devtools.
 *
 * A sticker scan arrives as /go?s=<token>. If they're signed in the stamp
 * is recorded and they're sent to their card. If they're not, the token
 * is held through the door and applied the moment they're through — being
 * asked to sign up shouldn't cost someone the sticker they just walked to.
 */
export const metadata: Metadata = {
  title: "The SSBD Experience",
  description: "Step through the portal and pick your element — fire, air, earth or water.",
};

export default async function GoPage(props: PageProps<"/go">) {
  const params = await props.searchParams;
  const scanned = typeof params.s === "string" ? params.s : undefined;

  const code = await getSessionAmbassadorCode().catch(() => null);
  if (!code) return <GoGate scanned={scanned} />;

  // A scan: stamp it, then hand them their card rather than the doors.
  if (scanned) {
    const { outcome, slot } = await recordStamp(code, scanned);
    const target = slot ? `/go/scavenger?outcome=${outcome}&s=${slot.token}` : `/go/scavenger?outcome=${outcome}`;
    redirect(target);
  }

  return <SsbdExperience />;
}
