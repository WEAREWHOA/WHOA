"use client";

/**
 * The wormhole you arrive through.
 *
 * Rings of increasing size spin at different speeds and directions, which
 * reads as depth without anything 3D — this has to open instantly on a
 * phone at a festival, so there's no engine and no downloaded assets
 * behind it.
 *
 * `opening` starts the collapse: the rings rush outward past the viewport
 * while the village fades up underneath, so you travel *through* rather
 * than watch a curtain lift.
 */
export default function Portal({ opening }: { opening: boolean }) {
  const rings = [0, 1, 2, 3, 4, 5, 6];

  return (
    <div className={`go-portal ${opening ? "go-portal-open" : ""}`} aria-hidden>
      <div className="go-portal-rings">
        {rings.map((i) => (
          <span
            key={i}
            className="go-ring"
            style={{
              // Each ring a little larger and a little slower, so the eye
              // reads the stack as a tunnel receding away from it.
              width: `${8 + i * 13}vmax`,
              height: `${8 + i * 13}vmax`,
              animationDuration: `${6 + i * 2.5}s`,
              animationDirection: i % 2 === 0 ? "normal" : "reverse",
              opacity: 1 - i * 0.1,
              borderColor:
                i % 3 === 0 ? "rgba(255,122,0,0.75)" : i % 3 === 1 ? "rgba(123,47,247,0.7)" : "rgba(46,168,199,0.65)",
              transitionDelay: `${i * 45}ms`,
            }}
          />
        ))}
        <span className="go-portal-core" />
      </div>
    </div>
  );
}
