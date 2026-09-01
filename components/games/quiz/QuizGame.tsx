"use client";

import { useRef, useState } from "react";
import { QUIZ_QUESTIONS, computeQuizResult, type QuizResult } from "@/lib/games/quiz";

const CARD_WIDTH = 540;
const CARD_HEIGHT = 960;

export default function QuizGame() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [result, setResult] = useState<QuizResult | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  function choose(resultId: string) {
    const next = [...answers, resultId];
    setAnswers(next);

    if (step + 1 >= QUIZ_QUESTIONS.length) {
      setResult(computeQuizResult(next));
    } else {
      setStep(step + 1);
    }
  }

  function restart() {
    setStep(0);
    setAnswers([]);
    setResult(null);
  }

  async function downloadCard() {
    if (!result) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    try {
      await document.fonts.load("700 64px 'Bebas Neue'");
    } catch {
      // Falls back to the default canvas font below if this doesn't load.
    }

    const gradient = ctx.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
    gradient.addColorStop(0, "#0a0806");
    gradient.addColorStop(0.5, `${result.accent}33`);
    gradient.addColorStop(1, "#0a0806");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

    ctx.textAlign = "center";
    ctx.fillStyle = "#a89686";
    ctx.font = "600 22px system-ui, sans-serif";
    ctx.fillText("WHICH WHOA PIECE ARE YOU", CARD_WIDTH / 2, 140);

    ctx.font = "120px system-ui, sans-serif";
    ctx.fillText(result.emoji, CARD_WIDTH / 2, 320);

    ctx.fillStyle = result.accent;
    ctx.font = "64px 'Bebas Neue', system-ui, sans-serif";
    wrapText(ctx, result.title.toUpperCase(), CARD_WIDTH / 2, 420, CARD_WIDTH - 80, 64);

    ctx.fillStyle = "#f7f0e6";
    ctx.font = "italic 28px system-ui, sans-serif";
    wrapText(ctx, result.tagline, CARD_WIDTH / 2, 560, CARD_WIDTH - 100, 38);

    ctx.fillStyle = "#a89686";
    ctx.font = "22px system-ui, sans-serif";
    wrapText(ctx, result.description, CARD_WIDTH / 2, 680, CARD_WIDTH - 120, 32);

    ctx.fillStyle = "#f7f0e6";
    ctx.font = "600 24px system-ui, sans-serif";
    ctx.fillText("wearewhoa.art", CARD_WIDTH / 2, CARD_HEIGHT - 60);

    const link = document.createElement("a");
    link.download = `whoa-piece-${result.id}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  if (result) {
    return (
      <div className="flex flex-col items-center">
        <div
          className="flex w-full max-w-xs flex-col items-center rounded-3xl border-2 p-8 text-center"
          style={{ borderColor: result.accent }}
        >
          <span className="text-6xl" aria-hidden>
            {result.emoji}
          </span>
          <p className="mt-3 text-xs font-semibold tracking-[0.2em] text-muted uppercase">
            You are
          </p>
          <h2 className="font-display mt-1 text-3xl tracking-wide" style={{ color: result.accent }}>
            {result.title}
          </h2>
          <p className="mt-3 text-sm text-foreground/90 italic">{result.tagline}</p>
          <p className="mt-3 text-sm text-muted">{result.description}</p>
        </div>

        <div className="mt-6 flex gap-3">
          <button type="button" onClick={downloadCard} className="btn-flame rounded-full px-6 py-3 text-sm">
            Download for Stories
          </button>
          <button
            type="button"
            onClick={restart}
            className="rounded-full border border-border-strong px-6 py-3 text-sm text-muted hover:text-foreground"
          >
            Retake quiz
          </button>
        </div>

        <canvas ref={canvasRef} width={CARD_WIDTH} height={CARD_HEIGHT} className="hidden" />
      </div>
    );
  }

  const question = QUIZ_QUESTIONS[step];

  return (
    <div className="w-full max-w-lg">
      <p className="text-xs font-semibold tracking-wide text-muted uppercase">
        Question {step + 1} of {QUIZ_QUESTIONS.length}
      </p>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="bg-flame h-full rounded-full transition-all"
          style={{ width: `${((step + 1) / QUIZ_QUESTIONS.length) * 100}%` }}
        />
      </div>

      <h2 className="font-display mt-6 text-2xl tracking-wide sm:text-3xl">{question.prompt}</h2>

      <div className="mt-6 flex flex-col gap-3">
        {question.options.map((opt) => (
          <button
            key={opt.label}
            type="button"
            onClick={() => choose(opt.resultId)}
            className="card-surface rounded-xl border border-border-strong px-5 py-4 text-left text-sm transition-colors hover:border-flame-2/60"
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(" ");
  let line = "";
  let lineY = y;

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, lineY);
      line = word;
      lineY += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line) ctx.fillText(line, x, lineY);
}
