import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCategoryBySlug } from '@/server/repositories/categories.repo';
import { listPublishedProducts } from '@/server/repositories/products.repo';
import { listPublishedArticles } from '@/server/repositories/articles.repo';
import { listActiveSources } from '@/server/repositories/sources.repo';
import { CategoryView } from '@/features/catalog/CategoryView';
import { buildProductSchemaJson } from '@/lib/productSchema';
import type { Locale } from '@/types';

export const revalidate = 86400;

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://aqurivo.store';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (locale !== 'ar' && locale !== 'en') {
    return {
      title: 'Category Not Found | AQURIVO',
      robots: 'noindex, nofollow',
    };
  }

  const decodedSlug = decodeURIComponent(slug);
  const category =
    (await getCategoryBySlug(decodedSlug)) ?? (await getCategoryBySlug(slug));

  if (!category) {
    return {
      title: 'Category Not Found | AQURIVO',
      robots: 'noindex, nofollow',
    };
  }

  const isAr = locale === 'ar';
  const nameAr = category.name?.ar || category.name?.en || slug;
  const nameEn = category.name?.en || category.name?.ar || slug;
  const displayName = isAr ? nameAr : nameEn;

  const descAr =
    category.description?.ar ||
    `تسوق وقارن أفضل منتجات ${nameAr} المختارة بعناية مع مراجعات المواصفات وأفضل الأسعار الموثوقة عبر AQURIVO.`;
  const descEn =
    category.description?.en ||
    `Discover and compare top handpicked ${nameEn} products with in-depth specs, pros & cons, and verified store offers on AQURIVO.`;
  const description = (isAr ? descAr : descEn).slice(0, 155);

  const title = isAr
    ? `أفضل منتجات ${nameAr} — مقارنة المواصفات والأسعار | AQURIVO`
    : `Best ${nameEn} Products — Specs Comparison & Offers | AQURIVO`;

  const canonicalSlug = encodeURIComponent(category.slug || decodedSlug);
  const canonicalUrl = `${BASE_URL}/${locale}/categories/${canonicalSlug}`;
  const ogImageUrl = `${BASE_URL}/api/og?title=${encodeURIComponent(
    displayName
  )}&subtitle=${encodeURIComponent(description)}&category=${encodeURIComponent(
    isAr ? 'فئة المنتجات' : 'Product Category'
  )}&source=AQURIVO`;

  const keywords = isAr
    ? [
        nameAr,
        `أفضل منتجات ${nameAr}`,
        `مقارنة ${nameAr}`,
        `أسعار ${nameAr}`,
        `مراجعات ${nameAr}`,
        'AQURIVO',
      ]
    : [
        nameEn,
        `best ${nameEn} products`,
        `${nameEn} comparison`,
        `${nameEn} reviews`,
        `${nameEn} deals`,
        'AQURIVO',
      ];

  return {
    title,
    description,
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
      'twitter:label1': isAr ? 'القسم' : 'Category',
      'twitter:data1': displayName,
    },
    alternates: {
      canonical: canonicalUrl,
      languages: {
        ar: `${BASE_URL}/ar/categories/${canonicalSlug}`,
        en: `${BASE_URL}/en/categories/${canonicalSlug}`,
        'x-default': `${BASE_URL}/en/categories/${canonicalSlug}`,
      },
    },
    openGraph: {
      title,
      description,
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
          alt: displayName,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      site: '@aqurivo',
      creator: '@aqurivo',
      title,
      description,
      images: [
        {
          url: ogImageUrl,
          alt: displayName,
        },
      ],
    },
  };
}

export default async function LocalizedCategoryPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (locale !== 'ar' && locale !== 'en') {
    notFound();
  }

  const decodedSlug = decodeURIComponent(slug);
  const [category, allProducts, allArticles, sources] = await Promise.all([
    (await getCategoryBySlug(decodedSlug)) ?? (await getCategoryBySlug(slug)),
    listPublishedProducts(),
    listPublishedArticles(),
    listActiveSources(),
  ]);

  if (!category) {
    notFound();
  }

  const isAr = locale === 'ar';
  const categoryProducts = allProducts.filter(
    (p) => p.categorySlug === category.slug || p.categoryId === category.id
  );
  const categoryArticles = allArticles.filter(
    (a) => a.categorySlug === category.slug || a.categoryId === category.id
  );

  const categoryName = isAr
    ? category.name?.ar || category.name?.en || category.slug
    : category.name?.en || category.name?.ar || category.slug;
  const categoryUrl = `${BASE_URL}/${locale}/categories/${encodeURIComponent(
    category.slug
  )}`;

  const categorySchemaJsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        name: categoryName,
        url: categoryUrl,
        inLanguage: isAr ? 'ar' : 'en',
        description: isAr
          ? category.description?.ar || `أفضل منتجات ومراجعات ${categoryName}`
          : category.description?.en || `Top curated ${categoryName} products and buying guides`,
      },
      {
        '@type': 'ItemList',
        name: categoryName,
        numberOfItems: categoryProducts.length,
        itemListElement: categoryProducts.slice(0, 30).map((product, idx) => {
          const prodSlug = encodeURIComponent(product.slug || product.id);
          const prodUrl = `${BASE_URL}/${locale}/products/${prodSlug}`;
          const schemaItem = buildProductSchemaJson({
            product,
            locale: locale as Locale,
            siteUrl: BASE_URL,
          });

          return {
            '@type': 'ListItem',
            position: idx + 1,
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
            name: isAr ? 'الرئيسية' : 'Home',
            item: `${BASE_URL}/${locale}`,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: isAr ? 'المنتجات' : 'Products',
            item: `${BASE_URL}/${locale}/products`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: categoryName,
            item: categoryUrl,
          },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(categorySchemaJsonLd),
        }}
      />
      <CategoryView
        category={category}
        products={categoryProducts}
        articles={categoryArticles}
        sources={sources}
      />
    </>
  );
}
