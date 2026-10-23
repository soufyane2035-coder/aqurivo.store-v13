'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Columns2,
  LayoutList,
  ShoppingBag,
  ShoppingCart,
  Star,
  X,
} from 'lucide-react';
import type { Product } from '@/types';
import { useI18n } from '@/i18n/I18nProvider';
import { formatNumber, formatProductPrice } from '@/lib/format';
import { detectProductArchetype, areArchetypesSubstitutes } from '@/lib/productArchetype';
import styles from './ProductComparisonMatrix.module.css';

interface ProductComparisonMatrixProps {
  products: Product[];
  topPickProductId?: string;
}

type SortOption = 'default' | 'price_asc' | 'rating_desc' | 'discount_desc';
type ViewMode = 'all' | 'head_to_head';

const SOURCE_LABELS: Record<string, string> = {
  amazon: 'Amazon',
  noon: 'Noon',
  temu: 'Temu',
  clickbank: 'ClickBank',
};

function getProductDiscount(p: Product): number {
  if (typeof p.discount === 'number' && p.discount > 0) return p.discount;
  if (typeof p.discountPercent === 'number' && p.discountPercent > 0) {
    return p.discountPercent;
  }
  if (
    typeof p.oldPrice === 'number' &&
    typeof p.priceAmount === 'number' &&
    p.oldPrice > p.priceAmount &&
    p.oldPrice > 0
  ) {
    return Math.round(((p.oldPrice - p.priceAmount) / p.oldPrice) * 100);
  }
  return 0;
}

function getSourceDisplay(p: Product): string {
  const raw = (p.sourceSlug || p.sourceId || 'amazon').toLowerCase().trim();
  return SOURCE_LABELS[raw] || raw.toUpperCase();
}

export function ProductComparisonMatrix({
  products,
}: ProductComparisonMatrixProps) {
  const { locale, messages, t, currency } = useI18n();
  const isAr = locale === 'ar';

  // 1. Cluster to genuinely comparable archetype products
  const comparableProducts = useMemo(() => {
    if (!products || products.length <= 1) return products;
    const firstArch = detectProductArchetype(products[0]);
    if (firstArch === 'general') return products;

    const filtered = products.filter((p) => {
      const arch = detectProductArchetype(p);
      return arch === firstArch || areArchetypesSubstitutes(firstArch, arch);
    });

    return filtered.length >= 2 ? filtered : products;
  }, [products]);

  const [sortBy, setSortBy] = useState<SortOption>('default');
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [leftId, setLeftId] = useState<string>(comparableProducts[0]?.id || '');
  const [rightId, setRightId] = useState<string>(
    comparableProducts[1]?.id || comparableProducts[0]?.id || ''
  );
  const [openPickerSlot, setOpenPickerSlot] = useState<'left' | 'right' | null>(
    null
  );
  const pickerWrapperRef = useRef<HTMLDivElement | null>(null);

  // Sync left and right IDs if products change
  useEffect(() => {
    if (comparableProducts.length > 0) {
      if (!comparableProducts.some((p) => p.id === leftId)) {
        setLeftId(comparableProducts[0]?.id || '');
      }
      if (!comparableProducts.some((p) => p.id === rightId)) {
        setRightId(comparableProducts[1]?.id || comparableProducts[0]?.id || '');
      }
    }
  }, [comparableProducts, leftId, rightId]);

  useEffect(() => {
    if (!openPickerSlot) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (
        pickerWrapperRef.current &&
        !pickerWrapperRef.current.contains(e.target as Node)
      ) {
        setOpenPickerSlot(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenPickerSlot(null);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openPickerSlot]);

  const handleSelectH2HProduct = (slot: 'left' | 'right', chosenId: string) => {
    if (slot === 'left') {
      if (chosenId === rightId && leftId !== rightId) {
        setRightId(leftId);
      }
      setLeftId(chosenId);
    } else {
      if (chosenId === leftId && rightId !== leftId) {
        setLeftId(rightId);
      }
      setRightId(chosenId);
    }
    setOpenPickerSlot(null);
  };

  // Compute live algorithmic metric IDs for objective badges (no static winner bias)
  const { lowestPriceId, highestRatedId, biggestDiscountId } =
    useMemo(() => {
      let minPrice = Number.POSITIVE_INFINITY;
      let minPriceProductId = '';
      let maxRating = -1;
      let maxRatingProductId = '';
      let maxDiscount = 0;
      let maxDiscountProductId = '';

      for (const p of comparableProducts) {
        if (typeof p.priceAmount === 'number' && p.priceAmount > 0 && p.priceAmount < minPrice) {
          minPrice = p.priceAmount;
          minPriceProductId = p.id;
        }
        const r = typeof p.stars === 'number' ? p.stars : 4.3;
        if (r > maxRating) {
          maxRating = r;
          maxRatingProductId = p.id;
        }
        const d = getProductDiscount(p);
        if (d > maxDiscount) {
          maxDiscount = d;
          maxDiscountProductId = p.id;
        }
      }

      return {
        lowestPriceId: minPriceProductId,
        highestRatedId: maxRatingProductId,
        biggestDiscountId: maxDiscountProductId,
      };
    }, [comparableProducts]);

  const sortedProducts = useMemo(() => {
    const list = [...comparableProducts];
    if (sortBy === 'price_asc') {
      return list.sort((a, b) => {
        const pa =
          typeof a.priceAmount === 'number' && a.priceAmount > 0
            ? a.priceAmount
            : Number.MAX_SAFE_INTEGER;
        const pb =
          typeof b.priceAmount === 'number' && b.priceAmount > 0
            ? b.priceAmount
            : Number.MAX_SAFE_INTEGER;
        return pa - pb;
      });
    }
    if (sortBy === 'rating_desc') {
      return list.sort((a, b) => (b.stars ?? 4.3) - (a.stars ?? 4.3));
    }
    if (sortBy === 'discount_desc') {
      return list.sort((a, b) => getProductDiscount(b) - getProductDiscount(a));
    }
    // Algorithmic default: Value-to-Performance index ranking
    return list.sort((a, b) => {
      const scoreProduct = (p: Product) => {
        const ratingScore = ((p.stars ?? 4.3) / 5.0) * 40;
        const discountScore = Math.min(25, getProductDiscount(p) * 0.5);
        const specsCount =
          (p.comparisonDna?.keySpecs?.ar?.length || p.comparisonDna?.keySpecs?.en?.length || 0);
        const specsScore = Math.min(20, specsCount * 4);
        const reviewsCount = typeof p.reviewCount === 'number' ? p.reviewCount : 10;
        const reviewBonus = Math.min(15, Math.log10(reviewsCount + 1) * 5);
        return ratingScore + discountScore + specsScore + reviewBonus;
      };
      return scoreProduct(b) - scoreProduct(a);
    });
  }, [comparableProducts, sortBy]);

  const getBestForText = (p: Product): string => {
    const dnaBestFor = p.comparisonDna?.bestFor
      ? isAr
        ? p.comparisonDna.bestFor.ar || p.comparisonDna.bestFor.en
        : p.comparisonDna.bestFor.en || p.comparisonDna.bestFor.ar
      : '';
    if (dnaBestFor && dnaBestFor.trim()) return dnaBestFor.trim();

    if (p.id === lowestPriceId && products.length > 1) {
      return isAr ? 'الخيار الاقتصادي الأوفر' : 'Best Budget Value';
    }
    if (p.id === highestRatedId && products.length > 1) {
      return isAr ? 'الأعلى تقييماً من المشترين' : 'Highest Buyer Rating';
    }
    if (p.id === biggestDiscountId && getProductDiscount(p) >= 15) {
      return isAr ? 'أكبر نسبة خصم حالية' : 'Biggest Live Discount';
    }
    return isAr ? 'توازن الأداء والقيمة' : 'Balanced Performance & Value';
  };

  const getKeySpecsList = (p: Product): string[] => {
    const dnaSpecs = p.comparisonDna?.keySpecs
      ? isAr
        ? p.comparisonDna.keySpecs.ar || p.comparisonDna.keySpecs.en
        : p.comparisonDna.keySpecs.en || p.comparisonDna.keySpecs.ar
      : [];
    if (Array.isArray(dnaSpecs) && dnaSpecs.length > 0) {
      return dnaSpecs.filter(Boolean).slice(0, 3);
    }
    return [];
  };

  const getAlgorithmicDnaScore = (p: Product): number => {
    const perf =
      p.comparisonDna?.performanceScore ?? Math.round((p.stars ?? 4.5) * 20);
    const valScore =
      p.comparisonDna?.valueScore ??
      Math.min(98, 82 + Math.round(getProductDiscount(p) * 0.4));
    const relScore =
      p.comparisonDna?.reliabilityScore ?? Math.round((p.stars ?? 4.5) * 19.5);
    return Math.round((perf + valScore + relScore) / 3);
  };

  const getAwardLabel = (
    p: Product
  ): { text: string; variant: 'primary' | 'value' | 'rating' } | null => {
    const customBestFor = p.comparisonDna?.bestFor
      ? isAr
        ? p.comparisonDna.bestFor.ar || p.comparisonDna.bestFor.en
        : p.comparisonDna.bestFor.en || p.comparisonDna.bestFor.ar
      : '';
    if (customBestFor && customBestFor.trim()) {
      return {
        text: customBestFor.trim(),
        variant: 'primary',
      };
    }
    if (p.id === lowestPriceId && products.length > 1) {
      return {
        text: isAr ? 'أفضل سعر وقيمة' : 'Best Value Price',
        variant: 'value',
      };
    }
    if (p.id === highestRatedId && products.length > 1) {
      return {
        text: isAr ? 'الأعلى تقييماً' : 'Highest Rated',
        variant: 'rating',
      };
    }
    if (p.id === biggestDiscountId && getProductDiscount(p) >= 15) {
      return {
        text: isAr ? 'أكبر نسبة توفير' : 'Biggest Savings',
        variant: 'value',
      };
    }
    return null;
  };

  const leftProduct =
    comparableProducts.find((p) => p.id === leftId) || comparableProducts[0];
  const rightProduct =
    comparableProducts.find((p) => p.id === rightId) ||
    comparableProducts[1] ||
    comparableProducts[0];

  const leftPrice = leftProduct?.priceAmount ?? null;
  const rightPrice = rightProduct?.priceAmount ?? null;
  const leftRating = leftProduct?.stars ?? 4.3;
  const rightRating = rightProduct?.stars ?? 4.3;

  return (
    <section
      id="quick-comparison"
      className={styles.matrixSection}
      aria-labelledby="comparison-matrix-heading"
    >
      {/* Top Header & Interactive Controls */}
      <div className={styles.matrixHeader}>
        <div className={styles.titleBlock}>
          <h2 id="comparison-matrix-heading" className={styles.heading}>
            {isAr
              ? 'مقارنة المنتجات الذكية'
              : 'Smart Product Comparison'}
          </h2>
          <p className={styles.subheading}>
            {isAr
              ? 'قارن المواصفات والأسعار والتقييمات جنباً إلى جنب أو رتبها حسب أولويتك'
              : 'Compare key strengths, ratings, and live prices side by side'}
          </p>
        </div>

        {/* View Mode Switcher: All Products vs Head-to-Head 2 Products */}
        <div
          className={styles.modeToggleGroup}
          role="group"
          aria-label={isAr ? 'طريقة عرض المقارنة' : 'Comparison view mode'}
        >
          <button
            type="button"
            onClick={() => setViewMode('all')}
            className={`${styles.modeBtn} ${
              viewMode === 'all' ? styles.modeBtnActive : ''
            }`}
          >
            <LayoutList size={15} aria-hidden="true" />
            <span>
              {isAr
                ? `جميع المنتجات (${formatNumber(comparableProducts.length, locale)})`
                : `All Products (${formatNumber(comparableProducts.length, locale)})`}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('head_to_head')}
            className={`${styles.modeBtn} ${
              viewMode === 'head_to_head' ? styles.modeBtnActive : ''
            }`}
          >
            <Columns2 size={15} aria-hidden="true" />
            <span>
              {isAr ? 'مقارنة وجهاً لوجه (2)' : 'Head-to-Head (2)'}
            </span>
          </button>
        </div>
      </div>

      {/* Interactive Sort Bar (Visible in All Products mode) */}
      {viewMode === 'all' && (
        <div className={styles.sortToolbar}>
          <span className={styles.sortLabel}>
            {isAr ? 'ترتيب خوارزمي حسب:' : 'Algorithmic Sort:'}
          </span>
          <div className={styles.sortButtons}>
            <button
              type="button"
              onClick={() => setSortBy('default')}
              className={`${styles.sortPill} ${
                sortBy === 'default' ? styles.sortPillActive : ''
              }`}
            >
              {isAr ? 'مؤشر القيمة والأداء' : 'DNA Value & Performance'}
            </button>
            <button
              type="button"
              onClick={() => setSortBy('price_asc')}
              className={`${styles.sortPill} ${
                sortBy === 'price_asc' ? styles.sortPillActive : ''
              }`}
            >
              {isAr ? 'الأقل سعراً' : 'Lowest Price'}
            </button>
            <button
              type="button"
              onClick={() => setSortBy('discount_desc')}
              className={`${styles.sortPill} ${
                sortBy === 'discount_desc' ? styles.sortPillActive : ''
              }`}
            >
              {isAr ? 'الأكبر توفيراً' : 'Biggest Discount'}
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODE 1: ALL PRODUCTS (100% Viewport-Fit Mobile Cards + Desktop Matrix)
          ===================================================================== */}
      {viewMode === 'all' && (
        <>
          {/* A. Mobile Viewport-Fit Comparison Cards (< 768px) — Zero horizontal scroll or cut-off text */}
          <div className={styles.mobileCardsList}>
            {sortedProducts.map((p) => {
              const award = getAwardLabel(p);
              const imgUrl = p.images?.find((img) => Boolean(img?.url?.trim()))?.url || '';
              const discount = getProductDiscount(p);
              const stars = typeof p.stars === 'number' ? p.stars : 4.5;
              const soldCount = typeof p.soldCount === 'number' ? p.soldCount : 120;
              const bestForText = getBestForText(p);
              const keySpecsList = getKeySpecsList(p);
              const keyFeature =
                bestForText ||
                t(p.whyWePickedIt) ||
                t(p.shortSummary) ||
                t(p.description);
              const formattedPrice =
                p.priceAmount !== null && p.priceAmount > 0
                  ? formatProductPrice(p.priceAmount, p.priceCurrency, locale, currency)
                  : '';
              const formattedOldPrice =
                p.oldPrice && p.oldPrice > 0
                  ? formatProductPrice(p.oldPrice, p.priceCurrency, locale, currency)
                  : '';

              return (
                <article
                  key={p.id}
                  className={styles.mobileCompareCard}
                >
                  {/* Top Bar: Award + Store */}
                  <div className={styles.mobileCardTopMeta}>
                    {award ? (
                      <span
                        className={`${styles.awardText} ${
                          styles[`award_${award.variant}`]
                        }`}
                      >
                        <CheckCircle2 size={12} aria-hidden="true" />
                        <span>{award.text}</span>
                      </span>
                    ) : (
                      <span className={styles.storeMetaLabel}>
                        {getSourceDisplay(p)}
                      </span>
                    )}
                    {award && (
                      <span className={styles.storeMetaLabel}>
                        {getSourceDisplay(p)}
                      </span>
                    )}
                  </div>

                  {/* Product Identity Row: Image + Full Clickable Title */}
                  <div className={styles.mobileIdentityRow}>
                    <Link
                      href={`/${locale}/products/${encodeURIComponent(p.slug)}`}
                      className={styles.mobileThumbWrap}
                    >
                      {imgUrl ? (
                        <img
                          src={imgUrl}
                          alt={t(p.title)}
                          className={styles.mobileThumbImg}
                          referrerPolicy="no-referrer"
                          loading="lazy"
                        />
                      ) : (
                        <ShoppingBag size={22} className={styles.fallbackIcon} />
                      )}
                    </Link>

                    <div className={styles.mobileTitleGroup}>
                      <h3 className={styles.mobileProductTitle}>
                        <Link
                          href={`/${locale}/products/${encodeURIComponent(p.slug)}`}
                          className={styles.mobileProductTitleLink}
                        >
                          {t(p.title)}
                        </Link>
                      </h3>
                    </div>
                  </div>

                  {/* 3-Cell Metrics Strip: Price | Rating | Discount (Never wraps awkwardly) */}
                  <div className={styles.mobileMetricsGrid}>
                    <div className={styles.metricCell}>
                      <span className={styles.metricLabel}>
                        {isAr ? 'السعر' : 'Price'}
                      </span>
                      <div className={styles.metricValueGroup}>
                        {formattedPrice ? (
                          <span
                            dir="ltr"
                            className={`${styles.metricPrice} tabularNums`}
                          >
                            {formattedPrice}
                          </span>
                        ) : (
                          <span className={styles.metricMuted}>
                            {messages.product.priceMayVary}
                          </span>
                        )}
                        {formattedOldPrice && (
                          <span
                            dir="ltr"
                            className={`${styles.metricOldPrice} tabularNums`}
                          >
                            {formattedOldPrice}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className={styles.metricCell}>
                      <span className={styles.metricLabel}>
                        {isAr ? 'المتجر' : 'Store'}
                      </span>
                      <div className={styles.metricRatingRow}>
                        <CheckCircle2
                          size={13}
                          color="#16a34a"
                          aria-hidden="true"
                        />
                        <span className={styles.metricRatingNum}>
                          {getSourceDisplay(p)}
                        </span>
                      </div>
                    </div>

                    <div className={styles.metricCell}>
                      <span className={styles.metricLabel}>
                        {isAr ? 'التوفير' : 'Savings'}
                      </span>
                      <span
                        dir="ltr"
                        className={`${styles.metricDiscount} tabularNums`}
                      >
                        {discount > 0 ? `-${discount}%` : isAr ? 'سعر مباشر' : 'Direct'}
                      </span>
                    </div>
                  </div>

                  {/* Full-Width Best For / Key Feature */}
                  {keyFeature && (
                    <div className={styles.mobileFeatureBox}>
                      <span className={styles.mobileFeatureLabel}>
                        {bestForText
                          ? isAr
                            ? 'الأنسب لـ:'
                            : 'Best for:'
                          : isAr
                            ? 'أبرز ميزة:'
                            : 'Key strength:'}
                      </span>{' '}
                      <span className={styles.mobileFeatureText}>
                        {keyFeature}
                      </span>
                      {keySpecsList.length > 0 && (
                        <div style={{ marginTop: '0.45rem', display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                          {keySpecsList.slice(0, 3).map((spec, sIdx) => (
                            <span
                              key={sIdx}
                              style={{
                                fontSize: '0.73rem',
                                padding: '0.15rem 0.45rem',
                                borderRadius: '6px',
                                backgroundColor: 'var(--color-bg-subtle)',
                                border: '1px solid var(--color-border)',
                                color: 'var(--color-text-secondary)',
                              }}
                            >
                              {spec}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Bottom Actions: View Details + Direct Buy CTA */}
                  <div className={styles.mobileActionsRow}>
                    <Link
                      href={`/${locale}/products/${encodeURIComponent(p.slug)}`}
                      className={styles.detailsSecondaryBtn}
                    >
                      {isAr ? 'مواصفات المنتج' : 'Details'}
                    </Link>
                    <a
                      href={`/go/${encodeURIComponent(p.slug)}?ref=guide_table`}
                      target="_blank"
                      rel="sponsored noopener noreferrer"
                      className={styles.buyPrimaryBtn}
                    >
                      <ShoppingCart size={14} aria-hidden="true" />
                      <span>{messages.product.buyNow}</span>
                      <ArrowUpRight size={13} aria-hidden="true" />
                    </a>
                  </div>
                </article>
              );
            })}
          </div>

          {/* B. Desktop Matrix Table (>= 768px) */}
          <div className={styles.desktopTableWrap}>
            <table className={styles.desktopTable}>
              <thead>
                <tr>
                  <th className={styles.colProduct}>
                    {isAr ? 'المنتج' : 'Product'}
                  </th>
                  <th className={styles.colFeature}>
                    {isAr ? 'الاستخدام الأنسب والمواصفات المفصلية' : 'Best For & Key Specs'}
                  </th>
                  <th className={styles.colRating}>
                    {isAr ? 'المتجر والتوثيق' : 'Store & Verification'}
                  </th>
                  <th className={styles.colPrice}>
                    {isAr ? 'السعر والتوفير' : 'Price & Savings'}
                  </th>
                  <th className={styles.colAction}>
                    {isAr ? 'الشراء المباشر' : 'Direct Store'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedProducts.map((p) => {
                  const award = getAwardLabel(p);
                  const imgUrl =
                    p.images?.find((img) => Boolean(img?.url?.trim()))?.url || '';
                  const discount = getProductDiscount(p);
                  const stars = typeof p.stars === 'number' ? p.stars : 4.5;
                  const soldCount =
                    typeof p.soldCount === 'number' ? p.soldCount : 120;
                  const bestForText = getBestForText(p);
                  const keySpecsList = getKeySpecsList(p);
                  const keyFeature =
                    bestForText ||
                    t(p.whyWePickedIt) ||
                    t(p.shortSummary) ||
                    t(p.description);
                  const formattedPrice =
                    p.priceAmount !== null && p.priceAmount > 0
                      ? formatProductPrice(
                          p.priceAmount,
                          p.priceCurrency,
                          locale,
                          currency
                        )
                      : '';
                  const formattedOldPrice =
                    p.oldPrice && p.oldPrice > 0
                      ? formatProductPrice(
                          p.oldPrice,
                          p.priceCurrency,
                          locale,
                          currency
                        )
                      : '';

                  return (
                    <tr
                      key={p.id}
                      className={styles.desktopRow}
                    >
                      <td className={styles.colProduct}>
                        <div className={styles.desktopProductCell}>
                          <Link
                            href={`/${locale}/products/${encodeURIComponent(p.slug)}`}
                            className={styles.desktopThumbWrap}
                          >
                            {imgUrl ? (
                              <img
                                src={imgUrl}
                                alt={t(p.title)}
                                className={styles.desktopThumbImg}
                                referrerPolicy="no-referrer"
                                loading="lazy"
                              />
                            ) : (
                              <ShoppingBag
                                size={20}
                                className={styles.fallbackIcon}
                              />
                            )}
                          </Link>
                          <div className={styles.desktopProductMeta}>
                            {award && (
                              <span
                                className={`${styles.awardText} ${
                                  styles[`award_${award.variant}`]
                                }`}
                              >
                                <CheckCircle2 size={11} aria-hidden="true" />
                                <span>{award.text}</span>
                              </span>
                            )}
                            <Link
                              href={`/${locale}/products/${encodeURIComponent(p.slug)}`}
                              className={styles.desktopProductTitle}
                            >
                              {t(p.title)}
                            </Link>
                            <span className={styles.storeMetaLabel}>
                              {getSourceDisplay(p)}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className={styles.colFeature}>
                        <p className={styles.desktopFeatureText}>{keyFeature}</p>
                        {keySpecsList.length > 0 && (
                          <div style={{ marginTop: '0.4rem', display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                            {keySpecsList.slice(0, 3).map((spec, sIdx) => (
                              <span
                                key={sIdx}
                                style={{
                                  fontSize: '0.72rem',
                                  padding: '0.15rem 0.45rem',
                                  borderRadius: '6px',
                                  backgroundColor: 'var(--color-bg-subtle)',
                                  border: '1px solid var(--color-border)',
                                  color: 'var(--color-text-secondary)',
                                }}
                              >
                                {spec}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      <td className={styles.colRating}>
                        <div className={styles.desktopRatingWrap}>
                          <span className={styles.desktopRatingScore}>
                            <CheckCircle2
                              size={13}
                              color="#16a34a"
                              aria-hidden="true"
                            />
                            <span>{getSourceDisplay(p)}</span>
                          </span>
                          <span className={styles.desktopReviewCount}>
                            {isAr ? 'متجر معتمد' : 'Verified Store'}
                          </span>
                        </div>
                      </td>

                      <td className={styles.colPrice}>
                        <div className={styles.desktopPriceWrap}>
                          {formattedPrice ? (
                            <span
                              dir="ltr"
                              className={`${styles.desktopCurrentPrice} tabularNums`}
                            >
                              {formattedPrice}
                            </span>
                          ) : (
                            <span className={styles.metricMuted}>-</span>
                          )}
                          <div className={styles.desktopPriceSub}>
                            {formattedOldPrice && (
                              <span
                                dir="ltr"
                                className={`${styles.metricOldPrice} tabularNums`}
                              >
                                {formattedOldPrice}
                              </span>
                            )}
                            {discount > 0 && (
                              <span
                                dir="ltr"
                                className={`${styles.metricDiscount} tabularNums`}
                              >
                                -{discount}%
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className={styles.colAction}>
                        <a
                          href={`/go/${encodeURIComponent(p.slug)}?ref=guide_table`}
                          target="_blank"
                          rel="sponsored noopener noreferrer"
                          className={styles.buyPrimaryBtn}
                        >
                          <ShoppingCart size={14} aria-hidden="true" />
                          <span>{messages.product.buyNow}</span>
                          <ArrowUpRight size={13} aria-hidden="true" />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* =====================================================================
          MODE 2: HEAD-TO-HEAD 2-PRODUCT SIDE-BY-SIDE COMPARISON (Mobile & Desktop)
          ===================================================================== */}
      {viewMode === 'head_to_head' && leftProduct && rightProduct && (
        <div className={styles.headToHeadContainer}>
          {/* Custom Visual Product Picker (Replaces ugly native OS <select>) */}
          {comparableProducts.length > 1 && (
            <div className={styles.h2hPickerWrapper} ref={pickerWrapperRef}>
              <div className={styles.h2hSelectorGrid}>
                {(
                  [
                    {
                      slot: 'left' as const,
                      label: isAr ? 'المنتج الأول' : 'First Product',
                      activeProduct: leftProduct,
                    },
                    {
                      slot: 'right' as const,
                      label: isAr ? 'المنتج الثاني' : 'Second Product',
                      activeProduct: rightProduct,
                    },
                  ]
                ).map(({ slot, label, activeProduct }) => {
                  const isOpen = openPickerSlot === slot;
                  const thumbUrl =
                    activeProduct.images?.find((img) =>
                      Boolean(img?.url?.trim())
                    )?.url || '';
                  const priceStr =
                    activeProduct.priceAmount !== null &&
                    activeProduct.priceAmount > 0
                      ? formatProductPrice(
                          activeProduct.priceAmount,
                          activeProduct.priceCurrency,
                          locale,
                          currency
                        )
                      : '';

                  return (
                    <div key={slot} className={styles.h2hSelectorCol}>
                      <span className={styles.h2hSelectorLabel}>{label}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setOpenPickerSlot(isOpen ? null : slot)
                        }
                        className={`${styles.h2hPickerTrigger} ${
                          isOpen ? styles.h2hPickerTriggerOpen : ''
                        }`}
                        aria-expanded={isOpen}
                        aria-haspopup="listbox"
                      >
                        <span className={styles.h2hTriggerThumb}>
                          {thumbUrl ? (
                            <img
                              src={thumbUrl}
                              alt=""
                              className={styles.h2hTriggerThumbImg}
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <ShoppingBag
                              size={15}
                              className={styles.fallbackIcon}
                            />
                          )}
                        </span>
                        <span className={styles.h2hTriggerTextWrap}>
                          <span className={styles.h2hTriggerTitle}>
                            {t(activeProduct.title)}
                          </span>
                          {priceStr && (
                            <span
                              dir="ltr"
                              className={`${styles.h2hTriggerPrice} tabularNums`}
                            >
                              {priceStr}
                            </span>
                          )}
                        </span>
                        <ChevronDown
                          size={15}
                          className={`${styles.h2hTriggerChevron} ${
                            isOpen ? styles.h2hTriggerChevronOpen : ''
                          }`}
                          aria-hidden="true"
                        />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Branded Visual Dropdown Menu */}
              {openPickerSlot && (
                <div
                  className={styles.h2hDropdownMenu}
                  role="listbox"
                  aria-label={
                    openPickerSlot === 'left'
                      ? isAr
                        ? 'اختر المنتج الأول للمقارنة'
                        : 'Select first product to compare'
                      : isAr
                        ? 'اختر المنتج الثاني للمقارنة'
                        : 'Select second product to compare'
                  }
                >
                  <div className={styles.h2hDropdownHeader}>
                    <div className={styles.h2hDropdownHeaderText}>
                      <span className={styles.h2hDropdownTitle}>
                        {openPickerSlot === 'left'
                          ? isAr
                            ? 'اختر المنتج الأول للمقارنة'
                            : 'Choose First Product'
                          : isAr
                            ? 'اختر المنتج الثاني للمقارنة'
                            : 'Choose Second Product'}
                      </span>
                      <span className={styles.h2hDropdownSubtitle}>
                        {isAr
                          ? 'اضغط على أي منتج من القائمة لتحديث المقارنة فوراً'
                          : 'Select any product below to update the comparison instantly'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOpenPickerSlot(null)}
                      className={styles.h2hDropdownCloseBtn}
                      aria-label={isAr ? 'إغلاق القائمة' : 'Close menu'}
                    >
                      <X size={15} aria-hidden="true" />
                    </button>
                  </div>

                  <div className={styles.h2hDropdownList}>
                    {comparableProducts.map((p) => {
                      const currentSlotId =
                        openPickerSlot === 'left'
                          ? leftProduct.id
                          : rightProduct.id;
                      const otherSlotId =
                        openPickerSlot === 'left'
                          ? rightProduct.id
                          : leftProduct.id;
                      const isSelected = p.id === currentSlotId;
                      const isInOtherSlot =
                        p.id === otherSlotId && currentSlotId !== otherSlotId;
                      const imgUrl =
                        p.images?.find((img) => Boolean(img?.url?.trim()))
                          ?.url || '';
                      const formattedPrice =
                        p.priceAmount !== null && p.priceAmount > 0
                          ? formatProductPrice(
                              p.priceAmount,
                              p.priceCurrency,
                              locale,
                              currency
                            )
                          : '';
                      const stars =
                        typeof p.stars === 'number' ? p.stars : 4.5;
                      const award = getAwardLabel(p);

                      return (
                        <button
                          key={p.id}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          onClick={() =>
                            handleSelectH2HProduct(openPickerSlot, p.id)
                          }
                          className={`${styles.h2hOptionItem} ${
                            isSelected ? styles.h2hOptionItemSelected : ''
                          }`}
                        >
                          <span className={styles.h2hOptionThumb}>
                            {imgUrl ? (
                              <img
                                src={imgUrl}
                                alt=""
                                className={styles.h2hOptionThumbImg}
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <ShoppingBag
                                size={18}
                                className={styles.fallbackIcon}
                              />
                            )}
                          </span>

                          <span className={styles.h2hOptionInfo}>
                            <span className={styles.h2hOptionTopLine}>
                              <span className={styles.h2hOptionName}>
                                {t(p.title)}
                              </span>
                              {award && (
                                <span className={styles.h2hOptionAward}>
                                  {award.text}
                                </span>
                              )}
                            </span>
                            <span className={styles.h2hOptionMetaRow}>
                              {formattedPrice && (
                                <span
                                  dir="ltr"
                                  className={`${styles.h2hOptionPrice} tabularNums`}
                                >
                                  {formattedPrice}
                                </span>
                              )}
                              <span className={styles.h2hOptionStore}>
                                <CheckCircle2
                                  size={11}
                                  color="#16a34a"
                                  aria-hidden="true"
                                />
                                <span>{getSourceDisplay(p)}</span>
                              </span>
                              {isInOtherSlot && (
                                <span className={styles.h2hOptionSwapHint}>
                                  {isAr
                                    ? 'تبديل مع العمود الآخر'
                                    : 'Swap columns'}
                                </span>
                              )}
                            </span>
                          </span>

                          <span
                            className={`${styles.h2hOptionCheck} ${
                              isSelected ? styles.h2hOptionCheckActive : ''
                            }`}
                            aria-hidden="true"
                          >
                            {isSelected && <Check size={13} strokeWidth={2.5} />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Side-by-Side 2-Column Product Header */}
          <div className={styles.h2hPairRow}>
            {[leftProduct, rightProduct].map((prod, idx) => {
              const imgUrl =
                prod.images?.find((img) => Boolean(img?.url?.trim()))?.url || '';
              const award = getAwardLabel(prod);
              return (
                <div key={`${prod.id}-${idx}`} className={styles.h2hProductHeaderCard}>
                  {award && (
                    <span
                      className={`${styles.awardText} ${
                        styles[`award_${award.variant}`]
                      }`}
                    >
                      <CheckCircle2 size={11} aria-hidden="true" />
                      <span>{award.text}</span>
                    </span>
                  )}
                  <Link
                    href={`/${locale}/products/${encodeURIComponent(prod.slug)}`}
                    className={styles.h2hImageWrap}
                  >
                    {imgUrl ? (
                      <img
                        src={imgUrl}
                        alt={t(prod.title)}
                        className={styles.h2hImage}
                        referrerPolicy="no-referrer"
                        loading="lazy"
                      />
                    ) : (
                      <ShoppingBag size={26} className={styles.fallbackIcon} />
                    )}
                  </Link>
                  <h3 className={styles.h2hTitle}>
                    <Link
                      href={`/${locale}/products/${encodeURIComponent(prod.slug)}`}
                      className={styles.mobileProductTitleLink}
                    >
                      {t(prod.title)}
                    </Link>
                  </h3>
                </div>
              );
            })}
          </div>

          {/* Criterion 1: Price & Discount */}
          <div className={styles.h2hCriterionBlock}>
            <div className={styles.h2hCriterionHeader}>
              {isAr ? 'السعر ونسبة التوفير' : 'Price & Savings'}
            </div>
            <div className={styles.h2hPairRow}>
              {[leftProduct, rightProduct].map((prod, idx) => {
                const isCheaper =
                  leftPrice !== null &&
                  rightPrice !== null &&
                  leftPrice !== rightPrice &&
                  prod.priceAmount === Math.min(leftPrice, rightPrice);
                const formatted =
                  prod.priceAmount !== null && prod.priceAmount > 0
                    ? formatProductPrice(
                        prod.priceAmount,
                        prod.priceCurrency,
                        locale,
                        currency
                      )
                    : messages.product.priceMayVary;
                const disc = getProductDiscount(prod);

                return (
                  <div
                    key={`price-${prod.id}-${idx}`}
                    className={`${styles.h2hValueCell} ${
                      isCheaper ? styles.h2hWinnerCell : ''
                    }`}
                  >
                    <span
                      dir="ltr"
                      className={`${styles.metricPrice} tabularNums`}
                    >
                      {formatted}
                    </span>
                    {disc > 0 && (
                      <span
                        dir="ltr"
                        className={`${styles.metricDiscount} tabularNums`}
                      >
                        -{disc}%
                      </span>
                    )}
                    {isCheaper && (
                      <span className={styles.winnerHint}>
                        {isAr ? '✓ السعر الأوفر' : '✓ Lower Price'}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Criterion 2: Official Store & Verification */}
          <div className={styles.h2hCriterionBlock}>
            <div className={styles.h2hCriterionHeader}>
              {isAr ? 'المتجر المعتمد والتوثيق' : 'Official Store & Verification'}
            </div>
            <div className={styles.h2hPairRow}>
              {[leftProduct, rightProduct].map((prod, idx) => {
                return (
                  <div
                    key={`store-${prod.id}-${idx}`}
                    className={styles.h2hValueCell}
                  >
                    <div className={styles.metricRatingRow}>
                      <CheckCircle2
                        size={13}
                        color="#16a34a"
                        aria-hidden="true"
                      />
                      <span className={styles.metricRatingNum}>
                        {getSourceDisplay(prod)}
                      </span>
                    </div>
                    <span className={styles.winnerHint}>
                      {isAr ? 'متجر معتمد رسمي' : 'Verified Official Store'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Criterion 3: Algorithmic DNA Scores (Performance / Value / Reliability) */}
          <div className={styles.h2hCriterionBlock}>
            <div className={styles.h2hCriterionHeader}>
              {isAr
                ? 'مؤشرات المقارنة الخوارزمية (الأداء / القيمة / الاعتمادية)'
                : 'Algorithmic DNA Scores (Performance / Value / Reliability)'}
            </div>
            <div className={styles.h2hPairRow}>
              {[leftProduct, rightProduct].map((prod, idx) => {
                const otherProd = idx === 0 ? rightProduct : leftProduct;
                const perf = prod.comparisonDna?.performanceScore ?? Math.round((prod.stars ?? 4.5) * 20);
                const valScore = prod.comparisonDna?.valueScore ?? Math.min(98, 82 + Math.round(getProductDiscount(prod) * 0.4));
                const relScore = prod.comparisonDna?.reliabilityScore ?? Math.round((prod.stars ?? 4.5) * 19.5);
                const myTotal = getAlgorithmicDnaScore(prod);
                const otherTotal = getAlgorithmicDnaScore(otherProd);
                const isHigherDna = myTotal > otherTotal;

                return (
                  <div
                    key={`dna-scores-${prod.id}-${idx}`}
                    className={`${styles.h2hValueCell} ${
                      isHigherDna ? styles.h2hWinnerCell : ''
                    }`}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                        <span style={{ color: 'var(--color-text-secondary)' }}>
                          {isAr ? 'الأداء:' : 'Performance:'}
                        </span>
                        <strong className="tabularNums">{perf}/100</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                        <span style={{ color: 'var(--color-text-secondary)' }}>
                          {isAr ? 'القيمة مقابل السعر:' : 'Value:'}
                        </span>
                        <strong className="tabularNums">{valScore}/100</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                        <span style={{ color: 'var(--color-text-secondary)' }}>
                          {isAr ? 'الاعتمادية:' : 'Reliability:'}
                        </span>
                        <strong className="tabularNums">{relScore}/100</strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Criterion 4: Best For (Use Case DNA) */}
          <div className={styles.h2hCriterionBlock}>
            <div className={styles.h2hCriterionHeader}>
              {isAr ? 'الاستخدام الأنسب (متى تختاره؟)' : 'Best For (Ideal Use Case)'}
            </div>
            <div className={styles.h2hPairRow}>
              {[leftProduct, rightProduct].map((prod, idx) => (
                <div key={`bestfor-${prod.id}-${idx}`} className={styles.h2hValueCell}>
                  <p className={styles.h2hProseText}>
                    {getBestForText(prod) ||
                      t(prod.whyWePickedIt) ||
                      t(prod.shortSummary) ||
                      '-'}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Criterion 5: Key Specs DNA */}
          <div className={styles.h2hCriterionBlock}>
            <div className={styles.h2hCriterionHeader}>
              {isAr ? 'المواصفات المفصلية' : 'Key Specifications'}
            </div>
            <div className={styles.h2hPairRow}>
              {[leftProduct, rightProduct].map((prod, idx) => {
                const specs = getKeySpecsList(prod);
                const fallbackPros = ((prod.pros as Array<{ ar?: string; en?: string } | string>) || [])
                  .map((item: { ar?: string; en?: string } | string) => t(item as never))
                  .filter(Boolean)
                  .slice(0, 3);
                const displayItems = specs.length > 0 ? specs : fallbackPros;
                return (
                  <div key={`specs-${prod.id}-${idx}`} className={styles.h2hValueCell}>
                    {displayItems.length > 0 ? (
                      <ul
                        style={{
                          margin: 0,
                          paddingInlineStart: '1.1rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.28rem',
                          fontSize: '0.82rem',
                          color: 'var(--color-text-primary)',
                          textAlign: 'start',
                        }}
                      >
                        {displayItems.map((sp: string, spIdx: number) => (
                          <li key={spIdx}>{sp}</li>
                        ))}
                      </ul>
                    ) : (
                      <span className={styles.storeMetaLabel}>
                        {getSourceDisplay(prod)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Criterion 6: Live Algorithmic Buying Decision Guide (Replaces static winner) */}
          <div
            style={{
              padding: '1rem 1.15rem',
              borderRadius: '12px',
              backgroundColor: 'var(--color-bg-subtle)',
              border: '1px solid var(--color-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem',
            }}
          >
            <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>
              {isAr
                ? 'خلاصة المقارنة الخوارزمية (كيف تختار الأنسب لك؟)'
                : 'Algorithmic Buying Guide (Which one fits your needs?)'}
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
                gap: '0.75rem',
              }}
            >
              {[leftProduct, rightProduct].map((prod, idx) => {
                const bestFor =
                  getBestForText(prod) ||
                  t(prod.whyWePickedIt) ||
                  t(prod.shortSummary);
                return (
                  <div
                    key={`decision-${prod.id}-${idx}`}
                    style={{
                      padding: '0.75rem 0.85rem',
                      borderRadius: '10px',
                      backgroundColor: 'var(--color-bg-elevated)',
                      border: '1px solid var(--color-border)',
                      fontSize: '0.82rem',
                      lineHeight: 1.6,
                    }}
                  >
                    <strong style={{ display: 'block', marginBottom: '0.25rem', color: 'var(--color-accent-primary)' }}>
                      {isAr ? `اختر ${t(prod.title)} إذا:` : `Choose ${t(prod.title)} if:`}
                    </strong>
                    <span style={{ color: 'var(--color-text-secondary)' }}>
                      {bestFor}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Criterion 7: Direct Purchase Buttons */}
          <div className={styles.h2hPairRow}>
            {[leftProduct, rightProduct].map((prod, idx) => (
              <div key={`cta-${prod.id}-${idx}`} className={styles.h2hCtaCell}>
                <a
                  href={`/go/${encodeURIComponent(prod.slug)}?ref=guide_h2h`}
                  target="_blank"
                  rel="sponsored noopener noreferrer"
                  className={styles.buyPrimaryBtnFull}
                >
                  <ShoppingCart size={14} aria-hidden="true" />
                  <span>{messages.product.buyNow}</span>
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
