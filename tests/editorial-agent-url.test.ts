import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validatePublicHttpUrl } from '../server/utils/public-url';

test('editorial source validation rejects local, private, and reserved destinations', async () => {
  for (const url of [
    'http://localhost/',
    'https://admin.localhost/',
    'http://127.0.0.1/',
    'http://10.0.0.4/',
    'http://169.254.169.254/latest/meta-data/',
    'http://100.64.1.2/',
    'http://[::1]/',
    'http://[fc00::1]/',
    'http://[2001:0::1]/',
    'http://[2002:c000:0201::1]/',
    'https://192.0.2.10/',
    'https://198.51.100.10/',
  ]) {
    await assert.rejects(validatePublicHttpUrl(url));
  }
});

test('editorial source validation requires ordinary HTTP(S) ports and safe URLs', async () => {
  for (const url of [
    'ftp://example.com/file',
    'https://user:password@example.com/product',
    'https://example.com:8443/product',
    'https://example.com:80/product',
    `https://${'a'.repeat(2049)}.com/product`,
  ]) {
    await assert.rejects(validatePublicHttpUrl(url));
  }
});

test('editorial source validation accepts public IP URLs and removes fragments', async () => {
  assert.equal(
    await validatePublicHttpUrl('https://8.8.8.8/product?ref=store#details'),
    'https://8.8.8.8/product?ref=store'
  );
});
