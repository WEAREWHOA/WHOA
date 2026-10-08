"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { deletePost, getPostById, savePost, slugify } from "@/lib/blog";
import { requirePortalTab } from "@/lib/portalAccess";
import { pacificWallTimeToUtc } from "@/lib/pacificTime";
import { portalPath } from "@/lib/portalNav";

/**
 * Every action re-checks the permission on the server.
 *
 * An action is a URL. The tab being hidden stops it appearing in the
 * nav, and stops nothing else: whoever can call this decides what
 * appears on a public page and what search engines read, so the gate has
 * to be here and not only on the page that rendered the form.
 */
async function requireBlogAdmin() {
  const { account } = await requirePortalTab("blog");
  return account;
}

/**
 * Publishing changes pages that are cached for an hour, so they are
 * rebuilt now rather than within whatever is left of that window.
 * Publishing a post and then not seeing it is indistinguishable from the
 * button not working.
 */
function refresh(slug: string) {
  revalidatePath("/blog");
  revalidatePath(`/blog/${slug}`);
  revalidatePath("/sitemap.xml");
}

export async function savePostAction(formData: FormData) {
  const account = await requireBlogAdmin();

  const id = String(formData.get("id") || "").trim() || undefined;
  const title = String(formData.get("title") || "").trim();
  const slugInput = String(formData.get("slug") || "").trim();
  const intent = String(formData.get("intent") || "save");

  // Only read from the form when it was actually sent. An editor that
  // posts a blank author would wipe the byline off an existing post.
  const tags = String(formData.get("tags") || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  let publishedAt: string | null = null;
  if (intent === "publish") {
    const scheduled = String(formData.get("publishedAt") || "").trim();
    // A datetime-local value carries no zone, so it is read as Pacific,
    // where whoever is typing it is standing. Through pacificWallTimeToUtc
    // rather than a fixed offset: this was "-08:00", which is PST, so for
    // the seven months of the year Pacific is on PDT every publish landed
    // an hour in the future and the post stayed invisible until it caught
    // up. An unparseable value publishes now rather than failing, which
    // is what the button said it would do.
    publishedAt = (scheduled ? pacificWallTimeToUtc(scheduled) : null)?.toISOString()
      ?? new Date().toISOString();
  }

  const slug = slugify(slugInput || title);

  try {
    const result = await savePost({
      id,
      slug,
      title,
      excerpt: String(formData.get("excerpt") || ""),
      body: String(formData.get("body") || ""),
      coverImageUrl: String(formData.get("coverImageUrl") || ""),
      coverAlt: String(formData.get("coverAlt") || ""),
      authorName: String(formData.get("authorName") || "") || account.name,
      authorCode: account.code,
      tags,
      publishedAt,
    });

    if (!result.ok) {
      redirect(portalPath("blog", `blogError=${encodeURIComponent(result.error ?? "server")}`));
    }
    refresh(slug);
  } catch (err) {
    unstable_rethrow(err);
    console.error("savePostAction failed:", err);
    redirect(portalPath("blog", "blogError=server"));
  }

  redirect(portalPath("blog", intent === "publish" ? "blogPublished=1" : "blogSaved=1"));
}

export async function unpublishPostAction(formData: FormData) {
  await requireBlogAdmin();
  const id = String(formData.get("id") || "").trim();
  if (!id) redirect(portalPath("blog"));

  try {
    const post = await getPostById(id);
    if (post) {
      await savePost({
        id,
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        body: post.body,
        coverImageUrl: post.coverImageUrl,
        coverAlt: post.coverAlt,
        authorName: post.authorName,
        authorCode: post.authorCode,
        tags: post.tags,
        publishedAt: null,
      });
      refresh(post.slug);
    }
  } catch (err) {
    unstable_rethrow(err);
    console.error("unpublishPostAction failed:", err);
    redirect(portalPath("blog", "blogError=server"));
  }

  redirect(portalPath("blog", "blogSaved=1"));
}

export async function deletePostAction(formData: FormData) {
  await requireBlogAdmin();
  const id = String(formData.get("id") || "").trim();
  if (!id) redirect(portalPath("blog"));

  try {
    const post = await getPostById(id);
    await deletePost(id);
    if (post) refresh(post.slug);
  } catch (err) {
    unstable_rethrow(err);
    console.error("deletePostAction failed:", err);
    redirect(portalPath("blog", "blogError=server"));
  }

  redirect(portalPath("blog", "blogDeleted=1"));
}
