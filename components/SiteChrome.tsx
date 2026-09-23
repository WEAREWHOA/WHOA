"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BottomNav from "@/components/BottomNav";

export default function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // The POS register is a standalone app screen, not a marketing page — no
  // site nav/footer wrapped around it, same as the home hub. The Oasis
  // catalogue is the same idea: its own place, entered from the footer,
  // with its own header and no WHOA chrome around it.
  const isImmersive =
    pathname === "/" ||
    pathname?.startsWith("/pos") ||
    pathname?.startsWith("/oasis") ||
    // /water is the QR landing on an H2WHOA bottle — it gets its own
    // ways into the site rather than a navbar wrapped around it.
    pathname?.startsWith("/water");

  if (isImmersive) {
    return <main className="flex flex-1 flex-col">{children}</main>;
  }

  return (
    <>
      <Navbar />
      {/* pb clears the fixed BottomNav on mobile (including its raised
          Shop button, which pokes up above the bar) so page content and
          the Footer never sit underneath it. */}
      <main className="flex flex-1 flex-col pb-24 md:pb-0">{children}</main>
      <Footer />
      <BottomNav />
    </>
  );
}
