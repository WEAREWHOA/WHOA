"use client";

import Link from "next/link";
import { useCart } from "./CartProvider";

export default function CartIndicator() {
  const { itemCount } = useCart();

  return (
    <Link
      href="/cart"
      className="flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-foreground"
    >
      Cart
      {itemCount > 0 && (
        <span className="bg-flame-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-semibold text-[#14100c]">
          {itemCount}
        </span>
      )}
    </Link>
  );
}
