import React from 'react';
import type { Metadata } from 'next';
import { LegalPageView } from '@/features/legal/LegalPageView';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://aqurivo.store';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'شروط الاستخدام - AQURIVO',
  description: 'شروط الاستخدام لتصفح منصة AQURIVO والتسوق بأمان.',
  alternates: {
    canonical: `${SITE_URL}/ar/terms`,
    languages: {
      ar: `${SITE_URL}/ar/terms`,
      en: `${SITE_URL}/en/terms`,
      'x-default': `${SITE_URL}/en/terms`,
    },
  },
};

const termsJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'شروط الاستخدام - AQURIVO',
  url: `${SITE_URL}/ar/terms`,
};

export default function TermsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(termsJsonLd),
        }}
      />
      <LegalPageView docType="terms" />
    </>
  );
}
