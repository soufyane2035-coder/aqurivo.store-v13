import React from 'react';
import type { Metadata } from 'next';
import { HowItWorksView } from '@/features/editorial/HowItWorksView';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://aqurivo.store';
const ogImageUrl = `${SITE_URL}/images/hero-desktop.jpg`;

export const metadata: Metadata = {
  title: 'كيف يعمل AQURIVO — How AQURIVO Works',
  description:
    'تعرف على كيفية عمل AQURIVO في 3 خطوات بسيطة: نبحث ونختار، نعرض لك الأفضل، وتشتري من المتجر الأصلي مباشرة بأمان تام.',
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
    canonical: `${SITE_URL}/how-it-works`,
  },
  openGraph: {
    title: 'كيف يعمل AQURIVO — How AQURIVO Works | AQURIVO',
    description:
      'نراجع آلاف المنتجات من Amazon و Noon و Temu و ClickBank ونختار الأفضل سعراً وجودةً.',
    url: `${SITE_URL}/how-it-works`,
    siteName: 'AQURIVO',
    type: 'website',
    images: [
      {
        url: ogImageUrl,
        secureUrl: ogImageUrl,
        width: 1200,
        height: 675,
        type: 'image/jpeg',
        alt: 'كيف يعمل AQURIVO — How AQURIVO Works',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@aqurivo',
    creator: '@aqurivo',
    title: 'كيف يعمل AQURIVO — How AQURIVO Works | AQURIVO',
    description:
      'نراجع آلاف المنتجات من Amazon و Noon و Temu و ClickBank ونختار الأفضل سعراً وجودةً.',
    images: [{ url: ogImageUrl, alt: 'كيف يعمل AQURIVO — How AQURIVO Works' }],
  },
};

export default function HowItWorksPage() {
  return <HowItWorksView />;
}
