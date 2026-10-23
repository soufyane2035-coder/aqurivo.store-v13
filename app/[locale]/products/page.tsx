import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { listActiveCategories } from '@/server/repositories/categories.repo';
import { listPublishedProducts } from '@/server/repositories/products.repo';
import { listActiveSources } from '@/server/repositories/sources.repo';
import { listPublishedArticles } from '@/server/repositories/articles.repo';
import { CatalogView } from '@/features/catalog/CatalogView';
import { buildProductSchemaJson } from '@/lib/productSchema';
import type { Locale } from '@/types';

export const revalidate = 86400;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://aqurivo.store';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (locale !== 'ar' && locale !== 'en') {
    return {
      metadataBase: new URL(SITE_URL),
      title: '404 — Page Not Found | AQURIVO',
      robots: 'noindex, nofollow',
    };
  }

  const isEn = locale === 'en';
  const canonicalUrl = `${SITE_URL}/${isEn ? 'en' : 'ar'}/products`;
  const title = isEn
    ? 'Curated Products Directory — Compare Specs, Pros & Cons & Prices | AQURIVO'
    : 'دليل المنتجات المنتقاة — مقارنة المواصفات والمميزات وأفضل الأسعار | AQURIVO';
  const description = isEn
    ? 'Browse top handpicked products across global stores in one place — compare real specs, pros & cons, and verified offers.'
    : 'تصفح أفضل المنتجات المختارة من أكبر المتاجر العالمية في مكان واحد — قارن المواصفات الحقيقية والمميزات والعيوب وأفضل العروض الموثوقة.';
  const keywords = isEn
    ? [
        'curated products directory',
        'product comparison',
        'best products 2026',
        'verified store deals',
        'Amazon Noon AliExpress picks',
        'AQURIVO products',
      ]
    : [
        'دليل المنتجات المنتقاة',
        'مقارنة المنتجات',
        'أفضل المنتجات 2026',
        'عروض المتاجر الموثوقة',
        'مراجعات ومواصفات المنتجات',
        'منتجات AQURIVO',
      ];

  const ogImageUrl = `${SITE_URL}/api/og?title=${encodeURIComponent(
    title
  )}&subtitle=${encodeURIComponent(description.slice(0, 120))}&source=AQURIVO`;

  return {
    metadataBase: new URL(SITE_URL),
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
        ar: `${SITE_URL}/ar/products`,
        en: `${SITE_URL}/en/products`,
        'x-default': `${SITE_URL}/en/products`,
      },
    },
    openGraph: {
      title,
      description: description.slice(0, 155),
      url: canonicalUrl,
      siteName: 'AQURIVO',
      locale: isEn ? 'en_US' : 'ar_SA',
      alternateLocale: isEn ? ['ar_SA'] : ['en_US'],
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

export default async function LocalizedProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string; source?: string; q?: string }>;
}) {
  const { locale } = await params;
  if (locale !== 'ar' && locale !== 'en') {
    notFound();
  }

  const [resolvedSearch, products, categories, sources, articles] = await Promise.all([
    searchParams,
    listPublishedProducts(),
    listActiveCategories(),
    listActiveSources(),
    listPublishedArticles(),
  ]);

  const isEn = locale === 'en';
  const canonicalUrl = `${SITE_URL}/${isEn ? 'en' : 'ar'}/products`;

  const catalogSchemaJsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        name: isEn ? 'AQURIVO Curated Products Directory' : 'دليل منتجات AQURIVO المنتقاة',
        url: canonicalUrl,
        inLanguage: isEn ? 'en' : 'ar',
        description: isEn
          ? 'Curated directory of handpicked products with verified store links and comparison specs.'
          : 'دليل شامل للمنتجات المختارة بعناية مع مقارنة المواصفات وروابط المتاجر الرسمية.',
      },
      {
        '@type': 'ItemList',
        name: isEn ? 'AQURIVO Curated Products' : 'منتجات AQURIVO المنتقاة',
        numberOfItems: products.length,
        itemListElement: products.slice(0, 50).map((product, index) => {
          const prodSlug = encodeURIComponent(product.slug || product.id);
          const prodUrl = `${SITE_URL}/${isEn ? 'en' : 'ar'}/products/${prodSlug}`;
          const schemaItem = buildProductSchemaJson({
            product,
            locale: (isEn ? 'en' : 'ar') as Locale,
            siteUrl: SITE_URL,
          });

          return {
            '@type': 'ListItem',
            position: index + 1,
            url: prodUrl,
            name: schemaItem.name,
            image: schemaItem.thumbnailUrl,
            item: schemaItem,
          };
        }),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: isEn ? 'Home' : 'الرئيسية',
            item: `${SITE_URL}/${isEn ? 'en' : 'ar'}`,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: isEn ? 'Products' : 'المنتجات',
            item: canonicalUrl,
          },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(catalogSchemaJsonLd) }}
      />
      <CatalogView
        initialProducts={products}
        categories={categories}
        sources={sources}
        articles={articles}
        initialCategorySlug={resolvedSearch.category || 'all'}
        initialSourceSlug={resolvedSearch.source || 'all'}
        initialSearchQuery={resolvedSearch.q || ''}
      />
    </>
  );
}
