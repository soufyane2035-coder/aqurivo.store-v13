import React from 'react';
import type { Metadata } from 'next';
import { listPublishedProducts } from '@/server/repositories/products.repo';
import { UnavailableView } from './UnavailableView';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Product Temporarily Unavailable',
  robots: { index: false, follow: false },
};

export default async function GoUnavailablePage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string; cat?: string }>;
}) {
  const { cat } = await searchParams;
  const allProducts = await listPublishedProducts();

  const sameCategory = cat
    ? allProducts.filter((p) => p.categorySlug === cat).slice(0, 3)
    : [];
  const alternatives = sameCategory.length > 0 ? sameCategory : allProducts.slice(0, 3);

  return <UnavailableView alternatives={alternatives} />;
}
