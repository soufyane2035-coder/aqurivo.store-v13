import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LegalPageView } from '@/features/legal/LegalPageView';

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
      title: '404 | AQURIVO',
      robots: 'noindex, nofollow',
    };
  }

  const isEn = locale === 'en';
  const canonicalUrl = `${SITE_URL}/${isEn ? 'en' : 'ar'}/terms`;
  const title = isEn ? 'Terms of Use | AQURIVO' : 'شروط الاستخدام | AQURIVO';
  const description = isEn
    ? 'Terms of use for browsing AQURIVO and purchasing products through partner stores.'
    : 'شروط الاستخدام لتصفح منصة AQURIVO والتسوق بأمان.';

  const ogImageUrl = `${SITE_URL}/images/hero-desktop.jpg`;

  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
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
      canonical: canonicalUrl,
      languages: {
        ar: `${SITE_URL}/ar/terms`,
        en: `${SITE_URL}/en/terms`,
        'x-default': `${SITE_URL}/en/terms`,
      },
    },
    openGraph: {
      title,
      description,
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
          height: 675,
          type: 'image/jpeg',
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
      images: [{ url: ogImageUrl, alt: title }],
    },
  };
}

export default async function LocalizedTermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (locale !== 'ar' && locale !== 'en') {
    notFound();
  }

  const isAr = locale === 'ar';

  const termsJsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        name: isAr ? 'شروط الاستخدام — AQURIVO' : 'Terms of Use — AQURIVO',
        url: `${SITE_URL}/${locale}/terms`,
        inLanguage: isAr ? 'ar' : 'en',
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
            name: isAr ? 'شروط الاستخدام' : 'Terms of Use',
            item: `${SITE_URL}/${locale}/terms`,
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
          __html: JSON.stringify(termsJsonLd),
        }}
      />
      <LegalPageView docType="terms" />
    </>
  );
}
