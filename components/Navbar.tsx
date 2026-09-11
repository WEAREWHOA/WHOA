"use client";

import Link from "next/link";
import CartLink from "@/components/CartLink";
import ComingSoonBadge from "@/components/LockedBadge";
import { isLockedRoute } from "@/lib/lockedRoutes";
import { useLoggedIn } from "@/lib/useLoggedIn";

// The same 5 destinations as BottomNav, for desktop — primary navigation
// now lives in exactly one place conceptually, just rendered two ways
// depending on viewport. Labels are written in sentence case and set in
// caps by CSS (`uppercase`, matching BottomNav), so a screen reader still
// hears "Events" rather than spelling out E-V-E-N-T-S.
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

        <nav className="hidden items-center gap-8 text-sm font-semibold tracking-wide text-muted uppercase md:flex">
          {links.map((link) =>
            // A locked destination stays in the nav rather than vanishing
            // from it — it's still part of what WHOA is, and a nav that
            // quietly loses an item teaches a returning visitor nothing.
            isLockedRoute(link.href) ? (
              <span
                key={link.href}
                aria-disabled="true"
                aria-label={`${link.label} — coming soon`}
                className="flex cursor-default flex-col items-center gap-0.5 leading-none text-muted/60 select-none"
              >
                {link.label}
                <ComingSoonBadge className="text-[0.5rem] tracking-[0.1em]" />
              </span>
            ) : (
              <Link key={link.href} href={link.href} className="transition-colors hover:text-foreground">
                {link.label}
              </Link>
            ),
          )}
        </nav>

        <div className="flex items-center gap-3">
          <CartLink />
          <Link
            href={loggedIn ? "/portal" : "/login"}
            className="btn-flame hidden rounded-full px-5 py-2 text-xs tracking-wide uppercase md:inline-block"
          >
            {loggedIn ? "You" : "Log In / Sign Up"}
          </Link>
        </div>
      </div>
    </header>
  );
}
