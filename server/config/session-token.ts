import 'server-only';

import { createHmac, timingSafeEqual } from 'crypto';
import { loadServerEnv, MIN_SESSION_COOKIE_SECRET_LENGTH } from './env';

export const SIGNED_SESSION_TOKEN_PREFIX = 'v2.';

export interface SignedSessionPayload {
  uid: string;
  email: string;
  emailVerified: boolean;
  exp: number;
  iat?: number;
  rt?: string;
}

function getSigningSecret(): string {
  const secret = loadServerEnv().sessionCookieSecret;
  if (secret.length < MIN_SESSION_COOKIE_SECRET_LENGTH) {
    throw new Error(
      `[AQURIVO Configuration Error] SESSION_COOKIE_SECRET must be at least ${MIN_SESSION_COOKIE_SECRET_LENGTH} characters.`
    );
  }
  return secret;
}

export function createSignedSessionToken(payload: SignedSessionPayload): string {
  const data = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = createHmac('sha256', getSigningSecret())
    .update(data)
    .digest('base64url');
  return `${SIGNED_SESSION_TOKEN_PREFIX}${data}.${signature}`;
}

export function verifySignedSessionToken(token: string): SignedSessionPayload | null {
  if (!token.startsWith(SIGNED_SESSION_TOKEN_PREFIX)) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [, data, signature] = parts;
  try {
    const expected = createHmac('sha256', getSigningSecret())
      .update(data)
      .digest('base64url');
    const actualBytes = Buffer.from(signature, 'utf8');
    const expectedBytes = Buffer.from(expected, 'utf8');
    if (
      actualBytes.length !== expectedBytes.length ||
      !timingSafeEqual(actualBytes, expectedBytes)
    ) {
      return null;
    }

    const parsed: unknown = JSON.parse(
      Buffer.from(data, 'base64url').toString('utf8')
    );
    if (!parsed || typeof parsed !== 'object') return null;
    const payload = parsed as SignedSessionPayload;
    if (
      !payload.uid ||
      !payload.email ||
      !Number.isSafeInteger(payload.exp) ||
      Date.now() >= payload.exp ||
      (payload.iat !== undefined &&
        (!Number.isSafeInteger(payload.iat) || payload.iat > Date.now()))
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
