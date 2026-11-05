import Link from "next/link";

import { adjustStockAction, seedStockAction, setStockAction } from "@/app/inventory/actions";
import type { StockLine, StockMovement } from "@/lib/inventoryAdmin";
import type { stuckPushes } from "@/lib/channelSync";

/**
 * The stock we keep, and every hand that moved it.
 *
 * Square has been the book and is moving out. This is where a count is
 * corrected now, and the ledger beside it is the thing Square used to
 * provide: without it the only answer to "why does this say three" is
 * a shrug, and that gets asked the first time a number looks wrong.
 */

const ERRORS: Record<string, string> = {
  invalid: "That didn't come through — try again.",
  quantity: "A count has to be a whole number, zero or more.",
  short: "There isn't enough on the shelf to take that off it.",
  server: "Something went wrong saving that — try again.",
};

function when(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "America/Los_Angeles",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const PAGE = 200;

export default function InventoryTab({
  lines,
  total,
  movements,
  query,
  stuck,
  saved,
  seeded,
  error,
}: {
  lines: StockLine[];
  total: number;
  movements: StockMovement[];
  query: string;
  stuck: Awaited<ReturnType<typeof stuckPushes>>;
  saved?: boolean;
  seeded?: string;
  error?: string;
}) {
  const counted = lines.filter((l) => !l.unseen).length;
  const unseen = lines.length - counted;
  // The whole catalogue is three forms a row, which is a lot of page on
  // a phone in a stockroom. Show the first screenful and let the search
  // reach the rest, rather than making everyone wait for everything.
  const shown = lines.slice(0, PAGE);
  const names = new Map(lines.map((l) => [l.variationId, `${l.productName} · ${l.variationName}`]));

  return (
    <div>
      <span className="text-xs font-semibold tracking-[0.2em] text-muted uppercase">Inventory</span>
      <h3 className="font-display mt-1 text-2xl">What we have</h3>
      <p className="mt-1 text-sm text-muted">
        The count the website sells against. While Square is still ringing sales it writes here
        too, so this follows it; once the shop sells against this table instead, this screen is
        the only place a number changes by hand.
      </p>

      {error && (
        <p className="border-flame-1/40 bg-flame-1/10 text-flame-3 mt-4 rounded-lg border px-4 py-3 text-sm">
          {ERRORS[error] ?? ERRORS.server}
        </p>
      )}
      {stuck.length > 0 && (
        <div className="border-flame-1/40 bg-flame-1/10 mt-4 rounded-lg border px-4 py-3 text-sm">
          <p className="text-flame-3 font-semibold">
            {stuck.length} {stuck.length === 1 ? "listing is" : "listings are"} not reaching the
            other shops.
          </p>
          <ul className="mt-1 text-xs text-muted">
            {stuck.slice(0, 5).map((s) => (
              <li key={`${s.channel}-${s.variationId}`}>
                {s.channel} · {names.get(s.variationId) ?? s.variationId}
                {s.lastError ? ` · ${s.lastError}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
      {saved && (
        <p className="border-flame-2/40 bg-flame-2/10 text-flame-3 mt-4 rounded-lg border px-4 py-2 text-sm">
          Saved.
        </p>
      )}
      {seeded && (
        <p className="border-flame-2/40 bg-flame-2/10 text-flame-3 mt-4 rounded-lg border px-4 py-2 text-sm">
          Copied {seeded} counts across from Square.
        </p>
      )}

      <form method="get" className="mt-6 flex flex-wrap items-center gap-2">
        <input
          name="q"
          defaultValue={query}
          placeholder="Search by product or option"
          aria-label="Search the catalogue"
          className="border-border-strong bg-surface-raised min-w-0 flex-1 rounded-lg border px-4 py-2 text-sm outline-none focus:border-flame-2"
        />
        <button type="submit" className="ba-btn">
          SEARCH
        </button>
        {query && (
          <Link href="/portal/inventory" className="text-sm text-muted hover:text-flame-2">
            Clear
          </Link>
        )}
      </form>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className="text-sm text-muted">
          {query
            ? `${lines.length.toLocaleString()} of ${total.toLocaleString()} matching`
            : `${counted.toLocaleString()} counted`}
          {!query && unseen > 0 ? ` · ${unseen.toLocaleString()} never counted` : ""}
        </span>
        <form action={seedStockAction}>
          <button type="submit" className="ba-btn">
            COPY FROM SQUARE
          </button>
        </form>
      </div>

      {/* Said plainly rather than left to be discovered. This button is
          safe today and becomes destructive on cutover day, and the
          difference is not visible from the button itself. */}
      <p className="mt-2 text-xs text-muted">
        Copying is safe while Square is still selling: it restates what Square says. Stop using it
        once the shop sells against this table, or it will overwrite real sales with Square&apos;s
        older view.
      </p>

      <h4 className="mt-8 font-semibold">Counts</h4>
      {lines.length === 0 ? (
        <p className="an-empty">
          {query
            ? "Nothing matches that."
            : "Nothing in the catalogue yet. Copy from Square above once the catalogue has synced."}
        </p>
      ) : (
        <div className="mt-3 flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border">
          {shown.map((line) => (
            <div key={line.variationId} className="flex flex-wrap items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{line.productName}</p>
                <p className="truncate text-xs text-muted">
                  {line.variationName}
                  {line.unseen && " · never counted"}
                  {!line.tracked && " · not tracked"}
                </p>
              </div>

              {/* One in and one out, for a breakage or a found box, next
                  to the number so it does not need a form filling in. */}
              <form action={adjustStockAction} className="flex items-center gap-1">
                <input type="hidden" name="variationId" value={line.variationId} />
                <input type="hidden" name="delta" value="-1" />
                <button
                  type="submit"
                  aria-label={`One fewer ${line.productName}`}
                  className="border-border-strong flex h-8 w-8 items-center justify-center rounded-full border text-sm hover:text-flame-2"
                >
                  −
                </button>
              </form>

              <span className="font-display w-10 text-center text-lg">
                {line.tracked ? line.quantity : "∞"}
              </span>

              <form action={adjustStockAction} className="flex items-center gap-1">
                <input type="hidden" name="variationId" value={line.variationId} />
                <input type="hidden" name="delta" value="1" />
                <button
                  type="submit"
                  aria-label={`One more ${line.productName}`}
                  className="border-border-strong flex h-8 w-8 items-center justify-center rounded-full border text-sm hover:text-flame-2"
                >
                  +
                </button>
              </form>

              <form action={setStockAction} className="flex items-center gap-2">
                <input type="hidden" name="variationId" value={line.variationId} />
                <input
                  name="quantity"
                  type="number"
                  min={0}
                  step={1}
                  defaultValue={line.quantity}
                  aria-label={`Set the count for ${line.productName}`}
                  className="border-border-strong bg-surface-raised w-20 rounded-lg border px-3 py-1.5 text-sm outline-none focus:border-flame-2"
                />
                <label className="flex items-center gap-1.5 text-xs text-muted">
                  <input type="checkbox" name="tracked" defaultChecked={line.tracked} />
                  Counted
                </label>
                <button type="submit" className="ba-btn">
                  SET
                </button>
              </form>
            </div>
          ))}
          {lines.length > shown.length && (
            <p className="p-3 text-sm text-muted">
              Showing the first {PAGE} of {lines.length.toLocaleString()}. Search above to reach
              the rest.
            </p>
          )}
        </div>
      )}

      <h4 className="mt-10 font-semibold">Recent movements</h4>
      <p className="mt-1 text-sm text-muted">
        Every change, and what caused it. This is what Square used to keep for us.
      </p>
      {movements.length === 0 ? (
        <p className="an-empty">Nothing has moved yet.</p>
      ) : (
        /* A list rather than a table. The columns a ledger needs are the
           ones that fall off the right edge of a phone, and this gets
           read in a stockroom more than at a desk. */
        <ul className="mt-3 flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border">
          {movements.map((m) => (
            <li key={m.id} className="flex items-start gap-3 p-3">
              <span
                className={`font-display w-12 shrink-0 text-right text-lg ${
                  m.delta < 0 ? "text-flame-3" : "text-flame-2"
                }`}
              >
                {m.delta > 0 ? `+${m.delta}` : m.delta}
              </span>
              <div className="min-w-0">
                <p className="text-sm">{names.get(m.variationId) ?? m.variationId}</p>
                <p className="text-xs text-muted">
                  {[
                    `left ${m.quantityAfter}`,
                    m.reason,
                    m.reference,
                    when(m.createdAt),
                    m.actor ?? "system",
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
