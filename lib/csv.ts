/**
 * Reading a spreadsheet somebody exported.
 *
 * Small on purpose. The alternative was a spreadsheet library, and the
 * one that handles xlsx brings three more advisories into a site that
 * takes card payments. That is a bad trade for a convenience tool, and
 * the design below means we never need to write a spreadsheet back:
 * only read one and hand back a column.
 */

/**
 * Rows of fields, quotes and newlines intact.
 *
 * Written as a character loop rather than split(",") because the thing
 * being parsed is a product catalogue, where a comma inside a name is
 * the normal case and a split would silently shift every later column
 * on exactly the rows nobody checks.
 */
export function parseCsv(text: string): string[][] {
  // Excel writes a BOM and it would otherwise become part of the first
  // header's name, so the column lookup would miss it.
  const input = text.replace(/^﻿/, "");

  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let quoted = false;

  const endField = () => {
    row.push(cur);
    cur = "";
  };
  const endRow = () => {
    endField();
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < input.length; i++) {
    const c = input[i];

    if (quoted) {
      if (c === '"' && input[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
      } else {
        cur += c;
      }
      continue;
    }

    if (c === '"') quoted = true;
    else if (c === ",") endField();
    else if (c === "\r" && input[i + 1] === "\n") {
      endRow();
      i++;
    } else if (c === "\n" || c === "\r") endRow();
    else cur += c;
  }

  // A file that does not end in a newline still has a last row.
  if (cur !== "" || row.length > 0) endRow();

  // Trailing blank lines are not rows; a single empty field is what a
  // blank line parses to.
  return rows.filter((r) => r.some((f) => f.trim() !== ""));
}

/** One field, quoted so a spreadsheet reads it back unchanged. */
export function csvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '""';
  return `"${String(value).replace(/"/g, '""')}"`;
}

/** Rows to a file Excel opens without mangling anything. */
export function toCsv(rows: (string | number | null)[][]): string {
  return `﻿${rows.map((r) => r.map(csvField).join(",")).join("\r\n")}\r\n`;
}
