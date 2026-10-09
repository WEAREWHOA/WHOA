import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from "@/lib/ogCard";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Shop WHOA — hand-painted apparel, one of one";

export default function ShopOpengraphImage() {
  return ogCard({
    eyebrow: "Shop",
    title: "One of one",
    subtitle: "Hand-painted tees, hoodies and headwear. When one sells, it is gone.",
  });
}
