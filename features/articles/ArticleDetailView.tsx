'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { Clock, List } from 'lucide-react';
import type { Article, Product } from '@/types';
import { useI18n } from '@/i18n/I18nProvider';
import { useSaved } from '@/features/saved/SavedProvider';
import { formatCalendarDate } from '@/lib/format';
import { SiteHeader } from '@/components/sections/SiteHeader';
import { SiteFooter } from '@/components/sections/SiteFooter';
import { SignatureMotif } from '@/components/ui/SignatureMotif';
import { ProductCard } from '@/components/ui/ProductCard';
import styles from './ArticleDetailView.module.css';

interface ArticleDetailViewProps {
  article: Article;
  relatedProducts: Product[];
}

interface TocItem {
  id: string;
  text: string;
}

/**
 * Injects deterministic section IDs into <h2> and <h3> tags and extracts a clean
 * Table of Contents list for smooth keyboard and pointer navigation.
 */
function buildContentWithToc(rawHtml: string): { htmlWithIds: string; toc: TocItem[] } {
  const toc: TocItem[] = [];
  let index = 0;

  const htmlWithIds = rawHtml.replace(
    /<(h[23])([^>]*)>([\s\S]*?)<\/\1>/gi,
    (_match, tag: string, attrs: string, inner: string) => {
      index += 1;
      const id = `guide-section-${index}`;
      const plainText = inner.replace(/<[^>]*>/g, '').trim();
      if (plainText) {
        toc.push({ id, text: plainText });
      }
      return `<${tag}${attrs} id="${id}">${inner}</${tag}>`;
    }
  );

  return { htmlWithIds, toc };
}

export function ArticleDetailView({ article, relatedProducts }: ArticleDetailViewProps) {
  const { locale, messages, t } = useI18n();
  const { isSaved, toggleSave } = useSaved();

  const title = t(article.title);
  const excerpt = t(article.excerpt);
  const categoryName = t(article.categoryName);
  const rawBody = t(article.contentHtml);
  const formattedPublished = formatCalendarDate(article.publishedAt, locale);

  const { htmlWithIds, toc } = useMemo(() => buildContentWithToc(rawBody), [rawBody]);

  return (
    <div className={styles.pageShell}>
      <SiteHeader />

      <main id="main-content" className={`siteContainer ${styles.main}`}>
        {/* Breadcrumb */}
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href="/blog" className={styles.breadcrumbLink}>
            {messages.nav.guides}
          </Link>
          <span aria-hidden="true">/</span>
          <span className={styles.breadcrumbCurrent}>{title}</span>
        </nav>

        {/* Article Header */}
        <header className={`${styles.articleHeader} revealUp`}>
          <div className={styles.metaRow}>
            <Link
              href={`/categories/${encodeURIComponent(article.categorySlug)}`}
              className={styles.categoryBadge}
            >
              {categoryName}
            </Link>
            <span aria-hidden="true">·</span>
            <span className={`${styles.readTime} tabularNums`}>
              <Clock size={14} aria-hidden="true" />
              <span>
                {article.readingTimeMinutes}{' '}
                {locale === 'ar' ? 'دقائق قراءة' : 'min read'}
              </span>
            </span>
            {formattedPublished && (
              <>
                <span aria-hidden="true">·</span>
                <span className="tabularNums">{formattedPublished}</span>
              </>
            )}
          </div>

          <h1 className={styles.articleTitle}>{title}</h1>
          <p className={styles.articleExcerpt}>{excerpt}</p>
        </header>

        {/* Two-Column Editorial Layout: Sticky TOC + 68ch Prose */}
        <div className={styles.editorialLayout}>
          {(toc.length > 0 || relatedProducts.length > 0) && (
            <aside className={styles.tocSidebar} aria-label="Table of Contents">
              <div className={styles.tocBox}>
                <h2 className={styles.tocTitle}>
                  <List size={15} aria-hidden="true" />
                  <span>{locale === 'ar' ? 'محتويات الدليل' : 'In This Guide'}</span>
                </h2>
                <ul className={styles.tocList}>
                  {toc.map((item) => (
                    <li key={item.id}>
                      <a href={`#${item.id}`} className={styles.tocLink}>
                        {item.text}
                      </a>
                    </li>
                  ))}
                  {relatedProducts.length > 0 && (
                    <li>
                      <a href="#recommended-products" className={styles.tocLink}>
                        {locale === 'ar'
                          ? 'المنتجات الموصى بها في هذا الدليل'
                          : 'Recommended Products'}
                      </a>
                    </li>
                  )}
                </ul>
              </div>
            </aside>
          )}

          <article className={styles.proseColumn}>
            <div
              className={styles.proseContent}
              dangerouslySetInnerHTML={{ __html: htmlWithIds }}
            />
          </article>
        </div>

        {/* Embedded Recommended Products */}
        {relatedProducts.length > 0 && (
          <section id="recommended-products" className={styles.recommendedSection}>
            <SignatureMotif
              index="02"
              label={
                locale === 'ar'
                  ? 'المنتجات الموصى بها في هذا الدليل'
                  : 'Recommended Products in This Guide'
              }
            />
            <div className={styles.productsGrid}>
              {relatedProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  isSaved={isSaved(product.id)}
                  onToggleSave={toggleSave}
                  refContext={`article_${article.slug}`}
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
