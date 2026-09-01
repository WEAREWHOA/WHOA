"use client";

import { useEffect, useRef, useState } from "react";
import {
  PUZZLE_SIZE,
  drawPuzzleArt,
  homePosition,
  initialBoard,
  isSolved,
  moveTile,
  shuffleBoard,
} from "@/lib/games/whoaPuzzle";

const IMAGE_DIMENSION = 480;
const TILE_DIMENSION = IMAGE_DIMENSION / PUZZLE_SIZE;

export default function WhoaPuzzle() {
  const [board, setBoard] = useState<number[]>(() => initialBoard());
  const [moves, setMoves] = useState(0);
  const [solved, setSolved] = useState(false);

  const sourceRef = useRef<HTMLCanvasElement | null>(null);
  const tileRefs = useRef<Array<HTMLCanvasElement | null>>([]);

  // Draws the (deterministic, off-screen) source art once, then paints
  // each tile's slice of it whenever the board changes — this keeps the
  // canvas as a DOM detail the effect synchronizes, rather than piping
  // a generated image through React state.
  useEffect(() => {
    if (!sourceRef.current) {
      const source = document.createElement("canvas");
      source.width = IMAGE_DIMENSION;
      source.height = IMAGE_DIMENSION;
      const ctx = source.getContext("2d");
      if (ctx) drawPuzzleArt(ctx, IMAGE_DIMENSION);
      sourceRef.current = source;
    }
    const source = sourceRef.current;
    if (!source) return;

    board.forEach((value, index) => {
      if (value === 0) return;
      const canvas = tileRefs.current[index];
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;
      const [row, col] = homePosition(value);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(
        source,
        col * TILE_DIMENSION,
        row * TILE_DIMENSION,
        TILE_DIMENSION,
        TILE_DIMENSION,
        0,
        0,
        canvas.width,
        canvas.height,
      );
    });
  }, [board]);

  function newGame() {
    setBoard(shuffleBoard());
    setMoves(0);
    setSolved(false);
  }

  function handleTileClick(index: number) {
    if (solved) return;
    const next = moveTile(board, index);
    if (!next) return;
    setBoard(next);
    setMoves((m) => m + 1);
    if (isSolved(next)) setSolved(true);
  }

  return (
    <div className="flex flex-col items-center">
      <div
        className="relative grid aspect-square w-full max-w-md gap-1 rounded-2xl border border-border-strong bg-surface p-1"
        style={{ gridTemplateColumns: `repeat(${PUZZLE_SIZE}, 1fr)` }}
      >
        {board.map((value, index) =>
          value === 0 ? (
            <div
              key={index}
              className="rounded-lg border border-dashed border-border-strong/40"
              aria-hidden
            />
          ) : (
            <button
              key={index}
              type="button"
              onClick={() => handleTileClick(index)}
              disabled={solved}
              aria-label={`Puzzle tile ${value}`}
              className="overflow-hidden rounded-lg bg-surface-raised transition-transform hover:scale-[0.98] disabled:cursor-default disabled:hover:scale-100"
            >
              <canvas
                ref={(el) => {
                  tileRefs.current[index] = el;
                }}
                width={TILE_DIMENSION}
                height={TILE_DIMENSION}
                className="h-full w-full"
              />
            </button>
          ),
        )}

        {solved && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl bg-background/90">
            <p className="text-psychedelic font-display text-5xl tracking-wide">WHOA!</p>
            <p className="text-sm text-muted">Solved in {moves} moves.</p>
          </div>
        )}
      </div>

      <div className="mt-6 flex items-center gap-6">
        <p className="text-xs font-semibold tracking-wide text-muted uppercase">Moves: {moves}</p>
        <button type="button" onClick={newGame} className="btn-flame rounded-full px-6 py-2.5 text-sm">
          {solved ? "Play again" : "Shuffle"}
        </button>
      </div>
    </div>
  );
}
