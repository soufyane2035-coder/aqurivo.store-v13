import React from 'react';
import { listAllTestimonialsAdminServer } from '@/server/repositories/testimonials.repo';
import { AdminTestimonialsView } from '@/features/admin/AdminTestimonialsView';

export const dynamic = 'force-dynamic';

export default async function AdminTestimonialsPage() {
  const testimonials = await listAllTestimonialsAdminServer();
  return <AdminTestimonialsView initialTestimonials={testimonials} />;
}
