"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import Trainer from "./Trainer";
import {
  COLS,
  MAP,
  ROWS,
  START,
  STEPS,
  WAYS_IN,
  canStandOn,
  tileAt,
  type Facing,
} from "./town";

/**
 * WHOA Town, which you walk around.
 *
 * Tile movement, not free movement: one square per press, the way
 * these games do it. Free movement would need collision boxes and
 * would feel like a different genre.
 *
 * A press when you are not already facing that way turns you on the
 * spot instead of moving. That is the behaviour from the games and it
 * is not a quirk: it is what lets you read a sign you are standing
 * beside without stepping past it.
 *
 * ARROW KEYS AND THE PAGE. The key handler is on the map, which takes
 * focus, rather than on the window. Stealing the arrow keys from the
 * whole document would break scrolling for anybody who never wanted
 * to play, and this is a page with a footer under it.
 *
 * NOT EVERYONE CAN PLAY THIS. The same eight destinations are listed
 * as ordinary links underneath, and that list is not a fallback that
 * appears when something fails, it is just there. A navigation page
 * that can only be used with four arrow keys and a working pointer
 * is not a navigation page.
 */

const TURN_FIRST = true;

export default function Town() {
  const router = useRouter();
  const field = useRef<HTMLDivElement>(null);

  const [pos, setPos] = useState({ x: START.x, y: START.y });
  const [facing, setFacing] = useState<Facing>(START.facing);
  const [step, setStep] = useState<0 | 1>(0);
  const [says, setSays] = useState<{ text: string; href?: string; name?: string }>({
    text: "WHOA TOWN. Arrow keys or the pad below. Doors take you in.",
  });
  // Entering a door navigates, which takes a moment. Without this the
  // player can keep walking on a page that is on its way out.
  const [leaving, setLeaving] = useState(false);

  const move = useCallback(
    (dir: Facing) => {
      if (leaving) return;

      // Turn first, step second.
      if (TURN_FIRST && facing !== dir) {
        setFacing(dir);
        const { dx, dy } = STEPS[dir];
        const ahead = tileAt(pos.x + dx, pos.y + dy);
        const way = WAYS_IN[ahead];
        // Turning towards a sign reads it, which is how you read one
        // without walking into it twice.
        if (way?.kind === "sign") {
          setSays({ text: way.says, href: way.href, name: way.name });
        }
        return;
      }

      const { dx, dy } = STEPS[dir];
      const nx = pos.x + dx;
      const ny = pos.y + dy;
      const target = tileAt(nx, ny);
      const way = WAYS_IN[target];

      if (way?.kind === "sign") {
        setSays({ text: way.says, href: way.href, name: way.name });
        return;
      }

      if (!canStandOn(nx, ny)) {
        // Bumping into something is not silent in these games.
        setSays({ text: blockedBy(target) });
        return;
      }

      setPos({ x: nx, y: ny });
      setStep((s) => (s === 0 ? 1 : 0));

      if (way?.kind === "door") {
        setLeaving(true);
        setSays({ text: `Entering ${way.name}…`, href: way.href, name: way.name });
        router.push(way.href);
        return;
      }

      setSays({ text: whereYouAre(target) });
    },
    [facing, leaving, pos.x, pos.y, router],
  );

  // Keyboard, scoped to the map.
  useEffect(() => {
    const el = field.current;
    if (!el) return;

    const KEYS: Record<string, Facing> = {
      ArrowUp: "up",
      ArrowDown: "down",
      ArrowLeft: "left",
      ArrowRight: "right",
      w: "up",
      s: "down",
      a: "left",
      d: "right",
      W: "up",
      S: "down",
      A: "left",
      D: "right",
    };

    const onKey = (e: KeyboardEvent) => {
      // A or Enter follows whatever the dialogue box is offering, so
      // a sign can be acted on without reaching for the mouse.
      if (e.key === "Enter" || e.key === " ") {
        if (says.href) {
          e.preventDefault();
          setLeaving(true);
          router.push(says.href);
        }
        return;
      }
      const dir = KEYS[e.key];
      if (!dir) return;
      // Only swallow the arrow keys while the map has focus, so the
      // page still scrolls for everybody else.
      e.preventDefault();
      move(dir);
    };

    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }, [move, router, says.href]);

  // Swipe, as well as the pad. One or the other is somebody's habit.
  const touch = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const from = touch.current;
    touch.current = null;
    if (!from) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - from.x;
    const dy = t.clientY - from.y;
    // Below this it is a tap, not a swipe, and treating a tap as a
    // swipe in whichever direction the thumb drifted is maddening.
    if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
    move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up");
  };

  return (
    <div className="whoa-pkmn">
      <div
        ref={field}
        tabIndex={0}
        role="application"
        aria-label="WHOA Town. Use the arrow keys to walk. Every destination is also listed as a link below the map."
        className="whoa-pkmn-field"
        style={{ "--cols": COLS, "--rows": ROWS } as React.CSSProperties}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {MAP.map((row, y) =>
          [...row].map((t, x) => {
            const way = WAYS_IN[t];
            return (
              <span
                key={`${x},${y}`}
                aria-hidden
                className="whoa-pkmn-tile"
                data-tile={way ? way.kind : t}
              />
            );
          }),
        )}

        {/* Names over the doors, so the town can be read without
            walking every inch of it. */}
        {MAP.map((row, y) =>
          [...row].map((t, x) => {
            const way = WAYS_IN[t];
            if (!way || way.kind !== "door") return null;
            return (
              <span
                key={`n${x},${y}`}
                aria-hidden
                className="whoa-pkmn-doorname"
                style={{ "--x": x, "--y": way.labelRow ?? y } as React.CSSProperties}
              >
                {way.name}
              </span>
            );
          }),
        )}

        <span
          className="whoa-pkmn-player"
          style={{ "--x": pos.x, "--y": pos.y } as React.CSSProperties}
        >
          <Trainer facing={facing} step={step} />
        </span>
      </div>

      {/* The dialogue box. */}
      <div className="whoa-pkmn-say" role="status" aria-live="polite">
        <p>{says.text}</p>
        {says.href && (
          <Link href={says.href} className="whoa-pkmn-say-go">
            {says.name ? `Go to ${says.name}` : "Go"} ▸
          </Link>
        )}
      </div>

      {/* The pad. Visible on every screen, not just touch: it says
          the thing is drivable before anybody has pressed a key. */}
      <div className="whoa-pkmn-pad" aria-hidden>
        <button type="button" data-d="up" onClick={() => move("up")}>▲</button>
        <button type="button" data-d="left" onClick={() => move("left")}>◀</button>
        <button type="button" data-d="right" onClick={() => move("right")}>▶</button>
        <button type="button" data-d="down" onClick={() => move("down")}>▼</button>
      </div>
    </div>
  );
}

function whereYouAre(tile: string): string {
  if (tile === ",") return "A dirt path, worn down by everybody who came before.";
  if (tile === "f") return "Flowers. Somebody planted these.";
  return "Grass, mostly.";
}

function blockedBy(tile: string): string {
  if (tile === "T") return "A wall of trees. Nothing through there.";
  if (tile === "W") return "The sea. You are not swimming today.";
  if (tile === "L") return "A lamp post. It comes on at dusk.";
  if (tile === "^" || tile === "#" || tile === "B") return "A building. Try the door.";
  return "You cannot get through.";
}
