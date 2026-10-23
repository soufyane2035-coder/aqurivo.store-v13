import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { listPublishedProducts } from '@/server/repositories/products.repo';
import { AccountView } from '@/features/account/AccountView';

export const dynamic = 'force-dynamic';

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
  const title = isAr
    ? 'المختارات المحفوظة وحسابي | AQURIVO'
    : 'Saved Picks & Account | AQURIVO';
  const description = isAr
    ? 'استعرض وقارن المنتجات التي قمت بحفظها في AQURIVO مع إدارة حسابك.'
    : 'View and compare your saved curated products on AQURIVO and manage your account.';

  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    robots: {
      index: false,
      follow: false,
    },
    alternates: {
      canonical: `${SITE_URL}/${locale}/account`,
      languages: {
        ar: `${SITE_URL}/ar/account`,
        en: `${SITE_URL}/en/account`,
        'x-default': `${SITE_URL}/en/account`,
      },
    },
  };
}

export default async function LocalizedAccountPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (locale !== 'ar' && locale !== 'en') {
    notFound();
  }

  const products = await listPublishedProducts();
  return <AccountView allProducts={products} />;
}
