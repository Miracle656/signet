/**
 * Deterministic text metrics for the diagram layout (E-05, design §2.3).
 *
 * Node widths depend on label widths, and the layout runs where there is no
 * DOM and no canvas `measureText`: on the server and inside the Go CLI's JS
 * engine (#544). The site self-hosts IBM Plex Mono (`--font-mono`,
 * apps/web/app/layout.tsx), and with a monospace face width is simply
 * character count × advance — exact, deterministic, environment-free.
 *
 * Advance width: IBM Plex Mono glyphs advance 600 font units on a
 * 1000-unit em, i.e. 0.6 × the font size per cell. Source: the `hmtx`
 * advance in the released fonts,
 * https://github.com/IBM/plex/blob/master/packages/plex-mono (every
 * `IBMPlexMono-*.ttf` reports advanceWidth 600, unitsPerEm 1000).
 *
 * "Cells", not "characters": terminals solved this long ago — East Asian
 * wide characters and emoji occupy two monospace cells, combining marks
 * occupy none. The ranges below are the pragmatic subset a contract
 * diagram's labels can plausibly contain, not a full Unicode width table.
 */

/** IBM Plex Mono advance per cell, in em (600/1000 font units). */
const CELL_EM = 0.6;

/**
 * Minimum rendered text size in CSS pixels (design §2.3): if the diagram
 * would have to shrink text below this to fit, it must switch to the
 * collapsed view instead of scaling down. Nothing may render text smaller.
 */
export const MIN_TEXT_PX = 12;

/** Combining marks: rendered over the previous glyph, zero cells wide. */
function isCombining(cp: number): boolean {
  return (
    (cp >= 0x0300 && cp <= 0x036f) || // Combining Diacritical Marks
    (cp >= 0x1ab0 && cp <= 0x1aff) || // … Extended
    (cp >= 0x20d0 && cp <= 0x20ff) || // … for Symbols
    (cp >= 0xfe20 && cp <= 0xfe2f) // Combining Half Marks
  );
}

/** East Asian wide/fullwidth ranges plus emoji: two cells in a mono face. */
function isWide(cp: number): boolean {
  return (
    (cp >= 0x1100 && cp <= 0x115f) || // Hangul Jamo (leading)
    (cp >= 0x2e80 && cp <= 0x303e) || // CJK Radicals … CJK Symbols
    (cp >= 0x3041 && cp <= 0x33ff) || // Hiragana … CJK Compatibility
    (cp >= 0x3400 && cp <= 0x4dbf) || // CJK Extension A
    (cp >= 0x4e00 && cp <= 0x9fff) || // CJK Unified Ideographs
    (cp >= 0xa000 && cp <= 0xa4cf) || // Yi
    (cp >= 0xac00 && cp <= 0xd7a3) || // Hangul Syllables
    (cp >= 0xf900 && cp <= 0xfaff) || // CJK Compatibility Ideographs
    (cp >= 0xfe30 && cp <= 0xfe4f) || // CJK Compatibility Forms
    (cp >= 0xff00 && cp <= 0xff60) || // Fullwidth Forms
    (cp >= 0xffe0 && cp <= 0xffe6) || // Fullwidth Signs
    (cp >= 0x1f000 && cp <= 0x1faff) || // Mahjong … Symbols & Pictographs Ext-A (emoji)
    (cp >= 0x2600 && cp <= 0x27bf) // Misc Symbols + Dingbats
  );
}

/** Monospace cell width of one code point: 0, 1 or 2. */
function cellsOf(cp: number): number {
  if (isCombining(cp)) return 0;
  return isWide(cp) ? 2 : 1;
}

/** Total monospace cells `text` occupies. */
export function textCells(text: string): number {
  let cells = 0;
  for (const ch of text) {
    cells += cellsOf(ch.codePointAt(0)!);
  }
  return cells;
}

/**
 * Exact rendered width of `text` at `fontSizePx`, in CSS pixels:
 * cells × 0.6 em. Deterministic everywhere the layout runs.
 */
export function textWidth(text: string, fontSizePx: number): number {
  return textCells(text) * CELL_EM * fontSizePx;
}

/**
 * Truncate `text` to at most `maxCells` cells, replacing the tail with `…`
 * (one cell) when it does not fit. Cuts on code-point boundaries and never
 * strands a combining mark ahead of the ellipsis without its base — the
 * width accounting treats a mark as part of its base's cells, so a cut
 * before a mark also drops it.
 *
 * The full name is not lost: #486 keeps it in the tooltip and the outline;
 * this is only what fits inside a node.
 */
export function truncateLabel(text: string, maxCells: number): string {
  if (textCells(text) <= maxCells) return text;

  const budget = Math.max(0, maxCells - 1); // reserve one cell for the ellipsis
  let out = '';
  let used = 0;
  for (const ch of text) {
    const w = cellsOf(ch.codePointAt(0)!);
    // A zero-width mark rides with its base only while the base survived.
    if (w === 0 && out.length === 0) break;
    if (used + w > budget) break;
    out += ch;
    used += w;
  }
  return `${out}…`;
}
