import React from 'react';
import type { Metadata } from 'next';
import { SiteHeader } from '@/components/sections/SiteHeader';
import { SiteFooter } from '@/components/sections/SiteFooter';
import { NotFoundContent } from './not-found-content';
import styles from './not-found.module.css';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://aqurivo.store';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: '404 — الصفحة غير موجودة | AQURIVO',
  robots: 'noindex, nofollow',
};

export default function NotFound() {
  return (
    <div className={styles.pageShell}>
      <SiteHeader />

      <main id="main-content" className={`siteContainer ${styles.main}`}>
        <NotFoundContent />
      </main>

      <SiteFooter />
    </div>
  );
}
