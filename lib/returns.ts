/**
 * How long a customer has to send something back.
 *
 * One constant because three places quote it: the return policy page,
 * the product structured data Google reads, and anything else that ever
 * needs to state it. A returns window that says 14 days on the page and
 * 30 in the markup is the kind of mismatch that gets a Merchant Center
 * account suspended, not just an item disapproved.
 */
export const RETURN_WINDOW_DAYS = 14;
