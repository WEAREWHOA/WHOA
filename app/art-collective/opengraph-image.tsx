import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from "@/lib/ogCard";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "The WHOA Art Collective";

export default function ArtCollectiveOpengraphImage() {
  return ogCard({
    eyebrow: "Art Collective",
    title: "Made by hand, sold here",
    subtitle: "Independent artists putting original work into the WHOA shop.",
  });
}
