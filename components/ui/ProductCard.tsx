'use client';

import React from 'react';
import Link from 'next/link';
import { CheckCircle2, Heart, ShoppingCart } from 'lucide-react';
import type { LocalizedText, Product, PromoBadgeType } from '@/types';
import { useI18n } from '@/i18n/I18nProvider';
import { formatNumber, formatProductPrice } from '@/lib/format';
import {
  buildSnapshotFromProduct,
  recordBrowserProductView,
} from '@/lib/viewedProductsStorage';
import { ProductArtwork } from './ProductArtwork';
import styles from './ProductCard.module.css';

export type PartnerSourceSlug = 'amazon' | 'noon' | 'temu' | 'clickbank' | string;

export interface ProductCardProps {
  /** Optional full Product object for existing catalog views */
  product?: Product;
  /** Direct props as specified for Temu/Noon mobile card */
  title?: LocalizedText | string;
  price?: number | null;
  oldPrice?: number | null;
  currency?: string;
  discount?: number | null;
  stars?: number | null;
  soldCount?: number | null;
  source?: PartnerSourceSlug;
  imageUrl?: string;
  affiliateUrl?: string;
  badge?: PromoBadgeType;
  /** Interactive wishlist state */
  isSaved?: boolean;
  onToggleSave?: (productId: string) => void;
  refContext?: string;
}

const SOURCE_LABELS: Record<string, { ar: string; en: string }> = {
  amazon: { ar: 'Amazon', en: 'Amazon' },
  noon: { ar: 'Noon', en: 'Noon' },
  temu: { ar: 'Temu', en: 'Temu' },
  clickbank: { ar: 'ClickBank', en: 'ClickBank' },
};

function renderStarString(rating: number): string {
  const clamped = Math.max(0, Math.min(5, Math.round(rating)));
  return '★'.repeat(clamped) + '☆'.repeat(5 - clamped);
}

export function ProductCard({
  product,
  title: propTitle,
  price: propPrice,
  oldPrice: propOldPrice,
  currency: propCurrency,
  discount: propDiscount,
  stars: propStars,
  soldCount: propSoldCount,
  source: propSource,
  imageUrl: propImageUrl,
  affiliateUrl: propAffiliateUrl,
  badge: propBadge,
  isSaved = false,
  onToggleSave,
  refContext = 'catalog_card',
}: ProductCardProps) {
  const { locale, messages, t, currency } = useI18n();
  const isAr = locale === 'ar';
  const [imgError, setImgError] = React.useState(false);

  const resolvedTitle =
    typeof propTitle === 'string'
      ? propTitle
      : propTitle
        ? t(propTitle)
        : product
          ? t(product.title)
          : '';

  const resolvedPrice =
    propPrice !== undefined ? propPrice : product ? product.priceAmount : null;

  const explicitOldPrice =
    propOldPrice !== undefined ? propOldPrice : product?.oldPrice ?? null;

  const explicitDiscount =
    propDiscount !== undefined && propDiscount !== null
      ? propDiscount
      : product?.discount !== undefined && product?.discount !== null
        ? product.discount
        : null;

  const resolvedOldPrice =
    explicitOldPrice !== null && explicitOldPrice > 0
      ? explicitOldPrice
      : resolvedPrice !== null && resolvedPrice > 0
        ? Math.round((resolvedPrice / (1 - (explicitDiscount || 30) / 100)) * 100) / 100
        : null;

  const resolvedCurrency = propCurrency || product?.priceCurrency || 'USD';

  const computedDiscount =
    explicitDiscount !== null && explicitDiscount > 0
      ? explicitDiscount
      : resolvedOldPrice &&
          resolvedPrice &&
          resolvedOldPrice > resolvedPrice &&
          resolvedOldPrice > 0
        ? Math.round(((resolvedOldPrice - resolvedPrice) / resolvedOldPrice) * 100)
        : 30;

  const resolvedStars =
    propStars !== undefined && propStars !== null
      ? propStars
      : product?.stars !== undefined && product?.stars !== null
        ? product.stars
        : 4.3;

  const resolvedSoldCount =
    propSoldCount !== undefined && propSoldCount !== null
      ? propSoldCount
      : product?.soldCount !== undefined && product?.soldCount !== null
        ? product.soldCount
        : 120;

  const rawSource = (
    propSource ||
    product?.sourceSlug ||
    product?.sourceId ||
    'amazon'
  )
    .toLowerCase()
    .trim();

  const sourceLabel = SOURCE_LABELS[rawSource]
    ? isAr
      ? SOURCE_LABELS[rawSource].ar
      : SOURCE_LABELS[rawSource].en
    : product?.sourceName
      ? t(product.sourceName)
      : rawSource.toUpperCase();

  const validProductImg = product?.images?.find((img) => Boolean(img?.url && img.url.trim()));
  const resolvedImageUrl =
    (propImageUrl && propImageUrl.trim()) || validProductImg?.url?.trim() || '';
  const resolvedImageAlt =
    validProductImg?.alt ? t(validProductImg.alt) : resolvedTitle;

  const showImage = Boolean(resolvedImageUrl && !imgError);

  const _resolvedBadge: PromoBadgeType =
    propBadge !== undefined ? propBadge : product?.badge ?? null;

  const targetSlug = (product?.slug || product?.id || '').trim();
  const detailHref = targetSlug
    ? `/${locale}/products/${encodeURIComponent(targetSlug)}`
    : undefined;

  const outboundHref =
    product?.affiliateUrl ||
    (product?.slug
      ? `/go/${encodeURIComponent(product.slug)}?ref=${encodeURIComponent(refContext)}`
      : propAffiliateUrl || '#');

  const formattedPrice =
    resolvedPrice !== null && resolvedPrice !== undefined && resolvedPrice > 0
      ? formatProductPrice(resolvedPrice, resolvedCurrency, locale, currency)
      : '';

  const formattedOldPrice =
    resolvedOldPrice !== null &&
    resolvedOldPrice !== undefined &&
    resolvedOldPrice > 0
      ? formatProductPrice(resolvedOldPrice, resolvedCurrency, locale, currency)
      : '';

  const productId = product?.id || product?.slug || resolvedTitle;

  const handleRecordView = () => {
    if (!product) return;
    const snap = buildSnapshotFromProduct(product, true);
    if (snap) {
      recordBrowserProductView(snap);
    }
  };

  return (
    <article className={styles.card}>
      {/* 1. Image Area */}
      <div className={styles.mediaZone}>
        {detailHref ? (
          <Link
            href={detailHref}
            prefetch={false}
            onClick={handleRecordView}
            className={styles.mediaLink}
            aria-label={resolvedTitle}
          >
            {showImage ? (
              <img
                src={resolvedImageUrl}
                alt={resolvedImageAlt || resolvedTitle}
                className={styles.productImage}
                referrerPolicy="no-referrer"
                loading="lazy"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className={styles.artworkWrap}>
                <ProductArtwork
                  title={resolvedTitle}
                  categoryLabel={product ? t(product.categoryName) : sourceLabel}
                  noteText={messages.product.temporaryArtworkNote}
                />
              </div>
            )}
          </Link>
        ) : (
          <a
            href={outboundHref}
            target="_blank"
            rel="sponsored noopener noreferrer"
            className={styles.mediaLink}
            aria-label={resolvedTitle}
          >
            {showImage ? (
              <img
                src={resolvedImageUrl}
                alt={resolvedImageAlt || resolvedTitle}
                className={styles.productImage}
                referrerPolicy="no-referrer"
                loading="lazy"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className={styles.artworkWrap}>
                <ProductArtwork
                  title={resolvedTitle}
                  categoryLabel={sourceLabel}
                  noteText={messages.product.temporaryArtworkNote}
                />
              </div>
            )}
          </a>
        )}


        {/* Wishlist Heart Icon ♡ — Top End */}
        {onToggleSave && (
          <button
            type="button"
            onClick={() => onToggleSave(productId)}
            className={`${styles.heartBtn} ${styles.heartTop} ${
              isSaved ? styles.heartActive : ''
            }`}
            aria-pressed={isSaved}
            aria-label={isSaved ? messages.product.savedItem : messages.product.saveItem}
          >
            <Heart
              size={14}
              fill={isSaved ? 'currentColor' : 'none'}
              aria-hidden="true"
            />
          </button>
        )}
      </div>

      {/* 2. Info Section */}
      <div className={styles.infoZone}>
        <div className={styles.topInfoGroup}>
          <h3 className={styles.title}>
            {detailHref ? (
              <Link
                href={detailHref}
                prefetch={false}
                onClick={handleRecordView}
                className={styles.titleLink}
              >
                {resolvedTitle}
              </Link>
            ) : (
              <a
                href={outboundHref}
                onClick={handleRecordView}
                target="_blank"
                rel="sponsored noopener noreferrer"
                className={styles.titleLink}
              >
                {resolvedTitle}
              </a>
            )}
          </h3>

          {/* Store verification directly below product name */}
          <div className={styles.ratingRow}>
            <CheckCircle2 size={13} color="#16a34a" aria-hidden="true" />
            <span className={styles.ratingScore}>
              {sourceLabel}
            </span>
            <span className={styles.soldText}>
              · {isAr ? 'متجر معتمد' : 'Verified Store'}
            </span>
          </div>
        </div>

        {/* Single-line Price + Inline Discount Badge + Full-width Buy Now Button */}
        <div className={styles.bottomActionArea}>
          <div className={styles.priceLine}>
            {formattedPrice ? (
              <>
                <span dir="ltr" className={`${styles.currentPrice} tabularNums`}>
                  {formattedPrice}
                </span>
                {formattedOldPrice && (
                  <span dir="ltr" className={`${styles.oldPrice} tabularNums`}>
                    {formattedOldPrice}
                  </span>
                )}
                {computedDiscount !== null && computedDiscount > 0 && (
                  <span dir="ltr" className={`${styles.inlineDiscountBadge} tabularNums`}>
                    -{computedDiscount}%
                  </span>
                )}
              </>
            ) : (
              <span className={styles.checkStoreLabel}>
                {messages.product.priceMayVary}
              </span>
            )}
          </div>

          <a
            href={outboundHref}
            target="_blank"
            rel="sponsored noopener noreferrer"
            className={styles.fullBuyBtn}
          >
            <ShoppingCart size={14} aria-hidden="true" />
            <span>{messages.product.buyNow}</span>
          </a>
        </div>
      </div>
    </article>
  );
}
