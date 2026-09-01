import Link from "next/link";

export default function ArcadeCabinetPage() {
  return (
    <section className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center px-6 py-16 text-center">
      <Link href="/games" className="self-start text-sm text-muted hover:text-foreground">
        ← WHOA Games
      </Link>

      <span className="mt-6 text-xs font-semibold tracking-[0.3em] text-muted uppercase">
        WHOA Games
      </span>
      <h1 className="text-psychedelic font-display mt-2 text-4xl tracking-wide sm:text-5xl">
        WHOASIS Arcade Cabinet
      </h1>
      <p className="mt-3 max-w-md text-sm text-muted">
        Not a web game — a physical build for the lounge. Here&apos;s the actual plan.
      </p>

      <div className="card-surface mt-10 w-full rounded-2xl border border-border p-6 text-left">
        <h2 className="font-display text-xl tracking-wide">The idea</h2>
        <p className="mt-2 text-sm text-muted">
          Every game on this page already runs full-screen in a browser. The cabinet is just
          that browser, in kiosk mode, pointed at{" "}
          <span className="font-mono-code text-foreground">wearewhoa.art/games</span>, inside
          real cabinet hardware in the lounge. No separate build — it&apos;s this site, on a
          screen people walk up to.
        </p>
      </div>

      <div className="card-surface mt-6 w-full rounded-2xl border border-border p-6 text-left">
        <h2 className="font-display text-xl tracking-wide">Cheapest real build</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted">
          <li>A used/thrifted arcade cabinet shell, or a plain wooden box built to look like one</li>
          <li>A small PC or Raspberry Pi running a browser in kiosk mode (Chromium&apos;s <span className="font-mono-code text-foreground">--kiosk</span> flag)</li>
          <li>A monitor sized to the cabinet, plus a USB arcade joystick + buttons (cheap, widely available, plug-and-play on most OSes)</li>
          <li>Map the joystick/buttons to keyboard input — Snake and Beat Pad already read keyboard directly, no extra work needed</li>
        </ul>
      </div>

      <div className="card-surface mt-6 w-full rounded-2xl border border-border p-6 text-left">
        <h2 className="font-display text-xl tracking-wide">Why this is worth doing</h2>
        <p className="mt-2 text-sm text-muted">
          Every other tile on this page already works on a phone. The cabinet doesn&apos;t add a
          new game — it adds a physical, photographable thing people stop at, point at, and post.
          That&apos;s the actual payoff: a real object in the lounge, not new code.
        </p>
      </div>
    </section>
  );
}
