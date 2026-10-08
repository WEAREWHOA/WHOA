import BlogTab from "@/components/dashboard/tabs/BlogTab";
import MediaLibrary from "@/components/portal/MediaLibrary";
import { listMedia } from "@/lib/media";
import { getPostById, listAllPosts } from "@/lib/blog";
import { requirePortalTab } from "@/lib/portalAccess";

const NOTICES: Record<string, string> = {
  blogSaved: "Saved.",
  blogPublished: "Published. It is on /blog and in the sitemap.",
  blogDeleted: "Post deleted.",
};

export default async function PortalBlogPage(props: PageProps<"/portal/blog">) {
  const { account } = await requirePortalTab("blog");
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

  // The image library sits on this tab rather than only on Settings,
  // because uploading a cover and pasting its URL into the editor is one
  // task, and sending somebody to another tab halfway through it is how
  // a draft gets lost.
  const media = await listMedia(account.code).catch((err) => {
    console.error("Couldn't list blog media:", err);
    return [];
  });

  return (
    <>
    <BlogTab
      posts={posts}
      editing={editing}
      notice={notice ? NOTICES[notice] : undefined}
      // The action puts the real reason in the URL, so a clash of slugs
      // says which slug rather than "something went wrong".
      error={rawError ? (rawError === "server" ? "Something went wrong. Try again." : rawError) : undefined}
    />
    <MediaLibrary code={account.code} kind="blog" items={media} />
    </>
  );
}
