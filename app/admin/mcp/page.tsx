import React from 'react';
import { AdminMcpControlsView } from '@/features/admin/AdminMcpControlsView';
import type { McpWriteControlDashboardState } from '@/server/repositories/mcp-controls.repo';

export const dynamic = 'force-dynamic';

export default async function AdminMcpControlsPage() {
  const initialControls: McpWriteControlDashboardState = {
    products: false,
    editorial: false,
    explicit: { products: false, editorial: false },
    configured: false,
    effective: null,
    allowed: { products: false, editorial: false },
    target: 'unconfigured',
    updatedAt: null,
    updatedBy: null,
  };
  return <AdminMcpControlsView initialControls={initialControls} />;
}
