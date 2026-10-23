import React from 'react';
import type { Metadata } from 'next';
import { SecurityCertificatesView } from '@/features/security/SecurityCertificatesView';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://aqurivo.store';
const ogImageUrl = `${SITE_URL}/images/hero-desktop.jpg`;

export const metadata: Metadata = {
  title: 'Security Certificates | شهادات الأمان والموثوقية — AQURIVO',
  description:
    'Discover AQURIVO’s buyer safety and trust commitments: verified daily security audits, safe direct store links, and independent editorial reviews for confident shopping.',
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: `${SITE_URL}/en/security`,
    languages: {
      ar: `${SITE_URL}/ar/security`,
      en: `${SITE_URL}/en/security`,
      'x-default': `${SITE_URL}/en/security`,
    },
  },
  openGraph: {
    title: 'Security Certificates | شهادات الأمان والموثوقية — AQURIVO',
    description:
      'Inspect the official TrustedOrigin verification certificate for aqurivo.store and review our encryption and visitor safety standards.',
    url: `${SITE_URL}/security`,
    siteName: 'AQURIVO',
    type: 'website',
    images: [
      {
        url: ogImageUrl,
        secureUrl: ogImageUrl,
        width: 1200,
        height: 675,
        type: 'image/jpeg',
        alt: 'Security Certificates | AQURIVO',
      },
    ],
  },
};

export default function RootSecurityPage() {
  return <SecurityCertificatesView />;
}
