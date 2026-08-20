import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div className="font-display text-xl tracking-wide">
          WHOA<span className="text-flame">.</span>
        </div>

        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
          <Link href="/apply" className="transition-colors hover:text-foreground">
            Apply
          </Link>
          <Link href="/login" className="transition-colors hover:text-foreground">
            Ambassador login
          </Link>
          <Link href="/ssbd-admin" className="transition-colors hover:text-foreground">
            SSBD Admin
          </Link>
          <a
            href="https://www.wearewhoa.art"
            className="transition-colors hover:text-foreground"
          >
            wearewhoa.art
          </a>
        </nav>
      </div>
      <div className="border-t border-border py-4 text-center text-xs text-muted">
        © {new Date().getFullYear()} WHOA. All rights reserved.
      </div>
    </footer>
  );
}
