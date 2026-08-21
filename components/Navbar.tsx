import Link from "next/link";
import CartLink from "@/components/CartLink";

const links = [
  { href: "/shop", label: "Shop" },
  { href: "/art-collective", label: "Art" },
  { href: "/music-collective", label: "Music" },
  { href: "/events", label: "Events" },
];

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur">
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
          <Link href="/login" className="btn-flame rounded-full px-5 py-2 text-sm">
            Log In / Sign Up
          </Link>
        </div>
      </div>
    </header>
  );
}
