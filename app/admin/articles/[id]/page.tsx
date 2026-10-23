import React from 'react';
import { notFound } from 'next/navigation';
import {
  getArticleByIdAdmin,
  listAllArticlesAdmin,
} from '@/server/repositories/articles.repo';
import { listAllCategoriesAdmin } from '@/server/repositories/categories.repo';
import { listAllProductsAdmin } from '@/server/repositories/products.repo';
import { AdminArticleFormView } from '@/features/admin/AdminArticleFormView';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminEditArticlePage({ params }: PageProps) {
  const { id } = await params;
  const [article, categories, products, allArticles] = await Promise.all([
    getArticleByIdAdmin(id),
    listAllCategoriesAdmin(),
    listAllProductsAdmin(),
    listAllArticlesAdmin(),
  ]);

  if (!article) {
    notFound();
  }

  return (
    <AdminArticleFormView
      existingArticle={article}
      categories={categories}
      products={products}
      allArticles={allArticles}
    />
  );
}
