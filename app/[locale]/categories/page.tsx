import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { listActiveCategories } from '@/server/repositories/categories.repo';
import { listPublishedProducts } from '@/server/repositories/products.repo';
import { SiteHeader } from '@/components/sections/SiteHeader';
import { SiteFooter } from '@/components/sections/SiteFooter';
import { SignatureMotif } from '@/components/ui/SignatureMotif';
import styles from '@/features/catalog/CategoryView.module.css';

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

  const isAr = locale === 'ar';
  const canonicalUrl = `${SITE_URL}/${locale}/categories`;
  const title = isAr
    ? 'جميع فئات المنتجات — تصفح وقارن حسب القسم | AQURIVO'
    : 'All Product Categories — Browse & Compare by Department | AQURIVO';
  const description = isAr
    ? 'تصفح جميع أقسام وفئات المنتجات المختارة في AQURIVO، وقارن المواصفات والمميزات والأسعار الموثوقة في كل فئة.'
    : 'Explore all curated product categories on AQURIVO and compare specs, pros & cons, and verified prices across global stores.';
  const ogImageUrl = `${SITE_URL}/api/og?title=${encodeURIComponent(
    title
  )}&subtitle=${encodeURIComponent(description.slice(0, 120))}&source=AQURIVO`;

  return {
    metadataBase: new URL(SITE_URL),
    title,
    description: description.slice(0, 155),
    keywords: isAr
      ? [
          'فئات المنتجات',
          'أقسام المتجر',
          'مقارنة المنتجات حسب الفئة',
          'أفضل المنتجات المختارة',
          'AQURIVO',
        ]
      : [
          'product categories',
          'shopping departments',
          'curated product categories',
          'compare products by category',
          'AQURIVO',
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
      thumbnail: ogImageUrl,
      'og:image:secure_url': ogImageUrl,
      'og:image:type': 'image/png',
    },
    alternates: {
      canonical: canonicalUrl,
      languages: {
        ar: `${SITE_URL}/ar/categories`,
        en: `${SITE_URL}/en/categories`,
        'x-default': `${SITE_URL}/en/categories`,
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

export default async function CategoriesIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (locale !== 'ar' && locale !== 'en') {
    notFound();
  }

  const isAr = locale === 'ar';
  const [categories, products] = await Promise.all([
    listActiveCategories(),
    listPublishedProducts(),
  ]);

  const canonicalUrl = `${SITE_URL}/${locale}/categories`;

  const categoriesJsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        name: isAr ? 'جميع فئات المنتجات — AQURIVO' : 'All Product Categories — AQURIVO',
        url: canonicalUrl,
        inLanguage: isAr ? 'ar' : 'en',
        description: isAr
          ? 'فهرس شامل لجميع فئات وأقسام المنتجات المنتقاة في AQURIVO.'
          : 'Complete directory of all curated product categories on AQURIVO.',
      },
      {
        '@type': 'ItemList',
        name: isAr ? 'فئات AQURIVO' : 'AQURIVO Categories',
        numberOfItems: categories.length,
        itemListElement: categories.map((cat, idx) => ({
          '@type': 'ListItem',
          position: idx + 1,
          name: isAr ? cat.name?.ar || cat.name?.en : cat.name?.en || cat.name?.ar,
          description: isAr
            ? cat.description?.ar || cat.description?.en
            : cat.description?.en || cat.description?.ar,
          url: `${SITE_URL}/${locale}/categories/${encodeURIComponent(cat.slug)}`,
        })),
      },
      {
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
            name: isAr ? 'الفئات' : 'Categories',
            item: canonicalUrl,
          },
        ],
      },
    ],
  };

  return (
    <div className={styles.pageShell} dir={isAr ? 'rtl' : 'ltr'}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(categoriesJsonLd) }}
      />
      <SiteHeader />

      <main id="main-content" className={`siteContainer ${styles.main}`}>
        <header className={styles.header}>
          <SignatureMotif
            index="01"
            label={isAr ? 'أقسام المتجر' : 'Product Departments'}
          />
          <h1 className={styles.title}>
            {isAr ? 'تصفح حسب الفئة' : 'Browse by Category'}
          </h1>
          <p className={styles.description}>
            {isAr
              ? 'اختر القسم الذي يهمك لمقارنة أفضل المنتجات المختارة والمواصفات والأسعار الموثوقة.'
              : 'Select a department to compare handpicked products, real specs, and verified store offers.'}
          </p>
        </header>

        <section className={styles.section}>
          <div className={styles.articlesGrid}>
            {categories.map((cat) => {
              const catName = isAr
                ? cat.name?.ar || cat.name?.en || cat.slug
                : cat.name?.en || cat.name?.ar || cat.slug;
              const catDesc = isAr
                ? cat.description?.ar || cat.description?.en || ''
                : cat.description?.en || cat.description?.ar || '';
              const count = products.filter(
                (p) => p.categorySlug === cat.slug || p.categoryId === cat.id
              ).length;

              return (
                <Link
                  key={cat.id || cat.slug}
                  href={`/${locale}/categories/${encodeURIComponent(cat.slug)}`}
                  prefetch={true}
                  className={`${styles.articleCard} hoverLift`}
                >
                  <h2 className={styles.articleTitle}>{catName}</h2>
                  {catDesc && <p className={styles.articleExcerpt}>{catDesc}</p>}
                  <span className={`${styles.readingTime} tabularNums`}>
                    {isAr ? `${count} منتج مختار` : `${count} curated products`}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
