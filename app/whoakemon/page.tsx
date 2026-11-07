import type { Metadata, Viewport } from "next";

import Town from "@/components/whoakemon/Town";

const TITLE = "WHOAkémon";

export const metadata: Metadata = {
  title: TITLE,
  description: "WHOA Town. Walk around it.",
  alternates: { canonical: "/whoakemon" },
  // Same call as /mystery: every link on it goes somewhere already
  // indexed properly, so letting a crawler have this would put a
  // page of duplicate nav into search competing with the pages it
  // points at. Followed, because the links are real.
  robots: { index: false, follow: true },
};

/**
 * No zoom, no scroll.
 *
 * Normally blocking zoom is an accessibility mistake and I would not
 * do it. Here it is one page, it is a fixed console that is already
 * sized to the viewport so there is nothing to zoom towards, and
 * pinching a game screen moves the device rather than the game.
 * Everything on it is also reachable as ordinary links from the
 * menu, which is where somebody who needs to magnify text should be
 * sent anyway.
 *
 * iOS has ignored user-scalable since iOS 10, so this is the polite
 * half of the request. The half that works is touch-action: none on
 * the shell.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0a0a0c",
};

export default function WhoakemonPage() {
  return <Town />;
}
