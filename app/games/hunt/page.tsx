import Link from "next/link";
import HuntProgress from "@/components/games/hunt/HuntProgress";

export default function HuntPage() {
  return (
    <section className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center px-6 py-16 text-center">
      <Link href="/games" className="self-start text-sm text-muted hover:text-foreground">
        ← WHOA Games
      </Link>

      <span className="mt-6 text-xs font-semibold tracking-[0.3em] text-muted uppercase">
        WHOA Games
      </span>
      <h1 className="text-psychedelic font-display mt-2 text-4xl tracking-wide sm:text-5xl">
        QR Scavenger Hunt
      </h1>
      <p className="mt-3 max-w-sm text-sm text-muted">
        Six codes are hidden around the space — one for each branch of the WHOA System.
      </p>

      <div className="mt-10">
        <HuntProgress />
      </div>

      <Link href="/games/hunt/print" className="mt-10 text-xs text-muted hover:text-foreground">
        Staff: print sheet →
      </Link>
    </section>
  );
}
