import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MIN_TEXT_PX, textCells, textWidth, truncateLabel } from './metrics.ts';

test('ASCII: width is count × 0.6 em, exactly', () => {
  assert.equal(textCells('transfer'), 8);
  assert.equal(textWidth('transfer', 10), 8 * 6);
  assert.equal(textWidth('transfer', MIN_TEXT_PX), 8 * 0.6 * 12);
  assert.equal(textWidth('', 12), 0);
});

test('a combining character adds no cells', () => {
  const composed = 'é'; // e + COMBINING ACUTE ACCENT
  assert.equal(textCells(composed), 1);
  assert.equal(textWidth(composed, 12), textWidth('e', 12));
});

test('an emoji and CJK count as two cells', () => {
  assert.equal(textCells('🔥'), 2);
  assert.equal(textCells('約'), 2);
  assert.equal(textWidth('a🔥', 10), 3 * 6);
});

test('truncation at the boundary: exact fit is untouched, one over gets the ellipsis', () => {
  assert.equal(truncateLabel('abcdef', 6), 'abcdef');
  assert.equal(truncateLabel('abcdefg', 6), 'abcde…');
  // The result never exceeds the budget.
  assert.ok(textCells(truncateLabel('abcdefg', 6)) <= 6);
});

test('truncation counts cells, not code units: a wide char that will not fit is dropped whole', () => {
  // 'ab' (2) + '約' (2) = 4 cells. Budget 4 → untouched.
  assert.equal(truncateLabel('ab約', 4), 'ab約');
  // Budget 3 → the wide char cannot fit next to the ellipsis (2+1 cells used
  // by 'ab' + '…'), and must not be split.
  assert.equal(truncateLabel('ab約', 3), 'ab…');
  assert.equal(textCells(truncateLabel('ab約', 3)), 3);
  // An astral emoji is one code point, two UTF-16 units — the cut never
  // lands inside it.
  assert.equal(truncateLabel('a🔥b', 3), 'a…');
});

test('MIN_TEXT_PX is the design floor', () => {
  assert.equal(MIN_TEXT_PX, 12);
});
