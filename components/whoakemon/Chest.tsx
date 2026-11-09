/**
 * The chest at the end of the hedges.
 *
 * Shut until it is opened, then lid back and glowing, because the
 * one thing a treasure chest has to do after you open it is look
 * opened. Drawn rather than a sprite sheet, like everything else
 * here.
 */
export default function Chest({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 16 16" className="whoa-pkmn-trainer" aria-hidden focusable="false">
      {open && (
        // What is inside, which is the only reason to open it.
        <rect x="4" y="5" width="8" height="5" fill="#ffd24a" />
      )}

      {/* The lid, thrown back when it is open. */}
      <g transform={open ? "translate(0,-3)" : undefined}>
        <rect x="2" y="4" width="12" height="4" rx="1.5" fill="#b4762e" />
        <rect x="2" y="4" width="12" height="4" rx="1.5" fill="none" stroke="#5a3410" strokeWidth="1" />
        <rect x="7" y="4" width="2" height="4" fill="#e8c05a" />
      </g>

      {/* The box. */}
      <rect x="2" y="8" width="12" height="6" rx="1" fill="#8a5620" />
      <rect x="2" y="8" width="12" height="6" rx="1" fill="none" stroke="#5a3410" strokeWidth="1" />
      <rect x="7" y="8" width="2" height="6" fill="#e8c05a" />
      {!open && <rect x="6.5" y="9.5" width="3" height="3" rx="0.6" fill="#f0d878" stroke="#5a3410" strokeWidth="0.8" />}
    </svg>
  );
}
