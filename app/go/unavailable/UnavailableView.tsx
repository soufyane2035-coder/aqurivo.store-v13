'use client';

import React from 'react';
import Link from 'next/link';
import type { Product } from '@/types';
import { useI18n } from '@/i18n/I18nProvider';
import { useSaved } from '@/features/saved/SavedProvider';
import { SiteHeader } from '@/components/sections/SiteHeader';
import { SiteFooter } from '@/components/sections/SiteFooter';
import { SignatureMotif } from '@/components/ui/SignatureMotif';
import { ProductCard } from '@/components/ui/ProductCard';
import styles from './unavailable.module.css';

interface UnavailableViewProps {
  alternatives: Product[];
}

export function UnavailableView({ alternatives }: UnavailableViewProps) {
  const { locale, messages } = useI18n();
  const { isSaved, toggleSave } = useSaved();

  return (
    <div className={styles.pageShell}>
      <SiteHeader />

      <main id="main-content" className={`siteContainer ${styles.main}`}>
        <section className={styles.noticeBox}>
          <SignatureMotif
            index="01"
            label={locale === 'ar' ? 'تحديث رابط المتجر' : 'Store Link Update'}
          />
          <h1 className={styles.title}>
            {locale === 'ar'
              ? 'هذا المنتج غير متاح للتحويل حالياً'
              : 'This product link is currently being updated'}
          </h1>
          <p className={styles.description}>
            {locale === 'ar'
              ? 'نحن نراجع روابط المتاجر الشريكة باستمرار لضمان عملها. يبدو أن هذا المنتج قد نفد مؤقتاً أو أن رابطه قيد التحديث من فريقنا.'
              : 'We continuously verify partner store links. This item is either temporarily out of stock or its store link is being refreshed by our team.'}
          </p>
          <div className={styles.actions}>
            <Link href="/products" className={styles.primaryBtn}>
              {messages.nav.products}
            </Link>
            <Link href="/contact" className={styles.secondaryBtn}>
              {messages.nav.contact}
            </Link>
          </div>
        </section>

        {alternatives.length > 0 && (
          <section className={styles.alternativesSection}>
            <SignatureMotif
              index="02"
              label={
                locale === 'ar'
                  ? 'بدائل مختارة متاحة الآن'
                  : 'Available Curated Alternatives'
              }
            />
            <div className={styles.grid}>
              {alternatives.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  isSaved={isSaved(product.id)}
                  onToggleSave={toggleSave}
                  refContext="unavailable_alternative"
                />
              ))}
            </div>
          </section>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
