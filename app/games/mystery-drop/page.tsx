import Link from "next/link";
import MysteryDropSpinner from "@/components/games/mystery-drop/MysteryDropSpinner";

export default function MysteryDropPage() {
  return (
    <section className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center px-6 py-16 text-center">
      <Link href="/games" className="self-start text-sm text-muted hover:text-foreground">
        ← WHOA Games
      </Link>

      <span className="mt-6 text-xs font-semibold tracking-[0.3em] text-muted uppercase">
        WHOA Games
      </span>
      <h1 className="text-psychedelic font-display mt-2 text-4xl tracking-wide sm:text-5xl">
        Mystery Drop Spinner
      </h1>
      <p className="mt-3 max-w-sm text-sm text-muted">
        Every pull is one of five prizes — from stickers to a genuine 1-of-1.
      </p>

      <div className="mt-10">
        <MysteryDropSpinner />
      </div>
    </section>
  );
}
