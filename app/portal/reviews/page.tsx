import ReviewsTab from "@/components/dashboard/reviews/ReviewsTab";
import { requirePortalTab } from "@/lib/portalAccess";
import { getReviewQueue } from "@/lib/reviews";

/**
 * The queue holds the reviewer's email address on every row, so it is
 * fetched behind the gate rather than loaded and then hidden, which would
 * still ship every address in the page payload.
 */
export default async function PortalReviewsPage() {
  await requirePortalTab("reviews");
  const queue = await getReviewQueue();
  return <ReviewsTab queue={queue} />;
}
