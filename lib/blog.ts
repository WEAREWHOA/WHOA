import { getSupabase } from "./supabase";

/**
 * Posts.
 *
 * Markdown goes in, HTML comes out at render time rather than at save
 * time. Storing rendered HTML would mean a post could carry whatever
 * somebody pasted into the editor straight into every reader's browser,
 * and it would freeze every post against the renderer that happened to
 * exist the day it was written.
 */

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  coverImageUrl: string | null;
  coverAlt: string | null;
  authorName: string | null;
  authorCode: string | null;
  tags: string[];
  /** Null for a draft. A future time is scheduled. */
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Row {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string | null;
  cover_image_url: string | null;
  cover_alt: string | null;
  author_name: string | null;
  author_code: string | null;
  tags: string[] | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

const COLUMNS =
  "id, slug, title, excerpt, body, cover_image_url, cover_alt, author_name, author_code, tags, published_at, created_at, updated_at";

function mapRow(row: Row): BlogPost {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    body: row.body ?? "",
    coverImageUrl: row.cover_image_url,
    coverAlt: row.cover_alt,
    authorName: row.author_name,
    authorCode: row.author_code,
    tags: row.tags ?? [],
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Published means "has a date, and that date has passed".
 *
 * One comparison covers both a draft and something scheduled for next
 * Tuesday, which is why scheduling needed no extra column or cron: the
 * post simply starts matching this on its own.
 */
export function isPublished(post: Pick<BlogPost, "publishedAt">, now = new Date()): boolean {
  if (!post.publishedAt) return false;
  const at = new Date(post.publishedAt).getTime();
  return !Number.isNaN(at) && at <= now.getTime();
}

/** Lowercase, hyphenated, no punctuation. The URL for the life of the post. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    // Accents off rather than through: a slug with a combining mark in it
    // is a different string to every link that ever pointed at it.
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

/** Roughly how long this takes to read, for the byline. */
export function readingMinutes(body: string): number {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

/**
 * The meta description.
 *
 * The hand-written excerpt when there is one, because that is the
 * sentence worth showing. Falling back to the opening of the post is
 * better than falling back to nothing, but it is a fallback: the first
 * 160 characters of a post are usually throat-clearing.
 */
export function describe(post: Pick<BlogPost, "excerpt" | "body">): string {
  const written = post.excerpt?.trim();
  if (written) return written.slice(0, 300);
  const plain = post.body
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > 157 ? `${plain.slice(0, 157).trimEnd()}...` : plain;
}

/* ------------------------------------------------------------------ */
/* Reading                                                             */
/* ------------------------------------------------------------------ */

export async function listPublishedPosts(limit = 50): Promise<BlogPost[]> {
  try {
    const { data, error } = await getSupabase()
      .from("blog_posts")
      .select(COLUMNS)
      .not("published_at", "is", null)
      .lte("published_at", new Date().toISOString())
      .order("published_at", { ascending: false })
      .limit(limit);
    if (error) {
      console.error("Couldn't list blog posts:", error.message);
      return [];
    }
    return ((data ?? []) as Row[]).map(mapRow);
  } catch (err) {
    console.error("Couldn't list blog posts:", err);
    return [];
  }
}

/** Everything, drafts included. Portal only. */
export async function listAllPosts(): Promise<BlogPost[]> {
  const { data, error } = await getSupabase()
    .from("blog_posts")
    .select(COLUMNS)
    // Newest activity first, so a draft being worked on stays at the top
    // rather than sinking below posts published years ago.
    .order("updated_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(`Couldn't list posts: ${error.message}`);
  return ((data ?? []) as Row[]).map(mapRow);
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  try {
    const { data, error } = await getSupabase()
      .from("blog_posts")
      .select(COLUMNS)
      .eq("slug", slug)
      .maybeSingle();
    if (error) {
      console.error(`Couldn't read the post ${slug}:`, error.message);
      return null;
    }
    return data ? mapRow(data as Row) : null;
  } catch (err) {
    console.error(`Couldn't read the post ${slug}:`, err);
    return null;
  }
}

export async function getPostById(id: string): Promise<BlogPost | null> {
  const { data, error } = await getSupabase()
    .from("blog_posts")
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Couldn't read that post: ${error.message}`);
  return data ? mapRow(data as Row) : null;
}

/* ------------------------------------------------------------------ */
/* Writing                                                             */
/* ------------------------------------------------------------------ */

export interface SavePostInput {
  id?: string;
  slug: string;
  title: string;
  excerpt?: string | null;
  body: string;
  coverImageUrl?: string | null;
  coverAlt?: string | null;
  authorName?: string | null;
  authorCode?: string | null;
  tags?: string[];
  publishedAt?: string | null;
}

export async function savePost(input: SavePostInput): Promise<{ ok: boolean; error?: string; id?: string }> {
  const title = input.title.trim().slice(0, 200);
  if (!title) return { ok: false, error: "A title is required." };

  const slug = slugify(input.slug || title);
  if (!slug) return { ok: false, error: "That title doesn't make a usable URL. Add some letters or numbers." };

  // An image without an alt is invisible to a crawler and to anybody
  // using a screen reader, so the pair is enforced here rather than
  // only in the form, where a stale tab could get around it.
  if (input.coverImageUrl?.trim() && !input.coverAlt?.trim()) {
    return { ok: false, error: "Describe the cover image. It is what a screen reader and a crawler read." };
  }

  const row = {
    slug,
    title,
    excerpt: input.excerpt?.trim().slice(0, 300) || null,
    body: input.body ?? "",
    cover_image_url: input.coverImageUrl?.trim() || null,
    cover_alt: input.coverAlt?.trim().slice(0, 300) || null,
    author_name: input.authorName?.trim().slice(0, 120) || null,
    author_code: input.authorCode ?? null,
    tags: (input.tags ?? []).map((t) => t.trim()).filter(Boolean).slice(0, 12),
    published_at: input.publishedAt ?? null,
    updated_at: new Date().toISOString(),
  };

  const supabase = getSupabase();
  const query = input.id
    ? supabase.from("blog_posts").update(row).eq("id", input.id).select("id").maybeSingle()
    : supabase.from("blog_posts").insert(row).select("id").maybeSingle();

  const { data, error } = await query;
  if (error) {
    if (/duplicate key|unique/i.test(error.message)) {
      return { ok: false, error: `The URL /blog/${slug} is already taken by another post.` };
    }
    console.error("Couldn't save the post:", error.message);
    return { ok: false, error: "Couldn't save that right now. Please try again." };
  }
  return { ok: true, id: (data as { id: string } | null)?.id ?? input.id };
}

export async function deletePost(id: string): Promise<void> {
  const { error } = await getSupabase().from("blog_posts").delete().eq("id", id);
  if (error) throw new Error(`Couldn't delete that post: ${error.message}`);
}
