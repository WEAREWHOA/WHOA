"use client";

import Link from "next/link";
import { useState } from "react";
import { chooseSpinPrizeAction, spinWheelAction } from "@/app/spin/actions";
import {
  SMALL_CHOICES,
  SPIN_SEGMENTS,
  WHEEL_SLICES,
  type SpinResult,
} from "@/lib/spinWheel";

/**
 * The wheel.
 *
 * It animates a decision the server already made: spinWheelAction
 * returns the prize, and the wheel is then told where to stop. Nothing
 * here decides anything, which is why the prize table being readable in
 * the bundle costs nothing.
 *
 * Sixteen equal slices, because that is what a prize wheel looks like.
 * The slices are NOT the odds -- those live in SPIN_SEGMENTS and are
 * applied server-side before this ever runs. When a prize comes back,
 * the pointer lands on one of the slices carrying it, picked at random
 * so the same prize does not always stop in the same place.
 */

const SIZE = 340;
const R = SIZE / 2;
/** The dark centre cap. Labels start outside it, or they get clipped. */
const HUB = 30;
const SLICES = WHEEL_SLICES.length;
const SWEEP = 360 / SLICES;

const SEGMENT_BY_ID = new Map(SPIN_SEGMENTS.map((segment) => [segment.id, segment]));

interface Slice {
  index: number;
  id: string;
  short: string;
  color: string;
  ink: string;
  /** Degrees clockwise from twelve o'clock. */
  start: number;
  mid: number;
  /** On the left half, where a radial label would read upside down. */
  flipped: boolean;
}

const WHEEL: Slice[] = WHEEL_SLICES.map((id, index) => {
  const segment = SEGMENT_BY_ID.get(id);
  // The two ordinary prizes alternate between the flame reds and
  // oranges so neighbouring slices never share a colour; the gift card
  // keeps its gold wherever it lands, because it is the one people are
  // looking for.
  const alternating = index % 2 === 0 ? "#ff2f1a" : "#ff7a00";
  const isTop = id === "gift-card";
  return {
    index,
    id,
    short: segment?.short ?? "",
    color: isTop ? "#ffd12f" : alternating,
    ink: isTop || index % 2 === 1 ? "#0a0806" : "#f7f0e6",
    start: index * SWEEP,
    mid: index * SWEEP + SWEEP / 2,
    flipped: index * SWEEP + SWEEP / 2 > 180,
  };
});

/**
 * Where the wheel has to stop for the pointer to sit on this prize.
 *
 * Picks among the slices carrying it, then a point inside that slice,
 * inset from both edges so a rounding error can't land on the line.
 * Random every time, so the same prize never stops in the same place
 * twice.
 */
function restingAngle(prizeId: string): number {
  const candidates = WHEEL.filter((slice) => slice.id === prizeId);
  const slice = candidates[Math.floor(Math.random() * candidates.length)] ?? WHEEL[WHEEL.length - 1];
  const inset = SWEEP * 0.2;
  const target = slice.start + inset + Math.random() * (SWEEP - inset * 2);
  // The pointer is at twelve o'clock, so the wheel turns back by the
  // slice's own angle to bring it under the pointer.
  return 360 - target;
}

/** A slice as an SVG path, measured clockwise from the top. */
function slicePath(start: number): string {
  const point = (deg: number) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return [R + R * Math.cos(rad), R + R * Math.sin(rad)];
  };
  const [x1, y1] = point(start);
  const [x2, y2] = point(start + SWEEP);
  return `M ${R} ${R} L ${x1} ${y1} A ${R} ${R} 0 0 1 ${x2} ${y2} Z`;
}

export default function SpinWheel({
  signedIn,
  initial,
}: {
  signedIn: boolean;
  initial: SpinResult | null;
}) {
  const [result, setResult] = useState<SpinResult | null>(initial);
  const [spinning, setSpinning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Degrees of rotation. Only ever increases, so each spin turns
  // forwards rather than rewinding to a smaller angle.
  // Somebody who has already spun should find the wheel resting on
  // what they won rather than at twelve o'clock as though it never
  // happened. Computed once in a lazy initial state, so it is the
  // first paint and the browser has nothing to animate from.
  const [angle, setAngle] = useState(() => (initial ? restingAngle(initial.segmentId) : 0));
  // The result is held back until the wheel stops, or the prize would
  // appear on screen while it is still turning.
  const [revealed, setRevealed] = useState(Boolean(initial));
  const [choosing, setChoosing] = useState(false);

  async function handleSpin() {
    if (spinning || result) return;
    setSpinning(true);
    setError(null);

    const outcome = await spinWheelAction();

    if (!outcome.ok || !outcome.result) {
      setError(outcome.error ?? "Something went wrong.");
      setSpinning(false);
      return;
    }

    const won = outcome.result;
    // Five to eight whole turns before it settles, so no two spins
    // look alike even when they win the same thing. Added to whatever
    // the wheel is already at rather than set absolutely, so it always
    // turns forwards instead of rewinding.
    const turns = 5 + Math.floor(Math.random() * 4);
    const current = ((angle % 360) + 360) % 360;
    const landing = 360 * turns + (restingAngle(won.segmentId) - current);
    setAngle(angle + landing);

    // Matches the CSS transition below. The result is already saved, so
    // a closed tab mid-spin loses the animation and not the prize.
    window.setTimeout(() => {
      setResult(won);
      setRevealed(true);
      setSpinning(false);
    }, 4300);
  }

  async function handleChoice(choice: string) {
    setChoosing(true);
    setError(null);
    const outcome = await chooseSpinPrizeAction(choice);
    if (!outcome.ok || !outcome.result) {
      setError(outcome.error ?? "Couldn't save that.");
    } else {
      setResult(outcome.result);
    }
    setChoosing(false);
  }

  if (!signedIn) {
    return (
      <div className="card-surface rounded-2xl border border-border p-8 text-center">
        <h2 className="font-display text-2xl">One spin per person</h2>
        <p className="mt-2 text-sm text-muted">
          Sign in or make a free account to take your spin. It only works once, so make it count.
        </p>
        <Link
          href="/login?mode=signup&from=/spin"
          className="btn-flame mt-6 inline-flex rounded-full px-8 py-3 text-sm font-semibold"
        >
          Sign up / Sign in
        </Link>
      </div>
    );
  }

  const done = Boolean(result) && revealed;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        {/* The pointer, at twelve o'clock, outside the rotating group. */}
        <div
          aria-hidden
          className="absolute left-1/2 z-10 -translate-x-1/2"
          style={{
            top: -14,
            width: 0,
            height: 0,
            borderLeft: "14px solid transparent",
            borderRight: "14px solid transparent",
            borderTop: "26px solid #f7f0e6",
            filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.6))",
          }}
        />

        {/* The rotation lives on this div and not on the <svg>.
            A CSS transform transition applied to an SVG root is not
            reliably animated -- transform-origin is interpreted
            differently there, and Safari has shipped versions that
            simply jump to the end value. A plain element always
            animates, and always about its own centre. */}
        <div
          style={{
            width: SIZE,
            height: SIZE,
            transform: `rotate(${angle}deg)`,
            transformOrigin: "50% 50%",
            // A long ease-out is what makes it read as a wheel slowing
            // down rather than a graphic being rotated.
            transition: "transform 4.2s cubic-bezier(0.17, 0.67, 0.16, 1)",
            willChange: "transform",
          }}
        >
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="img"
          aria-label="Prize wheel"
        >
          {WHEEL.map((slice) => (
            <path
              key={slice.index}
              d={slicePath(slice.start)}
              fill={slice.color}
              stroke="#0a0806"
              strokeWidth={2}
            />
          ))}

          {WHEEL.map((slice) => (
            <text
              key={`${slice.index}-label`}
              // Starts just clear of the hub and runs OUTWARD to the
              // rim. Anchored at the start for that reason: anchored at
              // the end it ran backwards across the middle of the wheel
              // and the words were clipped by the hub.
              //
              // On the left half the whole label is turned through 180
              // degrees and anchored from the other side, so it still
              // runs outward but reads the right way up. Without that,
              // half the wheel is upside down.
              x={slice.flipped ? R - HUB - 8 : R + HUB + 8}
              y={R}
              fill={slice.ink}
              // Stepped down for the long one. At a flat 11 the
              // keychain label reached within two pixels of the rim,
              // which is close enough that a different font fallback
              // would touch it.
              fontSize={slice.short.length > 14 ? 9.5 : 11}
              fontWeight={800}
              letterSpacing={0.2}
              textAnchor={slice.flipped ? "end" : "start"}
              dominantBaseline="middle"
              // Set along the slice's own centre line. Radial rather
              // than across the slice, because "KEYCHAIN / LIGHTER" has
              // nowhere near the room to sit horizontally in a 22.5
              // degree wedge.
              transform={`rotate(${slice.mid - 90 + (slice.flipped ? 180 : 0)} ${R} ${R})`}
            >
              {slice.short}
            </text>
          ))}

          <circle cx={R} cy={R} r={HUB} fill="#0a0806" stroke="#f7f0e6" strokeWidth={3} />
        </svg>
        </div>
      </div>

      {!done && (
        <button
          type="button"
          onClick={handleSpin}
          disabled={spinning}
          className="btn-flame mt-8 rounded-full px-10 py-4 text-base font-semibold tracking-wide uppercase disabled:cursor-not-allowed disabled:opacity-60"
        >
          {spinning ? "Spinning…" : "Spin the wheel"}
        </button>
      )}

      {error && (
        <p className="border-flame-1/40 bg-flame-1/10 text-flame-3 mt-6 rounded-lg border px-4 py-3 text-sm">
          {error}
        </p>
      )}

      {done && result && (
        <div className="card-surface mt-8 w-full max-w-md rounded-2xl border border-border p-6 text-center">
          <span className="text-flame-3 text-xs font-semibold tracking-[0.2em] uppercase">
            {result.alreadySpun ? "You already spun" : "You won"}
          </span>
          <p className="font-display mt-2 text-3xl">{result.reward}</p>

          {result.needsChoice && (
            <div className="mt-5">
              <p className="text-sm text-muted">Which one do you want?</p>
              <div className="mt-3 flex justify-center gap-3">
                {SMALL_CHOICES.map((choice) => (
                  <button
                    key={choice}
                    type="button"
                    onClick={() => handleChoice(choice)}
                    disabled={choosing}
                    className="rounded-full border border-border-strong px-6 py-2.5 text-sm font-semibold tracking-wide uppercase transition-colors hover:border-flame-2 disabled:opacity-60"
                  >
                    {choice}
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="mt-6 font-mono text-lg tracking-[0.2em]">{result.code}</p>

          {/* The rule, stated where it cannot be missed and in the
              words the shop uses. A prize that can be screenshotted and
              forwarded is a prize given away as many times as the
              picture is shared. */}
          <div className="border-flame-2/40 bg-flame-2/10 mt-6 rounded-xl border px-4 py-4 text-left">
            <p className="text-flame-3 text-xs font-semibold tracking-wide uppercase">
              Must be claimed in person
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Show this screen to a WHOA team member, in person, at the time you claim it. It has to
              be live on your device.{" "}
              <span className="text-foreground font-semibold">
                Screenshots do not count and will not be honoured.
              </span>
            </p>
          </div>

          {result.redeemedAt && (
            <p className="mt-4 text-xs text-muted">Already collected. Thanks for playing.</p>
          )}
        </div>
      )}
    </div>
  );
}
