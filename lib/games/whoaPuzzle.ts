export const PUZZLE_SIZE = 3;

// Solved board: position i (0-based, row-major) holds tile value i + 1,
// except the last cell, which holds 0 — the blank.
export function createSolvedBoard(size: number = PUZZLE_SIZE): number[] {
  const board = Array.from({ length: size * size }, (_, i) => i + 1);
  board[board.length - 1] = 0;
  return board;
}

export function isSolved(board: number[], size: number = PUZZLE_SIZE): boolean {
  const solved = createSolvedBoard(size);
  return board.every((value, i) => value === solved[i]);
}

function rowColOf(index: number, size: number): [number, number] {
  return [Math.floor(index / size), index % size];
}

function adjacentIndices(index: number, size: number): number[] {
  const [row, col] = rowColOf(index, size);
  const neighbors: number[] = [];
  if (row > 0) neighbors.push(index - size);
  if (row < size - 1) neighbors.push(index + size);
  if (col > 0) neighbors.push(index - 1);
  if (col < size - 1) neighbors.push(index + 1);
  return neighbors;
}

// Shuffles by making random legal moves from the solved state, which
// guarantees the result is always solvable — a random permutation of
// tile values is only solvable half the time. Takes an injectable RNG
// so the component's first-paint board can be deterministic (see
// `initialBoard`) while a user-triggered reshuffle stays truly random.
export function shuffleBoard(
  size: number = PUZZLE_SIZE,
  steps = 120,
  random: () => number = Math.random,
): number[] {
  const board = createSolvedBoard(size);
  let blankIndex = board.indexOf(0);
  let lastIndex = -1;

  for (let i = 0; i < steps; i++) {
    const options = adjacentIndices(blankIndex, size).filter((n) => n !== lastIndex);
    const next = options[Math.floor(random() * options.length)];
    [board[blankIndex], board[next]] = [board[next], board[blankIndex]];
    lastIndex = blankIndex;
    blankIndex = next;
  }

  return board;
}

// A tiny seeded PRNG (mulberry32) — deterministic across server and
// client renders, unlike `Math.random`.
function seededRandom(seed: number): () => number {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// The board's first-paint state. `useState(() => shuffleBoard())` would
// call `Math.random()` during SSR too, producing a different board than
// the client's hydration pass and tripping a hydration-mismatch error —
// this stays identical on server and client so the initial render can
// safely already be shuffled, with no need for a client-only effect to
// re-shuffle after mount.
export function initialBoard(size: number = PUZZLE_SIZE): number[] {
  return shuffleBoard(size, 60, seededRandom(42));
}

// Swaps `tileIndex` with the blank if they're adjacent; returns the new
// board, or null if the move isn't legal.
export function moveTile(board: number[], tileIndex: number, size: number = PUZZLE_SIZE): number[] | null {
  const blankIndex = board.indexOf(0);
  if (!adjacentIndices(blankIndex, size).includes(tileIndex)) return null;
  const next = [...board];
  [next[blankIndex], next[tileIndex]] = [next[tileIndex], next[blankIndex]];
  return next;
}

// A tile's home position in the solved board — used to work out which
// slice of the source image it should show, regardless of where it
// currently sits in the shuffled board.
export function homePosition(value: number, size: number = PUZZLE_SIZE): [number, number] {
  const homeIndex = value === 0 ? size * size - 1 : value - 1;
  return rowColOf(homeIndex, size);
}

const ACCENT_DOTS: Array<{ x: number; y: number; r: number; color: string }> = [
  { x: 0.12, y: 0.18, r: 46, color: "#ff2fb0" },
  { x: 0.85, y: 0.12, r: 34, color: "#29e6ff" },
  { x: 0.08, y: 0.82, r: 38, color: "#baff29" },
  { x: 0.88, y: 0.85, r: 50, color: "#7b2ff7" },
  { x: 0.5, y: 0.9, r: 30, color: "#fff229" },
  { x: 0.5, y: 0.08, r: 26, color: "#ff3b3b" },
];

// Draws the puzzle's source art: a flame-gradient board with the WHOA
// wordmark and a few scattered accent marks, so every tile has some
// unique visual signal to solve by — a flat gradient alone would make
// most of the nine tiles look identical.
export function drawPuzzleArt(ctx: CanvasRenderingContext2D, dimension: number) {
  const gradient = ctx.createLinearGradient(0, 0, dimension, dimension);
  gradient.addColorStop(0, "#ff2f1a");
  gradient.addColorStop(0.5, "#ff7a00");
  gradient.addColorStop(1, "#ffb800");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, dimension, dimension);

  ctx.globalAlpha = 0.35;
  for (const dot of ACCENT_DOTS) {
    ctx.beginPath();
    ctx.arc(dot.x * dimension, dot.y * dimension, dot.r, 0, Math.PI * 2);
    ctx.fillStyle = dot.color;
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `900 ${dimension * 0.26}px system-ui, sans-serif`;
  ctx.lineWidth = dimension * 0.014;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
  ctx.strokeText("WHOA", dimension / 2, dimension / 2);
  ctx.fillStyle = "#150900";
  ctx.fillText("WHOA", dimension / 2, dimension / 2);
}
