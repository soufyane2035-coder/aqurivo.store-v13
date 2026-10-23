import React from 'react';
import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://aqurivo.store';
const SITE_URL_COM = process.env.NEXT_PUBLIC_SITE_URL_COM || 'https://aqurivo.com';

export function generateStaticParams() {
  return [{ locale: 'ar' }, { locale: 'en' }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  await params;

  return {
    metadataBase: new URL(SITE_URL),
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },
    verification: {
      google: 'oS_3HRPs49irqAH5Ey9SwCB9vrNxeshh61SYJSfZP2E',
    },
    icons: {
      icon: [
        { url: '/favicon.ico', sizes: '48x48', type: 'image/png' },
        { url: '/icon.svg', type: 'image/svg+xml', sizes: 'any' },
        { url: '/icon', sizes: '192x192', type: 'image/png' },
      ],
      shortcut: ['/favicon.ico'],
      apple: [{ url: '/apple-icon', sizes: '180x180', type: 'image/png' }],
    },
  };
}

export default function LocaleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
