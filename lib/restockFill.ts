import { parseCsv, toCsv } from "./csv";
import { listStockLines } from "./inventoryAdmin";

/**
 * Filling in the quantities on somebody else's spreadsheet.
 *
 * The job this removes is real and dull: TikTok hands you a sheet of
 * your own listings and you type a number into each row by reading it
 * off another screen. For a few hundred variations that is an evening,
 * every time the stock moves, which is why it does not get done.
 *
 * ───────────────────────────────────────────────────────────────────────
 * It hands back a COLUMN, not a filled-in copy of their file. That is
 * the whole design and it is deliberate:
 *
 *   Writing their file back means writing xlsx, which means a
 *   spreadsheet library, which for this app means three more security
 *   advisories. A column is plain text and needs none of it.
 *
 *   A file that comes back looking ready to upload invites uploading it
 *   without looking. If a hundred rows silently failed to match, that
 *   uploads a hundred wrong numbers to a live shop. A column somebody
 *   has to paste is a column somebody glances at first.
 *
 *   Their file keeps whatever shape TikTok wants, including the bits we
 *   would have to understand in order not to break: category rows,
 *   hidden sheets, validation. We never touch it.
 *
 * Row order is preserved exactly, so the column pastes straight down
 * against the rows it was built from.
 * ───────────────────────────────────────────────────────────────────────
 */

/**
 * What a SKU column might be called.
 *
 * Matched loosely because this header comes from somebody else and
 * changes without notice. Checked longest-first so "seller_sku" wins
 * over a bare "sku" when a sheet carries both, which it does: one is
 * our code and the other is theirs, and ours is the one that matches.
 */
const SKU_HEADERS = [
  "seller sku",
  "seller_sku",
  "sellersku",
  "merchant sku",
  "your sku",
  "sku id",
  "sku",
];

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

/** Which column holds the SKU, or nothing if none of them do. */
export function findSkuColumn(headers: string[]): number {
  const normalized = headers.map(normalizeHeader);

  for (const candidate of SKU_HEADERS) {
    const want = normalizeHeader(candidate);
    const exact = normalized.indexOf(want);
    if (exact !== -1) return exact;
  }

  // Nothing matched outright, so take a column that merely contains the
  // word. Last resort: a header like "SKU (do not edit)" is still the
  // SKU column, and failing here would send somebody back to typing.
  return normalized.findIndex((h) => h.includes("sku"));
}

export interface RestockResult {
  csv: string;
  matched: number;
  unmatched: number;
  untracked: number;
  /** The headers we saw, for the message when no SKU column is found. */
  headers: string[];
}

export class NoSkuColumnError extends Error {
  constructor(public headers: string[]) {
    super("No SKU column found");
    this.name = "NoSkuColumnError";
  }
}

/**
 * Their sheet in, a quantity column out.
 *
 * Unmatched rows say so in words rather than carrying a zero. A zero in
 * a stock column means sold out, and a row that failed to match is the
 * row we know least about: guessing zero there would delist a product
 * because of a typo in a SKU.
 */
export async function buildRestockColumn(
  fileText: string,
  locationId: string,
): Promise<RestockResult> {
  const rows = parseCsv(fileText);
  if (rows.length === 0) throw new NoSkuColumnError([]);

  const headers = rows[0];
  const skuColumn = findSkuColumn(headers);
  if (skuColumn === -1) throw new NoSkuColumnError(headers);

  const lines = await listStockLines(locationId);
  const bySku = new Map<string, (typeof lines)[number]>();
  for (const line of lines) {
    const key = line.sku?.trim().toLowerCase();
    // First one wins. Two variations sharing a SKU is a catalogue
    // mistake rather than something to resolve by guessing here, and it
    // shows up as a quantity that looks wrong on one of them.
    if (key && !bySku.has(key)) bySku.set(key, line);
  }

  const out: (string | number)[][] = [["sku", "quantity", "status"]];
  let matched = 0;
  let unmatched = 0;
  let untracked = 0;

  for (const row of rows.slice(1)) {
    const sku = (row[skuColumn] ?? "").trim();
    const line = bySku.get(sku.toLowerCase());

    if (!sku) {
      out.push(["", "", "no sku on this row"]);
      unmatched += 1;
    } else if (!line) {
      out.push([sku, "", "no match in our inventory"]);
      unmatched += 1;
    } else if (!line.tracked) {
      // Not counted here means unlimited, which is not a number to
      // paste. Said plainly so somebody decides what it should be
      // rather than inheriting whatever was in the cell.
      out.push([sku, "", "not counted here, set it yourself"]);
      untracked += 1;
    } else {
      out.push([sku, line.quantity, "ok"]);
      matched += 1;
    }
  }

  return { csv: toCsv(out), matched, unmatched, untracked, headers };
}
