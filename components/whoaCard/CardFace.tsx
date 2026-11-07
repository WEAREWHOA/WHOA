/**
 * The metal card, drawn rather than photographed.
 *
 * Drawn because the thing it has to stay true to is the card in
 * somebody's hand, and a photograph of one card under one light
 * becomes wrong the moment the stock changes. The brushed rose gold
 * lives in one CSS class (.whoa-card-metal), so when the real card
 * changes there is one place to change.
 *
 * Decorative by default: it says nothing a screen reader needs, since
 * every word on it is repeated as real text beside it.
 */
export default function CardFace({
  /** Shown small on the face, the way a number is on a real card. */
  code,
  member,
  className = "",
}: {
  code?: string | null;
  member?: boolean;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={`whoa-card-metal relative w-full max-w-sm overflow-hidden p-5 ${className}`}
    >
      <div className="whoa-card-metal-ink flex h-full flex-col justify-between">
        <div className="flex items-start justify-between gap-3">
          <span className="font-display text-2xl leading-none tracking-wide">
            WHOA<span className="opacity-60">.</span>
          </span>
          {member && (
            <span className="rounded-full border border-black/20 px-2 py-0.5 text-[10px] font-semibold tracking-[0.18em] uppercase opacity-75">
              Member
            </span>
          )}
        </div>

        <div>
          {/* Monospaced and spaced out, because a code on a card is
              read aloud a character at a time. */}
          <p className="font-mono text-xs tracking-[0.2em] opacity-80">
            {code ?? "WHOA •••• ••••"}
          </p>
        </div>
      </div>
    </div>
  );
}
