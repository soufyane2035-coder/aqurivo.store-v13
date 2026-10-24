import 'server-only';

import { ensureTursoSchema, getTursoClient } from './turso';
import {
  checkRateLimitWithClient,
  type RateLimitDecision,
} from './rate-limit-logic';

export async function checkTursoRateLimit(
  bucketKey: string,
  maxRequests: number,
  windowMs: number
): Promise<RateLimitDecision> {
  await ensureTursoSchema();
  return checkRateLimitWithClient(
    getTursoClient(),
    bucketKey,
    maxRequests,
    windowMs
  );
}
