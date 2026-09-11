/**
 * The areas that aren't open to the public yet.
 *
 * Kept in one place because "locked" has to be told the same way everywhere
 * — the homepage orrery, the desktop nav, the mobile dock, the Join tiles,
 * a mention in a paragraph — and a visitor who finds one unlocked entrance
 * has effectively found the thing unlocked. Opening an area back up is
 * deleting a line here, not hunting through components.
 *
 * The pages themselves stay live and reachable by URL: artists and
 * musicians already mid-application, and staff checking their own work,
 * still need them. This governs what the public site invites you to click.
 */
export const LOCKED_ROUTES: readonly string[] = ["/join", "/art-collective", "/music-collective"];

/** The words shown next to the padlock, in one place so they never drift. */
export const COMING_SOON_LABEL = "Coming Soon!";

/**
 * Whether a link should be shown locked. Compares the path only, so a
 * query string or a trailing slash can't sneak an unlocked link through.
 * Deeper paths (`/art-collective/apply`, an artist's own page) are not
 * locked — those are reached from inside the section, and stranding
 * someone already in there helps nobody.
 */
export function isLockedRoute(href: string): boolean {
  const path = (href.split(/[?#]/)[0] || "/").replace(/\/+$/, "") || "/";
  return LOCKED_ROUTES.includes(path);
}
