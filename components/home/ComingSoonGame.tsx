"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import PsychedelicBackground from "@/components/home/PsychedelicBackground";

const RUN_MS = 45_000;
const KEY_SPEED = 300; // px/s
const DRAG_EASE = 0.28; // per-frame lerp toward pointer target
const SHIP_HALF_W = 22;
const SHIP_HALF_H = 26;
const BULLET_SPEED = 520; // px/s
const BULLET_RADIUS = 3.5;
const AUTO_FIRE_MS = 260;
const MANUAL_FIRE_MS = 150;
const SPAWN_MS_START = 850;
const SPAWN_MS_MIN = 420;
const BEST_SCORE_KEY = "whoa_incoming_best_score";

type Status = "idle" | "playing" | "over";

interface Ship {
  x: number;
  y: number;
}

interface Bullet {
  x: number;
  y: number;
}

interface Target {
  x: number;
  y: number;
  vy: number;
  wobbleAmp: number;
  wobbleSpeed: number;
  wobblePhase: number;
  baseX: number;
  radius: number;
  hue: number;
  points: number;
  kind: "asteroid" | "orb" | "ufo";
  rotation: number;
  spin: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  hue: number;
}

interface Trail {
  x: number;
  y: number;
  life: number;
}

const TARGET_KINDS: { kind: Target["kind"]; radius: [number, number]; speed: [number, number]; points: number; weight: number }[] = [
  { kind: "asteroid", radius: [18, 26], speed: [70, 115], points: 10, weight: 5 },
  { kind: "orb", radius: [11, 15], speed: [120, 170], points: 15, weight: 3 },
  { kind: "ufo", radius: [10, 14], speed: [165, 220], points: 25, weight: 2 },
];

function pickTargetKind() {
  const totalWeight = TARGET_KINDS.reduce((sum, k) => sum + k.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const k of TARGET_KINDS) {
    roll -= k.weight;
    if (roll <= 0) return k;
  }
  return TARGET_KINDS[0];
}

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

// Best score persists in localStorage — read via useSyncExternalStore (the
// same pattern lib/useLoggedIn.ts uses) rather than state-synced-from-an-
// effect, since that's the React-sanctioned way to read client-only mutable
// state without a hydration mismatch or a disallowed setState-in-effect.
function subscribeBest(): () => void {
  return () => {};
}
function getBestSnapshot(): number {
  try {
    return Number(localStorage.getItem(BEST_SCORE_KEY) ?? 0) || 0;
  } catch {
    return 0;
  }
}
function getBestServerSnapshot(): number {
  return 0;
}

export default function ComingSoonGame() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [status, setStatus] = useState<Status>("idle");
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(RUN_MS / 1000);
  const best = useSyncExternalStore(subscribeBest, getBestSnapshot, getBestServerSnapshot);

  const sizeRef = useRef({ width: 380, height: 560 });
  const shipRef = useRef<Ship>({ x: 190, y: 480 });
  const pointerTargetRef = useRef<Ship | null>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const bulletsRef = useRef<Bullet[]>([]);
  const targetsRef = useRef<Target[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const trailRef = useRef<Trail[]>([]);
  const scoreRef = useRef(0);
  const lastAutoFireRef = useRef(0);
  const lastManualFireRef = useRef(0);
  const spawnTimerRef = useRef(0);
  const startAtRef = useRef(0);
  const endAtRef = useRef(0);
  const rafRef = useRef(0);
  const lastFrameRef = useRef(0);
  const statusRef = useRef<Status>("idle");
  const tickRef = useRef<(time: number) => void>(() => {});

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const { width, height } = sizeRef.current;

    ctx.clearRect(0, 0, width, height);

    // Trail behind the ship.
    for (const t of trailRef.current) {
      const alpha = t.life * 0.5;
      ctx.fillStyle = `rgba(255, 122, 0, ${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(t.x, t.y, 6 * t.life, 0, Math.PI * 2);
      ctx.fill();
    }

    // Bullets.
    for (const b of bulletsRef.current) {
      ctx.save();
      ctx.shadowColor = "#ffb800";
      ctx.shadowBlur = 10;
      ctx.fillStyle = "#fff7ea";
      ctx.beginPath();
      ctx.arc(b.x, b.y, BULLET_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Targets.
    for (const target of targetsRef.current) {
      ctx.save();
      ctx.translate(target.x, target.y);
      ctx.rotate(target.rotation);
      ctx.shadowColor = `hsl(${target.hue}, 95%, 65%)`;
      ctx.shadowBlur = 16;

      if (target.kind === "asteroid") {
        ctx.fillStyle = `hsl(${target.hue}, 70%, 45%)`;
        ctx.beginPath();
        const sides = 7;
        for (let i = 0; i < sides; i++) {
          const angle = (i / sides) * Math.PI * 2;
          const r = target.radius * (0.75 + ((i * 37) % 10) / 40);
          const px = Math.cos(angle) * r;
          const py = Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
      } else if (target.kind === "orb") {
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, target.radius);
        gradient.addColorStop(0, `hsla(${target.hue}, 100%, 80%, 1)`);
        gradient.addColorStop(1, `hsla(${target.hue}, 100%, 55%, 0.4)`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, target.radius, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = `hsl(${target.hue}, 90%, 60%)`;
        ctx.beginPath();
        ctx.ellipse(0, 0, target.radius, target.radius * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `hsl(${target.hue}, 90%, 80%)`;
        ctx.beginPath();
        ctx.ellipse(0, -target.radius * 0.25, target.radius * 0.55, target.radius * 0.4, 0, Math.PI, 0);
        ctx.fill();
      }
      ctx.restore();
    }

    // Particles.
    for (const p of particlesRef.current) {
      const alpha = Math.max(p.life / p.maxLife, 0);
      ctx.fillStyle = `hsla(${p.hue}, 100%, 65%, ${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Ship.
    const ship = shipRef.current;
    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.shadowColor = "#ff7a00";
    ctx.shadowBlur = 18;
    const gradient = ctx.createLinearGradient(0, -SHIP_HALF_H, 0, SHIP_HALF_H);
    gradient.addColorStop(0, "#ffb800");
    gradient.addColorStop(0.55, "#ff7a00");
    gradient.addColorStop(1, "#ff2f1a");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(0, -SHIP_HALF_H);
    ctx.lineTo(SHIP_HALF_W, SHIP_HALF_H);
    ctx.lineTo(SHIP_HALF_W * 0.35, SHIP_HALF_H * 0.6);
    ctx.lineTo(-SHIP_HALF_W * 0.35, SHIP_HALF_H * 0.6);
    ctx.lineTo(-SHIP_HALF_W, SHIP_HALF_H);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#fff7ea";
    ctx.font = "bold 10px var(--font-inter), sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("WHOA", 0, 2);
    ctx.restore();
  }, []);

  const spawnTarget = useCallback(() => {
    const { width } = sizeRef.current;
    const kindConfig = pickTargetKind();
    const radius = rand(kindConfig.radius[0], kindConfig.radius[1]);
    const x = rand(radius + 8, width - radius - 8);
    targetsRef.current = [
      ...targetsRef.current,
      {
        x,
        baseX: x,
        y: -radius,
        vy: rand(kindConfig.speed[0], kindConfig.speed[1]),
        wobbleAmp: rand(10, 40),
        wobbleSpeed: rand(1, 2.4),
        wobblePhase: rand(0, Math.PI * 2),
        radius,
        hue: Math.floor(rand(0, 360)),
        points: kindConfig.points,
        kind: kindConfig.kind,
        rotation: 0,
        spin: rand(-1.5, 1.5),
      },
    ];
  }, []);

  const explode = useCallback((x: number, y: number, hue: number) => {
    const burst: Particle[] = [];
    for (let i = 0; i < 10; i++) {
      const angle = rand(0, Math.PI * 2);
      const speed = rand(40, 160);
      burst.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 0.5, maxLife: 0.5, hue });
    }
    particlesRef.current = [...particlesRef.current, ...burst];
  }, []);

  const fireBullet = useCallback(() => {
    const ship = shipRef.current;
    bulletsRef.current = [...bulletsRef.current, { x: ship.x, y: ship.y - SHIP_HALF_H }];
  }, []);

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
  }, []);

  // tick recurses via tickRef.current rather than referencing itself by name
  // (which would be a use-before-declaration inside its own useCallback) —
  // the same indirection SnakeGame's tickRef uses for the same reason.
  useEffect(() => {
    tickRef.current = (time: number) => {
      if (statusRef.current !== "playing") return;

      const last = lastFrameRef.current || time;
      const dt = Math.min((time - last) / 1000, 0.05);
      lastFrameRef.current = time;
      const { width, height } = sizeRef.current;

      const remainingMs = Math.max(0, endAtRef.current - time);
      setTimeLeft(Math.ceil(remainingMs / 1000));
      if (remainingMs <= 0) {
        statusRef.current = "over";
        setStatus("over");
        try {
          const current = Number(localStorage.getItem(BEST_SCORE_KEY) ?? 0) || 0;
          if (scoreRef.current > current) localStorage.setItem(BEST_SCORE_KEY, String(scoreRef.current));
        } catch {
          // localStorage unavailable — high score just won't persist
        }
        stop();
        return;
      }

      // Ship movement.
      const ship = shipRef.current;
      const pointerTarget = pointerTargetRef.current;
      let nextShip: Ship;
      if (pointerTarget) {
        nextShip = {
          x: ship.x + (pointerTarget.x - ship.x) * DRAG_EASE,
          y: ship.y + (pointerTarget.y - ship.y) * DRAG_EASE,
        };
      } else {
        const keys = keysRef.current;
        let dx = 0;
        let dy = 0;
        if (keys.has("ArrowLeft") || keys.has("a")) dx -= 1;
        if (keys.has("ArrowRight") || keys.has("d")) dx += 1;
        if (keys.has("ArrowUp") || keys.has("w")) dy -= 1;
        if (keys.has("ArrowDown") || keys.has("s")) dy += 1;
        if (dx !== 0 || dy !== 0) {
          const len = Math.hypot(dx, dy) || 1;
          nextShip = { x: ship.x + (dx / len) * KEY_SPEED * dt, y: ship.y + (dy / len) * KEY_SPEED * dt };
        } else {
          nextShip = ship;
        }
      }
      nextShip = {
        x: Math.min(width - SHIP_HALF_W, Math.max(SHIP_HALF_W, nextShip.x)),
        y: Math.min(height - SHIP_HALF_H, Math.max(height * 0.35, nextShip.y)),
      };
      shipRef.current = nextShip;

      // Trail.
      trailRef.current = [...trailRef.current, { x: nextShip.x, y: nextShip.y + SHIP_HALF_H * 0.6, life: 1 }]
        .map((t) => ({ ...t, life: t.life - dt * 2.5 }))
        .filter((t) => t.life > 0);

      // Auto-fire.
      if (time - lastAutoFireRef.current >= AUTO_FIRE_MS) {
        lastAutoFireRef.current = time;
        fireBullet();
      }
      if (keysRef.current.has(" ") && time - lastManualFireRef.current >= MANUAL_FIRE_MS) {
        lastManualFireRef.current = time;
        fireBullet();
      }

      // Bullets.
      bulletsRef.current = bulletsRef.current.map((b) => ({ ...b, y: b.y - BULLET_SPEED * dt })).filter((b) => b.y > -10);

      // Spawn targets.
      spawnTimerRef.current -= dt * 1000;
      if (spawnTimerRef.current <= 0) {
        const elapsed = RUN_MS - remainingMs;
        spawnTimerRef.current = Math.max(SPAWN_MS_MIN, SPAWN_MS_START - elapsed * 0.01);
        spawnTarget();
      }

      // Move targets.
      const elapsedSec = (time - startAtRef.current) / 1000;
      targetsRef.current = targetsRef.current
        .map((t) => ({
          ...t,
          y: t.y + t.vy * dt,
          x: t.baseX + Math.sin(elapsedSec * t.wobbleSpeed + t.wobblePhase) * t.wobbleAmp,
          rotation: t.rotation + t.spin * dt,
        }))
        .filter((t) => t.y - t.radius < height + 20);

      // Bullet/target collisions.
      let bullets = bulletsRef.current;
      const survivingTargets: Target[] = [];
      for (const target of targetsRef.current) {
        let hitIndex = -1;
        for (let i = 0; i < bullets.length; i++) {
          if (Math.hypot(bullets[i].x - target.x, bullets[i].y - target.y) < target.radius + BULLET_RADIUS) {
            hitIndex = i;
            break;
          }
        }
        if (hitIndex >= 0) {
          bullets = bullets.filter((_, i) => i !== hitIndex);
          explode(target.x, target.y, target.hue);
          scoreRef.current += target.points;
          setScore(scoreRef.current);
        } else {
          survivingTargets.push(target);
        }
      }
      bulletsRef.current = bullets;
      targetsRef.current = survivingTargets;

      // Particles.
      particlesRef.current = particlesRef.current
        .map((p) => ({ ...p, x: p.x + p.vx * dt, y: p.y + p.vy * dt, life: p.life - dt }))
        .filter((p) => p.life > 0);

      draw();
      rafRef.current = requestAnimationFrame(tickRef.current);
    };
  }, [draw, explode, fireBullet, spawnTarget, stop]);

  const start = useCallback(() => {
    const { width, height } = sizeRef.current;
    shipRef.current = { x: width / 2, y: height * 0.82 };
    pointerTargetRef.current = null;
    bulletsRef.current = [];
    targetsRef.current = [];
    particlesRef.current = [];
    trailRef.current = [];
    scoreRef.current = 0;
    setScore(0);
    spawnTimerRef.current = 0;
    lastAutoFireRef.current = 0;
    lastManualFireRef.current = 0;
    lastFrameRef.current = 0;
    const now = performance.now();
    startAtRef.current = now;
    endAtRef.current = now + RUN_MS;
    setTimeLeft(RUN_MS / 1000);
    statusRef.current = "playing";
    setStatus("playing");
    stop();
    rafRef.current = requestAnimationFrame(tickRef.current);
  }, [stop]);

  // Canvas sizing.
  useEffect(() => {
    function resize() {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      sizeRef.current = { width: rect.width, height: rect.height };
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      const ctx = canvas.getContext("2d");
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    }
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [draw]);

  // Keyboard controls.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const key = e.key === " " ? " " : e.key;
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "a", "d", "w", "s", " "].includes(key)) {
        e.preventDefault();
        keysRef.current.add(key);
        // Keyboard input cancels pointer-drag mode so the two don't fight.
        pointerTargetRef.current = null;
      }
    }
    function handleKeyUp(e: KeyboardEvent) {
      keysRef.current.delete(e.key === " " ? " " : e.key);
    }
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Pointer (mouse/touch) controls — drag to fly, tap for an extra burst.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function setPointerFromEvent(e: PointerEvent) {
      const rect = canvas!.getBoundingClientRect();
      pointerTargetRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    function onPointerDown(e: PointerEvent) {
      setPointerFromEvent(e);
      if (statusRef.current === "playing" && performance.now() - lastManualFireRef.current >= MANUAL_FIRE_MS) {
        lastManualFireRef.current = performance.now();
        fireBullet();
      }
    }
    function onPointerMove(e: PointerEvent) {
      if (e.buttons === 0 && e.pointerType === "mouse") return;
      setPointerFromEvent(e);
    }

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
    };
  }, [fireBullet]);

  useEffect(() => stop, [stop]);

  return (
    <section className="relative flex min-h-screen flex-col items-center gap-6 px-6 py-8 text-center">
      <PsychedelicBackground />

      <div className="relative z-10 flex-shrink-0">
        <span className="text-xs font-semibold tracking-[0.4em] text-white/60 uppercase">WHOA.</span>
        <h1 className="text-psychedelic font-display mt-2 text-5xl tracking-wide sm:text-6xl">STAY TUNED</h1>
      </div>

      <div className="relative z-10 flex w-full max-w-[380px] flex-shrink-0 flex-col items-center">
        <div className="flex items-center gap-6 text-sm text-white/70">
          <span>
            Score <span className="font-semibold text-white">{score}</span>
          </span>
          <span>
            Best <span className="text-flame-3 font-semibold">{best}</span>
          </span>
          {status === "playing" && (
            <span>
              Time <span className="font-semibold text-white">{timeLeft}s</span>
            </span>
          )}
        </div>

        <div
          ref={containerRef}
          className="relative mt-4 aspect-[3/4] w-full max-w-[380px] flex-shrink-0 touch-none overflow-hidden rounded-2xl border border-white/15 bg-black/30 shadow-[0_0_60px_-15px_rgba(255,122,0,0.5)] backdrop-blur-sm"
        >
          <canvas ref={canvasRef} className="absolute inset-0" />

          {status !== "playing" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/60 px-6 text-center backdrop-blur-sm">
              {status === "over" && (
                <>
                  <p className="font-display text-2xl text-white">Time&apos;s up!</p>
                  <p className="text-sm text-white/70">
                    You scored <span className="font-semibold text-white">{score}</span> points.
                  </p>
                </>
              )}
              <button type="button" onClick={start} className="btn-flame rounded-full px-8 py-3 text-sm font-semibold">
                {status === "over" ? "Play again" : "Launch ship"}
              </button>
              {status === "idle" && (
                <p className="max-w-[240px] text-xs text-white/60">
                  Drag to fly, or use arrow keys / WASD + space. Your ship fires on its own too — just dodge and
                  point it at the incoming targets.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="relative z-10 flex-shrink-0">
        <p className="font-display text-2xl tracking-[0.3em] text-white/80 sm:text-3xl">WHOA INCOMING</p>
      </div>
    </section>
  );
}
