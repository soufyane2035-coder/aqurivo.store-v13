import React from 'react';
import { getServiceReadiness } from '@/server/config/env';
import { listAllCategoriesAdmin } from '@/server/repositories/categories.repo';
import { listAllSourcesAdmin } from '@/server/repositories/sources.repo';
import { AdminProductFormView } from '@/features/admin/AdminProductFormView';

export const dynamic = 'force-dynamic';

export default async function AdminNewProductPage() {
  const readiness = getServiceReadiness();
  const [categories, sources] = await Promise.all([
    listAllCategoriesAdmin(),
    listAllSourcesAdmin(),
  ]);

  return (
    <AdminProductFormView
      categories={categories}
      sources={sources}
      cloudinaryReady={readiness.cloudinaryConfigured}
    />
  );
}
