import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from "@/lib/ogCard";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "WHOA events — pop-ups, live painting and WHOA Wednesday";

export default function EventsOpengraphImage() {
  return ogCard({
    eyebrow: "Events",
    title: "Come find us",
    subtitle: "Pop-ups, live painting, WHOA Wednesday and festival activations.",
  });
}
