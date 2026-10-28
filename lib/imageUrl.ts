/**
 * Turning a link somebody pasted into one an <img> can actually load.
 *
 * A share link from a file host is a web page about the file, not the
 * file. Pasting one into a flyer field gives a broken image and no
 * explanation, because the browser asked for an image and was handed
 * HTML. The hosts people actually paste are few enough to handle by
 * name: fix the ones with a documented direct form, and refuse the ones
 * without, saying why.
 */

export type ImageUrlCheck =
  | { ok: true; url: string | null }
  | { ok: false; error: string };

const USE_LIBRARY = "Upload it in the Images panel at the bottom of this tab and paste that URL instead.";

/**
 * Dropbox serves the raw bytes when a link carries raw=1, and its
 * interstitial preview page otherwise. dl=1 is not the answer either:
 * that sets a download disposition, which an <img> will not render.
 *
 * Both link shapes are handled, the older /s/ one and the /scl/fi/ one
 * Dropbox issues now, whose rlkey must be kept or the link stops
 * resolving at all.
 */
function dropboxDirect(url: URL): URL {
  const direct = new URL(url.toString());
  direct.searchParams.delete("dl");
  direct.searchParams.set("raw", "1");
  return direct;
}

/**
 * Hosts whose share links cannot be embedded and have no stable direct
 * form worth rewriting to. Google Drive had one for years and has been
 * closing it off; guessing at it would produce a link that works today
 * for whoever is signed in and breaks for the public, which is worse
 * than refusing it here.
 */
const NOT_EMBEDDABLE: { match: RegExp; name: string }[] = [
  { match: /(^|\.)drive\.google\.com$/i, name: "Google Drive" },
  { match: /(^|\.)docs\.google\.com$/i, name: "Google Docs" },
  { match: /(^|\.)onedrive\.live\.com$/i, name: "OneDrive" },
  { match: /(^|\.)1drv\.ms$/i, name: "OneDrive" },
  { match: /(^|\.)icloud\.com$/i, name: "iCloud" },
  { match: /(^|\.)wetransfer\.com$/i, name: "WeTransfer" },
];

export function normalizeImageUrl(raw: string | null | undefined): ImageUrlCheck {
  const trimmed = raw?.trim();
  if (!trimmed) return { ok: true, url: null };

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { ok: false, error: `"${trimmed}" isn't a full URL. It needs to start with https://.` };
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { ok: false, error: "A flyer image has to be an http or https URL." };
  }

  const host = url.hostname;

  if (/(^|\.)dropbox\.com$/i.test(host)) {
    return { ok: true, url: dropboxDirect(url).toString() };
  }
  if (/(^|\.)dropboxusercontent\.com$/i.test(host)) {
    return { ok: true, url: url.toString() };
  }

  const blocked = NOT_EMBEDDABLE.find((entry) => entry.match.test(host));
  if (blocked) {
    return {
      ok: false,
      error: `${blocked.name} share links are web pages rather than image files, so the card would show nothing. ${USE_LIBRARY}`,
    };
  }

  return { ok: true, url: url.toString() };
}
