import type { NextConfig } from 'next';

const isAiStudioPreviewEnv =
  process.env.DISABLE_HMR === 'true' ||
  Boolean(process.env.APP_URL && process.env.APP_URL.includes('.run.app'));

const strictCspHeader = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://trustedorigin.org https://*.trustedorigin.org https://cdn.ywxi.net https://*.ywxi.net https://www.trustedsite.com https://*.trustedsite.com https://cdn.trustedsite.com https://apis.google.com https://www.gstatic.com https://www.googletagmanager.com",
  "style-src 'self' 'unsafe-inline' https://trustedorigin.org https://*.trustedorigin.org https://cdn.ywxi.net https://*.ywxi.net https://www.trustedsite.com https://*.trustedsite.com https://fonts.googleapis.com",
  "img-src 'self' data: blob: https: https://res.cloudinary.com https://trustedorigin.org https://*.trustedorigin.org https://cdn.ywxi.net https://*.ywxi.net https://www.trustedsite.com https://*.trustedsite.com",
  "media-src 'self' data: blob: https:",
  "font-src 'self' https://fonts.gstatic.com https://trustedorigin.org https://*.trustedorigin.org https://cdn.ywxi.net https://*.ywxi.net",
  "connect-src 'self' https://trustedorigin.org https://*.trustedorigin.org https://cdn.ywxi.net https://*.ywxi.net https://www.trustedsite.com https://*.trustedsite.com https://*.amazonaws.com https://s3-us-west-2.amazonaws.com https://securedsite-us.us-3.evennode.com https://*.evennode.com https://dns.google https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://*.firebasestorage.app https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://api.cloudinary.com https://res.cloudinary.com https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com",
  "frame-src 'self' https://trustedorigin.org https://*.trustedorigin.org https://cdn.ywxi.net https://*.ywxi.net https://www.trustedsite.com https://*.trustedsite.com https://*.firebaseapp.com https://accounts.google.com https://www.youtube-nocookie.com https://www.youtube.com https://player.vimeo.com",
  "frame-ancestors 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  'upgrade-insecure-requests',
].join('; ');

const previewCspHeader = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://trustedorigin.org https://*.trustedorigin.org https://cdn.ywxi.net https://*.ywxi.net https://www.trustedsite.com https://*.trustedsite.com https://cdn.trustedsite.com https://apis.google.com https://www.gstatic.com https://www.googletagmanager.com",
  "style-src 'self' 'unsafe-inline' https://trustedorigin.org https://*.trustedorigin.org https://cdn.ywxi.net https://*.ywxi.net https://www.trustedsite.com https://*.trustedsite.com https://fonts.googleapis.com",
  "img-src 'self' data: blob: https: https://res.cloudinary.com https://trustedorigin.org https://*.trustedorigin.org https://cdn.ywxi.net https://*.ywxi.net https://www.trustedsite.com https://*.trustedsite.com",
  "media-src 'self' data: blob: https:",
  "font-src 'self' https://fonts.gstatic.com https://trustedorigin.org https://*.trustedorigin.org https://cdn.ywxi.net https://*.ywxi.net",
  "connect-src 'self' https://trustedorigin.org https://*.trustedorigin.org https://cdn.ywxi.net https://*.ywxi.net https://www.trustedsite.com https://*.trustedsite.com https://*.amazonaws.com https://s3-us-west-2.amazonaws.com https://securedsite-us.us-3.evennode.com https://*.evennode.com https://dns.google https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://*.firebasestorage.app https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://api.cloudinary.com https://res.cloudinary.com https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com",
  "frame-src 'self' https://trustedorigin.org https://*.trustedorigin.org https://cdn.ywxi.net https://*.ywxi.net https://www.trustedsite.com https://*.trustedsite.com https://*.firebaseapp.com https://accounts.google.com https://www.youtube-nocookie.com https://www.youtube.com https://player.vimeo.com",
  "frame-ancestors 'self' https://aistudio.google.com https://*.google.com https://*.googleusercontent.com https://*.gstatic.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  'upgrade-insecure-requests',
].join('; ');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: {
    buildActivity: false,
    appIsrStatus: false,
  },
  env: {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'https://aqurivo.store',
    NEXT_PUBLIC_SITE_URL_COM: process.env.NEXT_PUBLIC_SITE_URL_COM || 'https://aqurivo.com',
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },

  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  outputFileTracingIncludes: {
    '/**': [
      './server/data/**/*',
    ],
  },
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'soufshop.vercel.app' }],
        destination: 'https://aqurivo.store/:path*',
        permanent: true, // 301 redirect
      },
      // Legacy Shopify/WP Page URLs -> Canonical Active Pages (301 Permanent)
      {
        source: '/pages/about-us',
        destination: '/en/about',
        permanent: true,
      },
      {
        source: '/pages/about',
        destination: '/en/about',
        permanent: true,
      },
      {
        source: '/pages/contact',
        destination: '/en/contact',
        permanent: true,
      },
      {
        source: '/pages/contact-us',
        destination: '/en/contact',
        permanent: true,
      },
      // Legacy Policy URLs -> Corresponding Legal & Transparency Pages (301 Permanent)
      {
        source: '/policies/privacy-policy',
        destination: '/en/privacy-policy',
        permanent: true,
      },
      {
        source: '/policies/terms-of-service',
        destination: '/en/terms',
        permanent: true,
      },
      {
        source: '/policies/refund-policy',
        destination: '/en/terms',
        permanent: true,
      },
      {
        source: '/policies/shipping-policy',
        destination: '/how-it-works',
        permanent: true,
      },
      {
        source: '/policies/legal-notice',
        destination: '/en/terms',
        permanent: true,
      },
      {
        source: '/policies/cookie-policy',
        destination: '/cookies',
        permanent: true,
      },
      {
        source: '/en/affiliate-disclosure',
        destination: '/affiliate-disclosure',
        permanent: false,
      },
      // Consolidated duplicate article slugs -> Canonical Buying Guides (301 Permanent)
      {
        source: '/guides/contigo-byron-16oz-travel-mug-review-guide-2026',
        destination: '/guides/contigo-byron-16oz-travel-mug-review-buying-guide-2026',
        permanent: true,
      },
      {
        source: '/:locale(ar|en)/guides/contigo-byron-16oz-travel-mug-review-guide-2026',
        destination: '/:locale/guides/contigo-byron-16oz-travel-mug-review-buying-guide-2026',
        permanent: true,
      },
      {
        source: '/guides/cosori-pro-le-5qt-air-fryer-review-guide-2026',
        destination: '/guides/cosori-pro-le-5qt-air-fryer-review-buying-guide-2026',
        permanent: true,
      },
      {
        source: '/:locale(ar|en)/guides/cosori-pro-le-5qt-air-fryer-review-guide-2026',
        destination: '/:locale/guides/cosori-pro-le-5qt-air-fryer-review-buying-guide-2026',
        permanent: true,
      },
    ];
  },
  async headers() {
    const baseHeaders = [
      {
        key: 'Content-Security-Policy',
        value: isAiStudioPreviewEnv ? previewCspHeader : strictCspHeader,
      },
      {
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains; preload',
      },
      {
        key: 'X-Content-Type-Options',
        value: 'nosniff',
      },
      {
        key: 'X-Permitted-Cross-Domain-Policies',
        value: 'none',
      },
      {
        key: 'X-DNS-Prefetch-Control',
        value: 'on',
      },
      {
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin',
      },
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=()',
      },
    ];

    if (!isAiStudioPreviewEnv) {
      baseHeaders.push({
        key: 'X-Frame-Options',
        value: 'SAMEORIGIN',
      });
    }

    return [
      {
        source: '/(.*)',
        headers: baseHeaders,
      },
    ];
  },
  serverExternalPackages: [
    'firebase-admin',
    '@opentelemetry/api',
    '@opentelemetry/core',
    '@grpc/grpc-js',
    '@grpc/proto-loader',
  ],
  transpilePackages: ['motion'],
  webpack: (config, { dev }) => {
    // HMR is disabled in AI Studio via DISABLE_HMR env var.
    // Do not modify—file watching is disabled to prevent flickering during agent edits.
    if (dev && process.env.DISABLE_HMR === 'true') {
      config.watchOptions = {
        ignored: /.*/,
      };
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
