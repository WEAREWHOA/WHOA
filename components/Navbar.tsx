"use client";

import Link from "next/link";
import CartLink from "@/components/CartLink";
import { useLoggedIn } from "@/lib/useLoggedIn";

// The same 5 destinations as BottomNav, for desktop — primary navigation
// now lives in exactly one place conceptually, just rendered two ways
// depending on viewport.
const links = [
  { href: "/events", label: "Events" },
  { href: "/join", label: "Join" },
  { href: "/shop", label: "Shop" },
  { href: "/about", label: "About" },
];

export default function Navbar() {
  const loggedIn = useLoggedIn();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-display text-2xl tracking-wide">
          WHOA<span className="text-flame">.</span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-muted md:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="transition-colors hover:text-foreground">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <CartLink />
          <Link
            href={loggedIn ? "/portal" : "/login"}
            className="btn-flame hidden rounded-full px-5 py-2 text-sm md:inline-block"
          >
            {loggedIn ? "You" : "Log In / Sign Up"}
          </Link>
        </div>
      </div>
    </header>
  );
}
