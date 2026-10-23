import React from 'react';
import { listReportsAdmin } from '@/server/repositories/reports.repo';
import { AdminReportsView } from '@/features/admin/AdminReportsView';

export const dynamic = 'force-dynamic';

export default async function AdminReportsPage() {
  const reports = await listReportsAdmin();
  return <AdminReportsView initialReports={reports} />;
}
