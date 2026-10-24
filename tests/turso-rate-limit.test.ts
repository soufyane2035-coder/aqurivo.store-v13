import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createClient } from '@libsql/client';
import { checkRateLimitWithClient } from '../server/database/rate-limit-logic';

test('Turso rate limits are atomic, bounded, and reset per fixed window', async () => {
  const client = createClient({
    url: 'file::memory:',
  });

  await client.execute(`CREATE TABLE request_rate_limits (
    bucket_hash TEXT PRIMARY KEY,
    window_started_at INTEGER NOT NULL,
    request_count INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  )`);

  const bucketKey = 'contact_form:daily-ip-hash';
  const first = await checkRateLimitWithClient(client, bucketKey, 2, 60_000, 120_000);
  const second = await checkRateLimitWithClient(client, bucketKey, 2, 60_000, 120_001);
  const blocked = await checkRateLimitWithClient(client, bucketKey, 2, 60_000, 120_002);
  const reset = await checkRateLimitWithClient(client, bucketKey, 2, 60_000, 180_000);

  assert.equal(first.allowed, true);
  assert.equal(second.allowed, true);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.retryAfterSeconds, 60);
  assert.equal(reset.allowed, true);

  const stored = await client.execute(
    'SELECT bucket_hash, request_count FROM request_rate_limits'
  );
  assert.equal(stored.rows.length, 1);
  assert.notEqual(String(stored.rows[0].bucket_hash), bucketKey);
  assert.equal(Number(stored.rows[0].request_count), 1);

  const concurrent = await Promise.all(
    Array.from({ length: 25 }, () =>
      checkRateLimitWithClient(client, 'concurrent:daily-ip-hash', 10, 60_000, 240_000)
    )
  );
  assert.equal(concurrent.filter((decision) => decision.allowed).length, 10);
  assert.equal(concurrent.filter((decision) => !decision.allowed).length, 15);

  await assert.rejects(
    checkRateLimitWithClient(client, bucketKey, 0, 60_000),
    /Invalid rate-limit parameters/
  );
  await client.close();
});
