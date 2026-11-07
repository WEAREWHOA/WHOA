export const REF_COOKIE = "whoa_ref";
export const REF_COOKIE_DAYS = 30;

/**
 * The store promo a customer has typed, kept apart from the referral.
 *
 * A separate cookie, not a replacement for the referral one, because
 * the two answer different questions and both can be true at once: a
 * customer can arrive through an ambassador's link AND type a store
 * code at checkout. Overwriting the referral with the promo is exactly
 * the bug this separation exists to prevent, since it would quietly
 * take the sale off the ambassador who earned it.
 *
 * Short-lived compared to the referral. A sale is a thing happening
 * this week; a referral is a relationship that lasts a month. A promo
 * that outlived its own end date in somebody's browser would also keep
 * being re-checked against the database on every checkout for nothing.
 */
export const PROMO_COOKIE = "whoa_promo";
export const PROMO_COOKIE_DAYS = 7;
