import Link from "next/link";

import FooterSignup from "@/components/newsletter/FooterSignup";

export default function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-col gap-6">
          <div className="font-display text-xl tracking-wide">
            WHOA<span className="text-flame">.</span>
          </div>
          <FooterSignup />
        </div>

        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted lg:justify-end">
          <Link href="/about" className="transition-colors hover:text-foreground">
            About
          </Link>
          <Link href="/stores" className="transition-colors hover:text-foreground">
            Locations
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
          <Link href="/join" className="transition-colors hover:text-foreground">
            Apply
          </Link>
          {/* Site Concept is still live at /site-concept for anyone with
              the link — it's just not something the footer offers a
              shopper. The Oasis catalogue has been taken down entirely. */}
        </nav>
      </div>
      <div className="border-t border-border py-4 text-center text-xs text-muted">
        © {new Date().getFullYear()} WHOA. All rights reserved.
      </div>
    </footer>
  );
}
