"use client";

import { useMemo, useState } from "react";
import { recordWaterSpin, useWaterSpin } from "@/components/water/waterPrize";
import ClaimPrize from "@/components/water/ClaimPrize";

/**
 * The wheel's faces, in the order they're drawn, clockwise from the top.
 *
 * Winning slices are spread around the wheel rather than bunched together
 * so the pointer landing on one looks like luck instead of a rigged arc.
 * Change WIN_CHANCE to change the odds — the wheel picks a matching slice
 * afterwards, so the two can never disagree about whether someone won.
 */
const SLICES = [
  { label: "FREE\nSTICKER", win: true },
  { label: "NOT\nTHIS TIME", win: false },
  { label: "FREE\nSTICKER", win: true },
  { label: "SO\nCLOSE", win: false },
  { label: "FREE\nSTICKER", win: true },
  { label: "NEXT\nBOTTLE", win: false },
];

/** Roughly half. One number to change if you want to be more generous. */
const WIN_CHANCE = 0.5;

const SPIN_MS = 4200;

export default function SpinTheWheel() {
  const spin = useWaterSpin();
  const [angle, setAngle] = useState(0);
  const [spinning, setSpinning] = useState(false);
  // Whether the wheel was spun in *this* visit. Someone coming back to a
  // stored result never animated it, so the wheel has to be parked rather
  // than left at its default position — otherwise they'd read "you won"
  // above a pointer sitting on "NEXT BOTTLE".
  const [spunHere, setSpunHere] = useState(false);
  // Held back until the wheel stops, so the answer arrives with the
  // pointer rather than before it.
  const [revealed, setRevealed] = useState(false);

  const alreadySpun = spin !== null && !spinning;
  const showResult = revealed || (spin !== null && !spinning);

  function handleSpin() {
    if (spin || spinning) return;

    const won = Math.random() < WIN_CHANCE;
    const result = recordWaterSpin(won);

    // Pick a slice that matches the outcome, then land the pointer on it.
    const matching = SLICES.map((slice, i) => ({ slice, i })).filter((s) => s.slice.win === result.won);
    const target = matching[Math.floor(Math.random() * matching.length)].i;

    const sliceAngle = 360 / SLICES.length;
    // The pointer sits at the top, so the wheel turns backwards to bring
    // the chosen slice's centre under it, plus several whole turns.
    const centre = target * sliceAngle + sliceAngle / 2;
    setAngle(360 * 5 + (360 - centre));

    setSpunHere(true);
    setSpinning(true);
    window.setTimeout(() => {
      setSpinning(false);
      setRevealed(true);
    }, SPIN_MS);
  }

  const sliceAngle = 360 / SLICES.length;

  // Where the wheel sits for a result that was spun on a previous visit:
  // on a slice that agrees with what the page is telling them they got.
  const restingAngle = useMemo(() => {
    if (!spin) return 0;
    const index = SLICES.findIndex((slice) => slice.win === spin.won);
    if (index < 0) return 0;
    return 360 - (index * sliceAngle + sliceAngle / 2);
  }, [spin, sliceAngle]);

  const shownAngle = spunHere ? angle : restingAngle;

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        {/* Pointer */}
        <div className="water-pointer" aria-hidden />

        <div
          className="water-wheel"
          style={{
            transform: `rotate(${shownAngle}deg)`,
            transition: spinning ? `transform ${SPIN_MS}ms cubic-bezier(0.17, 0.67, 0.12, 0.99)` : "none",
          }}
        >
          <svg viewBox="0 0 200 200" className="h-full w-full">
            {SLICES.map((slice, i) => {
              // Rounded, and not for tidiness: Math.cos/Math.sin aren't
              // required to be correctly rounded, so Node and the browser
              // can disagree in the last bits and render path strings that
              // differ by a digit. React sees that as a hydration mismatch
              // and warns it "won't be patched up". Two decimals is well
              // past what a 200-unit viewBox can show.
              const at = (deg: number, radius: number) => {
                const rad = (deg - 90) * (Math.PI / 180);
                return [
                  (100 + radius * Math.cos(rad)).toFixed(2),
                  (100 + radius * Math.sin(rad)).toFixed(2),
                ] as const;
              };
              const [x1, y1] = at(i * sliceAngle, 100);
              const [x2, y2] = at((i + 1) * sliceAngle, 100);
              const [tx, ty] = at(i * sliceAngle + sliceAngle / 2, 62);

              return (
                <g key={i}>
                  <path
                    d={`M100,100 L${x1},${y1} A100,100 0 0,1 ${x2},${y2} Z`}
                    fill={slice.win ? "#2ea8c7" : "#123a47"}
                    stroke="#0b1f27"
                    strokeWidth="1.5"
                  />
                  <text
                    x={tx}
                    y={ty}
                    textAnchor="middle"
                    transform={`rotate(${i * sliceAngle + sliceAngle / 2}, ${tx}, ${ty})`}
                    fill={slice.win ? "#04161c" : "#8fc7d8"}
                    fontSize="10"
                    fontWeight="700"
                    letterSpacing="0.5"
                  >
                    {slice.label.split("\n").map((line, li) => (
                      <tspan key={li} x={tx} dy={li === 0 ? -2 : 11}>
                        {line}
                      </tspan>
                    ))}
                  </text>
                </g>
              );
            })}
            <circle cx="100" cy="100" r="16" fill="#04161c" stroke="#2ea8c7" strokeWidth="2" />
          </svg>
        </div>
      </div>

      {!showResult && (
        <button
          type="button"
          onClick={handleSpin}
          disabled={spinning}
          className="water-btn mt-8"
        >
          {spinning ? "Spinning…" : "Spin once"}
        </button>
      )}

      {/* aria-live so a screen reader hears the outcome when it lands. */}
      <div aria-live="polite" className="mt-8 w-full max-w-sm text-center">
        {showResult && spin && (
          spin.won ? (
            <div className="water-prize">
              <p className="text-xs font-semibold tracking-[0.25em] text-[#7fd8ee] uppercase">
                You won
              </p>
              <h3 className="font-display mt-2 text-4xl tracking-wide">A FREE STICKER</h3>
              <p className="mt-3 text-sm text-[#a9c9d4]">
                Show it at <strong className="text-[#e9f6fa]">the WHOAdega</strong> in Ocean Beach to
                pick it up.
              </p>
              <ClaimPrize code={spin.code} />
            </div>
          ) : (
            <div className="water-prize">
              <p className="text-xs font-semibold tracking-[0.25em] text-[#6f909c] uppercase">
                Not this time
              </p>
              <h3 className="font-display mt-2 text-3xl tracking-wide">NO STICKER — YET</h3>
              <p className="mt-3 text-sm text-[#a9c9d4]">
                That was your one spin. Come say hi at the WHOAdega anyway — we like people who
                recycle.
              </p>
            </div>
          )
        )}

        {alreadySpun && (
          <p className="mt-4 text-xs text-[#6f909c]">
            You&apos;ve already had your spin on this phone.
          </p>
        )}
      </div>
    </div>
  );
}
