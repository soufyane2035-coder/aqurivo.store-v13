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
  createSignedSessionToken,
  CSRF_COOKIE_NAME,
  generateCsrfToken,
  getClientIpFromHeaders,
  getServerSession,
  hashClientIpDaily,
  SESSION_COOKIE_NAME,
  verifyCsrfRequest,
} from '@/server/middleware/security';
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

  return {
    httpOnly,
    secure: isHttps || process.env.NODE_ENV === 'production',
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
  const csrfToken = session
    ? createSignedSessionToken({
        uid: session.uid,
        email: session.email,
        emailVerified: session.emailVerified,
        exp: Date.now() + SESSION_DURATION_MS,
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
    getCookieOptions(req, false, 60 * 60 * 24)
  );

  return response;
}

export async function POST(req: NextRequest) {
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

  const rate = checkRateLimit(`auth_login:${ipHash}`, 25, 10 * 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Too many sign-in attempts. Please wait a few minutes and try again.' },
      { status: 429 }
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

    const signedSessionToken = createSignedSessionToken({
      uid,
      email,
      emailVerified,
      exp: Date.now() + SESSION_DURATION_MS,
      ...(refreshToken ? { rt: refreshToken } : {}),
    });

    const profile = await syncUserProfileOnLogin({
      uid,
      email,
      emailVerified,
    });

    const maxAgeSec = Math.floor(SESSION_DURATION_MS / 1000);
    const response = NextResponse.json({
      authenticated: true,
      user: {
        email: profile.email,
        role: profile.role,
      },
      csrfToken: signedSessionToken,
    });

    response.cookies.set(
      SESSION_COOKIE_NAME,
      signedSessionToken,
      getCookieOptions(req, true, maxAgeSec)
    );

    response.cookies.set(
      CSRF_COOKIE_NAME,
      signedSessionToken,
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
