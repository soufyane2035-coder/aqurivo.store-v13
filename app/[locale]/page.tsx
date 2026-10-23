import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { listPublishedProducts } from '@/server/repositories/products.repo';
import { listActiveCategories } from '@/server/repositories/categories.repo';
import { listActiveSources } from '@/server/repositories/sources.repo';
import { listApprovedTestimonialsServer } from '@/server/repositories/testimonials.repo';
import { listPublishedArticles } from '@/server/repositories/articles.repo';
import { HomeClient } from '@/components/sections/HomeClient';
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
  const isAr = locale === 'ar';

  const title = isAr
    ? 'AQURIVO | مراجعات المنتجات ومقارنة الأسعار قبل الشراء'
    : 'AQURIVO | Product Reviews & Price Comparisons Before You Buy';
  const description = isAr
    ? 'اكتشف مراجعات المنتجات وأدلة الشراء، وقارن الأسعار والمميزات والعيوب قبل اتخاذ قرارك. يساعدك AQURIVO على اختيار ما يناسب احتياجاتك وميزانيتك.'
    : 'Explore product reviews and buying guides, and compare prices, pros, and cons before making your decision. AQURIVO helps you choose what fits your needs and budget.';
  const keywords = isAr
    ? [
        'AQURIVO',
        'أفضل المنتجات المختارة',
        'دليل الشراء والمراجعات',
        'مقارنة المنتجات',
        'أدوات تسوق ذكية',
        'حاسبة هل يستحق الشراء',
        'حاسبة الفائدة المخفية للتقسيط',
        'تسوق ذكي',
      ]
    : [
        'AQURIVO',
        'handpicked products',
        'buying guides and reviews',
        'product comparison',
        'smart shopping calculators',
        'cost per use calculator',
        'hidden interest calculator',
        'verified store deals',
      ];

  const ogImageUrl = `${SITE_URL}/images/hero-desktop.jpg`;

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
      'og:image:type': 'image/jpeg',
    },
    alternates: {
      canonical: `${SITE_URL}/${locale}`,
      languages: {
        en: `${SITE_URL}/en`,
        ar: `${SITE_URL}/ar`,
        'x-default': `${SITE_URL}/en`,
      },
    },
    verification: {
      google: 'oS_3HRPs49irqAH5Ey9SwCB9vrNxeshh61SYJSfZP2E',
    },
    icons: {
      icon: [
        { url: '/favicon.ico', sizes: '48x48' },
        { url: '/icon.svg', type: 'image/svg+xml', sizes: 'any' },
        { url: '/icon', sizes: '192x192', type: 'image/png' },
      ],
      shortcut: ['/favicon.ico'],
      apple: [{ url: '/apple-icon', sizes: '180x180', type: 'image/png' }],
    },
    openGraph: {
      title,
      description,
      images: [
        {
          url: ogImageUrl,
          secureUrl: ogImageUrl,
          width: 1200,
          height: 675,
          type: 'image/jpeg',
          alt: title,
        },
      ],
      url: `${SITE_URL}/${locale}`,
      siteName: 'AQURIVO',
      locale: isAr ? 'ar_SA' : 'en_US',
      alternateLocale: isAr ? ['en_US'] : ['ar_SA'],
      type: 'website',
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
          alt: title,
        },
      ],
    },
  };
}

export default async function LocalizedHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (locale !== 'ar' && locale !== 'en') {
    notFound();
  }

  const [products, categories, sources, testimonials, articles] = await Promise.all([
    listPublishedProducts(),
    listActiveCategories(),
    listActiveSources(),
    listApprovedTestimonialsServer(),
    listPublishedArticles(),
  ]);

  const isAr = locale === 'ar';
  const heroImageUrl = `${SITE_URL}/images/hero-desktop.jpg`;

  const structuredDataJsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/${locale}#website`,
        name: 'AQURIVO',
        url: `${SITE_URL}/${locale}`,
        inLanguage: isAr ? 'ar' : 'en',
        image: heroImageUrl,
        thumbnailUrl: heroImageUrl,
        primaryImageOfPage: {
          '@type': 'ImageObject',
          '@id': `${SITE_URL}/${locale}#primaryimage`,
          url: heroImageUrl,
          contentUrl: heroImageUrl,
          width: 1200,
          height: 675,
          caption: isAr
            ? 'AQURIVO | اختر بذكاء. واشترِ بثقة.'
            : 'AQURIVO | Choose Smarter. Buy with Confidence.',
        },
        description: isAr
          ? 'اكتشف مراجعات المنتجات وأدلة الشراء، وقارن الأسعار والمميزات والعيوب قبل اتخاذ قرارك. يساعدك AQURIVO على اختيار ما يناسب احتياجاتك وميزانيتك.'
          : 'Explore product reviews and buying guides, and compare prices, pros, and cons before making your decision. AQURIVO helps you choose what fits your needs and budget.',
        potentialAction: {
          '@type': 'SearchAction',
          target: `${SITE_URL}/${locale}/products?q={search_term}`,
          'query-input': 'required name=search_term',
        },
      },
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: 'AQURIVO',
        url: SITE_URL,
        email: 'contact@aqurivo.store',
        telephone: '+212684063908',
        logo: {
          '@type': 'ImageObject',
          url: `${SITE_URL}/icon`,
          contentUrl: `${SITE_URL}/icon.svg`,
          width: 192,
          height: 192,
        },
        image: `${SITE_URL}/icon`,
        description: isAr
          ? 'دليل تسوق ذكي وموثوق لأفضل المنتجات العالمية مع أدوات قرار شراء مجانية'
          : 'Curated e-commerce shopping guide, product comparisons, and free decision tools',
        contactPoint: {
          '@type': 'ContactPoint',
          contactType: 'customer support',
          email: 'contact@aqurivo.store',
          telephone: '+212684063908',
          availableLanguage: ['Arabic', 'English'],
        },
      },
      {
        '@type': 'ItemList',
        name: isAr ? 'أقسام موقع AQURIVO الرئيسية' : 'AQURIVO Main Navigation',
        itemListElement: [
          {
            '@type': 'SiteNavigationElement',
            position: 1,
            name: isAr ? 'دليل المنتجات المنتقاة' : 'Curated Products',
            url: `${SITE_URL}/${locale}/products`,
          },
          {
            '@type': 'SiteNavigationElement',
            position: 2,
            name: isAr ? 'أدلة الشراء والمراجعات' : 'Buying Guides & Reviews',
            url: `${SITE_URL}/${locale}/guides`,
          },
          {
            '@type': 'SiteNavigationElement',
            position: 3,
            name: isAr ? 'الأدوات الذكية المجانية (11 أداة)' : 'Free Smart Tools (11 Calculators)',
            url: `${SITE_URL}/${locale}/tools`,
          },
          {
            '@type': 'SiteNavigationElement',
            position: 4,
            name: isAr ? 'من نحن ومنهجيتنا' : 'About Our Methodology',
            url: `${SITE_URL}/${locale}/about`,
          },
          {
            '@type': 'SiteNavigationElement',
            position: 5,
            name: isAr ? 'اتصل بنا' : 'Contact Us',
            url: `${SITE_URL}/${locale}/contact`,
          },
        ],
      },
      ...(products.length > 0
        ? [
            {
              '@type': 'ItemList',
              name: isAr ? 'أبرز المنتجات المختارة' : 'Featured Curated Products',
              numberOfItems: Math.min(products.length, 16),
              itemListElement: products.slice(0, 16).map((prod, idx) => {
                const prodSlug = encodeURIComponent(prod.slug || prod.id);
                const prodUrl = `${SITE_URL}/${locale}/products/${prodSlug}`;
                const schemaItem = buildProductSchemaJson({
                  product: prod,
                  locale: locale as Locale,
                  siteUrl: SITE_URL,
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
          ]
        : []),
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredDataJsonLd) }}
      />
      <HomeClient
        products={products}
        categories={categories}
        sources={sources}
        testimonials={testimonials}
        articles={articles}
        pageLocale={locale as Locale}
      />
    </>
  );
}
