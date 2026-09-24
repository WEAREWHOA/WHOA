import type { Metadata } from "next";
import GamesHub from "@/components/games/GamesHub";

export const metadata: Metadata = {
  title: "Games",
  description: "Play WHOA's collection of built-in games — beat pad, puzzle, snake, and more.",
};

export default function GamesPage() {
  return <GamesHub />;
}
