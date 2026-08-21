"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // The POS register is a standalone app screen, not a marketing page — no
  // site nav/footer wrapped around it, same as the home hub.
  const isImmersive = pathname === "/" || pathname?.startsWith("/pos");

  if (isImmersive) {
    return <main className="flex flex-1 flex-col">{children}</main>;
  }

  return (
    <>
      <Navbar />
      <main className="flex flex-1 flex-col">{children}</main>
      <Footer />
    </>
  );
}
