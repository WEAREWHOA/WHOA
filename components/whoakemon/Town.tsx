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
 * WHOA Town, in a handheld.
 *
 * Tile movement, not free movement: one square per press, the way
 * these games do it. A press when you are not already facing that way
 * turns you on the spot instead of moving, which is not a quirk of
 * the original: it is what lets you read a sign you are standing
 * beside without stepping past it.
 *
 * THE PAGE IS THE DEVICE. This route gets no site chrome and the body
 * does not scroll while it is open, because a console that scrolls is
 * a picture of a console. The shell takes focus on mount, which is
 * normally rude, but here the whole page is one control surface and
 * there is nothing else on it to take focus from.
 *
 * NOT EVERYONE CAN PLAY THIS. START opens a menu listing every
 * destination as an ordinary link, and the same list is in the page
 * under the device for anyone who never finds START. A navigation
 * page usable only with four arrow keys and a working pointer is not
 * a navigation page.
 */

/**
 * How much of the town is on screen at once.
 *
 * Fewer squares than the map has, so each square is bigger: 16 of 20
 * columns makes every tile a quarter larger, which is the difference
 * between a map you squint at and one you can read. The rest of the
 * town is still there, and the camera follows you onto it, which is
 * what these games have always done.
 *
 * The slack is small on purpose, four columns and three rows. The
 * town is tiny and most of it should stay in view; this is a nudge,
 * not an expedition.
 */
const VIEW_COLS = 16;
const VIEW_ROWS = 13;

/** ↑ ↑ ↓ ↓ ← → ← → B A. */
const KONAMI = [
  "ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown",
  "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a",
];

/** How many times somebody has to try the sea before it gives in. */
const SEA_PATIENCE = 5;

const SEA_LINES = [
  "The sea. You are not swimming today.",
  "Still the sea. Still not swimming.",
  "You don't have SURF.",
  "You really are going to keep trying this.",
];

type Said = { text: string; href?: string; name?: string };

export default function Town() {
  const router = useRouter();
  const shell = useRef<HTMLDivElement>(null);

  const [pos, setPos] = useState({ x: START.x, y: START.y });
  const [facing, setFacing] = useState<Facing>(START.facing);
  const [step, setStep] = useState<0 | 1>(0);
  const [menu, setMenu] = useState(false);
  const [dmg, setDmg] = useState(false);
  const [says, setSays] = useState<Said>({
    text: "WHOA TOWN. Arrows or the pad. Doors take you in. START for the menu.",
  });
  // Navigating away takes a moment; without this you can keep walking
  // on a page that is already leaving.
  const [leaving, setLeaving] = useState(false);

  const seaTries = useRef(0);
  const konami = useRef<string[]>([]);

  // Centre on the player, then stop at the edges of the map rather
  // than scrolling past them into nothing.
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  const camX = clamp(pos.x + 0.5 - VIEW_COLS / 2, 0, COLS - VIEW_COLS);
  const camY = clamp(pos.y + 0.5 - VIEW_ROWS / 2, 0, ROWS - VIEW_ROWS);

  const move = useCallback(
    (dir: Facing) => {
      if (leaving || menu) return;

      if (facing !== dir) {
        setFacing(dir);
        const { dx, dy } = STEPS[dir];
        const way = WAYS_IN[tileAt(pos.x + dx, pos.y + dy)];
        if (way?.kind === "sign") setSays({ text: way.says, href: way.href, name: way.name });
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
        if (target === "W") {
          // Persistence is rewarded, eventually.
          seaTries.current += 1;
          setSays(
            seaTries.current >= SEA_PATIENCE
              ? {
                  text: "Fine. There is water elsewhere.",
                  href: "/water",
                  name: "the water",
                }
              : { text: SEA_LINES[Math.min(seaTries.current - 1, SEA_LINES.length - 1)] },
          );
          return;
        }
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
    [facing, leaving, menu, pos.x, pos.y, router],
  );

  const press = useCallback(
    (button: "a" | "b" | "start" | "select") => {
      if (leaving) return;
      if (button === "start") {
        setMenu((m) => !m);
        return;
      }
      if (button === "select") {
        // True to the hardware.
        setSays({ text: "SELECT does nothing. It never did." });
        return;
      }
      if (button === "b") {
        if (menu) setMenu(false);
        else setSays({ text: "…" });
        return;
      }
      if (says.href) {
        setLeaving(true);
        router.push(says.href);
      }
    },
    [leaving, menu, router, says.href],
  );

  // The body does not scroll while the console is on screen.
  useEffect(() => {
    const body = document.body;
    const prevOverflow = body.style.overflow;
    const prevOverscroll = body.style.overscrollBehavior;
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";
    return () => {
      body.style.overflow = prevOverflow;
      body.style.overscrollBehavior = prevOverscroll;
    };
  }, []);

  useEffect(() => {
    shell.current?.focus();
  }, []);

  useEffect(() => {
    const el = shell.current;
    if (!el) return;

    const DIRS: Record<string, Facing> = {
      ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
      w: "up", s: "down", a: "left", d: "right",
      W: "up", S: "down", A: "left", D: "right",
    };

    const onKey = (e: KeyboardEvent) => {
      // The code is read off the raw keys before anything else claims
      // them, so A and B count both as the buttons and as the code.
      konami.current = [...konami.current, e.key].slice(-KONAMI.length);
      if (konami.current.join(",").toLowerCase() === KONAMI.join(",").toLowerCase()) {
        konami.current = [];
        setDmg((on) => !on);
        setSays({ text: "The screen goes green. Just like that." });
        e.preventDefault();
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        press("a");
        return;
      }
      if (e.key === "Backspace" || e.key === "Escape") {
        e.preventDefault();
        press("b");
        return;
      }
      if (e.key === "Shift") {
        e.preventDefault();
        press("select");
        return;
      }

      const dir = DIRS[e.key];
      if (dir) {
        // Swallowed only while the console has focus, which on this
        // route is all the time, because there is nothing else here.
        e.preventDefault();
        move(dir);
        return;
      }

      // Space is START, because on a page that does not scroll it has
      // nothing better to do.
      if (e.key === " ") {
        e.preventDefault();
        press("start");
      }
    };

    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }, [move, press]);

  // Swipe on the screen itself, for anybody whose habit that is.
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
    if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
    move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up");
  };

  return (
    <div
      ref={shell}
      tabIndex={0}
      role="application"
      aria-label="WHOA Town, a handheld game. Arrow keys to walk, Enter to confirm, Space for the menu. Every destination is also listed as a link below."
      className="whoa-gb"
      data-dmg={dmg ? "on" : "off"}
    >
      <div className="whoa-gb-body">
        <div className="whoa-gb-bezel">
          <span className="whoa-gb-led" aria-hidden />
          <div
            className="whoa-gb-screen"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <div
              className="whoa-pkmn-view"
              style={
                {
                  "--cols": COLS,
                  "--rows": ROWS,
                  "--view-cols": VIEW_COLS,
                  "--view-rows": VIEW_ROWS,
                  "--cam-x": camX,
                  "--cam-y": camY,
                } as React.CSSProperties
              }
            >
              <div className="whoa-pkmn-field">
              {MAP.map((row, y) =>
                [...row].map((t, x) => {
                  const way = WAYS_IN[t];
                  return (
                    <span
                      key={`${x},${y}`}
                      aria-hidden
                      className="whoa-pkmn-tile"
                      // A tree you can walk through has to look exactly
                      // like one you cannot, or it is not hidden.
                      data-tile={way ? way.kind : t === "t" ? "T" : t}
                    />
                  );
                }),
              )}

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

              {menu && (
                <div className="whoa-gb-menu">
                  <p className="whoa-gb-menu-head">WHERE TO?</p>
                  <ul>
                    {Object.values(WAYS_IN).map((w) => (
                      <li key={w.href}>
                        <Link href={w.href}>{w.name}</Link>
                      </li>
                    ))}
                  </ul>
                  <p className="whoa-gb-menu-foot">START or B to close</p>
                </div>
              )}
            </div>

            {/* The dialogue box lives on the screen, as it does in the
                games, rather than under the device. */}
            <div className="whoa-gb-say" role="status" aria-live="polite">
              <p>{says.text}</p>
              {says.href && (
                <Link href={says.href} className="whoa-gb-say-go">
                  {says.name ? `Go to ${says.name}` : "Go"} ▸
                </Link>
              )}
            </div>
          </div>
        </div>

        <p className="whoa-gb-brand" aria-hidden>
          WHOA <span>BOY</span>
        </p>

        <div className="whoa-gb-controls">
          <div className="whoa-gb-dpad" aria-hidden>
            <button type="button" data-d="up" onClick={() => move("up")}>
              <span className="sr-only">Up</span>
            </button>
            <button type="button" data-d="left" onClick={() => move("left")}>
              <span className="sr-only">Left</span>
            </button>
            <span className="whoa-gb-dpad-hub" />
            <button type="button" data-d="right" onClick={() => move("right")}>
              <span className="sr-only">Right</span>
            </button>
            <button type="button" data-d="down" onClick={() => move("down")}>
              <span className="sr-only">Down</span>
            </button>
          </div>

          <div className="whoa-gb-ab" aria-hidden>
            <button type="button" className="whoa-gb-round" onClick={() => press("b")}>
              B
            </button>
            <button type="button" className="whoa-gb-round" onClick={() => press("a")}>
              A
            </button>
          </div>
        </div>

        <div className="whoa-gb-startsel" aria-hidden>
          <button type="button" onClick={() => press("select")}>SELECT</button>
          <button type="button" onClick={() => press("start")}>START</button>
        </div>
      </div>
    </div>
  );
}

function whereYouAre(tile: string): string {
  if (tile === ",") return "A dirt path, worn down by everybody who came before.";
  if (tile === "f") return "Flowers. Somebody planted these.";
  if (tile === "t") return "…you walked straight through that tree.";
  return "Grass, mostly.";
}

function blockedBy(tile: string): string {
  if (tile === "T") return "A wall of trees. Nothing through there.";
  if (tile === "F") return "A picket fence. There is a gate round the bottom.";
  if (tile === "L") return "A lamp post. It comes on at dusk.";
  if (tile === "^" || tile === "#" || tile === "B") return "A building. Try the door.";
  return "You cannot get through.";
}
