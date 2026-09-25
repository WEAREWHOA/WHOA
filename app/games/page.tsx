import type { Metadata } from "next";
import GamesHub from "@/components/games/GamesHub";

export const metadata: Metadata = {
  // Self-canonical, so the ?cfa=gpl / ?si=true tracking variants
  // Square Online sprayed around consolidate here instead of
  // competing as separate pages.
  alternates: { canonical: "/games" },
  title: "Games",
  description: "Play WHOA's collection of built-in games — beat pad, puzzle, snake, and more.",
};

export default function GamesPage() {
  return <GamesHub />;
}
