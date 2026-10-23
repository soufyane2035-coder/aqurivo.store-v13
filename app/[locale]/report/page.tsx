import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { Locale } from '@/types';
import { SiteHeader } from '@/components/sections/SiteHeader';
import { SiteFooter } from '@/components/sections/SiteFooter';
import { ReportModal } from '@/components/ReportModal/ReportModal';

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://aqurivo.store';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (locale !== 'ar' && locale !== 'en') {
    return {};
  }

  const isAr = locale === 'ar';
  const title = isAr
    ? 'الإبلاغ والمساعدة — مركز العناية بالزوار | AQURIVO'
    : 'Report an Issue & Visitor Care | AQURIVO';
  const description = isAr
    ? 'مركز العناية بالزوار وحل المشكلات في AQURIVO. أبلغ عن أي مشكلة في المنتجات أو استفسر عن طلبك لنراجعه باهتمام كامل.'
    : 'AQURIVO Visitor Care & Issue Resolution Center. Report a product issue or request assistance with your order.';

  const ogImageUrl = `${SITE_URL}/images/hero-desktop.jpg`;

  return {
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
      canonical: `${SITE_URL}/${locale}/report`,
      languages: {
        ar: `${SITE_URL}/ar/report`,
        en: `${SITE_URL}/en/report`,
        'x-default': `${SITE_URL}/en/report`,
      },
    },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/${locale}/report`,
      siteName: 'AQURIVO',
      locale: isAr ? 'ar_SA' : 'en_US',
      alternateLocale: isAr ? ['en_US'] : ['ar_SA'],
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

export default async function ReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    productSlug?: string;
    productName?: string;
  }>;
}) {
  const { locale: rawLocale } = await params;
  if (rawLocale !== 'ar' && rawLocale !== 'en') {
    notFound();
  }

  const locale: Locale = rawLocale;
  const resolvedSearch = await searchParams;
  const productSlug =
    typeof resolvedSearch?.productSlug === 'string'
      ? resolvedSearch.productSlug
      : '';
  const productName =
    typeof resolvedSearch?.productName === 'string'
      ? resolvedSearch.productName
      : '';

  return (
    <div dir={locale === 'ar' ? 'rtl' : 'ltr'} lang={locale}>
      <SiteHeader />
      <main>
        <ReportModal
          mode="page"
          locale={locale}
          productSlug={productSlug}
          productName={productName}
        />
      </main>
      <SiteFooter />
    </div>
  );
}
