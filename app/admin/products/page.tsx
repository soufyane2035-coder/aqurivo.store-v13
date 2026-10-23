import React from 'react';
import { listAllProductsAdmin } from '@/server/repositories/products.repo';
import { listAllSourcesAdmin } from '@/server/repositories/sources.repo';
import {
  computeProductWarningMap,
  listReportsAdmin,
} from '@/server/repositories/reports.repo';
import { AdminProductsListView } from '@/features/admin/AdminProductsListView';

export const dynamic = 'force-dynamic';

export default async function AdminProductsPage() {
  const [products, sources, reports] = await Promise.all([
    listAllProductsAdmin(),
    listAllSourcesAdmin(),
    listReportsAdmin(),
  ]);

  const warningMap = computeProductWarningMap(reports);

  return (
    <AdminProductsListView
      initialProducts={products}
      sources={sources}
      productWarnings={warningMap}
    />
  );
}
