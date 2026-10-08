"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BottomNav from "@/components/BottomNav";

export default function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // The POS register is a standalone app screen, not a marketing page — no
  // site nav/footer wrapped around it, same as the home hub.
  const isImmersive =
    pathname === "/" ||
    pathname?.startsWith("/pos") ||
    // /water is the QR landing on an H2WHOA bottle: still its own sealed
    // thing, with its own way into the site.
    //
    // /go is not, any more. It used to be the SSBD experience, a gated
    // room with its own doors, and a navbar around that would have been
    // a way out of something built to be walked through. It is now a
    // plain landing page for a URL printed on flyers, and the first
    // thing somebody who scans one needs is the rest of the site.
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
