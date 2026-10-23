import React from 'react';
import type { Metadata } from 'next';
import { AuthFormView } from '@/features/account/AuthFormView';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://aqurivo.store';

export const metadata: Metadata = {
  title: 'Create Account',
  description: 'Create an optional AQURIVO account to keep your saved items synced.',
  robots: { index: false, follow: false },
  alternates: {
    canonical: `${SITE_URL}/register`,
  },
};

export default function RegisterPage() {
  return <AuthFormView mode="register" />;
}
