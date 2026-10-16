import type { Metadata } from "next";
import PsychedelicBackground from "@/components/home/PsychedelicBackground";
import SpinWheel from "@/components/spin/SpinWheel";
import { getSessionAmbassadorCode } from "@/lib/auth";
import { getSpin } from "@/lib/spinWheel";

/**
 * One spin, one account, one prize.
 *
 * Out of the index like /go: it is a thing you do, not a page anybody
 * should arrive at from a search, and letting it rank would put a prize
 * draw in front of people who have not been handed the link.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: true },
  title: "Spin the wheel",
  description: "One spin per account. Win a sticker pack, a keychain or lighter, or a $50 gift card.",
};

// The result is per-account, so nothing here can be shared between
// visitors.
export const dynamic = "force-dynamic";

export default async function SpinPage() {
  const code = await getSessionAmbassadorCode();

  // Fails soft to "not spun yet" rather than erroring the page: the
  // wheel itself re-reads on spin, and the unique constraint means a
  // second attempt by somebody who had in fact already spun hands back
  // their original prize instead of a new one.
  const existing = code ? await getSpin(code).catch(() => null) : null;

  return (
    <section className="relative flex flex-1 flex-col items-center overflow-hidden px-6 py-16 sm:py-20">
      <PsychedelicBackground />

      <div className="relative z-10 max-w-xl text-center">
        <span className="text-xs font-semibold tracking-[0.3em] text-white/70 uppercase">
          One spin, one time
        </span>
        <h1 className="text-psychedelic font-display mt-3 text-5xl tracking-wide sm:text-6xl">
          Spin the wheel
        </h1>
        <p className="mt-4 text-sm leading-relaxed tracking-wide text-white/70 uppercase">
          Claim it in person with a WHOA team member present. Everybody wins something.
        </p>
      </div>

      <div className="relative z-10 mt-12 w-full max-w-md">
        <SpinWheel signedIn={Boolean(code)} initial={existing} />
      </div>
    </section>
  );
}
