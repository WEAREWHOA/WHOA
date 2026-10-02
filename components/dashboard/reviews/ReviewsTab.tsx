import Stars from "@/components/shop/Stars";
import { moderateReviewAction, replyToReviewAction } from "@/app/reviews/actions";
import type { QueuedReview, ReviewQueue } from "@/lib/reviews";

/**
 * REVIEWS - the queue, and what was decided.
 *
 * Nothing a customer writes reaches a product page or the structured
 * data until somebody approves it here. That is the whole point of the
 * tab: Google's review guidelines put the responsibility for what a
 * rating claims on the site publishing it, so there is a person between
 * the form and the page.
 *
 * A server component with plain form posts. No state to lose, it works
 * without JavaScript, and every button is a server action that re-checks
 * the permission rather than trusting the page that drew it.
 */

const dateFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Los_Angeles",
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function when(iso: string | null): string {
  return iso ? dateFormat.format(new Date(iso)) : "not yet";
}

function ReviewCard({ review, decided }: { review: QueuedReview; decided?: boolean }) {
  return (
    <article className="card-surface rounded-xl border border-border p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <Stars value={review.rating} size="sm" />
            {review.verifiedPurchase ? (
              <span className="text-flame-2 text-[0.65rem] font-semibold tracking-[0.12em] uppercase">
                Verified purchase
              </span>
            ) : (
              <span className="text-[0.65rem] font-semibold tracking-[0.12em] uppercase text-muted">
                Purchase not matched
              </span>
            )}
            {decided && (
              <span
                className={`text-[0.65rem] font-semibold tracking-[0.12em] uppercase ${
                  review.status === "approved" ? "ba-strong" : "ba-warn"
                }`}
              >
                {review.status}
              </span>
            )}
          </div>
          <p className="mt-2 text-sm font-semibold">
            {review.productSlug ? (
              <a
                href={`/shop/${review.productSlug}#reviews`}
                target="_blank"
                rel="noreferrer"
                className="hover:underline"
              >
                {review.productName}
              </a>
            ) : (
              review.productName
            )}
          </p>
        </div>
        <p className="text-xs text-muted">{when(review.createdAt)}</p>
      </div>

      {review.title && <p className="mt-3 font-semibold">{review.title}</p>}
      <p className="mt-2 max-w-3xl text-sm leading-relaxed whitespace-pre-line text-muted">
        {review.body}
      </p>

      <p className="mt-3 text-xs text-muted">
        {review.authorName} · {review.authorEmail}
        {review.accountCode ? ` · ${review.accountCode}` : ""}
      </p>

      {decided && review.moderatedBy && (
        <p className="mt-1 text-xs text-muted">
          {review.status === "approved" ? "Approved" : "Rejected"} by {review.moderatedBy} ·{" "}
          {when(review.moderatedAt)}
        </p>
      )}

      {!decided && (
        <div className="mt-4 flex flex-wrap gap-2">
          <form action={moderateReviewAction}>
            <input type="hidden" name="id" value={review.id} />
            <input type="hidden" name="decision" value="approved" />
            <button
              type="submit"
              className="rounded-full bg-tier-icon px-4 py-2 text-xs font-semibold tracking-wide text-background uppercase"
            >
              Publish
            </button>
          </form>
          <form action={moderateReviewAction}>
            <input type="hidden" name="id" value={review.id} />
            <input type="hidden" name="decision" value="rejected" />
            <button
              type="submit"
              className="rounded-full border border-border-strong px-4 py-2 text-xs font-semibold tracking-wide text-muted uppercase hover:text-foreground"
            >
              Reject
            </button>
          </form>
        </div>
      )}

      {/* A reply is public, so it is only offered once the review itself
          is. Replying under something nobody can read helps no one. */}
      {review.status === "approved" && (
        <form action={replyToReviewAction} className="mt-4 flex flex-col gap-2">
          <input type="hidden" name="id" value={review.id} />
          <label
            htmlFor={`reply-${review.id}`}
            className="text-[0.65rem] font-semibold tracking-[0.12em] uppercase text-muted"
          >
            Public reply
          </label>
          <textarea
            id={`reply-${review.id}`}
            name="reply"
            rows={2}
            defaultValue={review.reply?.body ?? ""}
            placeholder="Shown under the review. Leave empty to remove a reply."
            className="rounded-xl border border-border-strong bg-surface px-3 py-2 text-sm outline-none focus:border-flame-2"
          />
          <button
            type="submit"
            className="self-start rounded-full border border-border-strong px-4 py-2 text-xs font-semibold tracking-wide text-muted uppercase hover:text-foreground"
          >
            Save reply
          </button>
        </form>
      )}
    </article>
  );
}

export default function ReviewsTab({ queue }: { queue: ReviewQueue }) {
  if (queue.unavailable) {
    return (
      <div className="an-root">
        <header className="an-head">
          <div>
            <h2 className="an-title">REVIEWS</h2>
            <p className="an-sub">Not set up yet.</p>
          </div>
        </header>
        <p className="ba-caution">
          The reviews table isn&apos;t in the database yet. Run migration{" "}
          <code className="font-mono-code">0038_product_reviews.sql</code> and this tab will fill
          itself. Nothing else on the site is affected in the meantime.
        </p>
      </div>
    );
  }

  const published = queue.recent.filter((r) => r.status === "approved");
  const verified = published.filter((r) => r.verifiedPurchase).length;

  return (
    <div className="an-root">
      <header className="an-head">
        <div>
          <h2 className="an-title">REVIEWS</h2>
          <p className="an-sub">
            Nothing appears under a product, or in what Google reads, until it is published here.
          </p>
        </div>
      </header>

      <div className="an-kpis">
        {[
          ["Waiting", queue.pending.length.toLocaleString(), "nobody can see these yet"],
          ["Published", published.length.toLocaleString(), "live on the product page"],
          ["Verified buyers", verified.toLocaleString(), "matched to a Square order"],
        ].map(([label, value, hint]) => (
          <article key={label} className="an-kpi">
            <p className="an-kpi-value">{value}</p>
            <p className="an-kpi-label">{label}</p>
            <p className="an-kpi-hint">{hint}</p>
          </article>
        ))}
      </div>

      <section className="an-panel">
        <header className="an-panel-head">
          <h3 className="an-panel-title">Waiting on you</h3>
          <span className="an-panel-group">newest first</span>
        </header>

        {queue.pending.length === 0 ? (
          <p className="an-empty">Nothing waiting. Everything written has been looked at.</p>
        ) : (
          <div className="mt-4 flex flex-col gap-4">
            {queue.pending.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        )}
      </section>

      <section className="an-panel">
        <header className="an-panel-head">
          <h3 className="an-panel-title">Already decided</h3>
          <span className="an-panel-group">last 100</span>
        </header>

        {queue.recent.length === 0 ? (
          <p className="an-empty">Nothing has been published or rejected yet.</p>
        ) : (
          <div className="mt-4 flex flex-col gap-4">
            {queue.recent.map((review) => (
              <ReviewCard key={review.id} review={review} decided />
            ))}
          </div>
        )}
      </section>

      <p className="ba-note">
        Reject anything that isn&apos;t a genuine experience of the piece, and anything written in
        exchange for a discount or a freebie that doesn&apos;t say so. Google&apos;s review rules
        were tightened in July 2026 and the penalty is a manual action against the whole site, not
        a quieter snippet on one product.
      </p>
    </div>
  );
}
