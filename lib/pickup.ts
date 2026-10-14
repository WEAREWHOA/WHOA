import { PERMANENT_LOCATIONS, formatAddress } from "./stores";

/**
 * Local pickup at the WHOADEGA.
 *
 * One home for the facts and the wording, because three places have to
 * agree and they are a server action, a client component and an email
 * template -- the checkout screen that offers it, the Square order that
 * records it, and the receipt that tells somebody where to go. A pickup
 * address that was right in two of the three would send a customer to
 * the wrong door.
 *
 * Read off the stores list rather than retyped, so there is still only
 * one WHOADEGA address in the codebase.
 */

const WHOADEGA = PERMANENT_LOCATIONS.find((location) => location.slug === "whoadega");

export const PICKUP_STORE_NAME = WHOADEGA?.name ?? "The WHOADEGA";

/** "4847 Newport Ave, San Diego, CA 92107" */
export const PICKUP_ADDRESS = WHOADEGA?.address ? formatAddress(WHOADEGA.address) : "";

export const PICKUP_PHONE = WHOADEGA?.phone ?? "";

/**
 * What a customer is promised when they choose pickup.
 *
 * No collection time is offered and none is asked for. A small shop
 * cannot honour a slot chosen by a stranger at 2am, and a promise the
 * shop has to break is worse than a window nobody was given.
 */
export const PICKUP_LEAD_TIME =
  "Give us up to 24 hours to get this order ready. If you need it faster, call or email us and we'll prioritize it.";

/**
 * Hours deliberately not stated anywhere.
 *
 * They change, and a printed hour that is wrong sends somebody to a
 * locked door -- which is worse than one more tap. Google is where the
 * shop keeps them current, so Google is what we link to.
 */
export const PICKUP_HOURS_URL = `https://maps.google.com/maps?q=${encodeURIComponent(
  `${PICKUP_STORE_NAME} ${PICKUP_ADDRESS}`,
)}`;
