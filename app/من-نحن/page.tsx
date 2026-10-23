import React from 'react';
import type { Metadata } from 'next';
import { AboutView } from '@/features/editorial/AboutView';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://aqurivo.store';

export const metadata: Metadata = {
  title: 'من نحن وفريقنا المستقل — AQURIVO',
  description:
    'تعرف على منصة AQURIVO وفريق التدقيق المستقل بقيادة المؤسس سفيان العرايش، وسعيد طلحة، وإلياس التازي، وخولة الوردي، وفراح الناصري. ميثاق نزاهة معلن وفحص يدوي دقيق لصفقات المتاجر الكبرى.',
  alternates: {
    canonical: `${SITE_URL}/ar/about`,
  },
};

export default function ArabicAboutPage() {
  return <AboutView />;
}
