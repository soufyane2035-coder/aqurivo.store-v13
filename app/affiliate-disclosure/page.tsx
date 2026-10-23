import React from 'react';
import type { Metadata } from 'next';
import { LegalPageView } from '@/features/legal/LegalPageView';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://aqurivo.store';
const ogImageUrl = `${SITE_URL}/images/hero-desktop.jpg`;

export const metadata: Metadata = {
  title: 'Affiliate Disclosure | إفصاح العمولة — AQURIVO',
  description:
    'Transparent disclosure of how AQURIVO earns commissions from Amazon Associates, Noon, Temu, and ClickBank.',
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
    canonical: `${SITE_URL}/affiliate-disclosure`,
  },
  openGraph: {
    title: 'Affiliate Disclosure | إفصاح العمولة — AQURIVO',
    description:
      'Transparent disclosure of how AQURIVO earns commissions from Amazon Associates, Noon, Temu, and ClickBank.',
    url: `${SITE_URL}/affiliate-disclosure`,
    siteName: 'AQURIVO',
    type: 'website',
    images: [
      {
        url: ogImageUrl,
        secureUrl: ogImageUrl,
        width: 1200,
        height: 675,
        type: 'image/jpeg',
        alt: 'Affiliate Disclosure | AQURIVO',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@aqurivo',
    creator: '@aqurivo',
    title: 'Affiliate Disclosure | إفصاح العمولة — AQURIVO',
    description:
      'Transparent disclosure of how AQURIVO earns commissions from Amazon Associates, Noon, Temu, and ClickBank.',
    images: [{ url: ogImageUrl, alt: 'Affiliate Disclosure | AQURIVO' }],
  },
};

export default function AffiliateDisclosurePage() {
  return <LegalPageView docType="affiliate-disclosure" />;
}
