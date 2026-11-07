/**
 * A bush or a rock, as a three-lobed cluster.
 *
 * Drawn twice: once in black with a fat round-joined stroke, then
 * again filled on top. That is what gives one outline around the
 * whole silhouette instead of an outline around each lobe, which is
 * what you get from three overlapping outlined circles and is the
 * thing that makes homemade pixel art look homemade.
 *
 * Two colours per prop, light on top and dark below, because every
 * sprite in the reference is shaded that way and a flat one sits on
 * the sand rather than on the ground.
 */

const PALETTE = {
  bush: { light: "#58d854", dark: "#00a800" },
  rock: { light: "#fca044", dark: "#e45c10" },
} as const;

export default function Prop({ kind }: { kind: "bush" | "rock" }) {
  const { light, dark } = PALETTE[kind];

  // Three circles and a base, which together make the cluster.
  const lobes = (
    <>
      <circle cx="11" cy="19" r="10" />
      <circle cx="24" cy="14" r="11" />
      <circle cx="37" cy="19" r="10" />
      <rect x="1" y="19" width="46" height="10" />
    </>
  );

  return (
    <svg viewBox="0 0 48 32" className="whoa-smb-sprite" aria-hidden focusable="false">
      {/* Pass one: the outline. */}
      <g stroke="#000" strokeWidth="5" strokeLinejoin="round" fill="#000">
        {lobes}
      </g>
      {/* Pass two: the fill, which covers pass one's inner edges. */}
      <g fill={light}>{lobes}</g>
      {/* The shaded underside, clipped to the cluster. */}
      <g fill={dark}>
        <rect x="1" y="24" width="46" height="5" />
      </g>
    </svg>
  );
}
