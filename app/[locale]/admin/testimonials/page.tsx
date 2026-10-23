import React from 'react';
import { redirect } from 'next/navigation';
import { getServiceReadiness } from '@/server/config/env';
import { getServerSession } from '@/server/middleware/security';
import { listAllTestimonialsAdminServer } from '@/server/repositories/testimonials.repo';
import { AdminShell } from '@/features/admin/AdminShell';
import { AdminTestimonialsView } from '@/features/admin/AdminTestimonialsView';

export const dynamic = 'force-dynamic';

export default async function LocalizedAdminTestimonialsPage() {
  const session = await getServerSession();

  if (!session || session.role !== 'admin') {
    redirect('/login?next=/admin');
  }

  const readiness = getServiceReadiness();
  const testimonials = await listAllTestimonialsAdminServer();

  return (
    <AdminShell
      adminEmail={session?.email || ''}
      firebaseAdminReady={readiness.firebaseAdminConfigured}
      cloudinaryReady={readiness.cloudinaryConfigured}
    >
      <AdminTestimonialsView initialTestimonials={testimonials} />
    </AdminShell>
  );
}
