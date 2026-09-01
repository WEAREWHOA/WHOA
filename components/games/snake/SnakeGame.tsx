"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const GRID = 20;
const CELL = 20;
const CANVAS_SIZE = GRID * CELL;
const START_SPEED_MS = 140;
const MIN_SPEED_MS = 80;
const SCORE_THRESHOLD = 10;
const DISCOUNT_CODE = "WHOAGAMES10";

// The "drops" the snake eats — each one a different color, standing in
// for a 1-of-1 piece rather than a plain dot.
const DROP_COLORS = ["#ff2fb0", "#29e6ff", "#baff29", "#fff229", "#ff8a29", "#7b2ff7"];

type Point = { x: number; y: number };
type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";
type Status = "idle" | "playing" | "over";

const OPPOSITE: Record<Direction, Direction> = {
  UP: "DOWN",
  DOWN: "UP",
  LEFT: "RIGHT",
  RIGHT: "LEFT",
};

function randomCell(exclude: Point[]): Point {
  let cell: Point;
  do {
    cell = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
  } while (exclude.some((p) => p.x === cell.x && p.y === cell.y));
  return cell;
}

function lerpFlame(t: number): string {
  // Simple flame-gradient interpolation for the trail body.
  const stops = [
    [255, 47, 26],
    [255, 122, 0],
    [255, 184, 0],
  ];
  const idx = Math.min(Math.floor(t * (stops.length - 1)), stops.length - 2);
  const localT = t * (stops.length - 1) - idx;
  const [r1, g1, b1] = stops[idx];
  const [r2, g2, b2] = stops[idx + 1];
  const r = Math.round(r1 + (r2 - r1) * localT);
  const g = Math.round(g1 + (g2 - g1) * localT);
  const b = Math.round(b1 + (b2 - b1) * localT);
  return `rgb(${r}, ${g}, ${b})`;
}

export default function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);

  const snakeRef = useRef<Point[]>([{ x: 10, y: 10 }]);
  const dirRef = useRef<Direction>("RIGHT");
  const nextDirRef = useRef<Direction>("RIGHT");
  const dropRef = useRef<Point>({ x: 14, y: 10 });
  const dropColorRef = useRef(DROP_COLORS[0]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    ctx.fillStyle = "#14100c";
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    const snake = snakeRef.current;
    snake.forEach((seg, i) => {
      const t = i / Math.max(snake.length - 1, 1);
      ctx.fillStyle = i === 0 ? "#fff7ea" : lerpFlame(t);
      ctx.fillRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2);
    });

    const drop = dropRef.current;
    ctx.fillStyle = dropColorRef.current;
    ctx.beginPath();
    ctx.arc(drop.x * CELL + CELL / 2, drop.y * CELL + CELL / 2, CELL / 2.4, 0, Math.PI * 2);
    ctx.fill();
  }, []);

  const tickRef = useRef<() => void>(() => {});

  useEffect(() => {
    tickRef.current = () => {
      dirRef.current = nextDirRef.current;
      const snake = snakeRef.current;
      const head = snake[0];
      const delta: Record<Direction, Point> = {
        UP: { x: 0, y: -1 },
        DOWN: { x: 0, y: 1 },
        LEFT: { x: -1, y: 0 },
        RIGHT: { x: 1, y: 0 },
      };
      const d = delta[dirRef.current];
      const newHead = { x: head.x + d.x, y: head.y + d.y };

      const hitWall = newHead.x < 0 || newHead.x >= GRID || newHead.y < 0 || newHead.y >= GRID;
      const hitSelf = snake.some((seg) => seg.x === newHead.x && seg.y === newHead.y);

      if (hitWall || hitSelf) {
        setStatus("over");
        setBest((b) => Math.max(b, snake.length - 1));
        return;
      }

      const ateDrop = newHead.x === dropRef.current.x && newHead.y === dropRef.current.y;
      const nextSnake = [newHead, ...snake];
      if (!ateDrop) nextSnake.pop();
      snakeRef.current = nextSnake;

      if (ateDrop) {
        dropRef.current = randomCell(nextSnake);
        dropColorRef.current = DROP_COLORS[Math.floor(Math.random() * DROP_COLORS.length)];
        setScore(nextSnake.length - 1);
      }

      draw();

      const speed = Math.max(MIN_SPEED_MS, START_SPEED_MS - (nextSnake.length - 1) * 4);
      timerRef.current = setTimeout(() => tickRef.current(), speed);
    };
  }, [draw]);

  function start() {
    snakeRef.current = [{ x: 10, y: 10 }];
    dirRef.current = "RIGHT";
    nextDirRef.current = "RIGHT";
    dropRef.current = randomCell(snakeRef.current);
    dropColorRef.current = DROP_COLORS[Math.floor(Math.random() * DROP_COLORS.length)];
    setScore(0);
    setStatus("playing");
    draw();
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => tickRef.current(), START_SPEED_MS);
  }

  function setDirection(next: Direction) {
    if (OPPOSITE[next] === dirRef.current) return;
    nextDirRef.current = next;
  }

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const map: Record<string, Direction> = {
        ArrowUp: "UP",
        w: "UP",
        ArrowDown: "DOWN",
        s: "DOWN",
        ArrowLeft: "LEFT",
        a: "LEFT",
        ArrowRight: "RIGHT",
        d: "RIGHT",
      };
      const dir = map[e.key];
      if (dir) {
        e.preventDefault();
        setDirection(dir);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  useEffect(() => {
    draw();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [draw]);

  const unlocked = score >= SCORE_THRESHOLD;

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-6 text-sm text-muted">
        <span>
          Score <span className="text-foreground font-semibold">{score}</span>
        </span>
        <span>
          Best <span className="text-foreground font-semibold">{best}</span>
        </span>
        <span>
          Unlock at <span className="text-flame-2 font-semibold">{SCORE_THRESHOLD}</span>
        </span>
      </div>

      <div className="relative mt-4">
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="rounded-2xl border border-border-strong"
        />

        {status !== "playing" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-2xl bg-background/85 px-6 text-center backdrop-blur-sm">
            {status === "over" && (
              <>
                <p className="font-display text-2xl">Game over</p>
                <p className="text-sm text-muted">You collected {score} drops.</p>
              </>
            )}
            <button type="button" onClick={start} className="btn-flame rounded-full px-8 py-3 text-sm">
              {status === "over" ? "Play again" : "Start game"}
            </button>
            {status === "idle" && (
              <p className="max-w-xs text-xs text-muted">
                Arrow keys or WASD to move — or use the pad below on mobile.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="mt-6 grid grid-cols-3 gap-2 sm:hidden">
        <span />
        <PadButton label="↑" onPress={() => setDirection("UP")} />
        <span />
        <PadButton label="←" onPress={() => setDirection("LEFT")} />
        <PadButton label="↓" onPress={() => setDirection("DOWN")} />
        <PadButton label="→" onPress={() => setDirection("RIGHT")} />
      </div>

      <div className="mt-8 w-full max-w-sm rounded-2xl border border-border-strong p-5 text-center">
        {unlocked ? (
          <>
            <p className="text-flame-2 text-xs font-semibold tracking-wide uppercase">Unlocked</p>
            <p className="font-mono-code font-display mt-2 text-3xl tracking-wide">{DISCOUNT_CODE}</p>
            <p className="mt-2 text-xs text-muted">
              Show this at checkout or the register — ask staff to apply it.
            </p>
          </>
        ) : (
          <p className="text-sm text-muted">
            Collect {SCORE_THRESHOLD} drops in one run to unlock a discount code.
          </p>
        )}
      </div>
    </div>
  );
}

function PadButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <button
      type="button"
      onClick={onPress}
      className="card-surface flex h-14 w-14 items-center justify-center rounded-xl border border-border-strong text-xl"
    >
      {label}
    </button>
  );
}
