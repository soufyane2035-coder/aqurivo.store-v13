import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { listPublishedArticles } from '@/server/repositories/articles.repo';
import { listActiveCategories } from '@/server/repositories/categories.repo';
import { GuidesView } from './GuidesView';

export const revalidate = 86400;

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://aqurivo.store';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (locale !== 'ar' && locale !== 'en') {
    return {
      title: 'Not Found | AQURIVO',
    };
  }

  const isAr = locale === 'ar';
  const title = isAr
    ? 'أدلة الشراء والمراجعات الشاملة | AQURIVO'
    : 'Editorial Buying Guides & In-Depth Reviews | AQURIVO';

  const description = isAr
    ? 'مقارنات دقيقة ودلائل شراء عملية تساعدك على اختيار أفضل المنتجات بأفضل الأسعار الموثوقة.'
    : 'Comprehensive buying guides, specs comparisons, and candid product recommendations from the AQURIVO editorial team.';

  const canonicalUrl = `${BASE_URL}/${locale}/guides`;
  const keywords = isAr
    ? [
        'أدلة الشراء',
        'مراجعات المنتجات',
        'مقارنة المنتجات',
        'أفضل المنتجات 2026',
        'نصائح تسوق ذكية',
        'AQURIVO',
      ]
    : [
        'buying guides',
        'product reviews',
        'side by side product comparison',
        'best products 2026',
        'smart shopping guides',
        'AQURIVO',
      ];

  const ogImageUrl = `${BASE_URL}/api/og?title=${encodeURIComponent(
    title
  )}&subtitle=${encodeURIComponent(description.slice(0, 120))}&category=${encodeURIComponent(
    isAr ? 'أدلة الشراء' : 'Buying Guides'
  )}&source=AQURIVO`;

  return {
    title,
    description: description.slice(0, 155),
    keywords,
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
      'og:image:type': 'image/png',
    },
    alternates: {
      canonical: canonicalUrl,
      languages: {
        ar: `${BASE_URL}/ar/guides`,
        en: `${BASE_URL}/en/guides`,
        'x-default': `${BASE_URL}/en/guides`,
      },
    },
    openGraph: {
      title,
      description: description.slice(0, 155),
      url: canonicalUrl,
      siteName: 'AQURIVO',
      locale: isAr ? 'ar_SA' : 'en_US',
      alternateLocale: isAr ? ['en_US'] : ['ar_SA'],
      type: 'website',
      images: [
        {
          url: ogImageUrl,
          secureUrl: ogImageUrl,
          width: 1200,
          height: 630,
          type: 'image/png',
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      site: '@aqurivo',
      creator: '@aqurivo',
      title,
      description: description.slice(0, 155),
      images: [
        {
          url: ogImageUrl,
          alt: title,
        },
      ],
    },
  };
}

export default async function LocalizedGuidesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (locale !== 'ar' && locale !== 'en') {
    notFound();
  }

  const [articles, categories] = await Promise.all([
    listPublishedArticles(),
    listActiveCategories(),
  ]);

  const isAr = locale === 'ar';

  const collectionSchemaJsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        name: isAr ? 'أدلة الشراء والمراجعات' : 'Buying Guides & Reviews',
        url: `${BASE_URL}/${locale}/guides`,
        description: isAr
          ? 'مقارنات دقيقة ودلائل شراء عملية لاختيار أفضل المنتجات.'
          : 'Curated buying guides and product comparisons.',
      },
      {
        '@type': 'ItemList',
        name: isAr ? 'أدلة AQURIVO' : 'AQURIVO Buying Guides',
        numberOfItems: articles.length,
        itemListElement: articles.slice(0, 30).map((article, idx) => ({
          '@type': 'ListItem',
          position: idx + 1,
          url: `${BASE_URL}/${locale}/guides/${encodeURIComponent(article.slug)}`,
          name: isAr ? article.title.ar : article.title.en,
          description: (isAr ? article.excerpt.ar : article.excerpt.en).slice(0, 155),
        })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: isAr ? 'الرئيسية' : 'Home',
            item: `${BASE_URL}/${locale}`,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: isAr ? 'أدلة الشراء' : 'Buying Guides',
            item: `${BASE_URL}/${locale}/guides`,
          },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchemaJsonLd) }}
      />
      <GuidesView articles={articles} categories={categories} />
    </>
  );
}
