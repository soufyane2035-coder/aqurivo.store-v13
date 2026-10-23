import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ResetPasswordView } from '@/features/account/ResetPasswordView';

export const metadata: Metadata = {
  title: 'Authentication Action — AQURIVO',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function LocalizedAuthActionPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (locale !== 'ar' && locale !== 'en') {
    notFound();
  }

  return <ResetPasswordView />;
}
