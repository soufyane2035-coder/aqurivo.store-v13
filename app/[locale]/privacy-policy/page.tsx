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
  const canonicalUrl = `${SITE_URL}/${isEn ? 'en' : 'ar'}/privacy-policy`;
  const title = isEn ? 'Privacy Policy | AQURIVO' : 'سياسة الخصوصية | AQURIVO';
  const description = isEn
    ? 'Read how AQURIVO protects your privacy, minimizes data collection, and respects your rights.'
    : 'تعرف على سياسة الخصوصية في AQURIVO وكيف نحمي بياناتك ونحترم خصوصيتك.';

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
        ar: `${SITE_URL}/ar/privacy-policy`,
        en: `${SITE_URL}/en/privacy-policy`,
        'x-default': `${SITE_URL}/en/privacy-policy`,
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

export default async function LocalizedPrivacyPolicyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (locale !== 'ar' && locale !== 'en') {
    notFound();
  }

  const isAr = locale === 'ar';

  const privacyJsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        name: isAr ? 'سياسة الخصوصية — AQURIVO' : 'Privacy Policy — AQURIVO',
        url: `${SITE_URL}/${locale}/privacy-policy`,
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
            name: isAr ? 'سياسة الخصوصية' : 'Privacy Policy',
            item: `${SITE_URL}/${locale}/privacy-policy`,
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
          __html: JSON.stringify(privacyJsonLd),
        }}
      />
      <LegalPageView docType="privacy" />
    </>
  );
}
