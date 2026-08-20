import Link from "next/link";

const links = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#tiers", label: "Tiers" },
  { href: "/#faq", label: "FAQ" },
];

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-display text-2xl tracking-wide">
          WHOA<span className="text-flame">.</span>
          <span className="ml-2 hidden text-xs font-sans font-medium tracking-[0.2em] text-muted sm:inline">
            AMBASSADORS
          </span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-muted md:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="transition-colors hover:text-foreground">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden text-sm font-medium text-muted transition-colors hover:text-foreground sm:inline"
          >
            Log in
          </Link>
          <Link
            href="/apply"
            className="btn-flame rounded-full px-5 py-2 text-sm"
          >
            Apply now
          </Link>
        </div>
      </div>
    </header>
  );
}
