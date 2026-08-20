"use client";

import { useState } from "react";
import Link from "next/link";
import { START_NODE, STORY } from "@/lib/adventure";

export default function AdventureGame() {
  const [nodeId, setNodeId] = useState(START_NODE);
  const node = STORY[nodeId];

  return (
    <div
      key={nodeId}
      className="adventure-fade card-surface relative z-10 w-full max-w-xl rounded-3xl border border-border-strong p-8 text-left shadow-[0_0_60px_-15px_rgba(123,47,247,0.6)] sm:p-10"
    >
      <span className="text-xs font-semibold tracking-[0.3em] text-flame-2 uppercase">
        {node.ending === "success"
          ? "Achievement unlocked"
          : node.ending === "fail"
            ? "A different path"
            : "Same Same But WHOA"}
      </span>

      <h1 className="text-psychedelic font-display mt-3 text-3xl leading-tight sm:text-4xl">
        {node.title}
      </h1>

      <p className="mt-5 text-base leading-relaxed text-foreground/90">{node.body}</p>

      {node.choices && (
        <div className="mt-8 flex flex-col gap-3">
          {node.choices.map((choice) => (
            <button
              key={choice.next}
              type="button"
              onClick={() => setNodeId(choice.next)}
              className="btn-flame rounded-full px-6 py-4 text-left text-sm font-semibold sm:text-base"
            >
              {choice.label}
            </button>
          ))}
        </div>
      )}

      {node.ending === "success" && (
        <div className="mt-8 rounded-2xl border border-flame-2/40 bg-black/30 p-5">
          <p className="text-sm text-muted">Show this at the WHOADEGA:</p>
          <p className="text-psychedelic font-display mt-1 text-2xl tracking-widest">WHOA-SECRET</p>
          <Link href="/shop" className="btn-flame mt-4 inline-block rounded-full px-8 py-4 text-base">
            Claim your secret gift at the WHOADEGA
          </Link>
        </div>
      )}

      {node.ending === "fail" && (
        <button
          type="button"
          onClick={() => setNodeId(START_NODE)}
          className="mt-8 rounded-full border-2 border-border-strong px-6 py-4 text-sm font-semibold tracking-wide uppercase transition-colors hover:border-flame-2"
        >
          Try again
        </button>
      )}
    </div>
  );
}
