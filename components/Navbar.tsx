"use client";

import Link from "next/link";
import { useState } from "react";
import CartLink from "@/components/CartLink";

const links = [
  { href: "/shop", label: "Shop" },
  { href: "/art-collective", label: "Art" },
  { href: "/music-collective", label: "Music" },
  { href: "/events", label: "Events" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-display text-2xl tracking-wide" onClick={() => setOpen(false)}>
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
          <Link href="/login" className="btn-flame rounded-full px-5 py-2 text-sm">
            Log In / Sign Up
          </Link>
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((o) => !o)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border-strong text-foreground md:hidden"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              {open ? (
                <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
              ) : (
                <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <nav id="mobile-nav" className="flex flex-col border-t border-border px-6 py-3 text-sm font-medium md:hidden">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded-lg px-2 py-3 text-muted transition-colors hover:bg-surface-raised hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
