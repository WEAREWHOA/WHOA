import type { Facing } from "./scenes";

/**
 * The character you move, in WHOA merch.
 *
 * The hat is the point. A cap has a brim pointing one way, which at
 * this size reads as a beak and tells you which way somebody is
 * facing; a bucket hat has a brim all the way round, so the facing
 * has to come from the face instead. That is why the head sits below
 * the brim here rather than inside it, and why turning away hides
 * the face completely: with no beak to go on, an empty head is the
 * only thing that says "turned around".
 *
 * Black with an orange band, and the tee carries a flash of the same
 * orange, so the player reads as wearing WHOA rather than as a
 * person who happens to be orange. The staff behind the counters
 * wear no hat, which is also how you tell yourself apart from them.
 *
 * Drawn rather than spritesheeted, because a sheet is a binary file
 * somebody has to keep in step with this code and the whole thing is
 * a dozen rectangles.
 */

const HAT = "#1d1d22";
const HAT_LIT = "#34343c";
const BAND = "#ff7a00";
const SKIN = "#f2c9a0";
const TEE = "#ff2f1a";
const INK = "#2b2b38";
const HAIR = "#3a2a1a";

export default function Trainer({
  facing,
  step,
  hat = "bucket",
}: {
  facing: Facing;
  step: 0 | 1;
  /** The staff behind the counters are not wearing the merch. */
  hat?: "bucket" | "none";
}) {
  const back = facing === "up";
  const side = facing === "left" || facing === "right";
  // One drawing, mirrored, rather than two that can drift apart.
  const flip = facing === "left";

  return (
    <svg
      viewBox="0 0 16 20"
      className="whoa-pkmn-trainer"
      style={flip ? { transform: "scaleX(-1)" } : undefined}
      aria-hidden
      focusable="false"
    >
      {/* Legs, swapped each step. Two frames is all the original had
          and all this needs: the walk reads from the alternation. */}
      <rect x={step ? 4 : 5} y="16.5" width="3" height="3.5" fill={INK} />
      <rect x={step ? 9 : 8} y="16.5" width="3" height="3.5" fill={INK} />

      {/* Tee, with the flash of orange across it. */}
      <rect x="3" y="11" width="10" height="6" fill={TEE} />
      <rect x="6" y="12.6" width="4" height="1.5" fill={BAND} />
      <rect x="1.2" y="11.6" width="2" height="4" fill={SKIN} />
      <rect x="12.8" y="11.6" width="2" height="4" fill={SKIN} />

      {/* Head, under the brim rather than inside it. */}
      <rect x="4" y="7" width="8" height="4.4" fill={back ? HAIR : SKIN} />

      {hat === "bucket" ? (
        <>
          {/* The crown: short and wide against the brim. Taller than
              this and the silhouette is a top hat, which is what the
              first attempt looked like. */}
          <rect x="3.2" y="2.1" width="9.6" height="3.6" rx="1.6" fill={HAT} />
          <rect x="3.2" y="2.1" width="9.6" height="1.3" rx="0.65" fill={HAT_LIT} />
          {/* The band, which is the WHOA of it. */}
          <rect x="3.2" y="4.2" width="9.6" height="1.5" fill={BAND} />
          {/* The brim, all the way round and wider than the head. */}
          <rect x="0.5" y="5.5" width="15" height="2.1" rx="1.05" fill={HAT} />
        </>
      ) : (
        <>
          {/* No merch, so hair. */}
          <rect x="3.6" y="2.4" width="8.8" height="4.8" rx="1.6" fill={HAIR} />
        </>
      )}

      {/* The face, only when you can see it. With no brim pointing
          the way, this is the whole of how facing is read. */}
      {!back &&
        (side ? (
          <rect x="9.6" y="8.4" width="1.8" height="1.8" fill={INK} />
        ) : (
          <>
            <rect x="5.4" y="8.4" width="1.8" height="1.8" fill={INK} />
            <rect x="8.8" y="8.4" width="1.8" height="1.8" fill={INK} />
          </>
        ))}
    </svg>
  );
}
