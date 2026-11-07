import type { Facing } from "./town";

/**
 * The character you move.
 *
 * Four directions, drawn rather than spritesheeted, because a sheet
 * is a binary file somebody has to keep in step with this code and
 * the whole thing is six shapes. Facing up shows the back of the
 * head with no face on it, which is the single detail that makes a
 * top-down character read as turned away.
 *
 * `step` flips which leg is forward. Two frames is all the original
 * had and all this needs: the walk reads from the alternation, not
 * from the number of frames.
 */
export default function Trainer({ facing, step }: { facing: Facing; step: 0 | 1 }) {
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
      {/* Legs, swapped each step. */}
      <rect x={step ? 4 : 5} y="16" width="3" height="4" fill="#2b2b38" />
      <rect x={step ? 9 : 8} y="16" width="3" height="4" fill="#2b2b38" />

      {/* Body */}
      <rect x="3" y="10" width="10" height="7" fill="#ff2f1a" />
      {/* Arms */}
      <rect x="1" y="11" width="2" height="4" fill="#f2c9a0" />
      <rect x="13" y="11" width="2" height="4" fill="#f2c9a0" />

      {/* Head */}
      <rect x="3" y="3" width="10" height="8" fill="#f2c9a0" />
      {/* Cap: the brim points the way you are facing, which doubles as
          the arrow telling you which way the next step goes. */}
      <rect x="2" y="2" width="12" height="4" fill="#ff7a00" />
      {side ? (
        <rect x="12" y="5" width="4" height="2" fill="#ff7a00" />
      ) : back ? null : (
        <rect x="3" y="6" width="10" height="2" fill="#ff7a00" />
      )}

      {/* Hair under the cap at the back of the head. */}
      {back && <rect x="3" y="6" width="10" height="4" fill="#3a2a1a" />}

      {/* Face, only when you can see it. */}
      {!back &&
        (side ? (
          <rect x="10" y="8" width="2" height="2" fill="#2b2b38" />
        ) : (
          <>
            <rect x="5" y="8" width="2" height="2" fill="#2b2b38" />
            <rect x="9" y="8" width="2" height="2" fill="#2b2b38" />
          </>
        ))}
    </svg>
  );
}
