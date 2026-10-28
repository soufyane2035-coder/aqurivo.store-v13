'use client';

import React, { useEffect } from 'react';
import { RotateCcw } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { Button } from './Button';
import { SiteFooter } from '@/components/sections/SiteFooter';
import { SiteHeader } from '@/components/sections/SiteHeader';
import styles from './RouteError.module.css';

export function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const pathname = usePathname();
  const isEnglish = pathname.startsWith('/en/');

  useEffect(() => {
    console.error('Page rendering failed:', error);
  }, [error]);

  return (
    <div className={styles.pageShell}>
      <SiteHeader />
      <main id="main-content" className={`siteContainer ${styles.main}`}>
        <section className={styles.message} role="alert">
          <div className={styles.statusMark} aria-hidden="true">
            !
          </div>
          <h1 className={styles.title}>
            {isEnglish ? 'This page could not be loaded' : 'تعذّر تحميل هذه الصفحة'}
          </h1>
          <p className={styles.description}>
            {isEnglish
              ? 'There was a problem retrieving the content. Please try again.'
              : 'حدثت مشكلة أثناء جلب المحتوى. يُرجى إعادة المحاولة.'}
          </p>
          <Button type="button" onClick={reset}>
            <RotateCcw size={16} aria-hidden="true" />
            {isEnglish ? 'Try again' : 'إعادة المحاولة'}
          </Button>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
