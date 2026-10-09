import { unstable_cache } from "next/cache";
import { MUSICIANS, type Musician } from "./musicians";
import { listMediaForAccounts } from "./media";
import {
  ensureMusicianSlug,
  listMusicianApplications,
  musicSlug,
  type MusicianApplication,
} from "./musicianProfiles";

/**
 * The public Music Collective roster: the hand-written artists plus
 * everyone whose application was approved.
 *
 * Two sources, one page, same shape. The hand-written entries in
 * lib/musicians.ts carry things an application form never asks for -- a
 * multi-paragraph story, past shows, fun facts, a chosen colourway -- so
 * they stay as they are rather than being migrated into the table and
 * flattened. An approved applicant gets everything the form does collect,
 * their uploaded photos, and a colourway derived from their account code
 * so that their card looks like it was designed rather than defaulted.
 *
 * Approval is the only way onto this page. The filter is deliberately
 * both halves of "approved": the recorded decision AND the live
 * permission. Removing an artist in MUSIC ADMIN clears the permission, so
 * that one revocation takes them off the public site as well as out of
 * their portal, and no row can be public on the strength of a status
 * somebody forgot to revoke.
 */

export const MUSIC_ROSTER_TAG = "music-roster";

/**
 * Colourways for applicants, since the form doesn't ask for one.
 *
 * Chosen from the same family as the hand-written entries so a card can't
 * be picked out as the automatic one, and assigned by a hash of the
 * account code rather than by position: an artist's card keeps its colour
 * when somebody approved before them is removed.
 */
const PALETTE: { accent: string; gradient: [string, string, string] }[] = [
  { accent: "#ff7a00", gradient: ["#2a0f00", "#7b3100", "#ff7a00"] },
  { accent: "#29e6ff", gradient: ["#0a1a2e", "#1a4a6b", "#29e6ff"] },
  { accent: "#7b2ff7", gradient: ["#0d0a2a", "#3a2a7b", "#7b2ff7"] },
  { accent: "#ff2d95", gradient: ["#2a0016", "#7b0040", "#ff2d95"] },
  { accent: "#2fff8f", gradient: ["#00210f", "#006b38", "#2fff8f"] },
  { accent: "#ffd12f", gradient: ["#2a2000", "#7b5e00", "#ffd12f"] },
];

/** A small stable hash, so a code always lands on the same colourway. */
function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function visualsFor(code: string): Pick<Musician, "accent" | "gradient" | "rotate" | "patternSeed"> {
  const h = hash(code);
  const palette = PALETTE[h % PALETTE.length];
  return {
    accent: palette.accent,
    gradient: palette.gradient,
    // The same gentle scatter the hand-written cards have: -2 to 2
    // degrees, never 0, because a card at exactly 0 reads as a mistake
    // next to five tilted ones.
    rotate: (h % 4) - 2 || 2,
    patternSeed: h % 10,
  };
}

function toMusician(artist: MusicianApplication, slug: string, photos: string[]): Musician {
  return {
    slug,
    name: artist.artistName,
    subgenre: artist.subgenre || "WHOA Music Collective",
    // Both of these are shown and both are read by crawlers, so neither
    // can be empty. The bio stands in for a missing tagline and the
    // tagline for a missing bio; an artist who wrote neither still gets a
    // sentence that says who they are rather than an empty element.
    tagline: artist.tagline || artist.bio || `${artist.artistName} on the WHOA Music Collective.`,
    bio: artist.bio || artist.tagline || `${artist.artistName} is part of the WHOA Music Collective.`,
    photos: photos.length > 0 ? photos : undefined,
    links: artist.links.filter((link) => /^https?:\/\//i.test(link.url)),
    ...visualsFor(artist.ambassadorCode),
  };
}

/**
 * Reads the approved artists and shapes them like roster entries.
 *
 * Not exported: everything public goes through the cached wrappers below,
 * so that a page nobody has loaded in five minutes costs two queries and
 * not two queries per visitor.
 */
async function readApproved(): Promise<Musician[]> {
  const all = await listMusicianApplications();
  const approved = all
    .filter((artist) => artist.status === "approved" && artist.hasAccess)
    // Oldest first, so the roster grows at the end instead of reordering
    // itself whenever somebody new is approved.
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  if (approved.length === 0) return [];

  // Their press photos, which is what the `music` media kind in the
  // portal has been promising since it was added ("Press photos, cover
  // art, flyers for your Music Collective profile") without anywhere to
  // show them. A profile photo comes first where there is one, because
  // that is the one chosen to be the face of the account.
  const media = await listMediaForAccounts(
    approved.map((artist) => artist.ambassadorCode),
    ["profile", "music"],
  ).catch(() => new Map());

  const taken = new Set(MUSICIANS.map((m) => m.slug));
  const roster: Musician[] = [];

  for (const artist of approved) {
    // A stored slug is the URL. Anyone approved before migration 0049 is
    // given one here, once; if that write can't happen (the column isn't
    // there yet) the derived name is used for this render, which keeps
    // the page working rather than hiding the artist.
    let slug = artist.slug;
    if (!slug) {
      slug = await ensureMusicianSlug(artist.ambassadorCode, artist.artistName).catch(() => null);
    }
    if (!slug) slug = musicSlug(artist.artistName);

    // Last line of defence. A slug that collides with the hand-written
    // roster would make one of the two artists unreachable, and the
    // hand-written one is the one with the inbound links.
    if (taken.has(slug)) slug = `${slug}-${artist.ambassadorCode.toLowerCase()}`;
    taken.add(slug);

    const items = (media.get(artist.ambassadorCode) ?? []) as { kind: string; publicUrl: string }[];
    const photos = [
      ...items.filter((item) => item.kind === "profile").map((item) => item.publicUrl),
      ...items.filter((item) => item.kind === "music").map((item) => item.publicUrl),
    ];

    roster.push(toMusician(artist, slug, photos));
  }

  return roster;
}

const approvedMusicians = unstable_cache(readApproved, ["music-roster"], {
  revalidate: 300,
  tags: [MUSIC_ROSTER_TAG],
});

/**
 * Every artist on the public roster.
 *
 * Fails soft to the hand-written list. The roster is on the public site
 * and in the sitemap, and a Supabase hiccup taking the whole page down
 * with it would be a worse outcome than a page that is briefly missing
 * its newest members.
 */
export async function getMusicRoster(): Promise<Musician[]> {
  try {
    return [...MUSICIANS, ...(await approvedMusicians())];
  } catch (err) {
    console.error("Failed to load approved musicians:", err);
    return [...MUSICIANS];
  }
}

/**
 * One artist by their URL segment.
 *
 * The hand-written roster is checked first and without touching the
 * database, so the four artists who have always been here cost nothing
 * extra to serve.
 */
export async function getRosterMusician(slug: string): Promise<Musician | undefined> {
  const builtIn = MUSICIANS.find((musician) => musician.slug === slug);
  if (builtIn) return builtIn;

  try {
    return (await approvedMusicians()).find((musician) => musician.slug === slug);
  } catch (err) {
    console.error("Failed to look up approved musician:", err);
    return undefined;
  }
}
