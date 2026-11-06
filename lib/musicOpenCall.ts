/**
 * Whether the Music Collective is taking applications.
 *
 * The collective runs on open calls: a few artists at a time, brought in
 * when there is room to actually book and release for them, which is
 * what the decline email says and what this enforces.
 *
 * In one place because "closed" has to be told the same way in every
 * one of them, and because a visitor who finds one entrance still open
 * has effectively found the whole thing open. Opening the next call is
 * flipping the boolean below, not hunting through components.
 *
 * Deliberately NOT part of LOCKED_ROUTES. That list hides a whole
 * section from the public site; here the section stays open, with its
 * roster and every artist's page live and listed. It is only the way in
 * that is shut.
 */
export const MUSIC_APPLICATIONS_OPEN = false;

/** Next to the padlock, wherever a way in used to be. */
export const MUSIC_CLOSED_LABEL = "Applications closed";

/** The short version, for a tile or a line in a paragraph. */
export const MUSIC_CLOSED_BLURB =
  "We take a few artists at a time so we can book and release for everyone we bring in. " +
  "The next open call has not been announced yet.";

/**
 * Where to send somebody who arrived wanting to apply.
 *
 * The newsletter rather than a dead end: interest that turns up at a
 * shut door is worth keeping hold of, and it is the only honest answer
 * to "when does it open" when there is no date to give.
 */
export const MUSIC_CLOSED_CTA = {
  href: "/newsletter",
  label: "Get told when it opens",
} as const;
