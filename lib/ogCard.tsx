import { ImageResponse } from "next/og";

/**
 * The share previews.
 *
 * Every link off this site used to show the same orange slab, because
 * the root layout pinned one image and one title onto every page. These
 * are the cards that replace it: one shape for anything with a
 * photograph behind it (a product, a post, an artist) and one for
 * anything without.
 *
 * Satori, which renders these, is not a browser. It supports flexbox and
 * nothing else -- no grid, no background-clip, no shorthand that it has
 * not implemented -- and it requires display:flex on any element with
 * more than one child. Keep that in mind before "tidying" the styles
 * below: a card that renders in a browser preview is not evidence.
 */

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

const INK = "#0a0806";
const PAPER = "#f7f0e6";
const MUTED = "#b8ada0";
const FLAME = "linear-gradient(135deg, #ff2f1a 0%, #ff7a00 55%, #ffb800 100%)";
const DOMAIN = "WEAREWHOA.ART";

/**
 * How much the title has to shrink to survive.
 *
 * A product called "Hand-Painted One of One Denim Jacket" and one called
 * "Tee" cannot be set at the same size: the first would overflow the
 * card and be clipped mid-word, which is worse than small. Stepping on
 * character count rather than measuring is approximate, and approximate
 * is enough when the only thing at stake is a few points of type.
 */
function titleSize(title: string, max: number): number {
  if (title.length <= 18) return max;
  if (title.length <= 32) return Math.round(max * 0.78);
  if (title.length <= 52) return Math.round(max * 0.62);
  return Math.round(max * 0.5);
}

function Wordmark({ dark = false }: { dark?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ display: "flex", width: 34, height: 34, borderRadius: 10, background: FLAME }} />
      <span
        style={{
          fontSize: 26,
          fontWeight: 800,
          letterSpacing: 4,
          color: dark ? INK : PAPER,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        WHOA
      </span>
    </div>
  );
}

/**
 * A card built around a photograph.
 *
 * The photo takes the left 58% rather than the full bleed behind the
 * text, because a product shot on a pale background and a dark live
 * photo cannot both carry legible type on top of them. A panel beside
 * the picture is readable whatever the picture turns out to be.
 */
function PhotoCard({
  photo,
  eyebrow,
  title,
  meta,
}: {
  photo: string;
  eyebrow: string;
  title: string;
  meta?: string;
}) {
  return (
    <div style={{ display: "flex", width: "100%", height: "100%", background: INK }}>
      <div style={{ display: "flex", width: "58%", height: "100%", position: "relative" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo} alt="" width={696} height={630} style={{ objectFit: "cover" }} />
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "42%",
          height: "100%",
          padding: 48,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span
            style={{
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: 3,
              textTransform: "uppercase",
              color: "#ff7a00",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            {eyebrow}
          </span>
          <span
            style={{
              marginTop: 18,
              fontSize: titleSize(title, 60),
              fontWeight: 800,
              lineHeight: 1.08,
              color: PAPER,
              fontFamily: "system-ui, sans-serif",
            }}
          >
            {title}
          </span>
          {meta && (
            <span
              style={{
                marginTop: 18,
                fontSize: 30,
                fontWeight: 600,
                color: MUTED,
                fontFamily: "system-ui, sans-serif",
              }}
            >
              {meta}
            </span>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <Wordmark />
          <span
            style={{
              marginTop: 10,
              fontSize: 17,
              letterSpacing: 2,
              color: MUTED,
              fontFamily: "system-ui, sans-serif",
            }}
          >
            {DOMAIN}
          </span>
        </div>
      </div>
    </div>
  );
}

/** The card for a page with no photograph of its own. */
function TextCard({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: "100%",
        height: "100%",
        padding: 72,
        background: FLAME,
      }}
    >
      <Wordmark dark />

      <div style={{ display: "flex", flexDirection: "column" }}>
        {eyebrow && (
          <span
            style={{
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: "rgba(10,8,6,0.65)",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            {eyebrow}
          </span>
        )}
        <span
          style={{
            marginTop: 14,
            fontSize: titleSize(title, 108),
            fontWeight: 900,
            lineHeight: 1.02,
            letterSpacing: -2,
            color: INK,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          {title}
        </span>
        {subtitle && (
          <span
            style={{
              marginTop: 20,
              fontSize: 30,
              fontWeight: 600,
              lineHeight: 1.3,
              color: "rgba(10,8,6,0.75)",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            {subtitle}
          </span>
        )}
      </div>

      <span
        style={{
          fontSize: 20,
          fontWeight: 700,
          letterSpacing: 3,
          color: "rgba(10,8,6,0.7)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {DOMAIN}
      </span>
    </div>
  );
}

export interface OgCardInput {
  /** Small line above the title: the section, the genre, the date. */
  eyebrow?: string;
  title: string;
  /** Sits under the title. On a photo card this is the price or the date. */
  subtitle?: string;
  /**
   * An absolute URL. Satori fetches it while rendering, so a photo that
   * is slow or 404s would hang or break the card -- which is why every
   * caller passes one it got from the same data as the page itself, and
   * why the text card exists as the fallback rather than a broken image.
   */
  photo?: string | null;
}

/**
 * Renders a share card. One entry point, so a new page cannot invent a
 * fifth layout by accident.
 */
export function ogCard({ eyebrow, title, subtitle, photo }: OgCardInput): ImageResponse {
  return new ImageResponse(
    photo ? (
      <PhotoCard photo={photo} eyebrow={eyebrow ?? "WHOA"} title={title} meta={subtitle} />
    ) : (
      <TextCard eyebrow={eyebrow} title={title} subtitle={subtitle} />
    ),
    { ...OG_SIZE },
  );
}
