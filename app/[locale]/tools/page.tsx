import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { TOOLS_DATA } from '@/lib/tools-data';
import { ToolsIndexClient } from './ToolsIndexClient';

const SITE_URL = 'https://aqurivo.store';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isAr = locale === 'ar';

  const title = isAr
    ? '11 أداة وحاسبة ذكية مجانية للتسوق والتخطيط المالي | AQURIVO'
    : '11 Free Smart Calculators for Shopping, Finance & Work | AQURIVO';
  const description = isAr
    ? 'استخدم 11 أداة وحاسبة مجانية ذكية: حاسبة هل يستحق الشراء، الفائدة المخفية للتقسيط، الراتب الحقيقي، مقارنة المعيشة، والقروض بدون تسجيل.'
    : 'Use 11 free interactive calculators: Cost-Per-Use, Hidden Installment Interest, Real Net Salary, Cost of Living, Loan Comparison, and more.';
  const canonical = `${SITE_URL}/${locale}/tools`;
  const ogImageUrl = `${SITE_URL}/api/og/tools/is-it-worth-buying?locale=${locale}`;
  const keywords = isAr
    ? [
        'أدوات تسوق ذكية',
        'حاسبة هل يستحق الشراء',
        'حاسبة الفائدة المخفية للتقسيط',
        'حاسبة الراتب الحقيقي',
        'مقارنة تكلفة المعيشة بين المدن',
        'حاسبة هدف الادخار',
        'حاسبة تسعير العمل الحر',
        'مقارنة القروض',
        'حاسبة الفائدة المركبة',
        'AQURIVO',
      ]
    : [
        'smart shopping calculators',
        'cost per use calculator',
        'hidden interest calculator',
        'real salary calculator',
        'cost of living comparison tool',
        'savings goal planner',
        'freelance rate calculator',
        'loan comparison calculator',
        'compound interest calculator',
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
      'twitter:label1': isAr ? 'عدد الأدوات' : 'Calculators Included',
      'twitter:data1': isAr ? '11 أداة ذكية مجانية' : '11 Free Smart Tools',
    },
    alternates: {
      canonical,
      languages: {
        ar: `${SITE_URL}/ar/tools`,
        en: `${SITE_URL}/en/tools`,
        'x-default': `${SITE_URL}/en/tools`,
      },
    },
    openGraph: {
      title,
      description,
      url: canonical,
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

export default async function ToolsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (locale !== 'ar' && locale !== 'en') {
    notFound();
  }

  const isAr = locale === 'ar';

  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: isAr
      ? 'أدوات وحاسبات AQURIVO الذكية المجانية'
      : 'AQURIVO Free Smart Calculators & Tools',
    url: `${SITE_URL}/${locale}/tools`,
    inLanguage: isAr ? 'ar' : 'en',
    description: isAr
      ? 'مجموعة من 11 أداة وحاسبة تفاعلية مجانية لقرارات الشراء الذكية والتخطيط المالي والعمل الحر.'
      : 'Suite of 11 free interactive calculators for smart shopping decisions, personal finance, and freelance work.',
  };

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: isAr ? 'قائمة أدوات AQURIVO المجانية' : 'AQURIVO Free Tools List',
    description: isAr
      ? '11 أداة مجانية ذكية تساعدك في قرارات التسوق والمال والعمل'
      : '11 smart free tools for shopping, finance, and work decisions',
    numberOfItems: TOOLS_DATA.length,
    itemListElement: TOOLS_DATA.map((tool, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: isAr ? tool.nameAr : tool.nameEn,
      description: isAr ? tool.descriptionAr : tool.descriptionEn,
      url: `${SITE_URL}/${locale}/tools/${tool.slug}`,
    })),
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: isAr ? 'الرئيسية' : 'Home',
        item: `${SITE_URL}/${locale}`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: isAr ? 'الأدوات الذكية' : 'Tools',
        item: `${SITE_URL}/${locale}/tools`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <ToolsIndexClient tools={TOOLS_DATA} locale={locale} />
    </>
  );
}
