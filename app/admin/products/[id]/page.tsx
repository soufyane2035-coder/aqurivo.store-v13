import React from 'react';
import { notFound } from 'next/navigation';
import { getServiceReadiness } from '@/server/config/env';
import { getProductByIdAdmin } from '@/server/repositories/products.repo';
import { listAllCategoriesAdmin } from '@/server/repositories/categories.repo';
import { listAllSourcesAdmin } from '@/server/repositories/sources.repo';
import { AdminProductFormView } from '@/features/admin/AdminProductFormView';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminEditProductPage({ params }: PageProps) {
  const { id } = await params;
  const readiness = getServiceReadiness();
  const [product, categories, sources] = await Promise.all([
    getProductByIdAdmin(id),
    listAllCategoriesAdmin(),
    listAllSourcesAdmin(),
  ]);

  if (!product) {
    notFound();
  }

  return (
    <AdminProductFormView
      existingProduct={product}
      categories={categories}
      sources={sources}
      cloudinaryReady={readiness.cloudinaryConfigured}
    />
  );
}
