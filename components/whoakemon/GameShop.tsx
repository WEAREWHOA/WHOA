"use client";

import { useMemo, useState } from "react";

import { useCart } from "@/components/cart/CartProvider";
import { formatCents } from "@/lib/money";
import type { GameCatalogue, GameItem } from "./shopData";

/**
 * The shop, over the game screen.
 *
 * Categories, then items, then one item with its photo, its price
 * and a button that puts it in the site's real basket. Not a replica
 * of the shop: the same catalogue the website reads, and the same
 * cart, so something added in here is in the bag at checkout.
 *
 * It is a panel of real buttons rather than a tile grid driven by
 * the D-pad. That is deliberate. A list of products is a list, and
 * making somebody step a cursor down thirty items with an arrow key
 * is a worse way to buy a hoodie than a scrollbar, however much more
 * authentic it would be. B still closes it, so the console's own
 * control still does the console's own thing.
 */

type View =
  | { at: "categories" }
  | { at: "items"; category: string }
  | { at: "item"; category: string; item: GameItem };

export default function GameShop({
  catalogue,
  shopName,
  onClose,
  onSay,
}: {
  catalogue: GameCatalogue;
  shopName: string;
  onClose: () => void;
  onSay: (line: string) => void;
}) {
  const { addLine } = useCart();
  const [view, setView] = useState<View>({ at: "categories" });
  const [variationId, setVariationId] = useState<string | null>(null);

  const byCategory = useMemo(() => {
    const m = new Map<string, GameItem[]>();
    for (const item of catalogue.items) {
      for (const c of item.categories) {
        const list = m.get(c) ?? [];
        list.push(item);
        m.set(c, list);
      }
    }
    return m;
  }, [catalogue.items]);

  function add(item: GameItem) {
    const variation =
      item.variations.find((v) => v.id === variationId) ?? item.variations[0];
    addLine({
      variationId: variation.id,
      productId: item.id,
      productName: item.name,
      variationName: variation.name,
      priceCents: variation.priceCents,
      imageUrl: item.imageUrl,
    });
    onSay(`${item.name} is in the bag.`);
  }

  return (
    <div className="whoa-gs" role="dialog" aria-label={`${shopName} shop`}>
      <div className="whoa-gs-bar">
        <button
          type="button"
          onClick={() =>
            view.at === "categories"
              ? onClose()
              : setView(
                  view.at === "item" ? { at: "items", category: view.category } : { at: "categories" },
                )
          }
        >
          ◀ {view.at === "categories" ? "Leave" : "Back"}
        </button>
        <span className="whoa-gs-title">
          {view.at === "categories" ? shopName : view.at === "items" ? view.category : view.item.name}
        </span>
        <button type="button" onClick={onClose} aria-label="Close the shop">
          ✕
        </button>
      </div>

      <div className="whoa-gs-body">
        {catalogue.error && <p className="whoa-gs-empty">{catalogue.error}</p>}

        {!catalogue.error && view.at === "categories" && (
          catalogue.categories.length === 0 ? (
            <p className="whoa-gs-empty">Nothing on the shelves right now.</p>
          ) : (
            <ul className="whoa-gs-list">
              {catalogue.categories.map((c) => (
                <li key={c}>
                  <button type="button" onClick={() => setView({ at: "items", category: c })}>
                    <span>{c}</span>
                    <span className="whoa-gs-count">{byCategory.get(c)?.length ?? 0} ▸</span>
                  </button>
                </li>
              ))}
            </ul>
          )
        )}

        {view.at === "items" && (
          <ul className="whoa-gs-grid">
            {(byCategory.get(view.category) ?? []).map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    setVariationId(item.variations[0]?.id ?? null);
                    setView({ at: "item", category: view.category, item });
                  }}
                >
                  <span className="whoa-gs-thumb">
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.imageUrl} alt="" loading="lazy" decoding="async" />
                    ) : (
                      <span className="whoa-gs-nothumb" aria-hidden />
                    )}
                  </span>
                  <span className="whoa-gs-name">{item.name}</span>
                  <span className="whoa-gs-price">
                    {formatCents(item.variations[0]?.priceCents ?? 0)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {view.at === "item" && (
          <div className="whoa-gs-detail">
            <div className="whoa-gs-shot">
              {view.item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={view.item.imageUrl} alt={view.item.name} decoding="async" />
              ) : (
                <span className="whoa-gs-nothumb" aria-hidden />
              )}
            </div>

            <p className="whoa-gs-detail-price">
              {formatCents(
                (view.item.variations.find((v) => v.id === variationId) ?? view.item.variations[0])
                  ?.priceCents ?? 0,
              )}
            </p>

            {view.item.blurb && <p className="whoa-gs-blurb">{view.item.blurb}</p>}

            {/* Only when there is a choice to make. A size picker with
                one size in it is a question nobody asked. */}
            {view.item.variations.length > 1 && (
              <div className="whoa-gs-sizes">
                {view.item.variations.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    data-on={v.id === variationId ? "yes" : "no"}
                    onClick={() => setVariationId(v.id)}
                  >
                    {v.name}
                  </button>
                ))}
              </div>
            )}

            <button type="button" className="whoa-gs-add" onClick={() => add(view.item)}>
              Add to cart
            </button>

            <a className="whoa-gs-full" href={`/shop/${view.item.slug}`}>
              See the full listing ▸
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
