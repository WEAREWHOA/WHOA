"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import Chest from "./Chest";
import GamePanel from "./GamePanel";
import Trainer from "./Trainer";
import { claimWandAction, type WandPrize } from "@/app/whoakemon/actions";
import type { GamePanels } from "./panelData";
import {
  DOORS,
  INTERIOR_ENTRY,
  SIGNS,
  START,
  STEPS,
  canStandOn,
  colsOf,
  rowsOf,
  sceneAt,
  tileAt,
  type Facing,
  type NpcAction,
  type PanelId,
} from "./scenes";

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

type Said = {
  text: string;
  href?: string;
  name?: string;
  /** Set when an attendant is waiting on an answer. */
  act?: NpcAction;
};

export default function Town({ panels }: { panels: GamePanels }) {
  const router = useRouter();
  const shell = useRef<HTMLDivElement>(null);

  const [sceneId, setSceneId] = useState(START.scene);
  const [panel, setPanel] = useState<PanelId | null>(null);
  const [chestOpen, setChestOpen] = useState(false);
  const [prize, setPrize] = useState<WandPrize | "claiming" | null>(null);
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

  const scene = sceneAt(sceneId);
  const cols = colsOf(scene);
  const rows = rowsOf(scene);
  const npc = scene.npc;

  // Centre on the player, then stop at the edges of the map rather
  // than scrolling past them into nothing.
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  // Indoors the room is exactly the size of the window, so both of
  // these clamp to zero and the camera has nothing to do.
  const camX = clamp(pos.x + 0.5 - VIEW_COLS / 2, 0, Math.max(0, cols - VIEW_COLS));
  const camY = clamp(pos.y + 0.5 - VIEW_ROWS / 2, 0, Math.max(0, rows - VIEW_ROWS));

  /** Whoever is standing where you are looking, counter included. */
  const facingNpc = useCallback(
    (dir: Facing) => {
      if (!npc) return null;
      const { dx, dy } = STEPS[dir];
      const ax = pos.x + dx;
      const ay = pos.y + dy;
      if (npc.x === ax && npc.y === ay) return npc;
      // Across a counter, which is how you are served in every one of
      // these games: the person is behind it, not in front.
      if (tileAt(scene, ax, ay) === "=" && npc.x === ax + dx && npc.y === ay + dy) return npc;
      return null;
    },
    [npc, pos.x, pos.y, scene],
  );

  const move = useCallback(
    (dir: Facing) => {
      if (leaving || menu || panel || prize) return;

      if (facing !== dir) {
        setFacing(dir);
        const { dx, dy } = STEPS[dir];
        const ahead = tileAt(scene, pos.x + dx, pos.y + dy);
        const sign = SIGNS[ahead];
        if (sign) {
          setSays({ text: sign.says, href: sign.href, name: sign.name });
          return;
        }
        const who = facingNpc(dir);
        if (who) setSays({ text: who.says, act: who.does });
        return;
      }

      const { dx, dy } = STEPS[dir];
      const nx = pos.x + dx;
      const ny = pos.y + dy;
      const target = tileAt(scene, nx, ny);

      const sign = SIGNS[target];
      if (sign) {
        setSays({ text: sign.says, href: sign.href, name: sign.name });
        return;
      }

      const who = facingNpc(dir);
      if (who) {
        setSays({ text: who.says, act: who.does });
        return;
      }

      if (!canStandOn(scene, nx, ny)) {
        if (target === "W") {
          // Persistence is rewarded, eventually.
          seaTries.current += 1;
          setSays(
            seaTries.current >= SEA_PATIENCE
              ? { text: "Fine. There is water elsewhere.", href: "/water", name: "the water" }
              : { text: SEA_LINES[Math.min(seaTries.current - 1, SEA_LINES.length - 1)] },
          );
          return;
        }
        setSays({ text: blockedBy(target) });
        return;
      }

      setPos({ x: nx, y: ny });
      setStep((st) => (st === 0 ? 1 : 0));

      // A door is a doorway now, not a link: the screen becomes the
      // room rather than the page becoming a different page.
      const door = DOORS[target];
      if (door) {
        // Rooms all share one mat; the hedges say where they drop you.
        const where = door.entry ?? INTERIOR_ENTRY;
        setSceneId(door.to);
        setPos({ x: where.x, y: where.y });
        setFacing(where.facing);
        setSays({
          text: door.entry ? door.says : `${door.says} Walk up to the counter.`,
        });
        return;
      }

      // And the mat is the way back out.
      if (target === "M" && scene.exit) {
        const back = scene.exit;
        setSceneId(back.scene);
        setPos({ x: back.x, y: back.y });
        setFacing(back.facing);
        setSays({ text: "Back outside." });
        return;
      }

      setSays({ text: whereYouAre(target, scene.kind) });
    },
    [facing, facingNpc, leaving, menu, panel, pos.x, pos.y, prize, scene],
  );

  /**
   * Put the keys back where they work.
   *
   * The key handler lives on the shell, so anything that moves focus
   * onto a button inside it, the menu and the panel both, leaves the
   * player unable to walk until they click the screen. Which is what
   * happened: entering a building from the menu left the arrow keys
   * dead.
   */
  const refocus = useCallback(() => {
    shell.current?.focus();
  }, []);

  /** Step straight into a room, for the menu and for anybody who
   *  cannot drive a D-pad across a map to get there. */
  const goTo = useCallback((to: string) => {
    setMenu(false);
    setSceneId(to);
    setPos({ x: INTERIOR_ENTRY.x, y: INTERIOR_ENTRY.y });
    setFacing(INTERIOR_ENTRY.facing);
    setSays({ text: "Walk up to the counter." });
    refocus();
  }, [refocus]);

  const press = useCallback(
    (button: "a" | "b" | "start" | "select") => {
      if (leaving) return;
      if (button === "start") {
        setMenu((m) => {
          if (m) refocus();
          return !m;
        });
        return;
      }
      if (button === "select") {
        // True to the hardware.
        setSays({ text: "SELECT does nothing. It never did." });
        return;
      }
      if (button === "b") {
        if (panel) {
          setPanel(null);
          refocus();
        } else if (menu) {
          setMenu(false);
          refocus();
        } else setSays({ text: "…" });
        return;
      }
      // A is whatever the dialogue box is offering: open the counter's
      // panel, or follow a sign's link.
      if (says.act?.kind === "panel") {
        setPanel(says.act.panel);
        return;
      }
      if (says.act?.kind === "prize") {
        if (chestOpen) return;
        setChestOpen(true);
        setPrize("claiming");
        setSays({ text: "You found the WAND OF WHOA!" });
        void claimWandAction()
          .then(setPrize)
          .catch((err) => {
            console.error("Couldn't claim the Wand of WHOA:", err);
            setPrize({ ok: false, reason: "The code would not mint. Get in touch and we will sort it." });
          });
        return;
      }
      if (says.href) {
        setLeaving(true);
        router.push(says.href);
      }
    },
    [chestOpen, leaving, menu, panel, refocus, router, says.act, says.href],
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
              data-kind={scene.kind}
              style={
                {
                  "--cols": cols,
                  "--rows": rows,
                  "--view-cols": VIEW_COLS,
                  "--view-rows": VIEW_ROWS,
                  "--cam-x": camX,
                  "--cam-y": camY,
                } as React.CSSProperties
              }
            >
              <div className="whoa-pkmn-field">
                {scene.map.map((row, y) =>
                  [...row].map((t, x) => (
                    <span
                      key={`${x},${y}`}
                      aria-hidden
                      className="whoa-pkmn-tile"
                      // A door and a sign get their own look; a tree
                      // you can walk through has to look exactly like
                      // one you cannot, or it is not hidden.
                      data-tile={
                        DOORS[t]
                          ? (DOORS[t].look ?? "door")
                          : SIGNS[t]
                            ? "sign"
                            : t === "t"
                              ? "T"
                              : t
                      }
                    />
                  )),
                )}

                {scene.kind === "outdoor" &&
                  scene.map.map((row, y) =>
                    [...row].map((t, x) => {
                      const door = DOORS[t];
                      if (!door) return null;
                      return (
                        <span
                          key={`n${x},${y}`}
                          aria-hidden
                          className="whoa-pkmn-doorname"
                          style={{ "--x": x, "--y": door.labelRow } as React.CSSProperties}
                        >
                          {door.name}
                        </span>
                      );
                    }),
                  )}

                {npc && (
                  <span
                    className="whoa-pkmn-player whoa-pkmn-npc"
                    style={{ "--x": npc.x, "--y": npc.y } as React.CSSProperties}
                  >
                    {npc.look === "chest" ? (
                      <Chest open={chestOpen} />
                    ) : (
                      <Trainer facing={npc.facing} step={0} />
                    )}
                  </span>
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
                    {Object.values(DOORS).map((d) => (
                      <li key={d.to}>
                        <button type="button" onClick={() => goTo(d.to)}>
                          {d.name}
                        </button>
                      </li>
                    ))}
                    {Object.values(SIGNS).map((g) => (
                      <li key={g.href}>
                        <Link href={g.href}>{g.name}</Link>
                      </li>
                    ))}
                  </ul>
                  <p className="whoa-gb-menu-foot">START or B to close</p>
                </div>
              )}

              {/* THE WAND.

                  The screen whitens first and the words arrive after,
                  because the flash is the moment and reading starts
                  once it has passed. Over the whole screen, not in
                  the dialogue box: finding the chest is the end of
                  something and should not look like bumping a sign. */}
              {prize && (
                <div className="whoa-win" role="status" aria-live="polite">
                  <div className="whoa-win-flash" aria-hidden />
                  <div className="whoa-win-say">
                    <p className="whoa-win-found">You found the</p>
                    <p className="whoa-win-item">WAND OF WHOA</p>
                    <p className="whoa-win-won">YOU WON</p>

                    {prize === "claiming" && <p className="whoa-win-note">Cutting you a code…</p>}

                    {prize !== "claiming" && prize.ok && (
                      <>
                        <p className="whoa-win-note">
                          {prize.percent}% off your next WHOA order. Enter this at checkout:
                        </p>
                        <p className="whoa-win-code">{prize.code}</p>
                        <p className="whoa-win-small">
                          {prize.already ? "The one you already won." : "Yours alone."} One use, 30
                          days.
                        </p>
                        <Link href="/shop" className="whoa-win-go">
                          Spend it ▸
                        </Link>
                      </>
                    )}

                    {prize !== "claiming" && !prize.ok && (
                      <p className="whoa-win-note">{prize.reason}</p>
                    )}

                    <button
                      type="button"
                      className="whoa-win-close"
                      onClick={() => {
                        setPrize(null);
                        setSays({ text: "The wand is yours. Mind the hedges on the way out." });
                        refocus();
                      }}
                    >
                      Back to the hedges
                    </button>
                  </div>
                </div>
              )}

              {panel && (
                <GamePanel
                  panel={panel}
                  panels={panels}
                  title={scene.npc?.name ?? "Counter"}
                  onClose={() => {
                    setPanel(null);
                    refocus();
                  }}
                  onSay={(line) => setSays({ text: line })}
                />
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

function whereYouAre(tile: string, kind: "outdoor" | "indoor"): string {
  if (kind === "indoor") return "Inside. The counter is at the top, the mat is the way out.";
  if (tile === ",") return "A dirt path, worn down by everybody who came before.";
  if (tile === "f") return "Flowers. Somebody planted these.";
  if (tile === "t") return "…you walked straight through that tree.";
  return "Grass, mostly.";
}

function blockedBy(tile: string): string {
  if (tile === "|") return "A wall.";
  if (tile === "=") return "The counter. Somebody should be behind it.";
  if (tile === "S") return "Shelves, stacked.";
  if (tile === "P") return "A plant. Thriving, considering.";
  if (tile === "T") return "A wall of trees. Nothing through there.";
  if (tile === "F") return "A picket fence. There is a gate round the bottom.";
  if (tile === "L") return "A lamp post. It comes on at dusk.";
  if (tile === "^" || tile === "#" || tile === "B") return "A building. Try the door.";
  return "You cannot get through.";
}
