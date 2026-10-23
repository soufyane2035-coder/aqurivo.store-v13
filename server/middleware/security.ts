import 'server-only';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { cookies, headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { NextRequest, NextResponse } from 'next/server';
import {
  getAdminAuth,
  setServerFirebaseIdToken,
  setServerFirebaseRefreshToken,
} from '@/server/config/firebase-admin';
import {
  loadServerEnv,
  MIN_SESSION_COOKIE_SECRET_LENGTH,
} from '@/server/config/env';

export const SESSION_COOKIE_NAME = 'souf_session';
export const CSRF_COOKIE_NAME = 'souf_csrf';
export const CSRF_HEADER_NAME = 'x-csrf-token';

export interface AuthenticatedSession {
  uid: string;
  email: string;
  emailVerified: boolean;
  role: 'admin' | 'visitor';
}

interface SignedSessionPayload {
  uid: string;
  email: string;
  emailVerified: boolean;
  exp: number;
  rt?: string;
}

const JWT_FORMAT_REGEX = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/;

function getSigningSecret(): string {
  const env = loadServerEnv();
  if (env.sessionCookieSecret.length < MIN_SESSION_COOKIE_SECRET_LENGTH) {
    throw new Error(
      `[AQURIVO Configuration Error] SESSION_COOKIE_SECRET must be at least ${MIN_SESSION_COOKIE_SECRET_LENGTH} characters.`
    );
  }
  return env.sessionCookieSecret;
}

export function createSignedSessionToken(payload: SignedSessionPayload): string {
  const data = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = createHmac('sha256', getSigningSecret())
    .update(data)
    .digest('base64url');
  return `v1.${data}.${signature}`;
}

export function verifySignedSessionToken(token: string): SignedSessionPayload | null {
  if (!token.startsWith('v1.')) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [, data, signature] = parts;
  try {
    const expected = createHmac('sha256', getSigningSecret())
      .update(data)
      .digest('base64url');
    const a = Buffer.from(signature, 'utf8');
    const b = Buffer.from(expected, 'utf8');
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return null;
    }

    const parsed = JSON.parse(
      Buffer.from(data, 'base64url').toString('utf8')
    ) as SignedSessionPayload;

    if (!parsed.uid || !parsed.email || !parsed.exp || Date.now() > parsed.exp) {
      return null;
    }
    if (parsed.rt && typeof parsed.rt === 'string') {
      setServerFirebaseRefreshToken(parsed.rt);
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Generates a signed CSRF token bound to the server secret.
 */
export function generateCsrfToken(): string {
  const nonce = randomBytes(18).toString('hex');
  const secret = getSigningSecret();
  const signature = createHmac('sha256', secret).update(nonce).digest('hex');
  return `${nonce}.${signature}`;
}

export function verifyCsrfTokenString(token: string | null | undefined): boolean {
  if (!token || !token.includes('.')) return false;

  if (token.startsWith('v1.')) {
    return verifySignedSessionToken(token) !== null;
  }

  const [nonce, signature] = token.split('.');
  if (!nonce || !signature) return false;

  try {
    const secret = getSigningSecret();
    const expected = createHmac('sha256', secret).update(nonce).digest('hex');
    const a = Buffer.from(signature, 'hex');
    const b = Buffer.from(expected, 'hex');
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Enforces CSRF and Same-Origin checks on state-changing API requests (POST, PUT, PATCH, DELETE).
 * Accepts a server-signed CSRF token or server-signed v1 session token in the x-csrf-token header.
 */
export async function verifyCsrfRequest(req: NextRequest): Promise<boolean> {
  const headerToken = req.headers.get(CSRF_HEADER_NAME)?.trim();
  if (headerToken && verifyCsrfTokenString(headerToken)) {
    return true;
  }
  return false;
}

function buildSessionFromSignedPayload(
  verified: SignedSessionPayload,
  adminEmails: string[]
): AuthenticatedSession {
  const email = verified.email.trim().toLowerCase();
  const emailVerified = Boolean(verified.emailVerified);
  const isAdmin = emailVerified && adminEmails.includes(email);
  return {
    uid: verified.uid,
    email,
    emailVerified,
    role: isAdmin ? 'admin' : 'visitor',
  };
}

/**
 * Verifies the user's session via httpOnly cookie (or signed header token when third-party
 * cookies are blocked in preview iframes) and checks whether their email is in ADMIN_EMAILS.
 */
export async function getServerSession(): Promise<AuthenticatedSession | null> {
  try {
    const env = loadServerEnv();
    const hdrs = await headers();
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (sessionCookie) {
      if (sessionCookie.startsWith('v1.')) {
        const verified = verifySignedSessionToken(sessionCookie);
        if (verified) {
          return buildSessionFromSignedPayload(verified, env.adminEmails);
        }
      } else {
        const adminAuth = getAdminAuth();
        if (adminAuth) {
          const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
          const email = (decoded.email || '').trim().toLowerCase();
          const emailVerified = Boolean(decoded.email_verified);
          if (email) {
            return {
              uid: decoded.uid,
              email,
              emailVerified,
              role: emailVerified && env.adminEmails.includes(email) ? 'admin' : 'visitor',
            };
          }
        }
      }
    }

    // Fallback for preview iframes / browsers blocking third-party cookies:
    // Check x-csrf-token or Authorization Bearer for a v1 server-signed session token
    const headerToken = hdrs.get(CSRF_HEADER_NAME);
    if (headerToken && headerToken.startsWith('v1.')) {
      const verified = verifySignedSessionToken(headerToken);
      if (verified) {
        return buildSessionFromSignedPayload(verified, env.adminEmails);
      }
    }

    const authHeader = hdrs.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const bearerToken = authHeader.slice(7).trim();
      if (bearerToken.startsWith('v1.')) {
        const verified = verifySignedSessionToken(bearerToken);
        if (verified) {
          return buildSessionFromSignedPayload(verified, env.adminEmails);
        }
      }
    }

    const fbIdToken = hdrs.get('x-firebase-id-token')?.trim();
    if (fbIdToken && JWT_FORMAT_REGEX.test(fbIdToken)) {
      const adminAuth = getAdminAuth();
      if (adminAuth) {
        try {
          const verified = await adminAuth.verifyIdToken(fbIdToken, true);
          const email = (verified.email || '').trim().toLowerCase();
          const emailVerified = Boolean(verified.email_verified);
          if (email) {
            const isAdmin = emailVerified && env.adminEmails.includes(email);
            return {
              uid: verified.uid,
              email,
              emailVerified,
              role: isAdmin ? 'admin' : 'visitor',
            };
          }
        } catch {
          // Token cryptographic verification failed or revoked - strictly reject
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}

async function captureVerifiedAdminFirebaseToken(): Promise<void> {
  try {
    const hdrs = await headers();
    const fbIdToken = hdrs.get('x-firebase-id-token')?.trim();
    if (fbIdToken && fbIdToken.length <= 4096 && JWT_FORMAT_REGEX.test(fbIdToken)) {
      setServerFirebaseIdToken(fbIdToken);
    }
    const fbRefreshToken = hdrs.get('x-firebase-refresh-token')?.trim();
    if (fbRefreshToken && fbRefreshToken.length > 16 && fbRefreshToken.length <= 2048) {
      setServerFirebaseRefreshToken(fbRefreshToken);
    }
  } catch {
    // Ignore header access failure outside request context
  }
}

export async function requireAdminPage(): Promise<AuthenticatedSession> {
  const session = await getServerSession();
  if (!session || session.role !== 'admin') {
    notFound();
  }
  await captureVerifiedAdminFirebaseToken();
  return session;
}

export async function requireAdminApi(): Promise<
  | { authorized: true; session: AuthenticatedSession; email: string }
  | { authorized: false; response: NextResponse }
> {
  const session = await getServerSession();
  if (!session || session.role !== 'admin') {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Not found' }, { status: 404 }),
    };
  }
  await captureVerifiedAdminFirebaseToken();
  return { authorized: true, session, email: session.email };
}

export function hashClientIpDaily(rawIp: string): string {
  const env = loadServerEnv();
  if (!env.ipHashSalt) {
    throw new Error('[AQURIVO Configuration Error] IP_HASH_SALT is required.');
  }
  const dayKey = new Date().toISOString().slice(0, 10);
  return createHash('sha256')
    .update(`${rawIp.trim()}|${env.ipHashSalt}|${dayKey}`)
    .digest('hex')
    .slice(0, 32);
}

export async function getClientIpFromHeaders(): Promise<string> {
  const hdrs = await headers();
  const forwarded = hdrs.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return hdrs.get('x-real-ip') || '0.0.0.0';
}

const BOT_USER_AGENT_PATTERNS =
  /bot|crawler|spider|slurp|bingpreview|facebookexternalhit|whatsapp|telegrambot|discordbot|headlesschrome|lighthouse|pagespeed|gtmetrix|pingdom|curl|wget|python-requests|axios|go-http-client/i;

export function isKnownBotUserAgent(userAgent: string | null): boolean {
  if (!userAgent || userAgent.trim().length < 10) return true;
  return BOT_USER_AGENT_PATTERNS.test(userAgent);
}

export function detectDeviceType(userAgent: string | null): 'mobile' | 'tablet' | 'desktop' {
  if (!userAgent) return 'desktop';
  if (/ipad|tablet|kindle|playbook|silk/i.test(userAgent)) return 'tablet';
  if (/mobile|iphone|ipod|android.*mobile|windows phone/i.test(userAgent)) return 'mobile';
  return 'desktop';
}

interface RateLimitBucket {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitBucket>();

export function checkRateLimit(
  bucketKey: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const cutoff = now - windowMs;

  if (rateLimitStore.size > 2000) {
    for (const [key, val] of rateLimitStore.entries()) {
      if (val.timestamps.every((t) => t < cutoff)) {
        rateLimitStore.delete(key);
      }
    }
  }

  const existing = rateLimitStore.get(bucketKey) || { timestamps: [] };
  const recent = existing.timestamps.filter((t) => t > cutoff);

  if (recent.length >= maxRequests) {
    const oldest = recent[0] || now;
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    return { allowed: false, retryAfterSeconds };
  }

  recent.push(now);
  rateLimitStore.set(bucketKey, { timestamps: recent });
  return { allowed: true, retryAfterSeconds: 0 };
}
