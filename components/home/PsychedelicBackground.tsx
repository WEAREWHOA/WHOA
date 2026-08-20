"use client";

import { useEffect, useRef } from "react";

interface Blob {
  baseXFrac: number;
  baseYFrac: number;
  radius: number;
  hue: number;
  hueSpeed: number;
  driftSpeed: number;
  driftAmount: number;
  phase: number;
  parallax: number;
}

interface Star {
  xFrac: number;
  yFrac: number;
  radius: number;
  baseAlpha: number;
  twinkleSpeed: number;
  twinklePhase: number;
  parallax: number;
}

const BLOBS: Blob[] = [
  { baseXFrac: 0.2, baseYFrac: 0.25, radius: 420, hue: 320, hueSpeed: 6, driftSpeed: 0.6, driftAmount: 60, phase: 0, parallax: 40 },
  { baseXFrac: 0.8, baseYFrac: 0.2, radius: 380, hue: 265, hueSpeed: 8, driftSpeed: 0.5, driftAmount: 70, phase: 1.4, parallax: -30 },
  { baseXFrac: 0.75, baseYFrac: 0.75, radius: 460, hue: 85, hueSpeed: 5, driftSpeed: 0.4, driftAmount: 50, phase: 2.6, parallax: 50 },
  { baseXFrac: 0.25, baseYFrac: 0.78, radius: 400, hue: 190, hueSpeed: 7, driftSpeed: 0.55, driftAmount: 65, phase: 3.8, parallax: -45 },
  { baseXFrac: 0.5, baseYFrac: 0.5, radius: 340, hue: 40, hueSpeed: 9, driftSpeed: 0.7, driftAmount: 45, phase: 5.1, parallax: 25 },
];

function makeStars(count: number): Star[] {
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    const seed = i * 97.13;
    stars.push({
      xFrac: (Math.sin(seed) * 0.5 + 0.5 + i * 0.0131) % 1,
      yFrac: (Math.cos(seed * 1.7) * 0.5 + 0.5 + i * 0.0247) % 1,
      radius: 0.6 + ((i * 37) % 10) / 10,
      baseAlpha: 0.35 + ((i * 53) % 10) / 16,
      twinkleSpeed: 0.6 + ((i * 13) % 10) / 6,
      twinklePhase: (i * 71) % 628,
      parallax: 6 + (i % 3) * 4,
    });
  }
  return stars;
}

const STARS = makeStars(140);

export default function PsychedelicBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let height = 0;
    let dpr = 1;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas!.width = width * dpr;
      canvas!.height = height * dpr;
      canvas!.style.width = `${width}px`;
      canvas!.style.height = `${height}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    resize();
    window.addEventListener("resize", resize);

    const pointer = { x: 0, y: 0 };
    const pointerTarget = { x: 0, y: 0 };

    function handlePointer(clientX: number, clientY: number) {
      pointerTarget.x = (clientX / window.innerWidth) * 2 - 1;
      pointerTarget.y = (clientY / window.innerHeight) * 2 - 1;
    }

    function onPointerMove(e: PointerEvent) {
      handlePointer(e.clientX, e.clientY);
    }

    window.addEventListener("pointermove", onPointerMove, { passive: true });

    let raf = 0;

    function draw(time: number) {
      pointer.x += (pointerTarget.x - pointer.x) * 0.04;
      pointer.y += (pointerTarget.y - pointer.y) * 0.04;

      const t = time / 1000;

      ctx!.clearRect(0, 0, width, height);
      ctx!.fillStyle = "#0a0116";
      ctx!.fillRect(0, 0, width, height);

      ctx!.filter = "none";
      ctx!.globalCompositeOperation = "source-over";
      for (const star of STARS) {
        const x = star.xFrac * width + pointer.x * star.parallax;
        const y = star.yFrac * height + pointer.y * star.parallax;
        const alpha = star.baseAlpha * (0.55 + 0.45 * Math.sin(t * star.twinkleSpeed + star.twinklePhase));
        ctx!.fillStyle = `rgba(255, 255, 255, ${Math.max(alpha, 0).toFixed(3)})`;
        ctx!.beginPath();
        ctx!.arc(x, y, star.radius, 0, Math.PI * 2);
        ctx!.fill();
      }

      ctx!.filter = "blur(90px)";
      ctx!.globalCompositeOperation = "lighten";

      for (const blob of BLOBS) {
        const x = blob.baseXFrac * width + Math.sin(t * blob.driftSpeed + blob.phase) * blob.driftAmount + pointer.x * blob.parallax;
        const y = blob.baseYFrac * height + Math.cos(t * blob.driftSpeed * 0.8 + blob.phase) * blob.driftAmount + pointer.y * blob.parallax;
        const hue = (blob.hue + t * blob.hueSpeed) % 360;

        const gradient = ctx!.createRadialGradient(x, y, 0, x, y, blob.radius);
        gradient.addColorStop(0, `hsla(${hue}, 95%, 60%, 0.85)`);
        gradient.addColorStop(1, `hsla(${hue}, 95%, 60%, 0)`);

        ctx!.fillStyle = gradient;
        ctx!.beginPath();
        ctx!.arc(x, y, blob.radius, 0, Math.PI * 2);
        ctx!.fill();
      }

      if (!reduceMotion) {
        raf = requestAnimationFrame(draw);
      }
    }

    if (reduceMotion) {
      draw(0);
    } else {
      raf = requestAnimationFrame(draw);
    }

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full bg-[#0a0116]"
    />
  );
}
