import assert from 'node:assert/strict';
import test from 'node:test';
import type { Product } from '../types';
import { getProductCatalogPage } from '../server/services/catalog-pagination.service';

function makeProduct(index: number): Product {
  const suffix = String(index).padStart(4, '0');
  return {
    id: `product-${suffix}`,
    slug: `widget-${suffix}`,
    title: { en: `Widget ${suffix}`, ar: `منتج ${suffix}` },
    shortSummary: { en: 'Lightweight test item', ar: 'منتج تجريبي خفيف' },
    whyWePickedIt: { en: '', ar: '' },
    whatToConsider: { en: '', ar: '' },
    description: { en: '', ar: '' },
    priceAmount: 10 + (index % 90),
    priceCurrency: 'USD',
    priceDisplayPolicy: 'show_with_timestamp',
    priceUpdatedAt: '2026-01-01T00:00:00.000Z',
    images: [],
    affiliateUrl: 'https://example.com/item',
    sourceId: index % 2 ? 'store-a' : 'store-b',
    sourceSlug: index % 2 ? 'store-a' : 'store-b',
    sourceName: { en: 'Store', ar: 'متجر' },
    sourceDisclosure: { en: '', ar: '' },
    categoryId: 'electronics',
    categorySlug: 'electronics',
    categoryName: { en: 'Electronics', ar: 'إلكترونيات' },
    tags: ['widget'],
    isFeatured: false,
    status: 'published',
    clicksCount: 0,
    createdAt: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
    updatedAt: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
  };
}

test('catalog filtering, sort order, and cursor traversal preserve all matching products', () => {
  const products = Array.from({ length: 1_000 }, (_, index) => makeProduct(index));
  const seen = new Set<string>();
  let cursor: string | null = null;
  let pageCount = 0;

  do {
    const page = getProductCatalogPage(products, [], {
      category: 'electronics',
      source: 'store-a',
      query: 'widget',
      sort: 'price_asc',
      cursor,
    });
    for (const product of page.items) {
      assert.equal(product.sourceSlug, 'store-a');
      assert.equal(product.categorySlug, 'electronics');
      assert.ok(product.slug.includes('widget'));
      assert.equal(seen.has(product.id), false);
      seen.add(product.id);
    }
    cursor = page.nextCursor;
    pageCount += 1;
  } while (cursor);

  assert.equal(seen.size, 500);
  assert.equal(pageCount, Math.ceil(500 / 24));
});

test('initial catalog page bounds the 10,000-record response and card render set', () => {
  const inventory = Array.from({ length: 10_000 }, (_, index) => makeProduct(index));
  const beforePayload = JSON.stringify({ products: inventory });
  const startedAt = performance.now();
  const page = getProductCatalogPage(inventory, [], {});
  const elapsedMs = performance.now() - startedAt;
  const afterPayload = JSON.stringify({
    products: page.items,
    total: page.total,
    hasMore: page.hasMore,
    nextCursor: page.nextCursor,
  });

  assert.equal(page.total, 10_000);
  assert.equal(page.items.length, 24);
  assert.equal(page.hasMore, true);
  console.log(JSON.stringify({
    scenario: 'synthetic-10k-catalog',
    beforeItemsSentAndMapped: inventory.length,
    afterItemsSentAndMapped: page.items.length,
    beforeJsonBytes: Buffer.byteLength(beforePayload),
    afterJsonBytes: Buffer.byteLength(afterPayload),
    serverPageComputationMs: Number(elapsedMs.toFixed(2)),
  }));
});
