/**
 * Where the map's background comes from.
 *
 * One place, because there are two maps on the site now (the public
 * one and the pin picker) and a tile provider that changes its terms
 * should be a one-line change rather than a hunt.
 *
 * ───────────────────────────────────────────────────────────────────────
 * OpenStreetMap, and keyless is the whole reason.
 *
 * This was CARTO's dark basemap, which was keyless when it was built
 * and started demanding an API key in late September 2026, at which
 * point every map on the site grew a grey "API KEY REQUIRED" watermark.
 * A free CARTO key would fix it and would also be a third party able to
 * do the same thing again, plus a key to keep alive in two
 * environments. Google is not the escape it looks like either: it wants
 * an API key AND a billing account for the same job.
 *
 * OSM's standard tiles need neither. The cost is that they are a light
 * map on a dark site, which is handled in CSS rather than by paying for
 * a dark one (see .whoa-map-dark in globals.css).
 *
 * Their tile policy asks that heavy users run their own server. A
 * sticker map on a brand site is not heavy, but if this ever gets
 * popular enough to matter, the honest fix is a key or our own tiles,
 * and this is the file to change.
 * ───────────────────────────────────────────────────────────────────────
 */

export const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

/** Required by their licence, and shown on the map itself. */
export const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export const TILE_MAX_ZOOM = 19;
