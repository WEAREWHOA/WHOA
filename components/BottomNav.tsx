"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useLoggedIn } from "@/lib/useLoggedIn";

function EventsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M3 9h18M8 2v4M16 2v4" />
    </svg>
  );
}

function JoinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
      <path d="M16.5 4.5c1.6.5 2.7 2 2.7 3.5s-1.1 3-2.7 3.5M22 20c0-2.9-2-5-4.5-5.7" />
    </svg>
  );
}

function ShopIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M6 6h15l-1.5 9h-12z" />
      <path d="M6 6 5 3H2" />
      <circle cx="9" cy="20" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="18" cy="20" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

function YouIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20c0-4.1 3.4-7 7.5-7s7.5 2.9 7.5 7" />
    </svg>
  );
}

function AboutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6M12 7.5v.01" />
    </svg>
  );
}

export default function BottomNav() {
  const loggedIn = useLoggedIn();
  const pathname = usePathname() ?? "";

  const tabs: { href: string; label: string; icon: ReactNode; active: boolean }[] = [
    { href: "/events", label: "Events", icon: <EventsIcon />, active: pathname.startsWith("/events") },
    { href: "/join", label: "Join", icon: <JoinIcon />, active: pathname.startsWith("/join") },
    { href: "/shop", label: "Shop", icon: <ShopIcon />, active: pathname.startsWith("/shop") || pathname.startsWith("/cart") },
    {
      href: loggedIn ? "/portal" : "/login",
      label: "You",
      icon: <YouIcon />,
      active: pathname.startsWith("/portal") || pathname.startsWith("/login"),
    },
    { href: "/about-us", label: "About Us", icon: <AboutIcon />, active: pathname.startsWith("/about") },
  ];

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="grid grid-cols-5">
        {tabs.map((tab) => (
          <Link
            key={tab.label}
            href={tab.href}
            aria-current={tab.active ? "page" : undefined}
            className={`flex flex-col items-center gap-1 py-2.5 text-[0.65rem] font-semibold tracking-wide uppercase transition-colors ${
              tab.active ? "text-flame-2" : "text-muted hover:text-foreground"
            }`}
          >
            {tab.icon}
            {tab.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
