"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function SiteChrome({ children }: { children: ReactNode }) {
  const isHome = usePathname() === "/";

  if (isHome) {
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
