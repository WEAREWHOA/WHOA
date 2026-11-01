import type { Metadata } from "next";
import PsychedelicBackground from "@/components/home/PsychedelicBackground";
import SolarSystem from "@/components/home/SolarSystem";
import CollectionCarousel from "@/components/home/CollectionCarousel";
import { listProducts } from "@/lib/catalog";

export const metadata: Metadata = {
  // Self-canonical, so the ?cfa=gpl / ?si=true tracking variants
  // Square Online sprayed around consolidate here instead of
  // competing as separate pages.
  alternates: { canonical: "/" },
  title: "WHOA",
  description:
    "The WHOA universe — shop the WHOADEGA, catch an event, join the crew, and meet the artists and musicians behind it all.",
};

/** The collections below are read from the catalogue, so this cannot be
 *  a page built once and kept. */
export const revalidate = 300;

export default async function Home() {
  // Never fatal. The front page is the brand first; losing Square for a
  // minute should cost the collections rail, not the whole page.
  const products = await listProducts({ onlineOnly: true }).catch((err) => {
    console.error("Couldn't load products for the home collections:", err);
    return [];
  });

  return (
    <>
      {/* min-h-screen on its own put a whole screen between arriving and
          seeing anything to buy. Still full height on a desktop, where
          the solar system is the point; on a phone it gives the rail
          below it room to peek, which is what says keep scrolling. */}
      <section className="relative flex min-h-[78vh] flex-col items-center justify-center overflow-hidden px-6 py-16 text-center sm:min-h-screen">
        <PsychedelicBackground />
        <SolarSystem />
      </section>

      <CollectionCarousel products={products} />
    </>
  );
}
