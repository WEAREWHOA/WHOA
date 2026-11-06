import { listStockLines } from "./inventoryAdmin";

/**
 * Our counts, as a file anything can read.
 *
 * The point is that it needs nobody's permission. Every other way of
 * getting stock out of here and into another shop waits on an approval
 * somewhere: a developer app, a connector's onboarding, a platform
 * migration. This waits on nothing, and it is the same numbers.
 *
 * Keyed on SKU first because that is the column every bulk upload
 * template and every connector matches on. The variation id is carried
 * alongside it so a row can always be traced back here even when the
 * SKU is blank, which for us it often is.
 */

/**
 * One CSV field, quoted the way a spreadsheet expects.
 *
 * Everything is quoted rather than only the fields that need it. A
 * product name with a comma in it is the normal case here, not the
 * exception, and a rule with no exceptions cannot be applied wrongly to
 * the one row somebody does not check. Inner quotes are doubled, which
 * is what the format says and what Excel and Sheets both read back.
 */
function field(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '""';
  return `"${String(value).replace(/"/g, '""')}"`;
}

const HEADERS = [
  "sku",
  "product",
  "option",
  "quantity",
  "tracked",
  "variation_id",
] as const;

export async function buildStockCsv(locationId: string): Promise<string> {
  const lines = await listStockLines(locationId);

  const rows = lines.map((line) =>
    [
      field(line.sku),
      field(line.productName),
      field(line.variationName),
      // Untracked means unlimited, which is not a number. Left empty
      // rather than written as 0, because 0 in a stock column means
      // sold out and would take a made-to-order piece off sale
      // everywhere it was uploaded.
      field(line.tracked ? line.quantity : ""),
      field(line.tracked ? "yes" : "no"),
      field(line.variationId),
    ].join(","),
  );

  // CRLF and a leading BOM. Both are concessions to Excel, which is
  // what this file gets opened in: without the BOM it mangles any
  // accented character in a product name, and without CRLF some
  // versions put the whole file in one row.
  return `﻿${[HEADERS.join(","), ...rows].join("\r\n")}\r\n`;
}

/** A filename with the date in it, so two downloads do not collide. */
export function stockCsvFilename(now: Date = new Date()): string {
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return `whoa-stock-${day}.csv`;
}
