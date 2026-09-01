export type VisualizerMode = "bars" | "radial" | "ribbon";

export interface VisualizerPalette {
  id: string;
  label: string;
  colors: [string, string, string];
}

export const PALETTES: VisualizerPalette[] = [
  { id: "flame", label: "Flame", colors: ["#ff2f1a", "#ff7a00", "#ffb800"] },
  { id: "psychedelic", label: "Psychedelic", colors: ["#ff2fb0", "#7b2ff7", "#29e6ff"] },
  { id: "acid", label: "Acid", colors: ["#baff29", "#29e6ff", "#fff229"] },
];

function paletteColor(palette: VisualizerPalette, t: number): string {
  const [c1, c2, c3] = palette.colors;
  const clamped = Math.max(0, Math.min(1, t));
  const [a, b, localT] = clamped < 0.5 ? [c1, c2, clamped * 2] : [c2, c3, (clamped - 0.5) * 2];
  return lerpColor(a, b, localT);
}

function lerpColor(hexA: string, hexB: string, t: number): string {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const r = Math.round(a[0] + (b[0] - a[0]) * t);
  const g = Math.round(a[1] + (b[1] - a[1]) * t);
  const bl = Math.round(a[2] + (b[2] - a[2]) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export interface DrawOptions {
  palette: VisualizerPalette;
  sensitivity: number;
  time: number;
}

export function drawBars(
  ctx: CanvasRenderingContext2D,
  data: Uint8Array,
  width: number,
  height: number,
  opts: DrawOptions,
) {
  ctx.fillStyle = "#0a0806";
  ctx.fillRect(0, 0, width, height);

  const barCount = 64;
  const step = Math.floor(data.length / barCount);
  const barWidth = width / barCount;

  for (let i = 0; i < barCount; i++) {
    const value = (data[i * step] / 255) * opts.sensitivity;
    const barHeight = Math.min(value * height * 0.9, height);
    const idle = 4 + Math.sin(opts.time / 400 + i * 0.3) * 3;
    const h = Math.max(barHeight, idle);

    ctx.fillStyle = paletteColor(opts.palette, i / barCount);
    ctx.fillRect(i * barWidth + 1, height - h, barWidth - 2, h);
  }
}

export function drawRadial(
  ctx: CanvasRenderingContext2D,
  data: Uint8Array,
  width: number,
  height: number,
  opts: DrawOptions,
) {
  ctx.fillStyle = "rgba(10, 8, 6, 0.35)";
  ctx.fillRect(0, 0, width, height);

  const cx = width / 2;
  const cy = height / 2;
  const baseRadius = Math.min(width, height) * 0.18;
  const pointCount = 96;
  const step = Math.floor(data.length / pointCount);
  const rotation = opts.time / 6000;

  ctx.beginPath();
  for (let i = 0; i <= pointCount; i++) {
    const value = (data[(i % pointCount) * step] / 255) * opts.sensitivity;
    const radius = baseRadius + value * Math.min(width, height) * 0.35;
    const angle = (i / pointCount) * Math.PI * 2 + rotation;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.strokeStyle = paletteColor(opts.palette, (Math.sin(opts.time / 2000) + 1) / 2);
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, baseRadius * 0.5, 0, Math.PI * 2);
  ctx.fillStyle = paletteColor(opts.palette, 0.5);
  ctx.globalAlpha = 0.5;
  ctx.fill();
  ctx.globalAlpha = 1;
}

export function drawRibbon(
  ctx: CanvasRenderingContext2D,
  data: Uint8Array,
  width: number,
  height: number,
  opts: DrawOptions,
) {
  ctx.fillStyle = "rgba(10, 8, 6, 0.15)";
  ctx.fillRect(0, 0, width, height);

  ctx.beginPath();
  const sliceWidth = width / data.length;
  let x = 0;

  for (let i = 0; i < data.length; i++) {
    const normalized = (data[i] - 128) / 128;
    const y = height / 2 + normalized * (height / 2.2) * opts.sensitivity;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
    x += sliceWidth;
  }

  ctx.strokeStyle = paletteColor(opts.palette, (opts.time / 3000) % 1);
  ctx.lineWidth = 3;
  ctx.stroke();
}
