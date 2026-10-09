import { getRosterMusician } from "@/lib/musicRoster";
import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from "@/lib/ogCard";
import { SITE_URL } from "@/lib/site";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "A WHOA Music Collective artist";

/**
 * The share card for one artist.
 *
 * Their own photograph, which for the hand-written roster is a file
 * under /public and for an approved applicant is their upload. Satori
 * fetches the photo over HTTP rather than off disk, so a local path has
 * to be made absolute first or it renders as nothing.
 */
export default async function MusicianOpengraphImage(props: PageProps<"/music-collective/[slug]">) {
  const { slug } = await props.params;
  const musician = await getRosterMusician(slug);

  if (!musician) {
    return ogCard({ eyebrow: "Music Collective", title: "WHOA" });
  }

  const photo = musician.photos?.[0];
  return ogCard({
    eyebrow: musician.subgenre,
    title: musician.name,
    subtitle: musician.tagline,
    photo: photo?.startsWith("/") ? `${SITE_URL}${photo}` : photo,
  });
}
