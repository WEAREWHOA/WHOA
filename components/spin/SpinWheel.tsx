"use client";

import Link from "next/link";
import { useState } from "react";
import { chooseSpinPrizeAction, spinWheelAction } from "@/app/spin/actions";
import { SPIN_SEGMENTS, SMALL_CHOICES, type SpinResult } from "@/lib/spinWheel";

/**
 * The wheel.
 *
 * It animates a decision the server already made: spinWheelAction
 * returns the prize, and the wheel is then told where to stop. Nothing
 * here decides anything, which is why the prize table being readable in
 * the bundle costs nothing.
 *
 * The wedges are sized by their real odds, so the two per cent slice is
 * a sliver. That is the honest way to draw it, and it also makes the
 * rare one look rare, which is the whole appeal.
 */

const SIZE = 320;
const R = SIZE / 2;

interface Wedge {
  id: string;
  label: string;
  color: string;
  ink: string;
  /** Degrees, clockwise from twelve o'clock. */
  start: number;
  end: number;
  mid: number;
}

const WEDGES: Wedge[] = (() => {
  let cursor = 0;
  return SPIN_SEGMENTS.map((segment) => {
    const sweep = (segment.weight / 100) * 360;
    const wedge: Wedge = {
      id: segment.id,
      label: segment.label,
      color: segment.color,
      ink: segment.ink,
      start: cursor,
      end: cursor + sweep,
      mid: cursor + sweep / 2,
    };
    cursor += sweep;
    return wedge;
  });
})();

/** A wedge as an SVG path, measured clockwise from the top. */
function wedgePath(start: number, end: number): string {
  const point = (deg: number) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return [R + R * Math.cos(rad), R + R * Math.sin(rad)];
  };
  const [x1, y1] = point(start);
  const [x2, y2] = point(end);
  const large = end - start > 180 ? 1 : 0;
  return `M ${R} ${R} L ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} Z`;
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
  const [angle, setAngle] = useState(0);
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
    const wedge = WEDGES.find((w) => w.id === won.segmentId) ?? WEDGES[WEDGES.length - 1];

    // Land the pointer inside the winning wedge, a little off its
    // centre so two spins of the same prize don't stop identically.
    // Inset from the edges so a sliver-thin wedge can't be missed by a
    // rounding error.
    const inset = Math.min(2, (wedge.end - wedge.start) / 4);
    const target = wedge.start + inset + Math.random() * (wedge.end - wedge.start - inset * 2);

    // The pointer is at the top, so the wheel has to turn backwards by
    // the wedge's own angle to bring it under the pointer. Five whole
    // turns first, for the show.
    const landing = 360 * 5 + (360 - target);
    setAngle((previous) => previous + landing);

    // Matches the CSS transition below. The result is already saved, so
    // a closed tab mid-spin loses the animation and not the prize.
    window.setTimeout(() => {
      setResult(won);
      setRevealed(true);
      setSpinning(false);
    }, 4200);
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

        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="img"
          aria-label="Prize wheel"
          style={{
            transform: `rotate(${angle}deg)`,
            // A long ease-out is what makes it read as a wheel slowing
            // down rather than a graphic being rotated.
            transition: "transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)",
          }}
        >
          {WEDGES.map((wedge) => (
            <path
              key={wedge.id}
              d={wedgePath(wedge.start, wedge.end)}
              fill={wedge.color}
              stroke="#0a0806"
              strokeWidth={2}
            />
          ))}

          {WEDGES.map((wedge) => (
            <text
              key={`${wedge.id}-label`}
              x={R}
              y={R}
              fill={wedge.ink}
              fontSize={wedge.end - wedge.start < 20 ? 10 : 13}
              fontWeight={700}
              textAnchor="middle"
              // Rotated onto the wedge's own centre line and pushed out
              // towards the rim, which is the only way a label fits in
              // a slice this thin.
              transform={`rotate(${wedge.mid} ${R} ${R}) translate(0 ${-R * 0.58})`}
            >
              {wedge.label}
            </text>
          ))}

          <circle cx={R} cy={R} r={26} fill="#0a0806" stroke="#f7f0e6" strokeWidth={3} />
        </svg>
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
