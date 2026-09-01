"use client";

import { useRef, useState } from "react";
import { formatCents } from "@/lib/money";
import { LAYER_CATEGORIES, categorizeProduct, type LayerCategory } from "@/lib/games/outfitLayers";
import type { Product } from "@/lib/types";

const BOARD_WIDTH = 800;
const BOARD_HEIGHT = 1000;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export default function OutfitBuilder({ products }: { products: Product[] }) {
  const byCategory = new Map<LayerCategory, Product[]>();
  for (const product of products) {
    const category = categorizeProduct(product.name);
    if (!byCategory.has(category)) byCategory.set(category, []);
    byCategory.get(category)!.push(product);
  }

  const [activeTab, setActiveTab] = useState<LayerCategory>("top");
  const [picks, setPicks] = useState<Partial<Record<LayerCategory, Product>>>({});
  const [downloadState, setDownloadState] = useState<"idle" | "working" | "error">("idle");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const selected = LAYER_CATEGORIES.map((c) => picks[c.id]).filter((p): p is Product => Boolean(p));

  function toggle(category: LayerCategory, product: Product) {
    setPicks((prev) => ({
      ...prev,
      [category]: prev[category]?.id === product.id ? undefined : product,
    }));
    setDownloadState("idle");
  }

  async function download() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || selected.length === 0) return;

    setDownloadState("working");

    ctx.clearRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);
    const gradient = ctx.createLinearGradient(0, 0, BOARD_WIDTH, BOARD_HEIGHT);
    gradient.addColorStop(0, "#0a0806");
    gradient.addColorStop(1, "#1c1610");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);

    ctx.fillStyle = "#a89686";
    ctx.font = "600 20px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("MY WHOADEGA FIT", BOARD_WIDTH / 2, 50);

    const cardSize = 320;
    const positions = [
      { x: 240, y: 130, rotate: -4 },
      { x: 560, y: 100, rotate: 3 },
      { x: 120, y: 480, rotate: 2 },
      { x: 480, y: 500, rotate: -3 },
      { x: 300, y: 780, rotate: 4 },
    ];

    try {
      for (let i = 0; i < selected.length; i++) {
        const product = selected[i];
        const pos = positions[i % positions.length];
        if (!product.imageUrl) continue;
        const img = await loadImage(product.imageUrl);

        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.rotate((pos.rotate * Math.PI) / 180);
        ctx.fillStyle = "#f7f0e6";
        ctx.fillRect(-cardSize / 2 - 10, -cardSize / 2 - 10, cardSize + 20, cardSize + 60);
        ctx.drawImage(img, -cardSize / 2, -cardSize / 2, cardSize, cardSize);
        ctx.fillStyle = "#14100c";
        ctx.font = "600 16px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(product.name.slice(0, 28), 0, cardSize / 2 + 30);
        ctx.restore();
      }

      ctx.fillStyle = "#a89686";
      ctx.font = "600 16px system-ui, sans-serif";
      ctx.fillText("wearewhoa.art", BOARD_WIDTH / 2, BOARD_HEIGHT - 30);

      const link = document.createElement("a");
      link.download = "my-whoadega-fit.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
      setDownloadState("idle");
    } catch {
      // Most likely a tainted canvas from a product image with no CORS
      // headers — no way to force that from here, so fall back honestly.
      setDownloadState("error");
    }
  }

  return (
    <div className="w-full">
      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="flex flex-wrap gap-2">
            {LAYER_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveTab(cat.id)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  activeTab === cat.id
                    ? "btn-flame"
                    : "border border-border-strong text-muted hover:text-foreground"
                }`}
              >
                {cat.label}
                {picks[cat.id] && <span className="text-flame-2 ml-1">•</span>}
              </button>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {(byCategory.get(activeTab) ?? []).length === 0 ? (
              <p className="col-span-full text-sm text-muted">Nothing in this category yet.</p>
            ) : (
              byCategory.get(activeTab)!.map((product) => {
                const isPicked = picks[activeTab]?.id === product.id;
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => toggle(activeTab, product)}
                    className={`card-surface flex flex-col overflow-hidden rounded-xl border text-left transition-colors ${
                      isPicked ? "border-flame-2" : "border-border hover:border-flame-2/50"
                    }`}
                  >
                    <div className="bg-surface-raised aspect-square w-full overflow-hidden">
                      {product.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[0.6rem] text-muted">
                          WHOA
                        </div>
                      )}
                    </div>
                    <div className="p-2">
                      <p className="truncate text-xs font-semibold">{product.name}</p>
                      {product.variations[0] && (
                        <p className="text-flame text-xs">{formatCents(product.variations[0].priceCents)}</p>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold tracking-wide text-muted uppercase">Your fit</p>
          <div className="card-surface mt-3 flex min-h-[280px] flex-col gap-2 rounded-2xl border border-border p-4">
            {selected.length === 0 ? (
              <p className="text-sm text-muted">Pick something from each category to build a fit.</p>
            ) : (
              selected.map((product) => (
                <div key={product.id} className="flex items-center gap-3">
                  <div className="bg-surface-raised h-12 w-12 shrink-0 overflow-hidden rounded-lg">
                    {product.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                    )}
                  </div>
                  <p className="truncate text-sm">{product.name}</p>
                </div>
              ))
            )}
          </div>

          <button
            type="button"
            onClick={download}
            disabled={selected.length === 0 || downloadState === "working"}
            className="btn-flame mt-4 w-full rounded-full px-6 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            {downloadState === "working" ? "Building your fit…" : "Download my fit"}
          </button>

          {downloadState === "error" && (
            <p className="mt-2 text-xs text-flame-3">
              Couldn&apos;t generate the download — take a screenshot of your picks above instead.
            </p>
          )}
        </div>
      </div>

      <canvas ref={canvasRef} width={BOARD_WIDTH} height={BOARD_HEIGHT} className="hidden" />
    </div>
  );
}
