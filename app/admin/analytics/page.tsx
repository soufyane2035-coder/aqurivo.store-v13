import React from 'react';
import { listRecentClicksAdmin } from '@/server/repositories/clicks.repo';
import { listAllProductsAdmin } from '@/server/repositories/products.repo';
import { listAllSourcesAdmin } from '@/server/repositories/sources.repo';
import { AdminAnalyticsView } from '@/features/admin/AdminAnalyticsView';

export const dynamic = 'force-dynamic';

export default async function AdminAnalyticsPage() {
  const [clicks, products, sources] = await Promise.all([
    listRecentClicksAdmin(1000),
    listAllProductsAdmin(),
    listAllSourcesAdmin(),
  ]);
  const clickCounts = new Map<string, number>();
  for (const click of clicks) {
    clickCounts.set(click.productSlug, (clickCounts.get(click.productSlug) || 0) + 1);
  }
  const topClickedSlugs = new Set(
    Array.from(clickCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([slug]) => slug)
  );
  const analyticsProducts = products.filter((product) => topClickedSlugs.has(product.slug));

  return (
    <AdminAnalyticsView
      clicks={clicks}
      products={analyticsProducts}
      sources={sources}
    />
  );
}
