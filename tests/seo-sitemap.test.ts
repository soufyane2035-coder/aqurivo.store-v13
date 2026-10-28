import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSeoSitemap } from '../lib/seo-sitemap';

test('sitemap contains only published content and active categories', () => {
  const entries = buildSeoSitemap(
    'https://aqurivo.store/',
    [
      {
        slug: 'published-product',
        status: 'published',
        updatedAt: '2026-10-01T10:00:00.000Z',
        createdAt: '2026-09-01T10:00:00.000Z',
        hasArabicVideo: true,
        hasEnglishVideo: false,
      },
      {
        slug: 'draft-product',
        status: 'draft',
        hasArabicVideo: true,
        hasEnglishVideo: true,
      },
    ],
    [
      {
        slug: 'published-guide',
        status: 'published',
        publishedAt: '2026-09-01T10:00:00.000Z',
      },
      { slug: 'draft-guide', status: 'draft' },
    ],
    [{ slug: 'active-category' }, { slug: 'inactive-category', isActive: false }],
    [{ slug: 'working-tool' }]
  );
  const urls = entries.map((entry) => entry.url);

  assert.ok(urls.includes('https://aqurivo.store/en/products/published-product'));
  assert.ok(urls.includes('https://aqurivo.store/ar/products/published-product'));
  assert.ok(urls.includes('https://aqurivo.store/ar/videos/published-product'));
  assert.ok(!urls.includes('https://aqurivo.store/en/videos/published-product'));
  const arabicVideo = entries.find(
    (entry) => entry.url === 'https://aqurivo.store/ar/videos/published-product'
  );
  assert.deepEqual(arabicVideo?.alternates?.languages, {
    ar: 'https://aqurivo.store/ar/videos/published-product',
  });
  assert.ok(urls.includes('https://aqurivo.store/en/guides/published-guide'));
  assert.ok(urls.includes('https://aqurivo.store/en/categories/active-category'));
  assert.ok(urls.includes('https://aqurivo.store/en/tools/working-tool'));
  assert.ok(!urls.some((url) => /draft-|inactive-category/.test(url)));
});

test('sitemap URLs are unique and alternates are reciprocal per entry', () => {
  const entries = buildSeoSitemap(
    'https://aqurivo.store',
    [
      {
        slug: 'a-product',
        status: 'published',
        hasArabicVideo: false,
        hasEnglishVideo: false,
      },
    ],
    [{ slug: 'a-guide', status: 'published' }],
    [{ slug: 'a-category', isActive: true }],
    [{ slug: 'a-tool' }]
  );
  const urls = entries.map((entry) => entry.url);
  const urlSet = new Set(urls);

  assert.equal(new Set(urls).size, urls.length);
  for (const entry of entries) {
    if (!entry.alternates) continue;
    const languages = entry.alternates.languages || {};
    assert.ok(Object.values(languages).includes(entry.url));
    for (const alternateUrl of Object.values(languages)) {
      assert.equal(typeof alternateUrl, 'string');
      if (typeof alternateUrl === 'string') {
        assert.ok(urlSet.has(alternateUrl), `${alternateUrl} must exist in the sitemap`);
      }
    }
  }
});

test('sitemap uses stored modification dates and omits invalid timestamps', () => {
  const entries = buildSeoSitemap(
    'https://aqurivo.store',
    [
      {
        slug: 'dated-product',
        status: 'published',
        updatedAt: 'not-a-date',
        createdAt: '2026-08-15T12:00:00.000Z',
        hasArabicVideo: false,
        hasEnglishVideo: false,
      },
      {
        slug: 'undated-product',
        status: 'published',
        hasArabicVideo: false,
        hasEnglishVideo: false,
      },
    ],
    [{ slug: 'undated-guide', status: 'published', updatedAt: 'invalid' }],
    [],
    []
  );
  const datedProduct = entries.find(
    (entry) => entry.url === 'https://aqurivo.store/en/products/dated-product'
  );
  const undatedProduct = entries.find(
    (entry) => entry.url === 'https://aqurivo.store/en/products/undated-product'
  );
  const undatedGuide = entries.find(
    (entry) => entry.url === 'https://aqurivo.store/en/guides/undated-guide'
  );
  const modifiedAt = datedProduct?.lastModified;

  assert.equal(
    modifiedAt instanceof Date
      ? modifiedAt.toISOString()
      : modifiedAt
        ? new Date(modifiedAt).toISOString()
        : undefined,
    '2026-08-15T12:00:00.000Z'
  );
  assert.equal(undatedProduct?.lastModified, undefined);
  assert.equal(undatedGuide?.lastModified, undefined);
});
