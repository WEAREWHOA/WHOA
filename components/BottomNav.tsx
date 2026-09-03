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

function ShopIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
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
  const shopActive = pathname.startsWith("/shop") || pathname.startsWith("/cart");

  const sideTabs: { href: string; label: string; icon: ReactNode; active: boolean }[] = [
    { href: "/events", label: "Events", icon: <EventsIcon />, active: pathname.startsWith("/events") },
    { href: "/join", label: "Join", icon: <JoinIcon />, active: pathname.startsWith("/join") },
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
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 shadow-[0_-12px_32px_-16px_rgba(255,122,0,0.3)] backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="relative grid grid-cols-5">
        {sideTabs.slice(0, 2).map((tab) => (
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

        {/* Shop — raised above the bar, Etsy/native-app "primary action" style. */}
        <div className="flex flex-col items-center justify-start">
          <Link
            href="/shop"
            aria-current={shopActive ? "page" : undefined}
            aria-label="Shop"
            className="btn-flame -mt-7 flex h-14 w-14 items-center justify-center rounded-full border-4 border-background shadow-[0_6px_24px_-4px_rgba(255,122,0,0.6)] transition-transform hover:-translate-y-0.5"
          >
            <ShopIcon className="h-6 w-6" />
          </Link>
          <span
            className={`mt-1 text-[0.65rem] font-semibold tracking-wide uppercase ${
              shopActive ? "text-flame-2" : "text-muted"
            }`}
          >
            Shop
          </span>
        </div>

        {sideTabs.slice(2).map((tab) => (
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
