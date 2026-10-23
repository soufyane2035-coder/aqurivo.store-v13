import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ResetPasswordView } from '@/features/account/ResetPasswordView';

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
  const canonicalUrl = `${SITE_URL}/${locale}/reset-password`;
  const title = isAr
    ? 'إعادة تعيين كلمة المرور — AQURIVO'
    : 'Reset Password — AQURIVO';
  const description = isAr
    ? 'استعادة وإعادة تعيين كلمة المرور لحسابك في متجر AQURIVO بكل أمان وسهولة.'
    : 'Securely reset and update your AQURIVO account password.';

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
        ar: `${SITE_URL}/ar/reset-password`,
        en: `${SITE_URL}/en/reset-password`,
        'x-default': `${SITE_URL}/en/reset-password`,
      },
    },
  };
}

export default async function LocalizedResetPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (locale !== 'ar' && locale !== 'en') {
    notFound();
  }

  return <ResetPasswordView />;
}
