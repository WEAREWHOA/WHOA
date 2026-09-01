export type LayerCategory = "headwear" | "outerwear" | "top" | "bottom" | "accessory";

export const LAYER_CATEGORIES: { id: LayerCategory; label: string }[] = [
  { id: "headwear", label: "Headwear" },
  { id: "outerwear", label: "Outerwear" },
  { id: "top", label: "Tops" },
  { id: "bottom", label: "Bottoms" },
  { id: "accessory", label: "Accessories" },
];

// Square's catalog has no layer/slot field, so this guesses a product's
// spot in the outfit board from keywords in its name — same posture as
// lib/vendorMatch.ts's name-based vendor matching. Falls back to
// "accessory" for anything that doesn't match (stickers, prints, etc.),
// which is an honest bucket for "wearable, unclear where."
const KEYWORDS: [LayerCategory, string[]][] = [
  ["headwear", ["hat", "cap", "beanie", "bucket", "headband"]],
  ["outerwear", ["jacket", "hoodie", "coat", "flannel", "windbreaker"]],
  ["bottom", ["pant", "short", "jean", "trouser", "skirt", "legging"]],
  ["top", ["tee", "t-shirt", "shirt", "tank", "crop", "sweater", "longsleeve", "long sleeve"]],
];

export function categorizeProduct(name: string): LayerCategory {
  const normalized = name.toLowerCase();
  for (const [category, words] of KEYWORDS) {
    if (words.some((w) => normalized.includes(w))) return category;
  }
  return "accessory";
}
