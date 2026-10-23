import React from 'react';
import type { Metadata } from 'next';
import { ResetPasswordView } from '@/features/account/ResetPasswordView';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://aqurivo.store';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Reset Password — AQURIVO',
  description: 'Securely reset and update your AQURIVO account password.',
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: `${SITE_URL}/reset-password`,
    languages: {
      ar: `${SITE_URL}/ar/reset-password`,
      en: `${SITE_URL}/en/reset-password`,
      'x-default': `${SITE_URL}/reset-password`,
    },
  },
};

export default function ResetPasswordPage() {
  return <ResetPasswordView />;
}
