import React from 'react';
import type { Metadata } from 'next';
import { AuthFormView } from '@/features/account/AuthFormView';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://aqurivo.store';

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to AQURIVO to sync your saved products across devices.',
  robots: { index: false, follow: false },
  alternates: {
    canonical: `${SITE_URL}/login`,
  },
};

export default function LoginPage() {
  return <AuthFormView mode="login" />;
}
