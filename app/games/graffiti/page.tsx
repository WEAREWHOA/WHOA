import Link from "next/link";
import GraffitiCanvas from "@/components/games/graffiti/GraffitiCanvas";
import DrawingThumbnail from "@/components/games/graffiti/DrawingThumbnail";
import { getRecentDrawings } from "@/lib/graffiti";

export const dynamic = "force-dynamic";

export default async function GraffitiWallPage() {
  const drawings = await getRecentDrawings().catch(() => []);

  return (
    <section className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center px-6 py-16 text-center">
      <Link href="/games" className="self-start text-sm text-muted hover:text-foreground">
        ← WHOA Games
      </Link>

      <span className="mt-6 text-xs font-semibold tracking-[0.3em] text-muted uppercase">
        WHOA Games
      </span>
      <h1 className="text-psychedelic font-display mt-2 text-4xl tracking-wide sm:text-5xl">
        Graffiti Wall
      </h1>
      <p className="mt-3 max-w-sm text-sm text-muted">
        Draw something. Save it. It joins the wall below for everyone to see.
      </p>

      <div className="mt-10 w-full">
        <GraffitiCanvas />
      </div>

      <div className="mt-16 w-full">
        <h2 className="font-display text-left text-2xl tracking-wide">The wall</h2>
        {drawings.length === 0 ? (
          <p className="mt-4 text-left text-sm text-muted">
            Nothing saved yet — be the first to draw something.
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {drawings.map((drawing) => (
              <DrawingThumbnail key={drawing.id} strokes={drawing.strokes} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
