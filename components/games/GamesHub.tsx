import Link from "next/link";
import PsychedelicBackground from "@/components/home/PsychedelicBackground";
import { GAME_TILES } from "@/lib/games";

export default function GamesHub() {
  return (
    <section className="relative flex flex-1 flex-col items-center overflow-hidden px-6 py-20">
      <PsychedelicBackground />

      <div className="relative z-10 text-center">
        <span className="text-xs font-semibold tracking-[0.3em] text-white/70 uppercase">
          The WHOA Oasis
        </span>
        <h1 className="text-psychedelic font-display mt-3 text-5xl tracking-wide sm:text-6xl">
          WHOA Games
        </h1>
        <p className="mt-3 max-w-md text-sm text-white/60">
          Play, get weird, win something. New games drop as they&apos;re built.
        </p>
      </div>

      <div className="relative z-10 mt-14 grid w-full max-w-5xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {GAME_TILES.map((game) => {
          const card = (
            <div
              className={`card-surface flex h-full flex-col rounded-2xl border border-border p-6 text-left transition-colors ${
                game.status === "live" ? "hover:border-flame-2/50" : "opacity-60"
              }`}
              style={game.status === "live" ? { borderColor: `${game.accent}33` } : undefined}
            >
              <span
                className="h-2 w-10 rounded-full"
                style={{ backgroundColor: game.accent }}
                aria-hidden
              />
              <h3 className="font-display mt-4 text-xl tracking-wide">{game.title}</h3>
              <p className="mt-2 flex-1 text-sm text-muted">{game.tagline}</p>
              <span
                className={`mt-4 text-xs font-semibold tracking-wide uppercase ${
                  game.status === "live" ? "text-flame-2" : "text-muted"
                }`}
              >
                {game.status === "live" ? (game.ctaLabel ?? "Play now →") : "Coming soon"}
              </span>
            </div>
          );

          return game.href ? (
            <Link key={game.id} href={game.href} className="block h-full">
              {card}
            </Link>
          ) : (
            <div key={game.id}>{card}</div>
          );
        })}
      </div>
    </section>
  );
}
