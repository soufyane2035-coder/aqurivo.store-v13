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

  return (
    <AdminAnalyticsView
      clicks={clicks}
      products={products}
      sources={sources}
    />
  );
}
