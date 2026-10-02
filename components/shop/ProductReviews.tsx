import ReviewForm from "@/components/shop/ReviewForm";
import Stars from "@/components/shop/Stars";
import { summarize, type ProductReview } from "@/lib/reviews";

/**
 * What customers said, under the product.
 *
 * A server component, so every word of every review is in the HTML that
 * Google reads. That matters more than usual here: the review markup in
 * the page's structured data has to match what a reader can actually see
 * on the page, and the simplest way to guarantee that is for both to be
 * rendered from the same array in the same request.
 *
 * Only the form is interactive, and it is a separate client component so
 * the reviews themselves cost no JavaScript.
 */

const dateFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Los_Angeles",
  month: "short",
  day: "numeric",
  year: "numeric",
});

function Bar({ stars, count, total }: { stars: number; count: number; total: number }) {
  const percent = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3 text-xs text-muted">
      <span className="w-10 shrink-0 tabular-nums">{stars} star</span>
      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
        <span className="bg-flame-2 block h-full rounded-full" style={{ width: `${percent}%` }} />
      </span>
      <span className="w-6 shrink-0 text-right tabular-nums">{count}</span>
    </div>
  );
}

export default function ProductReviews({
  reviews,
  productId,
  productSlug,
  productName,
  variationIds,
}: {
  reviews: ProductReview[];
  productId: string;
  productSlug: string;
  productName: string;
  variationIds: string[];
}) {
  const summary = summarize(reviews);

  return (
    <section id="reviews" className="mt-16 border-t border-border pt-10 lg:col-span-2">
      <h2 className="font-display text-2xl tracking-wide">Reviews</h2>

      {summary.count === 0 ? (
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
          Nobody has reviewed this one yet. If you own it, yours would be the first.
        </p>
      ) : (
        <div className="mt-5 flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-12">
          <div>
            <p className="font-display text-4xl leading-none">{summary.average.toFixed(1)}</p>
            <Stars value={summary.average} size="md" className="mt-2" />
            <p className="mt-2 text-xs text-muted">
              {summary.count} review{summary.count === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex w-full max-w-xs flex-col gap-1.5">
            {[5, 4, 3, 2, 1].map((stars) => (
              <Bar
                key={stars}
                stars={stars}
                count={summary.distribution[stars] ?? 0}
                total={summary.count}
              />
            ))}
          </div>
        </div>
      )}

      {reviews.length > 0 && (
        <ul className="mt-10 flex flex-col gap-6">
          {reviews.map((review) => (
            <li key={review.id} className="border-t border-border pt-6 first:border-0 first:pt-0">
              <div className="flex flex-wrap items-center gap-3">
                <Stars value={review.rating} size="sm" />
                {review.verifiedPurchase && (
                  <span className="text-flame-2 text-[0.65rem] font-semibold tracking-[0.12em] uppercase">
                    Verified purchase
                  </span>
                )}
              </div>

              {review.title && <p className="mt-2 font-semibold">{review.title}</p>}

              <p className="mt-2 max-w-2xl text-sm leading-relaxed whitespace-pre-line text-muted">
                {review.body}
              </p>

              <p className="mt-2 text-xs text-muted">
                {review.authorName} · {dateFormat.format(new Date(review.createdAt))}
              </p>

              {review.reply && (
                <div className="border-flame-2/40 mt-4 border-l-2 pl-4">
                  <p className="text-[0.65rem] font-semibold tracking-[0.12em] uppercase text-flame-2">
                    WHOA replied
                  </p>
                  <p className="mt-1 max-w-2xl text-sm leading-relaxed whitespace-pre-line text-muted">
                    {review.reply.body}
                  </p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <ReviewForm
        productId={productId}
        productSlug={productSlug}
        productName={productName}
        variationIds={variationIds}
      />
    </section>
  );
}
