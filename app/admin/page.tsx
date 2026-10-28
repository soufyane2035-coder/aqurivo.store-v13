import React from 'react';
import { getServiceReadiness } from '@/server/config/env';
import { listAllProductsAdmin } from '@/server/repositories/products.repo';
import { listRecentClicksAdmin } from '@/server/repositories/clicks.repo';
import { listMessagesAdmin } from '@/server/repositories/messages.repo';
import { listReportsAdmin } from '@/server/repositories/reports.repo';
import { AdminOverviewView } from '@/features/admin/AdminOverviewView';

export const dynamic = 'force-dynamic';

export default async function AdminOverviewPage() {
  const readiness = getServiceReadiness();
  const [products, clicks, messages, reports] = await Promise.all([
    listAllProductsAdmin(),
    listRecentClicksAdmin(500),
    listMessagesAdmin(),
    listReportsAdmin(),
  ]);
  const nowMs = Date.now();
  const staleProducts = products
    .filter((product) => {
      const updatedMs = new Date(product.priceUpdatedAt).getTime();
      return Number.isFinite(updatedMs) && nowMs - updatedMs > 14 * 24 * 60 * 60 * 1000;
    })
    .sort((a, b) => String(a.priceUpdatedAt || '').localeCompare(String(b.priceUpdatedAt || '')));
  const topProducts = [...products]
    .sort((a, b) => (b.clicksCount || 0) - (a.clicksCount || 0))
    .slice(0, 5);

  return (
    <AdminOverviewView
      productCount={products.length}
      staleProducts={staleProducts.slice(0, 25)}
      staleProductCount={staleProducts.length}
      topProducts={topProducts}
      clicks={clicks}
      messages={messages}
      reports={reports}
      firebaseAdminReady={readiness.firebaseAdminConfigured}
      cloudinaryReady={readiness.cloudinaryConfigured}
    />
  );
}
