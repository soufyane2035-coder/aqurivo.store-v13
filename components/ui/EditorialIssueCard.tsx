'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, ArrowRight, Clock, Layers } from 'lucide-react';
import type { Article, Product } from '@/types';
import { useI18n } from '@/i18n/I18nProvider';
import { formatCalendarDate, formatNumber } from '@/lib/format';
import styles from './EditorialIssueCard.module.css';

export interface EditorialIssueCardProps {
  article: Article;
  indexNumber?: number;
  matchedProduct?: Product;
}

export function EditorialIssueCard({
  article,
  matchedProduct,
}: EditorialIssueCardProps) {
  const { locale, t } = useI18n();
  const isAr = locale === 'ar';
  const title = t(article.title);
  const excerpt = t(article.excerpt);
  const categoryName = t(article.categoryName);
  const formattedDate = formatCalendarDate(article.publishedAt, locale);
  const href = `/${locale}/guides/${encodeURIComponent(article.slug)}`;
  const matchedProductTitle = matchedProduct ? t(matchedProduct.title) : '';

  const comparedCount = Array.isArray(article.relatedProductIds)
    ? article.relatedProductIds.filter(Boolean).length
    : 0;

  return (
    <Link href={href} prefetch={false} className={styles.card}>
      {/* Compact Studio Thumbnail */}
      <div className={styles.thumbFrame}>
        <Image
          src={article.coverImage || '/images/hero-bg.jpg'}
          alt={title}
          fill
          sizes="(max-width: 768px) 96px, 112px"
          className={styles.thumbImage}
          referrerPolicy="no-referrer"
          unoptimized={Boolean(article.coverImage && article.coverImage.startsWith('http'))}
        />
      </div>

      {/* Structured Guide Content */}
      <div className={styles.contentCol}>
        <div className={styles.metaTopRow}>
          {categoryName && (
            <span className={styles.categoryBadge}>{categoryName}</span>
          )}

          <span className={styles.guideScopeBadge}>
            <Layers size={11} aria-hidden="true" />
            <span>
              {matchedProductTitle
                ? isAr
                  ? `مراجعة شاملة ومقارنة`
                  : `In-Depth Product Review`
                : comparedCount > 1
                  ? isAr
                    ? `مقارنة ${formatNumber(comparedCount, locale)} منتجات`
                    : `${formatNumber(comparedCount, locale)} Products`
                  : isAr
                    ? 'دليل شراء ومقارنة'
                    : 'Buying Guide'}
            </span>
          </span>

          <span className={`${styles.readTime} tabularNums`}>
            <Clock size={11} aria-hidden="true" />
            <span>
              {formatNumber(article.readingTimeMinutes || 5, locale)}{' '}
              {isAr ? 'د' : 'm'}
            </span>
          </span>
        </div>

        <h3 className={styles.title}>{title}</h3>

        {excerpt && <p className={styles.excerpt}>{excerpt}</p>}

        <div className={styles.footerRow}>
          {formattedDate ? (
            <span className={`${styles.dateText} tabularNums`}>
              {formattedDate}
            </span>
          ) : (
            <span />
          )}

          <span className={styles.actionPill}>
            <span>{isAr ? 'تصفح المقارنة' : 'Open Guide'}</span>
            {isAr ? (
              <ArrowLeft size={13} aria-hidden="true" />
            ) : (
              <ArrowRight size={13} aria-hidden="true" />
            )}
          </span>
        </div>
      </div>
    </Link>
  );
}
