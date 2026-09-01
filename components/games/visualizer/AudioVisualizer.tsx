"use client";

import { useEffect, useRef, useState } from "react";
import {
  PALETTES,
  drawBars,
  drawRadial,
  drawRibbon,
  type VisualizerMode,
  type VisualizerPalette,
} from "@/lib/games/visualizer";

type Status = "idle" | "requesting" | "running" | "denied" | "error";

export default function AudioVisualizer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);

  const [status, setStatus] = useState<Status>("idle");
  const [mode, setMode] = useState<VisualizerMode>("bars");
  const [palette, setPalette] = useState<VisualizerPalette>(PALETTES[0]);
  const [sensitivity, setSensitivity] = useState(1.5);
  const [smoothing, setSmoothing] = useState(0.8);

  const modeRef = useRef(mode);
  const paletteRef = useRef(palette);
  const sensitivityRef = useRef(sensitivity);

  useEffect(() => {
    modeRef.current = mode;
    paletteRef.current = palette;
    sensitivityRef.current = sensitivity;
  }, [mode, palette, sensitivity]);

  useEffect(() => {
    if (analyserRef.current) analyserRef.current.smoothingTimeConstant = smoothing;
  }, [smoothing]);

  async function start() {
    setStatus("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioContext = new AudioCtx();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = smoothing;
      source.connect(analyser);
      analyserRef.current = analyser;

      setStatus("running");
      runLoop();
    } catch {
      setStatus("denied");
    }
  }

  function stop() {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    audioContextRef.current?.close();
    streamRef.current = null;
    audioContextRef.current = null;
    analyserRef.current = null;
    setStatus("idle");
  }

  function runLoop() {
    const freqData = new Uint8Array(2048);
    const timeData = new Uint8Array(2048);
    const startedAt = performance.now();

    function frame() {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      const analyser = analyserRef.current;
      if (!canvas || !ctx || !analyser) return;

      const time = performance.now() - startedAt;
      const opts = { palette: paletteRef.current, sensitivity: sensitivityRef.current, time };

      if (modeRef.current === "ribbon") {
        analyser.getByteTimeDomainData(timeData);
        drawRibbon(ctx, timeData, canvas.width, canvas.height, opts);
      } else {
        analyser.getByteFrequencyData(freqData);
        if (modeRef.current === "bars") drawBars(ctx, freqData, canvas.width, canvas.height, opts);
        else drawRadial(ctx, freqData, canvas.width, canvas.height, opts);
      }

      rafRef.current = requestAnimationFrame(frame);
    }

    rafRef.current = requestAnimationFrame(frame);
  }

  useEffect(() => {
    function resize() {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    }
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      audioContextRef.current?.close();
    };
  }, []);

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  return (
    <div className="w-full">
      <div
        ref={containerRef}
        className="relative aspect-video w-full overflow-hidden rounded-2xl border border-border-strong bg-[#0a0806]"
      >
        <canvas ref={canvasRef} className="h-full w-full" />

        {status !== "running" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background/90 px-6 text-center">
            {status === "denied" ? (
              <>
                <p className="text-flame-3 text-sm">
                  Mic access was denied — allow it in your browser to run the visualizer.
                </p>
                <button type="button" onClick={start} className="btn-flame rounded-full px-8 py-3 text-sm">
                  Try again
                </button>
              </>
            ) : status === "error" ? (
              <p className="text-flame-3 text-sm">Couldn&apos;t start — try again in a moment.</p>
            ) : (
              <>
                <p className="max-w-xs text-sm text-muted">
                  Uses your mic to react to whatever&apos;s playing in the room. Nothing is
                  recorded or sent anywhere — it&apos;s only analyzed live, in your browser.
                </p>
                <button
                  type="button"
                  onClick={start}
                  disabled={status === "requesting"}
                  className="btn-flame rounded-full px-8 py-3 text-sm disabled:opacity-50"
                >
                  {status === "requesting" ? "Requesting mic…" : "Start visualizer"}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-6">
        <div className="flex gap-2">
          {(["bars", "radial", "ribbon"] as VisualizerMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-full px-4 py-2 text-xs font-semibold uppercase transition-colors ${
                mode === m ? "btn-flame" : "border border-border-strong text-muted hover:text-foreground"
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          {PALETTES.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPalette(p)}
              aria-label={p.label}
              className={`h-8 w-8 rounded-full border-2 transition-transform ${
                palette.id === p.id ? "scale-110 border-white" : "border-transparent"
              }`}
              style={{ background: `linear-gradient(90deg, ${p.colors.join(",")})` }}
            />
          ))}
        </div>
      </div>

      <div className="mx-auto mt-6 flex max-w-md flex-col gap-4">
        <label className="flex items-center gap-3 text-xs text-muted">
          Sensitivity
          <input
            type="range"
            min="0.5"
            max="3"
            step="0.1"
            value={sensitivity}
            onChange={(e) => setSensitivity(Number(e.target.value))}
            className="flex-1"
          />
        </label>
        <label className="flex items-center gap-3 text-xs text-muted">
          Smoothing
          <input
            type="range"
            min="0"
            max="0.95"
            step="0.05"
            value={smoothing}
            onChange={(e) => setSmoothing(Number(e.target.value))}
            className="flex-1"
          />
        </label>
      </div>

      <div className="mt-6 flex justify-center gap-3">
        {status === "running" && (
          <button
            type="button"
            onClick={toggleFullscreen}
            className="rounded-full border border-border-strong px-5 py-2.5 text-sm text-muted hover:text-foreground"
          >
            Fullscreen
          </button>
        )}
        {status === "running" && (
          <button
            type="button"
            onClick={stop}
            className="rounded-full border border-border-strong px-5 py-2.5 text-sm text-muted hover:text-foreground"
          >
            Stop
          </button>
        )}
      </div>
    </div>
  );
}
