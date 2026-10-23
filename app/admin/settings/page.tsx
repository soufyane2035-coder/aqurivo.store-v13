import React from 'react';
import { getSiteSettings } from '@/server/repositories/settings.repo';
import { getCanopyConfig } from '@/server/services/canopy.service';
import { AdminSettingsView } from '@/features/admin/AdminSettingsView';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  const [settings, canopyConfig] = await Promise.all([
    getSiteSettings(),
    getCanopyConfig(),
  ]);
  return (
    <AdminSettingsView
      initialSettings={settings}
      initialCanopyConfig={canopyConfig}
    />
  );
}
