import { redirect } from "next/navigation";

/**
 * The tab used to live here and is now EMAIL/TEXT at /portal/email.
 *
 * Kept as a redirect rather than deleted: this path is in people's
 * history and bookmarks, and landing on a 404 after clicking a saved
 * link reads as the tab having been taken away.
 */
export default function PortalNewsletterPage() {
  redirect("/portal/email");
}
