'use client';

import React, { useEffect } from 'react';
import type { Locale } from '@/types';
import { useI18n } from '@/i18n/I18nProvider';
import { convertCurrencyAmount, formatProductPrice } from '@/lib/format';
import { recordBrowserProductView } from '@/lib/viewedProductsStorage';
import styles from './ProductPage.module.css';

interface ProductPriceRowProps {
  priceAmount: number | null;
  oldPrice: number | null;
  priceCurrency: string;
  discount: number | null;
  inStock: boolean;
  locale: Locale;
  productMeta?: {
    id: string;
    slug: string;
    titleAr: string;
    titleEn: string;
    categorySlug: string;
    imageUrl: string;
  };
}

export function ProductPriceRow({
  priceAmount,
  oldPrice,
  priceCurrency,
  discount,
  inStock,
  locale,
  productMeta,
}: ProductPriceRowProps) {
  const { currency } = useI18n();
  const isAr = locale === 'ar';

  useEffect(() => {
    if (!productMeta || !priceAmount || priceAmount <= 0) return;
    const { convertedAmount: priceUsd } = convertCurrencyAmount(
      priceAmount,
      priceCurrency || 'USD',
      'USD'
    );
    if (!priceUsd || priceUsd <= 0) return;
    recordBrowserProductView({
      id: productMeta.id,
      slug: productMeta.slug,
      titleAr: productMeta.titleAr,
      titleEn: productMeta.titleEn,
      priceUsd: Math.max(1, Math.round(priceUsd * 100) / 100),
      originalPriceAmount: priceAmount,
      originalCurrency: priceCurrency || 'USD',
      discount,
      categorySlug: productMeta.categorySlug,
      imageUrl: productMeta.imageUrl,
      isExplicitlyViewed: true,
      updatedAt: Date.now(),
    });
  }, [
    productMeta?.id,
    productMeta?.slug,
    productMeta?.titleAr,
    productMeta?.titleEn,
    productMeta?.categorySlug,
    productMeta?.imageUrl,
    priceAmount,
    priceCurrency,
    discount,
  ]);

  const formattedPrice =
    priceAmount !== null
      ? formatProductPrice(priceAmount, priceCurrency, locale, currency)
      : isAr
        ? 'تحقق من السعر'
        : 'Check Price';

  const formattedOldPrice =
    oldPrice !== null && priceAmount !== null && oldPrice > priceAmount
      ? formatProductPrice(oldPrice, priceCurrency, locale, currency)
      : null;

  return (
    <div className={styles.priceRow}>
      {priceAmount !== null && (
        <span dir="ltr" className={`${styles.price} tabularNums`}>
          {formattedPrice}
        </span>
      )}

      {formattedOldPrice && (
        <span dir="ltr" className={`${styles.priceOriginal} tabularNums`}>
          {formattedOldPrice}
        </span>
      )}

      {discount !== null && discount > 0 && (
        <span dir="ltr" className={styles.discountBadge}>
          -{discount}%
        </span>
      )}

      <span className={styles.inStockBadge}>
        <span className={styles.inStockDot} aria-hidden="true" />
        {inStock
          ? isAr
            ? 'متوفر بالمخزون'
            : 'In Stock'
          : isAr
            ? 'نفذت الكمية'
            : 'Out of Stock'}
      </span>
    </div>
  );
}
