import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from "@/lib/ogCard";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "The WHOA Blog";

export default function BlogOpengraphImage() {
  return ogCard({
    eyebrow: "The WHOA Blog",
    title: "Process, people, nights out",
    subtitle: "How the pieces get made, and what happens when we take them somewhere.",
  });
}
