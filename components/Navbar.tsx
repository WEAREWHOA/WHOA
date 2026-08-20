import Link from "next/link";
import CartIndicator from "@/components/cart/CartIndicator";

const links = [
  { href: "/shop", label: "Shop" },
  { href: "/#how-it-works", label: "Ambassadors" },
  { href: "/#faq", label: "FAQ" },
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

        <div className="flex items-center gap-4">
          <CartIndicator />
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
            Become an ambassador
          </Link>
        </div>
      </div>
    </header>
  );
}
