import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AuthFormView } from '@/features/account/AuthFormView';

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

  const isAr = locale === 'ar';
  const canonicalUrl = `${SITE_URL}/${locale}/register`;
  const title = isAr
    ? 'إنشاء حساب جديد — AQURIVO'
    : 'Create Account — AQURIVO';
  const description = isAr
    ? 'أنشئ حساباً اختيارياً في AQURIVO لحفظ ومزامنة المنتجات المفضلة عبر جميع أجهزتك.'
    : 'Create an optional AQURIVO account to sync and manage your saved curated products across devices.';

  const ogImageUrl = `${SITE_URL}/images/hero-desktop.jpg`;

  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    robots: {
      index: false,
      follow: false,
    },
    alternates: {
      canonical: canonicalUrl,
      languages: {
        ar: `${SITE_URL}/ar/register`,
        en: `${SITE_URL}/en/register`,
        'x-default': `${SITE_URL}/en/register`,
      },
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: 'AQURIVO',
      locale: isAr ? 'ar_SA' : 'en_US',
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

export default async function LocalizedRegisterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (locale !== 'ar' && locale !== 'en') {
    notFound();
  }

  return <AuthFormView mode="register" />;
}
