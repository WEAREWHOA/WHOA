"use client";

import { useMemo, useState } from "react";
import ArtistCard from "@/components/artcollective/ArtistCard";
import { MEDIUM_CATEGORIES, type Artist, type MediumCategory } from "@/lib/artists";

type SortOrder = "featured" | "name-asc" | "name-desc";

const SORT_LABELS: Record<SortOrder, string> = {
  featured: "Featured",
  "name-asc": "Name (A–Z)",
  "name-desc": "Name (Z–A)",
};

export default function ArtCollectiveGrid({ artists }: { artists: Artist[] }) {
  const [category, setCategory] = useState<MediumCategory | "All">("All");
  const [sort, setSort] = useState<SortOrder>("featured");

  const visible = useMemo(() => {
    const filtered = category === "All" ? artists : artists.filter((a) => a.category === category);
    if (sort === "featured") return filtered;
    const sorted = [...filtered];
    sorted.sort((a, b) => (sort === "name-asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)));
    return sorted;
  }, [artists, category, sort]);

  return (
    <>
      <div className="relative z-10 mt-10 flex w-full max-w-3xl flex-col items-center gap-4">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setCategory("All")}
            className={`rounded-full border px-4 py-1.5 text-xs font-semibold tracking-wide uppercase transition-colors ${
              category === "All"
                ? "border-white bg-white text-black"
                : "border-white/30 text-white/70 hover:border-white/60 hover:text-white"
            }`}
          >
            All
          </button>
          {MEDIUM_CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`rounded-full border px-4 py-1.5 text-xs font-semibold tracking-wide uppercase transition-colors ${
                category === c
                  ? "border-white bg-white text-black"
                  : "border-white/30 text-white/70 hover:border-white/60 hover:text-white"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-xs text-white/60">
          Sort by
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOrder)}
            className="rounded-full border border-white/30 bg-black/50 px-3 py-1.5 text-xs text-white focus:border-white focus:outline-none"
          >
            {(Object.keys(SORT_LABELS) as SortOrder[]).map((key) => (
              <option key={key} value={key} className="bg-background text-foreground">
                {SORT_LABELS[key]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="relative z-10 mt-10 flex w-full max-w-6xl flex-wrap items-start justify-center gap-x-8 gap-y-14">
        {visible.length === 0 ? (
          <p className="text-sm text-white/60">No artists in this category yet.</p>
        ) : (
          visible.map((artist, i) => <ArtistCard key={artist.slug} artist={artist} delay={i * 0.45} />)
        )}
      </div>
    </>
  );
}
