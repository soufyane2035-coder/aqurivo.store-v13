import React from 'react';
import { listAllSourcesAdmin } from '@/server/repositories/sources.repo';
import { AdminSourcesView } from '@/features/admin/AdminSourcesView';

export const dynamic = 'force-dynamic';

export default async function AdminSourcesPage() {
  const sources = await listAllSourcesAdmin();
  return <AdminSourcesView initialSources={sources} />;
}
