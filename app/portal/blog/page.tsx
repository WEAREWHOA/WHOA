import BlogTab from "@/components/dashboard/tabs/BlogTab";
import { getPostById, listAllPosts } from "@/lib/blog";
import { requirePortalTab } from "@/lib/portalAccess";

const NOTICES: Record<string, string> = {
  blogSaved: "Saved.",
  blogPublished: "Published. It is on /blog and in the sitemap.",
  blogDeleted: "Post deleted.",
};

export default async function PortalBlogPage(props: PageProps<"/portal/blog">) {
  await requirePortalTab("blog");
  const params = (await props.searchParams) as Record<string, string | string[] | undefined>;

  const first = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const posts = await listAllPosts().catch((err) => {
    console.error("Couldn't list posts for the portal:", err);
    return [];
  });

  const edit = first("edit");
  const editing = edit === "new" ? ("new" as const) : edit ? await getPostById(edit).catch(() => null) : null;

  const notice = Object.keys(NOTICES).find((key) => first(key) === "1");
  const rawError = first("blogError");

  return (
    <BlogTab
      posts={posts}
      editing={editing}
      notice={notice ? NOTICES[notice] : undefined}
      // The action puts the real reason in the URL, so a clash of slugs
      // says which slug rather than "something went wrong".
      error={rawError ? (rawError === "server" ? "Something went wrong. Try again." : rawError) : undefined}
    />
  );
}
