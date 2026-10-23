import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://aqurivo.store';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/api/og/', '/api/logo'],
        disallow: [
          '/admin',
          '/ar/admin',
          '/en/admin',
          '/api/admin/',
          '/api/auth/',
          '/api/user/',
          '/login',
          '/ar/login',
          '/en/login',
          '/register',
          '/ar/register',
          '/en/register',
          '/account',
          '/ar/account',
          '/en/account',
          '/go/',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
