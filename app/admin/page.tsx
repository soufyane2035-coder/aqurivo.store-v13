import React from 'react';
import { getServiceReadiness } from '@/server/config/env';
import { listAllProductsAdmin } from '@/server/repositories/products.repo';
import { listRecentClicksAdmin } from '@/server/repositories/clicks.repo';
import { listMessagesAdmin } from '@/server/repositories/messages.repo';
import { listReportsAdmin } from '@/server/repositories/reports.repo';
import { AdminOverviewView } from '@/features/admin/AdminOverviewView';

export const dynamic = 'force-dynamic';

export default async function AdminOverviewPage() {
  const readiness = getServiceReadiness();
  const [products, clicks, messages, reports] = await Promise.all([
    listAllProductsAdmin(),
    listRecentClicksAdmin(500),
    listMessagesAdmin(),
    listReportsAdmin(),
  ]);

  return (
    <AdminOverviewView
      products={products}
      clicks={clicks}
      messages={messages}
      reports={reports}
      firebaseAdminReady={readiness.firebaseAdminConfigured}
      cloudinaryReady={readiness.cloudinaryConfigured}
    />
  );
}
