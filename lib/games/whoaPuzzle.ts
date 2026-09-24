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
  { x: 0.16, y: 0.16, r: 30, color: "#ffffff" },
  { x: 0.84, y: 0.16, r: 22, color: "#150900" },
  { x: 0.16, y: 0.84, r: 26, color: "#150900" },
  { x: 0.84, y: 0.84, r: 34, color: "#ffffff" },
  { x: 0.5, y: 0.88, r: 20, color: "#ffffff" },
  { x: 0.5, y: 0.12, r: 18, color: "#150900" },
];

// How finely the spectrum field is sampled. Small enough that the bands
// read as a smooth gradient, large enough that the whole thing is a few
// thousand fills drawn once into an off-screen canvas.
const FIELD_STEP = 6;

/**
 * Hue at a point on the board, as a fraction across (fx) and down (fy).
 *
 * The board is a 3×3, and the sliding puzzle is only fun if a tile can be
 * told apart from its neighbours at a glance. So the hue is chosen to put
 * each of the nine home positions a clean 40° apart: substituting a tile
 * centre — fx = (col + 0.5) / 3, fy = (row + 0.5) / 3 — gives exactly
 * (col + 3·row) × 40°, which walks the whole colour wheel once across the
 * nine squares. A single diagonal gradient can't do that: it hands the
 * top-right and bottom-left tiles the same colour.
 */
function hueAt(fx: number, fy: number): number {
  return (((3 * fx + 9 * fy - 2) / 9) * 360 + 360) % 360;
}

// Draws the puzzle's source art: a full-spectrum field with the WHOA
// wordmark and a few scattered accent marks, so every tile carries both
// its own colour and some unique detail to solve by. It used to be a
// flame gradient, which left most of the nine tiles a near-identical
// orange and the puzzle much harder to read than it was to solve.
export function drawPuzzleArt(ctx: CanvasRenderingContext2D, dimension: number) {
  for (let y = 0; y < dimension; y += FIELD_STEP) {
    for (let x = 0; x < dimension; x += FIELD_STEP) {
      const fx = (x + FIELD_STEP / 2) / dimension;
      const fy = (y + FIELD_STEP / 2) / dimension;
      // Lightness lifts towards the middle of the board so the wordmark
      // has something to sit on and the field doesn't read as flat.
      const lift = 1 - Math.abs(fy - 0.5) * 0.6;
      ctx.fillStyle = `hsl(${hueAt(fx, fy)}, 82%, ${Math.round(46 + lift * 12)}%)`;
      ctx.fillRect(x, y, FIELD_STEP + 1, FIELD_STEP + 1);
    }
  }

  ctx.globalAlpha = 0.28;
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
  ctx.strokeStyle = "rgba(255, 255, 255, 0.72)";
  ctx.strokeText("WHOA", dimension / 2, dimension / 2);
  ctx.fillStyle = "#150900";
  ctx.fillText("WHOA", dimension / 2, dimension / 2);
}
