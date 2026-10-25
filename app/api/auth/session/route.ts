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
import {
  checkRateLimit,
  ADMIN_SESSION_DURATION_MS,
  CSRF_COOKIE_NAME,
  generateCsrfToken,
  getClientIpFromHeaders,
  getServerSession,
  hashClientIpDaily,
  rateLimitResponseHeaders,
  SESSION_COOKIE_NAME,
  verifyCsrfRequest,
} from '@/server/middleware/security';
import { createSignedSessionToken } from '@/server/config/session-token';
import { rejectVerifiedBot } from '@/server/middleware/botid';
import { syncUserProfileOnLogin } from '@/server/repositories/users.repo';

const SESSION_DURATION_MS = 5 * 24 * 60 * 60 * 1000; // 5 days

async function verifyIdTokenViaFirebaseRest(idToken: string): Promise<{
  uid: string;
  email: string;
  emailVerified: boolean;
} | null> {
  const env = loadServerEnv();
  if (!env.firebaseClientApiKey) return null;

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(
      env.firebaseClientApiKey
    )}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    }
  );

  if (!res.ok) return null;

  const data = (await res.json()) as {
    users?: Array<{
      localId?: string;
      email?: string;
      emailVerified?: boolean;
    }>;
  };

  const user = data.users?.[0];
  if (!user?.localId || !user?.email) return null;

  return {
    uid: user.localId,
    email: user.email,
    emailVerified: Boolean(user.emailVerified),
  };
}

function getCookieOptions(req: NextRequest, httpOnly: boolean, maxAgeSeconds: number) {
  const proto = req.headers.get('x-forwarded-proto') || req.nextUrl.protocol;
  const isHttps = proto.includes('https');
  const hostname = req.nextUrl.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';

  return {
    httpOnly,
    secure: isHttps || (process.env.NODE_ENV === 'production' && !isLocalhost),
    sameSite: (isHttps ? 'none' : 'lax') as 'none' | 'lax',
    path: '/',
    maxAge: maxAgeSeconds,
  };
}

export async function GET(req: NextRequest) {
  if (
    loadServerEnv().sessionCookieSecret.length <
    MIN_SESSION_COOKIE_SECRET_LENGTH
  ) {
    return NextResponse.json(
      { error: 'Authentication is temporarily unavailable.' },
      { status: 503 }
    );
  }

  const session = await getServerSession();
  const issuedAt = session?.sessionIssuedAt ?? Date.now();
  const sessionExpiresAt =
    session?.sessionExpiresAt ??
    issuedAt +
      (session?.role === 'admin' ? ADMIN_SESSION_DURATION_MS : SESSION_DURATION_MS);
  const csrfToken = session
    ? createSignedSessionToken({
        uid: session.uid,
        email: session.email,
        emailVerified: session.emailVerified,
        iat: issuedAt,
        exp: sessionExpiresAt,
      })
    : generateCsrfToken();

  const response = NextResponse.json({
    authenticated: Boolean(session),
    user: session
      ? {
          email: session.email,
          role: session.role,
        }
      : null,
    csrfToken,
  });

  response.cookies.set(
    CSRF_COOKIE_NAME,
    csrfToken,
    getCookieOptions(
      req,
      false,
      session
        ? Math.max(0, Math.floor((sessionExpiresAt - Date.now()) / 1000))
        : 60 * 60 * 24
    )
  );

  return response;
}

export async function POST(req: NextRequest) {
  const botResponse = await rejectVerifiedBot();
  if (botResponse) return botResponse;

  if (
    loadServerEnv().sessionCookieSecret.length <
    MIN_SESSION_COOKIE_SECRET_LENGTH
  ) {
    return NextResponse.json(
      { error: 'Authentication is temporarily unavailable.' },
      { status: 503 }
    );
  }

  const rawIp = await getClientIpFromHeaders();
  const ipHash = hashClientIpDaily(rawIp);

  const rate = await checkRateLimit(`auth_login:${ipHash}`, 25, 10 * 60 * 1000);
  if (rate.unavailable) {
    return NextResponse.json(
      { error: 'Authentication is temporarily unavailable.' },
      { status: 503, headers: rateLimitResponseHeaders(rate) }
    );
  }
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Too many sign-in attempts. Please wait a few minutes and try again.' },
      { status: 429, headers: rateLimitResponseHeaders(rate) }
    );
  }

  try {
    const body = (await req.json()) as { idToken?: string; refreshToken?: string };
    const idToken = typeof body.idToken === 'string' ? body.idToken.trim() : '';
    const refreshToken = typeof body.refreshToken === 'string' ? body.refreshToken.trim() : '';

    if (!idToken) {
      return NextResponse.json({ error: 'Authentication token is required.' }, { status: 400 });
    }

    const adminAuth = getAdminAuth();
    let uid = '';
    let email = '';
    let emailVerified = false;

    if (adminAuth) {
      const decoded = await adminAuth.verifyIdToken(idToken, true);
      if (!decoded.email) {
        return NextResponse.json({ error: 'Account must have a valid email address.' }, { status: 400 });
      }
      uid = decoded.uid;
      email = decoded.email;
      emailVerified = Boolean(decoded.email_verified);
    } else {
      const verified = await verifyIdTokenViaFirebaseRest(idToken);
      if (!verified) {
        return NextResponse.json(
          { error: 'Unable to verify sign-in credentials. Please try again.' },
          { status: 401 }
        );
      }
      uid = verified.uid;
      email = verified.email;
      emailVerified = verified.emailVerified;
    }

    setServerFirebaseIdToken(idToken);
    if (refreshToken) {
      setServerFirebaseRefreshToken(refreshToken);
    }

    const issuedAt = Date.now();
    const isAdmin =
      emailVerified &&
      loadServerEnv().adminEmails.includes(email.trim().toLowerCase());
    const sessionDurationMs = isAdmin
      ? ADMIN_SESSION_DURATION_MS
      : SESSION_DURATION_MS;
    const sessionPayload = {
      uid,
      email,
      emailVerified,
      iat: issuedAt,
      exp: issuedAt + sessionDurationMs,
    };
    const signedSessionToken = createSignedSessionToken({
      ...sessionPayload,
      ...(refreshToken ? { rt: refreshToken } : {}),
    });
    const csrfToken = createSignedSessionToken(sessionPayload);

    const profile = await syncUserProfileOnLogin({
      uid,
      email,
      emailVerified,
    });

    const maxAgeSec = Math.floor(sessionDurationMs / 1000);
    const response = NextResponse.json({
      authenticated: true,
      user: {
        email: profile.email,
        role: profile.role,
      },
      csrfToken,
    });

    response.cookies.set(
      SESSION_COOKIE_NAME,
      signedSessionToken,
      getCookieOptions(req, true, maxAgeSec)
    );

    response.cookies.set(
      CSRF_COOKIE_NAME,
      csrfToken,
      getCookieOptions(req, false, maxAgeSec)
    );

    return response;
  } catch {
    return NextResponse.json(
      { error: 'Unable to verify sign-in credentials. Please try again.' },
      { status: 401 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const validCsrf = await verifyCsrfRequest(req);
  if (!validCsrf) {
    return NextResponse.json({ error: 'Invalid security token.' }, { status: 403 });
  }

  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(SESSION_COOKIE_NAME, '', getCookieOptions(req, true, 0));
  response.cookies.set(CSRF_COOKIE_NAME, '', getCookieOptions(req, false, 0));
  return response;
}
