import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SecurityCertificatesView } from '@/features/security/SecurityCertificatesView';

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
  const canonicalUrl = `${SITE_URL}/${isEn ? 'en' : 'ar'}/security`;
  const title = isEn
    ? 'Security Certificates & Trust Standards | AQURIVO'
    : 'شهادات الأمان ومعايير الموثوقية | AQURIVO';
  const description = isEn
    ? 'Discover AQURIVO’s buyer safety and trust commitments: verified daily security audits, safe direct store links, and independent editorial reviews for confident shopping.'
    : 'تعرّف على ميثاق الأمان وحماية المتسوق في AQURIVO: فحص يومي مستقل للموقع، روابط تسوق آمنة ومباشرة نحو المتاجر المعتمدة، وشفافية تحريرية تضمن راحة بالك.';

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
    alternates: {
      canonical: canonicalUrl,
      languages: {
        ar: `${SITE_URL}/ar/security`,
        en: `${SITE_URL}/en/security`,
        'x-default': `${SITE_URL}/en/security`,
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

export default async function LocalizedSecurityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (locale !== 'ar' && locale !== 'en') {
    notFound();
  }

  const isAr = locale === 'ar';
  const securityJsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        name: isAr
          ? 'شهادات الأمان ومعايير الموثوقية — AQURIVO'
          : 'Security Certificates & Trust Standards — AQURIVO',
        url: `${SITE_URL}/${locale}/security`,
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
            name: isAr ? 'شهادات الأمان والموثوقية' : 'Security & Trust',
            item: `${SITE_URL}/${locale}/security`,
          },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(securityJsonLd) }}
      />
      <SecurityCertificatesView />
    </>
  );
}
