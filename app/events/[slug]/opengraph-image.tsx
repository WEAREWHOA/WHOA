import { getEventById } from "@/lib/eventsStore";
import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from "@/lib/ogCard";
import { SITE_URL } from "@/lib/site";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "A WHOA event";

/**
 * The share card for one event.
 *
 * Its flyer where there is one. Satori fetches the photo over HTTP
 * rather than off disk, so a path under /public has to be made absolute
 * first or it renders as nothing at all.
 */
export default async function EventOpengraphImage(props: PageProps<"/events/[slug]">) {
  const { slug } = await props.params;
  const event = await getEventById(slug);

  if (!event) {
    return ogCard({ eyebrow: "Events", title: "WHOA" });
  }

  return ogCard({
    eyebrow: event.dateLabel,
    title: event.title,
    subtitle: [event.venue, event.location].filter(Boolean).join(" · "),
    photo: event.imageUrl?.startsWith("/") ? `${SITE_URL}${event.imageUrl}` : event.imageUrl,
  });
}
