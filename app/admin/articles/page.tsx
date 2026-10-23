import React from 'react';
import { listAllArticlesAdmin } from '@/server/repositories/articles.repo';
import { AdminArticlesListView } from '@/features/admin/AdminArticlesListView';

export const dynamic = 'force-dynamic';

export default async function AdminArticlesPage() {
  const articles = await listAllArticlesAdmin();
  return <AdminArticlesListView initialArticles={articles} />;
}
