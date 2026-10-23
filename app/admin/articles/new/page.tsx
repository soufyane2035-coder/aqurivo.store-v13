import React from 'react';
import { listAllCategoriesAdmin } from '@/server/repositories/categories.repo';
import { listAllProductsAdmin } from '@/server/repositories/products.repo';
import { listAllArticlesAdmin } from '@/server/repositories/articles.repo';
import { AdminArticleFormView } from '@/features/admin/AdminArticleFormView';

export const dynamic = 'force-dynamic';

export default async function AdminNewArticlePage() {
  const [categories, products, allArticles] = await Promise.all([
    listAllCategoriesAdmin(),
    listAllProductsAdmin(),
    listAllArticlesAdmin(),
  ]);

  return (
    <AdminArticleFormView
      categories={categories}
      products={products}
      allArticles={allArticles}
    />
  );
}
