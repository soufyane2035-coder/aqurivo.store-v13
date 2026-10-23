import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const locales = ['en', 'ar'] as const;
export const defaultLocale = 'en';

const ARAB_COUNTRY_CODES = new Set([
  'MA',
  'DZ',
  'TN',
  'LY',
  'EG',
  'SD',
  'MR',
  'SO',
  'DJ',
  'KM',
  'SA',
  'AE',
  'QA',
  'BH',
  'KW',
  'OM',
  'YE',
  'IQ',
  'SY',
  'LB',
  'JO',
  'PS',
]);

const BASE_CSP_DIRECTIVES = [
  "default-src 'self'",
  "style-src 'self' 'unsafe-inline' https://trustedorigin.org https://*.trustedorigin.org https://cdn.ywxi.net https://*.ywxi.net https://www.trustedsite.com https://*.trustedsite.com https://fonts.googleapis.com",
  "img-src 'self' data: blob: https: https://res.cloudinary.com https://trustedorigin.org https://*.trustedorigin.org https://cdn.ywxi.net https://*.ywxi.net https://www.trustedsite.com https://*.trustedsite.com",
  "media-src 'self' data: blob: https: https://m.media-amazon.com https://*.media-amazon.com https://images-na.ssl-images-amazon.com https://res.cloudinary.com",
  "font-src 'self' https://fonts.gstatic.com https://trustedorigin.org https://*.trustedorigin.org https://cdn.ywxi.net https://*.ywxi.net",
  "connect-src 'self' https://trustedorigin.org https://*.trustedorigin.org https://cdn.ywxi.net https://*.ywxi.net https://www.trustedsite.com https://*.trustedsite.com https://*.amazonaws.com https://s3-us-west-2.amazonaws.com https://securedsite-us.us-3.evennode.com https://*.evennode.com https://dns.google https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://*.firebasestorage.app https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://api.cloudinary.com https://res.cloudinary.com https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com",
  "frame-src 'self' https://trustedorigin.org https://*.trustedorigin.org https://cdn.ywxi.net https://*.ywxi.net https://www.trustedsite.com https://*.trustedsite.com https://*.firebaseapp.com https://accounts.google.com https://www.youtube-nocookie.com https://www.youtube.com https://player.vimeo.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  'upgrade-insecure-requests',
];

const PRODUCTION_SCRIPT_SRC =
  "script-src 'self' 'unsafe-inline' https://trustedorigin.org https://*.trustedorigin.org https://cdn.ywxi.net https://*.ywxi.net https://www.trustedsite.com https://*.trustedsite.com https://cdn.trustedsite.com https://apis.google.com https://www.gstatic.com https://www.googletagmanager.com";

const PREVIEW_SCRIPT_SRC =
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://trustedorigin.org https://*.trustedorigin.org https://cdn.ywxi.net https://*.ywxi.net https://www.trustedsite.com https://*.trustedsite.com https://cdn.trustedsite.com https://apis.google.com https://www.gstatic.com https://www.googletagmanager.com";

const STRICT_CSP_HEADER = [
  ...BASE_CSP_DIRECTIVES,
  PRODUCTION_SCRIPT_SRC,
  "frame-ancestors 'self'",
].join('; ');

const PREVIEW_CSP_HEADER = [
  ...BASE_CSP_DIRECTIVES,
  PREVIEW_SCRIPT_SRC,
  "frame-ancestors 'self' https://aistudio.google.com https://*.google.com https://*.googleusercontent.com https://*.gstatic.com",
].join('; ');

function getRequestHostname(request: NextRequest): string {
  const rawHost = (
    request.headers.get('x-forwarded-host') ||
    request.headers.get('host') ||
    request.nextUrl.hostname ||
    ''
  )
    .toLowerCase()
    .split(',')[0]
    .trim()
    .split(':')[0];

  return rawHost;
}

function isAiStudioPreviewHost(request: NextRequest): boolean {
  const rawHost = getRequestHostname(request);

  if (
    rawHost === 'aqurivo.store' ||
    rawHost.endsWith('.aqurivo.store') ||
    rawHost === 'aqurivo.com' ||
    rawHost.endsWith('.aqurivo.com') ||
    rawHost.endsWith('.vercel.app') ||
    rawHost.endsWith('.netlify.app')
  ) {
    return false;
  }

  return (
    rawHost === 'localhost' ||
    rawHost === '127.0.0.1' ||
    rawHost.endsWith('.run.app') ||
    rawHost.endsWith('.googleusercontent.com') ||
    process.env.DISABLE_HMR === 'true'
  );
}

function applySecurityHeaders(
  request: NextRequest,
  response: NextResponse
): NextResponse {
  const isPreview = isAiStudioPreviewHost(request);

  if (isPreview) {
    response.headers.set('Content-Security-Policy', PREVIEW_CSP_HEADER);
    response.headers.delete('X-Frame-Options');
  } else {
    response.headers.set('Content-Security-Policy', STRICT_CSP_HEADER);
    response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  }

  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');
  response.headers.set('X-DNS-Prefetch-Control', 'on');
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload'
  );
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  );
  return response;
}

function detectPreferredLocale(
  request: NextRequest,
  countryCode: string
): 'ar' | 'en' {
  const cookieLocale = request.cookies.get('soufshop_locale')?.value;
  if (cookieLocale === 'ar' || cookieLocale === 'en') {
    return cookieLocale;
  }

  const acceptLanguage = (request.headers.get('accept-language') || '').toLowerCase();
  const primaryLang = acceptLanguage.split(',')[0]?.trim() || '';
  if (primaryLang.startsWith('ar') || /\bar\b/.test(acceptLanguage.split(';')[0] || '')) {
    return 'ar';
  }

  if (countryCode && ARAB_COUNTRY_CODES.has(countryCode.toUpperCase())) {
    return 'ar';
  }

  return defaultLocale;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (getRequestHostname(request) === 'www.aqurivo.store') {
    const url = request.nextUrl.clone();
    url.protocol = 'https:';
    url.hostname = 'aqurivo.store';
    url.port = '';
    return applySecurityHeaders(request, NextResponse.redirect(url, 308));
  }

  const detectedCountry = (
    request.headers.get('x-vercel-ip-country') ||
    request.headers.get('cf-ipcountry') ||
    request.headers.get('x-country-code') ||
    request.headers.get('x-appengine-country') ||
    ''
  ).trim();

  const normalizedCountry =
    detectedCountry &&
    /^[A-Z]{2}$/i.test(detectedCountry) &&
    detectedCountry.toUpperCase() !== 'XX'
      ? detectedCountry.toUpperCase()
      : '';

  const existingCountryCookie = request.cookies.get('aqurivo_country')?.value;
  const existingLocaleCookie = request.cookies.get('soufshop_locale')?.value;

  if (pathname === '/') {
    const targetLocale = detectPreferredLocale(request, detectedCountry);

    const url = request.nextUrl.clone();
    url.pathname = `/${targetLocale}`;
    const response = NextResponse.redirect(url, 307);

    if (existingLocaleCookie !== targetLocale) {
      response.cookies.set('soufshop_locale', targetLocale, {
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'lax',
      });
    }

    if (normalizedCountry && existingCountryCookie !== normalizedCountry) {
      response.cookies.set('aqurivo_country', normalizedCountry, {
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
        sameSite: 'lax',
      });
    }
    return applySecurityHeaders(request, response);
  }

  const response = NextResponse.next();
  if (normalizedCountry && existingCountryCookie !== normalizedCountry) {
    response.cookies.set('aqurivo_country', normalizedCountry, {
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
      sameSite: 'lax',
    });
  }
  return applySecurityHeaders(request, response);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|txt|xml|woff|woff2)$).*)',
    '/robots.txt',
    '/sitemap.xml',
  ],
};
