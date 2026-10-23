import React from 'react';
import type { Metadata } from 'next';
import { LegalPageView } from '@/features/legal/LegalPageView';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://aqurivo.store';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'سياسة الخصوصية - AQURIVO',
  description:
    'تعرف على سياسة الخصوصية في AQURIVO وكيف نحمي بياناتك ونحترم خصوصيتك.',
  alternates: {
    canonical: `${SITE_URL}/ar/privacy-policy`,
    languages: {
      ar: `${SITE_URL}/ar/privacy-policy`,
      en: `${SITE_URL}/en/privacy-policy`,
      'x-default': `${SITE_URL}/en/privacy-policy`,
    },
  },
};

const privacyJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'سياسة الخصوصية - AQURIVO',
  url: `${SITE_URL}/ar/privacy-policy`,
};

export default function PrivacyPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(privacyJsonLd),
        }}
      />
      <LegalPageView docType="privacy" />
    </>
  );
}
