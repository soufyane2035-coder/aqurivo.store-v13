import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '@/components/sections/SiteHeader';
import { SiteFooter } from '@/components/sections/SiteFooter';
import { SignatureMotif } from '@/components/ui/SignatureMotif';
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
        <section className={styles.card}>
          <SignatureMotif index="404" label="الصفحة غير متوفرة — Page Not Found" />
          <h1 className={styles.title}>
            لم نتمكن من العثور على الصفحة التي تبحث عنها
          </h1>
          <p className={styles.description}>
            ربما تغيّر عنوان الرابط أو نُقل المحتوى إلى قسم آخر. يمكنك العودة إلى الرئيسية أو تصفح دليل المنتجات.
          </p>
          <div className={styles.actions}>
            <Link href="/ar" className={styles.primaryBtn}>
              العودة إلى الرئيسية
            </Link>
            <Link href="/ar/products" className={styles.secondaryBtn}>
              تصفح المنتجات
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
