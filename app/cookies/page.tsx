import React from 'react';
import type { Metadata } from 'next';
import { LegalPageView } from '@/features/legal/LegalPageView';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://aqurivo.store';
const ogImageUrl = `${SITE_URL}/images/hero-desktop.jpg`;

export const metadata: Metadata = {
  title: 'Cookie Policy & Preferences | سياسة ملفات الارتباط — AQURIVO',
  description:
    'Manage your cookie preferences and learn how AQURIVO uses essential and optional cookies.',
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
  other: {
    thumbnail: ogImageUrl,
    'og:image:secure_url': ogImageUrl,
    'og:image:type': 'image/jpeg',
  },
  alternates: {
    canonical: `${SITE_URL}/cookies`,
  },
  openGraph: {
    title: 'Cookie Policy & Preferences | سياسة ملفات الارتباط — AQURIVO',
    description:
      'Manage your cookie preferences and learn how AQURIVO uses essential and optional cookies.',
    url: `${SITE_URL}/cookies`,
    siteName: 'AQURIVO',
    type: 'website',
    images: [
      {
        url: ogImageUrl,
        secureUrl: ogImageUrl,
        width: 1200,
        height: 675,
        type: 'image/jpeg',
        alt: 'Cookie Policy & Preferences | AQURIVO',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@aqurivo',
    creator: '@aqurivo',
    title: 'Cookie Policy & Preferences | سياسة ملفات الارتباط — AQURIVO',
    description:
      'Manage your cookie preferences and learn how AQURIVO uses essential and optional cookies.',
    images: [{ url: ogImageUrl, alt: 'Cookie Policy & Preferences | AQURIVO' }],
  },
};

export default function CookiesPage() {
  return <LegalPageView docType="cookies" />;
}
