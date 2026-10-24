import { createHash } from 'crypto';
import type { Client } from '@libsql/client';

export interface RateLimitDecision {
  allowed: boolean;
  retryAfterSeconds: number;
}

export async function checkRateLimitWithClient(
  client: Client,
  bucketKey: string,
  maxRequests: number,
  windowMs: number,
  now = Date.now()
): Promise<RateLimitDecision> {
  if (
    !bucketKey ||
    !Number.isSafeInteger(maxRequests) ||
    maxRequests < 1 ||
    !Number.isSafeInteger(windowMs) ||
    windowMs < 1000 ||
    !Number.isSafeInteger(now)
  ) {
    throw new Error('Invalid rate-limit parameters.');
  }

  const bucketHash = createHash('sha256').update(bucketKey).digest('hex');
  const windowStartedAt = Math.floor(now / windowMs) * windowMs;
  const expiresAt = windowStartedAt + windowMs * 2;
  const result = await client.execute({
    sql: `INSERT INTO request_rate_limits
      (bucket_hash, window_started_at, request_count, expires_at)
      VALUES (?, ?, 1, ?)
      ON CONFLICT(bucket_hash) DO UPDATE SET
        window_started_at = CASE
          WHEN request_rate_limits.window_started_at < excluded.window_started_at
          THEN excluded.window_started_at
          ELSE request_rate_limits.window_started_at
        END,
        request_count = CASE
          WHEN request_rate_limits.window_started_at < excluded.window_started_at
          THEN 1
          ELSE MIN(request_rate_limits.request_count + 1, ?)
        END,
        expires_at = CASE
          WHEN request_rate_limits.window_started_at < excluded.window_started_at
          THEN excluded.expires_at
          ELSE MAX(request_rate_limits.expires_at, excluded.expires_at)
        END
      RETURNING request_count`,
    args: [bucketHash, windowStartedAt, expiresAt, maxRequests + 1],
  });

  const requestCount = Number(result.rows[0]?.request_count);
  if (!Number.isSafeInteger(requestCount) || requestCount < 1) {
    throw new Error('Turso returned an invalid rate-limit count.');
  }

  const allowed = requestCount <= maxRequests;
  return {
    allowed,
    retryAfterSeconds: allowed
      ? 0
      : Math.max(1, Math.ceil((windowStartedAt + windowMs - now) / 1000)),
  };
}
