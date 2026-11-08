"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { useCart } from "@/components/cart/CartProvider";
import { formatCents } from "@/lib/money";
import { COMMISSION_RATE, CUSTOMER_DISCOUNT, TIERS } from "@/lib/tiers";
import { CARD_PRICE_CENTS, MEMBER_PERKS } from "@/lib/whoaPerks";
import type { GameEvent, GamePanels } from "./panelData";
import type { GameItem } from "./shopData";

/**
 * What is behind each counter.
 *
 * Every attendant hands over their building's real contents rather
 * than a link to a page about them: the shop its Square catalogue,
 * the Events Hall the live calendar, the crew its actual tiers and
 * rates, the lab the card and its perks. Same chrome round all four,
 * because they are the same gesture from the player's side, and one
 * shell means the back button behaves identically everywhere.
 *
 * Real buttons in a scrolling panel, not a cursor stepped with the
 * D-pad. A list of thirty products is a list, and arrowing through
 * it to buy a hoodie is worse than a scrollbar however much more
 * faithful it would be. B still closes it.
 */

export type PanelId = "shop" | "events" | "crew" | "card";

export default function GamePanel({
  panel,
  panels,
  title,
  onClose,
  onSay,
}: {
  panel: PanelId;
  panels: GamePanels;
  title: string;
  onClose: () => void;
  onSay: (line: string) => void;
}) {
  // Held as a wrapper rather than bare, because React treats a
  // function passed to a setter as an updater and calls it: storing
  // `() => goBack()` ran goBack immediately and stored undefined,
  // which made every list row bounce straight back to the list it
  // came from. The extra arrow is what makes it a value.
  const [back, setBack] = useState<{ go: () => void } | null>(null);
  const [heading, setHeading] = useState<string | null>(null);

  return (
    <div className="whoa-gs" role="dialog" aria-label={`${title}`}>
      <div className="whoa-gs-bar">
        <button
          type="button"
          onClick={() => (back ? back.go() : onClose())}
        >
          ◀ {back ? "Back" : "Leave"}
        </button>
        <span className="whoa-gs-title">{heading ?? title}</span>
        <button type="button" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>

      <div className="whoa-gs-body">
        {panel === "shop" && (
          <ShopPanel
            catalogue={panels.catalogue}
            onSay={onSay}
            setBack={setBack}
            setHeading={setHeading}
          />
        )}
        {panel === "events" && (
          <EventsPanel
            events={panels.events}
            error={panels.eventsError}
            setBack={setBack}
            setHeading={setHeading}
          />
        )}
        {panel === "crew" && <CrewPanel />}
        {panel === "card" && <CardPanel />}
      </div>
    </div>
  );
}

type Nav = {
  setBack: (f: { go: () => void } | null) => void;
  setHeading: (h: string | null) => void;
};

/* ───── The shop ───── */

function ShopPanel({
  catalogue,
  onSay,
  setBack,
  setHeading,
}: { catalogue: GamePanels["catalogue"]; onSay: (l: string) => void } & Nav) {
  const { addLine } = useCart();
  const [category, setCategory] = useState<string | null>(null);
  const [item, setItem] = useState<GameItem | null>(null);
  const [variationId, setVariationId] = useState<string | null>(null);

  const byCategory = useMemo(() => {
    const m = new Map<string, GameItem[]>();
    for (const i of catalogue.items) {
      for (const c of i.categories) m.set(c, [...(m.get(c) ?? []), i]);
    }
    return m;
  }, [catalogue.items]);

  // Told to the shell rather than kept here, so one back button
  // serves every panel and they cannot disagree about what it does.
  function go(next: { category?: string | null; item?: GameItem | null }) {
    const c = next.category !== undefined ? next.category : category;
    const i = next.item !== undefined ? next.item : item;
    setCategory(c);
    setItem(i);
    setVariationId(i?.variations[0]?.id ?? null);
    setHeading(i ? i.name : c);
    setBack(
      i
        ? { go: () => go({ item: null }) }
        : c
          ? { go: () => go({ category: null, item: null }) }
          : null,
    );
  }

  if (catalogue.error) return <p className="whoa-gs-empty">{catalogue.error}</p>;

  if (item) {
    const chosen = item.variations.find((v) => v.id === variationId) ?? item.variations[0];
    return (
      <div className="whoa-gs-detail">
        <div className="whoa-gs-shot">
          {item.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.imageUrl} alt={item.name} decoding="async" />
          ) : (
            <span className="whoa-gs-nothumb" aria-hidden />
          )}
        </div>
        <p className="whoa-gs-detail-price">{formatCents(chosen?.priceCents ?? 0)}</p>
        {item.blurb && <p className="whoa-gs-blurb">{item.blurb}</p>}
        {item.variations.length > 1 && (
          <div className="whoa-gs-sizes">
            {item.variations.map((v) => (
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
        <button
          type="button"
          className="whoa-gs-add"
          onClick={() => {
            addLine({
              variationId: chosen.id,
              productId: item.id,
              productName: item.name,
              variationName: chosen.name,
              priceCents: chosen.priceCents,
              imageUrl: item.imageUrl,
            });
            onSay(`${item.name} is in the bag.`);
          }}
        >
          Add to cart
        </button>
        <Link className="whoa-gs-full" href={`/shop/${item.slug}`}>
          See the full listing ▸
        </Link>
      </div>
    );
  }

  if (category) {
    return (
      <ul className="whoa-gs-grid">
        {(byCategory.get(category) ?? []).map((i) => (
          <li key={i.id}>
            <button type="button" onClick={() => go({ item: i })}>
              <span className="whoa-gs-thumb">
                {i.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={i.imageUrl} alt="" loading="lazy" decoding="async" />
                ) : (
                  <span className="whoa-gs-nothumb" aria-hidden />
                )}
              </span>
              <span className="whoa-gs-name">{i.name}</span>
              <span className="whoa-gs-price">
                {formatCents(i.variations[0]?.priceCents ?? 0)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    );
  }

  if (catalogue.categories.length === 0) {
    return <p className="whoa-gs-empty">Nothing on the shelves right now.</p>;
  }

  return (
    <ul className="whoa-gs-list">
      {catalogue.categories.map((c) => (
        <li key={c}>
          <button type="button" onClick={() => go({ category: c })}>
            <span>{c}</span>
            <span className="whoa-gs-count">{byCategory.get(c)?.length ?? 0} ▸</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/* ───── The calendar ───── */

function EventsPanel({
  events,
  error,
  setBack,
  setHeading,
}: { events: GameEvent[]; error: string | null } & Nav) {
  const [open, setOpen] = useState<GameEvent | null>(null);

  function show(e: GameEvent | null) {
    setOpen(e);
    setHeading(e ? e.title : null);
    setBack(e ? { go: () => show(null) } : null);
  }

  if (error) return <p className="whoa-gs-empty">{error}</p>;
  if (events.length === 0) {
    return <p className="whoa-gs-empty">Nothing on the calendar right now.</p>;
  }

  if (open) {
    return (
      <div className="whoa-gs-detail">
        <div className="whoa-gs-shot">
          {open.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={open.imageUrl} alt={open.title} decoding="async" />
          ) : (
            <span className="whoa-gs-nothumb" aria-hidden />
          )}
        </div>
        <p className="whoa-gs-detail-price">
          {open.priceCents === null ? "Free" : formatCents(open.priceCents)}
        </p>
        <p className="whoa-gs-blurb">
          {open.dateLabel} · {open.timeLabel}
          <br />
          {open.venue}, {open.location}
          {open.lineup.length > 0 && (
            <>
              <br />
              {open.lineup.join(" · ")}
            </>
          )}
        </p>
        <Link className="whoa-gs-add" href={open.href}>
          {open.priceCents === null ? "RSVP" : "Get tickets"}
        </Link>
      </div>
    );
  }

  return (
    <ul className="whoa-gs-list">
      {events.map((e) => (
        <li key={e.id}>
          <button type="button" onClick={() => show(e)}>
            <span>
              {e.title}
              <span className="whoa-gs-sub">
                {e.dateLabel} · {e.venue}
              </span>
            </span>
            <span className="whoa-gs-count">
              {e.priceCents === null ? "Free" : formatCents(e.priceCents)} ▸
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/* ───── The crew ───── */

function CrewPanel() {
  return (
    <div className="whoa-gs-read">
      <p className="whoa-gs-detail-price">{Math.round(COMMISSION_RATE * 100)}%</p>
      <p className="whoa-gs-blurb">
        on every sale made with your code, and {Math.round(CUSTOMER_DISCOUNT * 100)}% off for
        whoever uses it. Your code and your link are yours from the day you are in.
      </p>
      {TIERS.map((tier) => (
        <div key={tier.id} className="whoa-gs-tier">
          <p className="whoa-gs-tier-head" style={{ color: tier.color }}>
            {tier.label}
            <span>{tier.minOrders === 0 ? "from the start" : `${tier.minOrders}+ orders`}</span>
          </p>
          <ul>
            {tier.perks.map((perk) => (
              <li key={perk}>{perk}</li>
            ))}
          </ul>
        </div>
      ))}
      <Link className="whoa-gs-add" href="/join">
        Join the crew
      </Link>
    </div>
  );
}

/* ───── The card ───── */

function CardPanel() {
  return (
    <div className="whoa-gs-read">
      <p className="whoa-gs-detail-price">{formatCents(CARD_PRICE_CENTS)}</p>
      <p className="whoa-gs-blurb">
        A metal card, over the counter at the WHOADEGA while they last. The{" "}
        {formatCents(CARD_PRICE_CENTS)} goes straight onto your balance, so it pays for itself,
        and the perks come with it.
      </p>
      <ul className="whoa-gs-perks">
        {MEMBER_PERKS.map((perk) => (
          <li key={perk.title}>
            <strong>{perk.title}</strong>
            {perk.detail && <span>{perk.detail}</span>}
          </li>
        ))}
      </ul>
      <Link className="whoa-gs-add" href="/whoa-card">
        Get a WHOA card
      </Link>
    </div>
  );
}
