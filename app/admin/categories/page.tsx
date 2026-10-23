import React from 'react';
import { listAllCategoriesAdmin } from '@/server/repositories/categories.repo';
import { AdminCategoriesView } from '@/features/admin/AdminCategoriesView';

export const dynamic = 'force-dynamic';

export default async function AdminCategoriesPage() {
  const categories = await listAllCategoriesAdmin();
  return <AdminCategoriesView initialCategories={categories} />;
}
