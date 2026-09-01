import Link from "next/link";
import WhoaPuzzle from "@/components/games/whoa-puzzle/WhoaPuzzle";

export default function WhoaPuzzlePage() {
  return (
    <section className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center px-6 py-16 text-center">
      <Link href="/games" className="self-start text-sm text-muted hover:text-foreground">
        ← WHOA Games
      </Link>

      <span className="mt-6 text-xs font-semibold tracking-[0.3em] text-muted uppercase">
        WHOA Games
      </span>
      <h1 className="text-psychedelic font-display mt-2 text-4xl tracking-wide sm:text-5xl">
        WHOA Puzzle
      </h1>
      <p className="mt-3 max-w-sm text-sm text-muted">
        Slide the tiles back into place. It only says WHOA when you actually solve it.
      </p>

      <div className="mt-10 w-full">
        <WhoaPuzzle />
      </div>
    </section>
  );
}
