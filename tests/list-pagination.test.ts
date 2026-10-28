import assert from 'node:assert/strict';
import test from 'node:test';
import { paginateByCursor, sortByCursor, type CursorPage } from '../lib/listPagination';

test('cursor pagination returns each item once in stable order', () => {
  const records = sortByCursor(
    Array.from({ length: 10_000 }, (_, index) => ({
      id: `item-${String(index).padStart(5, '0')}`,
      rank: index % 17,
    })),
    (a, b) => a.rank - b.rank
  );
  const visited = new Set<string>();
  let cursor: string | null = null;
  let pages = 0;

  do {
    const page: CursorPage<(typeof records)[number]> = paginateByCursor(records, cursor, 37);
    assert.ok(page.items.length <= 37);
    for (const item of page.items) {
      assert.equal(visited.has(item.id), false);
      visited.add(item.id);
    }
    cursor = page.nextCursor;
    pages += 1;
  } while (cursor);

  assert.equal(visited.size, records.length);
  assert.equal(pages, Math.ceil(records.length / 37));
});

test('cursor pagination clamps page sizes and rejects stale cursors', () => {
  const records = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

  assert.deepEqual(paginateByCursor(records, null, 1000, 2).items, [
    { id: 'a' },
    { id: 'b' },
  ]);
  assert.throws(() => paginateByCursor(records, 'missing', 2));
});
