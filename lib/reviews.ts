import { createHash } from "node:crypto";

import { getSquare } from "./square";
import { findAllSquareCustomerIdsByEmail } from "./squareCustomers";
import { getAllLocationIds } from "./squareSync";
import { getSupabase } from "./supabase";

/**
 * Customer reviews, and the queue that decides which ones are published.
 *
 * Search Console warns that every product is missing aggregateRating and
 * review. The only honest way to answer that is to have real reviews, so
 * everything here is built around one rule: a rating that reaches the
 * page, and therefore the structured data, is something a customer typed
 * and a person at WHOA then read and approved.
 *
 * Google's review snippet guidelines were tightened on 24 July 2026 to
 * prohibit fake and undisclosed incentivised reviews, with manual actions
 * as the penalty. Losing every star on the site and having to file a
 * reconsideration request is a far worse outcome than a warning nobody
 * but us can see, so nothing in this file can invent, import or average
 * in a rating that nobody wrote. There is deliberately no seeding path.
 *
 * The markup is built from the same list the page renders, never a
 * separate query, because the two disagreeing is itself a violation:
 * marked-up reviews have to be the ones visible on the page.
 */

export const RATING_MIN = 1;
export const RATING_MAX = 5;

/** Longest a review body may be. Past this it isn't read anyway. */
const BODY_MAX = 3000;
const BODY_MIN = 10;
const NAME_MAX = 60;
const TITLE_MAX = 90;

/** How many a single source may file, and over what window. */
const RATE_LIMIT_PER_IP = 3;
const RATE_LIMIT_WINDOW_MINUTES = 60;

export type ReviewStatus = "pending" | "approved" | "rejected";

/** What the public page may see. No email, ever. */
export interface ProductReview {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  authorName: string;
  verifiedPurchase: boolean;
  createdAt: string;
  reply: { body: string; at: string } | null;
}

/** The moderator's view: the same thing plus who sent it. */
export interface QueuedReview extends ProductReview {
  productId: string;
  productSlug: string | null;
  productName: string;
  authorEmail: string;
  accountCode: string | null;
  status: ReviewStatus;
  moderatedBy: string | null;
  moderatedAt: string | null;
}

export interface RatingSummary {
  count: number;
  /** Mean of the approved ratings, to one decimal. 0 when there are none. */
  average: number;
  /** How many of each star, indexed 1 to 5. */
  distribution: Record<number, number>;
}

interface ReviewRow {
  id: string;
  product_id: string;
  product_slug: string | null;
  product_name: string;
  rating: number;
  title: string | null;
  body: string;
  author_name: string;
  author_email: string;
  account_code: string | null;
  verified_purchase: boolean;
  status: ReviewStatus;
  moderated_by: string | null;
  moderated_at: string | null;
  reply_body: string | null;
  reply_at: string | null;
  created_at: string;
}

function toPublic(row: ReviewRow): ProductReview {
  return {
    id: row.id,
    rating: row.rating,
    title: row.title,
    body: row.body,
    authorName: row.author_name,
    verifiedPurchase: row.verified_purchase,
    createdAt: row.created_at,
    reply: row.reply_body ? { body: row.reply_body, at: row.reply_at ?? row.created_at } : null,
  };
}

function toQueued(row: ReviewRow): QueuedReview {
  return {
    ...toPublic(row),
    productId: row.product_id,
    productSlug: row.product_slug,
    productName: row.product_name,
    authorEmail: row.author_email,
    accountCode: row.account_code,
    status: row.status,
    moderatedBy: row.moderated_by,
    moderatedAt: row.moderated_at,
  };
}

/**
 * The average, from the list the page is about to render.
 *
 * Takes reviews rather than a product id so the number under the title
 * and the number in the structured data are arithmetic on one array.
 * Querying twice is how a page ends up claiming 4.8 while showing four
 * reviews averaging 4.2, which is the kind of mismatch the guidelines
 * treat as misleading markup.
 */
export function summarize(reviews: ProductReview[]): RatingSummary {
  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const review of reviews) distribution[review.rating] = (distribution[review.rating] ?? 0) + 1;

  if (reviews.length === 0) return { count: 0, average: 0, distribution };

  const total = reviews.reduce((sum, r) => sum + r.rating, 0);
  return {
    count: reviews.length,
    // One decimal, which is what Google shows and what the page prints.
    average: Math.round((total / reviews.length) * 10) / 10,
    distribution,
  };
}

/**
 * The approved reviews for a product, newest first.
 *
 * Returns an empty list on any failure rather than throwing. A product
 * page that 500s because the reviews table is unreachable is a worse
 * outcome than a product page with no reviews on it, and this runs at
 * build time for every product too.
 */
export async function getApprovedReviews(productId: string): Promise<ProductReview[]> {
  if (!productId) return [];

  try {
    const { data, error } = await getSupabase()
      .from("product_reviews")
      .select("*")
      .eq("product_id", productId)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) throw new Error(error.message);
    return ((data ?? []) as ReviewRow[]).map(toPublic);
  } catch (err) {
    console.error(`Couldn't load reviews for ${productId}; showing none:`, err);
    return [];
  }
}

export interface SubmitReviewInput {
  productId: string;
  productSlug?: string | null;
  productName: string;
  rating: number;
  title?: string | null;
  body: string;
  authorName: string;
  authorEmail: string;
  accountCode?: string | null;
  /**
   * Square variation ids for this product, used to match the review
   * against an order. Passed in from the page rather than fetched here,
   * so the check runs against exactly the product being reviewed.
   */
  variationIds?: string[];
  /**
   * True when the review arrived through the link in a review request
   * email. That link was issued against a real order and sent only to
   * the address on it, which is stronger evidence than the Square lookup
   * below and does not depend on Square being reachable.
   */
  verifiedByToken?: boolean;
  /** Raw client address, hashed here and never stored as given. */
  ip?: string | null;
}

export type SubmitResult =
  | { ok: true; verifiedPurchase: boolean }
  | { ok: false; error: string };

function clean(value: string | null | undefined, max: number): string {
  // Control characters out, whitespace collapsed at the ends. The body
  // keeps its newlines; everything else is a single line.
  return (value ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim().slice(0, max);
}

function validEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

/**
 * Hash, never the address.
 *
 * Enough to notice fifty reviews from one machine in an hour without
 * keeping a record of who looked at what. Salted from a secret that is
 * already server-only, so there is no new env var to forget and the
 * hashes aren't reversible with a dictionary of every IPv4 address.
 */
function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  const salt = process.env.REVIEW_IP_SALT ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

/**
 * Did this address ever buy this product?
 *
 * Best effort, and only ever used to add a badge. Anything that goes
 * wrong, including Square being unreachable, comes back false: an
 * unproven purchase and a disproven one both mean we don't get to call
 * it verified.
 *
 * Matched on the catalog object id of each line, which is the variation
 * id, with a fall back to the product name for POS lines rung up
 * manually without a catalog item behind them.
 *
 * One caveat worth knowing: an order taken at the till under a staff
 * member's own Square profile counts as that staff member's purchase
 * here. Every review is read by a person before it is published, so a
 * badge on a colleague's review is something a moderator can see and
 * reject rather than something that reaches the page by itself.
 */
export async function wasPurchased(
  email: string,
  variationIds: string[],
  productName: string,
): Promise<boolean> {
  try {
    const customerIds = await findAllSquareCustomerIdsByEmail(email);
    if (customerIds.length === 0) return false;

    const locationIds = await getAllLocationIds();
    if (locationIds.length === 0) return false;

    const wanted = new Set(variationIds.filter(Boolean));
    const wantedName = productName.trim().toLowerCase();
    const square = getSquare();

    // Ten per request is Square's cap on the customer filter, the same
    // chunk size the customer history uses.
    for (let i = 0; i < customerIds.length; i += 10) {
      const chunk = customerIds.slice(i, i + 10);
      let cursor: string | undefined;

      do {
        const response = await square.orders.search({
          locationIds,
          query: { filter: { customerFilter: { customerIds: chunk } } },
          limit: 100,
          cursor,
        });

        for (const order of response.orders ?? []) {
          if (order.state === "DRAFT" || order.state === "CANCELED") continue;
          for (const line of order.lineItems ?? []) {
            if (line.catalogObjectId && wanted.has(line.catalogObjectId)) return true;
            if (wantedName && (line.name ?? "").trim().toLowerCase() === wantedName) return true;
          }
        }

        cursor = response.cursor;
      } while (cursor);
    }

    return false;
  } catch (err) {
    console.error(`Couldn't check a purchase for a review of ${productName}:`, err);
    return false;
  }
}

async function overRateLimit(ipHash: string | null): Promise<boolean> {
  if (!ipHash) return false;
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60_000).toISOString();

  const { count, error } = await getSupabase()
    .from("product_reviews")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", since);

  // A rate limiter that can't read its own table shouldn't block honest
  // reviews; the moderation queue is the backstop either way.
  if (error) return false;
  return (count ?? 0) >= RATE_LIMIT_PER_IP;
}

/**
 * Take a review. It is never published by this function.
 *
 * Everything lands as pending. The only thing decided here is whether
 * the purchase could be verified, because that check needs the email,
 * and the email is not kept anywhere a moderator could re-run it from
 * later.
 */
export async function submitReview(input: SubmitReviewInput): Promise<SubmitResult> {
  const rating = Math.round(Number(input.rating));
  if (!Number.isFinite(rating) || rating < RATING_MIN || rating > RATING_MAX) {
    return { ok: false, error: "Pick a rating from 1 to 5 stars." };
  }

  const authorName = clean(input.authorName, NAME_MAX);
  if (authorName.length < 2) return { ok: false, error: "Add the name you'd like shown." };

  const authorEmail = clean(input.authorEmail, 320).toLowerCase();
  if (!validEmail(authorEmail)) return { ok: false, error: "That email address doesn't look right." };

  const body = clean(input.body, BODY_MAX);
  if (body.length < BODY_MIN) {
    return { ok: false, error: "Tell us a little more: at least a sentence." };
  }

  const productId = clean(input.productId, 120);
  const productName = clean(input.productName, 200);
  if (!productId || !productName) return { ok: false, error: "That product isn't available." };

  const ipHash = hashIp(input.ip);

  try {
    if (await overRateLimit(ipHash)) {
      return { ok: false, error: "That's a few reviews in a short time. Try again a bit later." };
    }
  } catch {
    // Same reasoning as inside overRateLimit: never block on the limiter.
  }

  // Looked up before the insert because the answer is stored on the row;
  // it is a snapshot of what was true when the review was written. A
  // token skips the lookup entirely: it was issued against a real order,
  // so there is nothing left to prove and nothing to fail.
  const verifiedPurchase = input.verifiedByToken
    ? true
    : await wasPurchased(authorEmail, input.variationIds ?? [], productName);

  const { error } = await getSupabase().from("product_reviews").insert({
    product_id: productId,
    product_slug: input.productSlug ? clean(input.productSlug, 200) : null,
    product_name: productName,
    rating,
    title: clean(input.title, TITLE_MAX) || null,
    body,
    author_name: authorName,
    author_email: authorEmail,
    account_code: input.accountCode ?? null,
    verified_purchase: verifiedPurchase,
    status: "pending",
    ip_hash: ipHash,
  });

  if (error) {
    // 23505 is the one-per-person index doing its job, which is a normal
    // thing for a person to run into rather than a failure.
    if (error.code === "23505") {
      return { ok: false, error: "There's already a review from this email for this piece." };
    }
    console.error("Failed to save a review:", error);
    return { ok: false, error: "Couldn't save that right now. Please try again later." };
  }

  return { ok: true, verifiedPurchase };
}

export interface ReviewQueue {
  pending: QueuedReview[];
  recent: QueuedReview[];
  /** True when the table isn't there yet, so the tab can say so. */
  unavailable: boolean;
}

/** The moderation tab: everything waiting, plus what was last decided. */
export async function getReviewQueue(): Promise<ReviewQueue> {
  try {
    const supabase = getSupabase();
    const [pending, recent] = await Promise.all([
      supabase
        .from("product_reviews")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("product_reviews")
        .select("*")
        .neq("status", "pending")
        .order("moderated_at", { ascending: false })
        .limit(100),
    ]);

    if (pending.error) throw new Error(pending.error.message);
    if (recent.error) throw new Error(recent.error.message);

    return {
      pending: ((pending.data ?? []) as ReviewRow[]).map(toQueued),
      recent: ((recent.data ?? []) as ReviewRow[]).map(toQueued),
      unavailable: false,
    };
  } catch (err) {
    console.error("Couldn't load the review queue:", err);
    return { pending: [], recent: [], unavailable: true };
  }
}

/** Publish or refuse one review. Returns the product slug to revalidate. */
export async function moderateReview(
  id: string,
  decision: "approved" | "rejected",
  moderator: string,
): Promise<{ productSlug: string | null }> {
  const { data, error } = await getSupabase()
    .from("product_reviews")
    .update({
      status: decision,
      moderated_by: moderator,
      moderated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("product_slug")
    .maybeSingle();

  if (error) throw new Error(`Failed to moderate that review: ${error.message}`);
  return { productSlug: (data as { product_slug: string | null } | null)?.product_slug ?? null };
}

/** WHOA's public answer under a review. Empty clears it. */
export async function replyToReview(
  id: string,
  body: string,
): Promise<{ productSlug: string | null }> {
  const text = clean(body, BODY_MAX);

  const { data, error } = await getSupabase()
    .from("product_reviews")
    .update({
      reply_body: text || null,
      reply_at: text ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .select("product_slug")
    .maybeSingle();

  if (error) throw new Error(`Failed to save that reply: ${error.message}`);
  return { productSlug: (data as { product_slug: string | null } | null)?.product_slug ?? null };
}

/**
 * aggregateRating and review, or nothing at all.
 *
 * Nothing at all is a perfectly good answer: Search Console calls both
 * fields non-critical and warns about them precisely because a product
 * with no reviews has nothing true to put there. Inventing a number to
 * silence a warning trades a warning nobody sees for a penalty everybody
 * does.
 */
export function reviewJsonLd(reviews: ProductReview[]): Record<string, unknown> {
  if (reviews.length === 0) return {};

  const summary = summarize(reviews);

  return {
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: summary.average,
      reviewCount: summary.count,
      bestRating: 5,
      worstRating: 1,
    },
    // A subset of what the page shows, newest first. Capped because the
    // markup is for the snippet, not an archive.
    review: reviews.slice(0, 20).map((review) => ({
      "@type": "Review",
      author: { "@type": "Person", name: review.authorName },
      datePublished: review.createdAt.slice(0, 10),
      name: review.title || undefined,
      reviewBody: review.body,
      reviewRating: {
        "@type": "Rating",
        ratingValue: review.rating,
        bestRating: 5,
        worstRating: 1,
      },
    })),
  };
}
