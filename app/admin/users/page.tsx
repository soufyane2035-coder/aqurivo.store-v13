import React from 'react';
import { listUsersAdmin } from '@/server/repositories/users.repo';
import { AdminUsersView } from '@/features/admin/AdminUsersView';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const users = await listUsersAdmin();
  return <AdminUsersView users={users} />;
}
