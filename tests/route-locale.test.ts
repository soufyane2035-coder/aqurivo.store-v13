import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildLocalizedPathname,
  resolvePathLocale,
} from '../i18n/routeLocale';

test('legacy catalog and editorial routes resolve to their Arabic canonical language', () => {
  for (const pathname of [
    '/products',
    '/products/example-item',
    '/categories',
    '/categories/electronics',
    '/guides',
    '/guides/example-guide',
    '/blog',
    '/blog/example-guide',
  ]) {
    assert.equal(resolvePathLocale(pathname), 'ar', pathname);
  }
});

test('locale-prefixed paths retain their explicit language', () => {
  assert.equal(resolvePathLocale('/en/products'), 'en');
  assert.equal(resolvePathLocale('/ar/guides/example-guide'), 'ar');
  assert.equal(resolvePathLocale('/other'), null);
});

test('legacy blog aliases switch to the localized guide route', () => {
  assert.equal(buildLocalizedPathname('/blog', 'en'), '/en/guides');
  assert.equal(
    buildLocalizedPathname('/blog/example-guide', 'en'),
    '/en/guides/example-guide'
  );
  assert.equal(buildLocalizedPathname('/products/example-item', 'en'), '/en/products/example-item');
});
