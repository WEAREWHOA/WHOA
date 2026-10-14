import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from "@/lib/ogCard";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "The WHOA Music Collective";

export default function MusicCollectiveOpengraphImage() {
  return ogCard({
    eyebrow: "Music Collective",
    title: "The sound of WHOA",
    subtitle: "The artists, DJs and producers behind WHOA Wednesday and the WHOADEGA stack.",
  });
}
