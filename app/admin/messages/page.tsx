import React from 'react';
import { listMessagesAdmin } from '@/server/repositories/messages.repo';
import { AdminMessagesView } from '@/features/admin/AdminMessagesView';

export const dynamic = 'force-dynamic';

export default async function AdminMessagesPage() {
  const messages = await listMessagesAdmin();
  return <AdminMessagesView initialMessages={messages} />;
}
