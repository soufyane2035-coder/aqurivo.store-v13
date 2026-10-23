import React from 'react';
import type { Metadata } from 'next';
import { ResetPasswordView } from '@/features/account/ResetPasswordView';

export const metadata: Metadata = {
  title: 'Authentication Action — AQURIVO',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AuthActionPage() {
  return <ResetPasswordView />;
}
