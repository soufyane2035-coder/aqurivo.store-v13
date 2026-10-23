import React from 'react';
import type { Metadata } from 'next';
import { listPublishedProducts } from '@/server/repositories/products.repo';
import { listActiveCategories } from '@/server/repositories/categories.repo';
import { listActiveSources } from '@/server/repositories/sources.repo';
import { listApprovedTestimonialsServer } from '@/server/repositories/testimonials.repo';
import { listPublishedArticles } from '@/server/repositories/articles.repo';
import { HomeClient } from '@/components/sections/HomeClient';

export const revalidate = 86400;

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://aqurivo.store';
const heroImageUrl = `${siteUrl}/images/hero-desktop.jpg`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'AQURIVO | مراجعات المنتجات ومقارنة الأسعار قبل الشراء',
  description:
    'اكتشف مراجعات المنتجات وأدلة الشراء، وقارن الأسعار والمميزات والعيوب قبل اتخاذ قرارك. يساعدك AQURIVO على اختيار ما يناسب احتياجاتك وميزانيتك.',
  keywords: [
    'AQURIVO',
    'مراجعات المنتجات',
    'مقارنة الأسعار قبل الشراء',
    'أفضل المنتجات المختارة',
    'أدلة الشراء والمراجعات',
    'أدوات تسوق ذكية',
    'تسوق ذكي',
  ],
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
    thumbnail: heroImageUrl,
    'og:image:secure_url': heroImageUrl,
    'og:image:type': 'image/jpeg',
  },
  openGraph: {
    title: 'AQURIVO | مراجعات المنتجات ومقارنة الأسعار قبل الشراء',
    description:
      'اكتشف مراجعات المنتجات وأدلة الشراء، وقارن الأسعار والمميزات والعيوب قبل اتخاذ قرارك. يساعدك AQURIVO على اختيار ما يناسب احتياجاتك وميزانيتك.',
    url: `${siteUrl}/ar`,
    siteName: 'AQURIVO',
    images: [
      {
        url: heroImageUrl,
        secureUrl: heroImageUrl,
        width: 1200,
        height: 675,
        type: 'image/jpeg',
        alt: 'AQURIVO | مراجعات المنتجات ومقارنة الأسعار قبل الشراء',
      },
    ],
    locale: 'ar_SA',
    alternateLocale: ['en_US'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@aqurivo',
    creator: '@aqurivo',
    title: 'AQURIVO | مراجعات المنتجات ومقارنة الأسعار قبل الشراء',
    description:
      'اكتشف مراجعات المنتجات وأدلة الشراء، وقارن الأسعار والمميزات والعيوب قبل اتخاذ قرارك. يساعدك AQURIVO على اختيار ما يناسب احتياجاتك وميزانيتك.',
    images: [
      {
        url: heroImageUrl,
        alt: 'AQURIVO | مراجعات المنتجات ومقارنة الأسعار قبل الشراء',
      },
    ],
  },
  alternates: {
    canonical: `${siteUrl}/ar`,
    languages: {
      ar: `${siteUrl}/ar`,
      en: `${siteUrl}/en`,
      'x-default': `${siteUrl}/en`,
    },
  },
  verification: {
    google: 'oS_3HRPs49irqAH5Ey9SwCB9vrNxeshh61SYJSfZP2E',
  },
};

export default async function HomePage() {
  const [products, categories, sources, testimonials, articles] = await Promise.all([
    listPublishedProducts(),
    listActiveCategories(),
    listActiveSources(),
    listApprovedTestimonialsServer(),
    listPublishedArticles(),
  ]);

  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${siteUrl}/#website`,
        name: 'AQURIVO',
        url: `${siteUrl}/ar`,
        inLanguage: 'ar',
        image: heroImageUrl,
        thumbnailUrl: heroImageUrl,
        primaryImageOfPage: {
          '@type': 'ImageObject',
          url: heroImageUrl,
          contentUrl: heroImageUrl,
          width: 1200,
          height: 675,
        },
        description:
          'اكتشف مراجعات المنتجات وأدلة الشراء، وقارن الأسعار والمميزات والعيوب قبل اتخاذ قرارك. يساعدك AQURIVO على اختيار ما يناسب احتياجاتك وميزانيتك.',
        potentialAction: {
          '@type': 'SearchAction',
          target: `${siteUrl}/ar/products?q={search_term}`,
          'query-input': 'required name=search_term',
        },
      },
      {
        '@type': 'Organization',
        '@id': `${siteUrl}/#organization`,
        name: 'AQURIVO',
        url: siteUrl,
        email: 'contact@aqurivo.store',
        telephone: '+212684063908',
        logo: {
          '@type': 'ImageObject',
          url: `${siteUrl}/icon`,
          contentUrl: `${siteUrl}/icon.svg`,
          width: 192,
          height: 192,
        },
        image: heroImageUrl,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <HomeClient
        products={products}
        categories={categories}
        sources={sources}
        testimonials={testimonials}
        articles={articles}
        pageLocale="ar"
      />
    </>
  );
}
