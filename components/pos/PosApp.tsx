"use client";

import { useState } from "react";
import Link from "next/link";
import CheckoutTab from "@/components/pos/tabs/CheckoutTab";
import InventoryTab from "@/components/pos/tabs/InventoryTab";
import TransactionsTab from "@/components/pos/tabs/TransactionsTab";
import NotificationsTab from "@/components/pos/tabs/NotificationsTab";
import MoreTab from "@/components/pos/tabs/MoreTab";
import PosTabBar from "@/components/pos/PosTabBar";
import type { PosOrderSummary } from "@/lib/posOrders";
import type { Product } from "@/lib/types";

export type PosTab = "checkout" | "inventory" | "transactions" | "notifications" | "more";

export default function PosApp({
  products,
  orders,
}: {
  products: Product[];
  orders: PosOrderSummary[];
}) {
  const [tab, setTab] = useState<PosTab>("checkout");

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <header className="border-border flex shrink-0 items-center justify-between border-b px-4 py-3">
        <Link href="/" className="font-display text-sm tracking-wide text-muted hover:text-foreground">
          ← WHOA<span className="text-flame">.</span>
        </Link>
        <span className="text-xs font-semibold tracking-[0.2em] text-muted uppercase">WHOADEGA</span>
      </header>

      {tab === "checkout" && <CheckoutTab products={products} />}
      {tab === "inventory" && <InventoryTab products={products} />}
      {tab === "transactions" && <TransactionsTab orders={orders} />}
      {tab === "notifications" && <NotificationsTab orders={orders} />}
      {tab === "more" && <MoreTab onNavigate={setTab} />}

      <PosTabBar active={tab} onChange={setTab} />
    </div>
  );
}
