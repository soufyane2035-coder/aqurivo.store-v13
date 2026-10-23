import React from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServiceReadiness } from '@/server/config/env';
import { getServerSession } from '@/server/middleware/security';
import { countNewReportsAdmin } from '@/server/repositories/reports.repo';
import { AdminShell } from '@/features/admin/AdminShell';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Admin Operations',
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  if (!session || session.role !== 'admin') {
    redirect('/login?next=/admin');
  }

  const readiness = getServiceReadiness();
  const newReportsCount = await countNewReportsAdmin();

  return (
    <AdminShell
      adminEmail={session?.email || ''}
      firebaseAdminReady={readiness.firebaseAdminConfigured}
      cloudinaryReady={readiness.cloudinaryConfigured}
      initialNewReportsCount={newReportsCount}
    >
      {children}
    </AdminShell>
  );
}
