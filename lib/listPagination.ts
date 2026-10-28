export interface CursorPage<T> {
  items: T[];
  total: number;
  hasMore: boolean;
  nextCursor: string | null;
  previousCursor: string | null;
}

export function paginateByCursor<T extends { id: string }>(
  items: T[],
  cursor: string | null,
  requestedLimit: number,
  maximumLimit = 50
): CursorPage<T> {
  const limit = Math.max(1, Math.min(maximumLimit, Math.floor(requestedLimit) || 1));
  let startIndex = 0;

  if (cursor) {
    const cursorIndex = items.findIndex((item) => item.id === cursor);
    if (cursorIndex === -1) {
      throw new Error('The pagination cursor is no longer valid.');
    }
    startIndex = cursorIndex + 1;
  }

  const itemsPage = items.slice(startIndex, startIndex + limit);
  const hasMore = startIndex + itemsPage.length < items.length;

  return {
    items: itemsPage,
    total: items.length,
    hasMore,
    nextCursor: hasMore && itemsPage.length > 0
      ? itemsPage[itemsPage.length - 1].id
      : null,
    previousCursor: startIndex > limit
      ? items[startIndex - limit - 1]?.id ?? null
      : null,
  };
}

export function sortByCursor<T extends { id: string }>(
  items: T[],
  compare: (a: T, b: T) => number
): T[] {
  return [...items].sort((a, b) => compare(a, b) || a.id.localeCompare(b.id));
}
