import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { listPublishedProducts } from '@/server/repositories/products.repo';
import { ShoppingListView } from '@/features/cart/ShoppingListView';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://aqurivo.store';

export const dynamic = 'force-dynamic';

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
  return {
    metadataBase: new URL(SITE_URL),
    title: isAr ? 'قائمة الشراء | AQURIVO' : 'Shopping List | AQURIVO',
    description: isAr
      ? 'راجع المنتجات التي حفظتها وانتقل إلى المتجر الشريك للتحقق من السعر والتوفر.'
      : 'Review your saved products and visit each partner store to check current prices and availability.',
    robots: {
      index: false,
      follow: false,
    },
    alternates: {
      canonical: `${SITE_URL}/${locale}/cart`,
    },
  };
}

export default async function ShoppingListPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (locale !== 'ar' && locale !== 'en') {
    notFound();
  }

  const products = await listPublishedProducts();
  return <ShoppingListView allProducts={products} />;
}
