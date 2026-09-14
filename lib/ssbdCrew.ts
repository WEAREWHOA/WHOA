/**
 * The event the /ssbd crew invite onboards people onto.
 *
 * Its own module rather than a constant in app/ssbd/actions.ts because
 * that file is "use server", where every export has to be an async
 * function — a plain string constant there fails the build.
 */
export const SSBD_EVENT_ID = "ssbd-2026";

/** Where a newly onboarded crew member lands: straight into the crew hub. */
export const SSBD_CREW_HUB = `/event-sales/${SSBD_EVENT_ID}`;
