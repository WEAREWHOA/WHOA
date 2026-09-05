import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div className="font-display text-xl tracking-wide">
          WHOA<span className="text-flame">.</span>
        </div>

        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
          <Link href="/about" className="transition-colors hover:text-foreground">
            About
          </Link>
          <Link href="/contact" className="transition-colors hover:text-foreground">
            Contact
          </Link>
          <Link href="/faq" className="transition-colors hover:text-foreground">
            FAQ
          </Link>
          <Link href="/shipping-policy" className="transition-colors hover:text-foreground">
            Shipping
          </Link>
          <Link href="/return-policy" className="transition-colors hover:text-foreground">
            Returns
          </Link>
          <Link href="/privacy-policy" className="transition-colors hover:text-foreground">
            Privacy
          </Link>
          <Link href="/terms-of-service" className="transition-colors hover:text-foreground">
            Terms
          </Link>
          <Link href="/apply" className="transition-colors hover:text-foreground">
            Apply
          </Link>
          <Link href="/site-concept" className="transition-colors hover:text-foreground">
            Site Concept
          </Link>
          <Link href="/login" className="transition-colors hover:text-foreground">
            Ambassador login
          </Link>
        </nav>
      </div>
      <div className="border-t border-border py-4 text-center text-xs text-muted">
        © {new Date().getFullYear()} WHOA. All rights reserved.
      </div>
    </footer>
  );
}
