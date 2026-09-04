import type { Metadata } from "next";
import ComingSoonGame from "@/components/home/ComingSoonGame";

// Temporary "coming soon" splash while the full site isn't public yet — swap
// back to <HomeHub /> (left untouched in ./components/home/HomeHub.tsx) when
// it's time to launch for real. Update this metadata at the same time —
// it's written to match the splash, not the real homepage.
export const metadata: Metadata = {
  title: "Stay Tuned",
  description: "WHOA is incoming. Fly the ship, dodge the targets, and stay tuned.",
};

export default function Home() {
  return <ComingSoonGame />;
}
