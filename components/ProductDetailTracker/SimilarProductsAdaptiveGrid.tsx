'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { Locale, Product } from '@/types';
import { formatProductPrice } from '@/lib/format';
import { rankSimilarProductsForVisitor } from '@/lib/productSearch';
import styles from '@/app/[locale]/products/[slug]/ProductPage.module.css';

interface SimilarProductsAdaptiveGridProps {
  initialProducts: Product[];
  currentProduct: Product;
  locale: Locale;
}

/**
 * Invisible in-browser background re-ranking for similar products.
 * Adapts item ordering to the visitor's session browsing velocity, dwell signals,
 * and price preferences without any visual footprint, badges, or UI disruption.
 */
export function SimilarProductsAdaptiveGrid({
  initialProducts,
  currentProduct,
  locale,
}: SimilarProductsAdaptiveGridProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const isAr = locale === 'ar';

  useEffect(() => {
    // Seamlessly re-ranks in the background on client mount if visitor signals exist
    const ranked = rankSimilarProductsForVisitor(initialProducts, currentProduct);
    setProducts(ranked);
  }, [initialProducts, currentProduct]);

  if (!products || products.length === 0) return null;

  return (
    <div className={styles.similarGrid}>
      {products.map((similar) => {
        const simName =
          (typeof similar.name === 'string'
            ? similar.name
            : (similar.name as unknown as Record<string, string> | undefined)?.[locale]) ||
          (typeof similar.title === 'string'
            ? similar.title
            : (similar.title as unknown as Record<string, string> | undefined)?.[locale]) ||
          similar.slug;

        const simPrice =
          typeof similar.priceAmount === 'number' && !Number.isNaN(similar.priceAmount)
            ? formatProductPrice(similar.priceAmount, similar.priceCurrency, locale)
            : isAr
              ? 'عرض السعر'
              : 'Check Price';

        const simImage = similar.images?.[0]?.url || '';

        return (
          <div key={similar.id} className={styles.similarCard}>
            <Link
              href={`/${locale}/products/${similar.slug}`}
              prefetch={false}
              className={styles.similarImageLink}
              tabIndex={-1}
            >
              {simImage ? (
                <Image
                  src={simImage}
                  alt={simName}
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className={styles.similarImage}
                  referrerPolicy="no-referrer"
                  unoptimized={Boolean(simImage && simImage.startsWith('http'))}
                />
              ) : (
                <div className={styles.imageFallback}>
                  <span>{simName.slice(0, 1)}</span>
                </div>
              )}
            </Link>

            <div className={styles.similarCardBody}>
              <Link
                href={`/${locale}/products/${similar.slug}`}
                prefetch={false}
                className={styles.similarTitleLink}
              >
                <h3 className={styles.similarTitle}>{simName}</h3>
              </Link>

              <div className={styles.similarPriceRow}>
                <span className={`${styles.similarPrice} tabularNums`}>
                  {simPrice}
                </span>
              </div>

              <Link
                href={`/${locale}/products/${similar.slug}`}
                prefetch={false}
                className={styles.similarViewButton}
              >
                {isAr ? 'عرض المنتج' : 'View Product'}
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
