import { getSupabase } from "./supabase";

export interface MusicProfileLink {
  label: string;
  url: string;
}

export interface MusicianProfile {
  ambassadorCode: string;
  artistName: string;
  subgenre: string | null;
  tagline: string | null;
  bio: string | null;
  links: MusicProfileLink[];
  updatedAt: string;
}

interface MusicianProfileRow {
  ambassador_code: string;
  artist_name: string;
  subgenre: string | null;
  tagline: string | null;
  bio: string | null;
  links: MusicProfileLink[];
  updated_at: string;
}

function mapProfile(row: MusicianProfileRow): MusicianProfile {
  return {
    ambassadorCode: row.ambassador_code,
    artistName: row.artist_name,
    subgenre: row.subgenre,
    tagline: row.tagline,
    bio: row.bio,
    links: Array.isArray(row.links) ? row.links : [],
    updatedAt: row.updated_at,
  };
}

// Powers both the "Join our Music Collective" application (creates this row
// while perm_music is still false, i.e. pending) and the Music tab's
// self-editing form once approved — same row, so nothing typed at
// application time is lost once staff approves.
export async function getMusicianProfile(code: string): Promise<MusicianProfile | undefined> {
  const { data, error } = await getSupabase()
    .from("musician_profiles")
    .select("*")
    .eq("ambassador_code", code.trim().toUpperCase())
    .maybeSingle();

  if (error) throw new Error(`Failed to load musician profile: ${error.message}`);

  return data ? mapProfile(data as MusicianProfileRow) : undefined;
}

export async function saveMusicianProfile(
  code: string,
  input: {
    artistName: string;
    subgenre?: string;
    tagline?: string;
    bio?: string;
    links: MusicProfileLink[];
  },
): Promise<void> {
  const { error } = await getSupabase()
    .from("musician_profiles")
    .upsert({
      ambassador_code: code.trim().toUpperCase(),
      artist_name: input.artistName,
      subgenre: input.subgenre || null,
      tagline: input.tagline || null,
      bio: input.bio || null,
      links: input.links,
      updated_at: new Date().toISOString(),
    });

  if (error) throw new Error(`Failed to save musician profile: ${error.message}`);
}
