'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  ChevronDown,
  Clock,
  List,
  ShieldCheck,
} from 'lucide-react';
import type { Article, Product } from '@/types';
import { useI18n } from '@/i18n/I18nProvider';
import { useSaved } from '@/features/saved/SavedProvider';
import { formatCalendarDate, formatProductPrice } from '@/lib/format';
import { SiteHeader } from '@/components/sections/SiteHeader';
import { SiteFooter } from '@/components/sections/SiteFooter';
import { SignatureMotif } from '@/components/ui/SignatureMotif';
import { ProductCard } from '@/components/ui/ProductCard';
import { ProductComparisonMatrix } from '@/components/ui/ProductComparisonMatrix';
import styles from './GuideDetailView.module.css';

interface GuideDetailViewProps {
  article: Article;
  relatedProducts: Product[];
}

interface TocItem {
  id: string;
  text: string;
}

function extractYouTubeEmbedId(url: string): string | null {
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/i
  );
  return m ? m[1] : null;
}

function buildContentChunksWithToc(
  rawHtml: string,
  locale: string
): {
  chunks: string[];
  toc: TocItem[];
} {
  const toc: TocItem[] = [];
  let index = 0;

  // Normalize full aqurivo.store / aqurivo.com product links to current locale relative paths
  // and ensure video links are never styled as affiliate CTA links
  const normalizedLinksHtml = rawHtml
    .replace(
      /https?:\/\/(?:www\.)?aqurivo\.(?:store|com)\/(?:(?:ar|en)\/)?products\/([^/?#\s"'<>]+)/gi,
      `/${locale}/products/$1`
    )
    .replace(
      /<p[^>]*>\s*<a\b[^>]*href\s*=\s*(['"])(https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)\/[^'"]+)\1[^>]*>([\s\S]*?)<\/a>\s*<\/p>/gi,
      (fullMatch, _q: string, href: string, innerText: string) => {
        const ytId = extractYouTubeEmbedId(href);
        if (!ytId) return fullMatch;
        const cleanCaption = innerText.replace(/<[^>]*>/g, '').replace(/↗/g, '').trim();
        return `<figure><iframe src="https://www.youtube.com/embed/${ytId}" title="${cleanCaption || 'Product Video'}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>${cleanCaption ? `<figcaption>${cleanCaption}</figcaption>` : ''}</figure>`;
      }
    )
    .replace(
      /<a\b([^>]*href\s*=\s*(['"])https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)\/[^'"]+\2[^>]*)>/gi,
      (_fullTag, attrs: string) => {
        const cleanedAttrs = attrs
          .replace(/\bclass\s*=\s*(['"])[^'"]*affiliate-cta-link[^'"]*\1/gi, '')
          .replace(/\bdata-affiliate-cta\s*=\s*(['"])[^'"]*\1/gi, '')
          .replace(/\bdata-cta-color\s*=\s*(['"])[^'"]*\1/gi, '');
        return `<a${cleanedAttrs}>`;
      }
    )
    .replace(
      /<a\b([^>]*data-cta-color\s*=\s*(['"])(#[0-9a-fA-F]{3,6})\2[^>]*)>/gi,
      (fullTag, attrs: string, _quote: string, hexColor: string) => {
        if (/style\s*=\s*(['"])[^'"]*--cta-color/i.test(attrs)) {
          return fullTag;
        }
        return `<a${attrs} style="--cta-color: ${hexColor};">`;
      }
    )
    .replace(/(<a\b[^>]*>[\s\S]*?)\s*↗(\s*<\/a>)/gi, '$1$2')
    .replace(
      /<p[^>]*>\s*(?:AQURIVO may earn a commission|قد تكسب AQURIVO عمولة)[\s\S]*?<\/p>/gi,
      ''
    );

  const htmlWithIds = normalizedLinksHtml.replace(
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

  // Split by <h2 so we can interleave inline product cards naturally between paragraphs/sections
  const rawParts = htmlWithIds.split(/(?=<h2\b)/i).filter((p) => p.trim().length > 0);
  const chunks = rawParts.length > 0 ? rawParts : [htmlWithIds];

  return { chunks, toc };
}

export function GuideDetailView({
  article,
  relatedProducts,
}: GuideDetailViewProps) {
  const { locale, messages, t } = useI18n();
  const { isSaved, toggleSave } = useSaved();
  const isAr = locale === 'ar';

  const title = t(article.title);
  const excerpt = t(article.excerpt);
  const categoryName = t(article.categoryName);
  const rawBody = t(article.contentHtml);
  const formattedPublished = formatCalendarDate(article.publishedAt, locale);
  const authorName = article.authorName || 'AQURIVO Editorial Team';
  const faqItems = article.faqItems || [];

  const { chunks, toc } = useMemo(
    () => buildContentChunksWithToc(rawBody, locale),
    [rawBody, locale]
  );

  const editorVerdictText = useMemo(() => {
    if (article.editorVerdict) {
      const custom = t(article.editorVerdict);
      if (custom && custom.trim()) return custom.trim();
    }
    return isAr
      ? 'تم تدقيق واختيار هذه المنتجات بناءً على الجودة والموثوقية وتجارب المشترين الفعلية. تأكد دائماً من مراجعة السعر وتفاصيل الشحن من المتجر الرسمي قبل إتمام طلبك.'
      : 'Every recommendation in this guide has been verified for real-world build quality, merchant authenticity, and user satisfaction. Be sure to check live availability and shipping options at the official store before purchase.';
  }, [article.editorVerdict, isAr, t]);

  return (
    <div className={styles.pageShell} dir={isAr ? 'rtl' : 'ltr'}>
      <SiteHeader />

      <main id="main-content" className={`siteContainer ${styles.main}`}>
        {/* Breadcrumbs */}
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href={`/${locale}`} className={styles.breadcrumbLink}>
            {messages.nav.home}
          </Link>
          <span aria-hidden="true">/</span>
          <Link href={`/${locale}/guides`} className={styles.breadcrumbLink}>
            {messages.nav.guides}
          </Link>
          <span aria-hidden="true">/</span>
          <span className={styles.breadcrumbCurrent}>{title}</span>
        </nav>

        {/* Article Header */}
        <header className={styles.articleHeader}>
          <div className={styles.metaRow}>
            <Link
              href={`/${locale}/categories/${encodeURIComponent(article.categorySlug)}`}
              className={styles.categoryBadge}
            >
              {categoryName}
            </Link>
            <span aria-hidden="true">·</span>
            <span>{authorName}</span>
            <span aria-hidden="true">·</span>
            <span className={`${styles.readTime} tabularNums`}>
              <Clock size={14} aria-hidden="true" />
              <span>
                {article.readingTimeMinutes}{' '}
                {isAr ? 'دقائق قراءة' : 'min read'}
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

        {/* Editorial Layout: Table of Contents + Prose */}
        <div className={styles.editorialLayout}>
          {(toc.length > 0 || relatedProducts.length > 0 || faqItems.length > 0) && (
            <aside className={styles.tocSidebar} aria-label="Table of Contents">
              <div className={styles.tocBox}>
                <h2 className={styles.tocTitle}>
                  <List size={15} aria-hidden="true" />
                  <span>{isAr ? 'محتويات الدليل' : 'In This Guide'}</span>
                </h2>
                <ul className={styles.tocList}>
                  {toc.map((item) => (
                    <li key={item.id}>
                      <a href={`#${item.id}`} className={styles.tocLink}>
                        {item.text}
                      </a>
                    </li>
                  ))}
                  {relatedProducts.length > 1 && (
                    <li>
                      <a href="#quick-comparison" className={styles.tocLink}>
                        {isAr ? 'جدول المقارنة التفاعلي' : 'Comparison Table'}
                      </a>
                    </li>
                  )}
                  {faqItems.length > 0 && (
                    <li>
                      <a href="#guide-faq" className={styles.tocLink}>
                        {isAr ? 'الأسئلة الشائعة' : 'Frequently Asked Questions'}
                      </a>
                    </li>
                  )}
                  {relatedProducts.length > 0 && (
                    <li>
                      <a href="#recommended-products" className={styles.tocLink}>
                        {isAr ? 'المنتجات الموصى بها' : 'Recommended Products'}
                      </a>
                    </li>
                  )}
                </ul>
              </div>
            </aside>
          )}

          <article className={styles.proseColumn}>
            {/* Standardized Editorial Affiliate Disclosure */}
            <div
              className={styles.affiliateDisclosureBanner}
              role="note"
              aria-label={isAr ? 'إفصاح الشفافية والعمولة' : 'Affiliate Disclosure'}
            >
              <ShieldCheck
                size={16}
                className={styles.affiliateDisclosureIcon}
                aria-hidden="true"
              />
              <p className={styles.affiliateDisclosureText}>
                {isAr
                  ? 'قد تكسب AQURIVO عمولة تسويقية من عمليات الشراء المؤهلة التي تتم عبر هذا الرابط، دون أي تأثير على معاييرنا التحريرية المتبعة في تقييم المنتج.'
                  : 'AQURIVO may earn a commission from qualifying purchases made through this link, without changing the criteria used to evaluate the product.'}
              </p>
            </div>

            {/* Main Editorial Body with Inline Product Cards Between Sections */}
            {chunks.map((chunkHtml, idx) => {
              const inlineProduct = relatedProducts[idx] || null;
              return (
                <React.Fragment key={idx}>
                  <div
                    className={styles.proseContent}
                    dangerouslySetInnerHTML={{ __html: chunkHtml }}
                  />

                  {inlineProduct && (
                    <div className={styles.inlineProductCard}>
                      <div className={styles.inlineProductInfo}>
                        {inlineProduct.images?.[0]?.url && (
                          <img
                            src={inlineProduct.images[0].url}
                            alt={t(inlineProduct.title)}
                            className={styles.inlineProductThumb}
                            referrerPolicy="no-referrer"
                          />
                        )}
                        <div className={styles.inlineProductMeta}>
                          <span className={styles.inlineProductKicker}>
                            {isAr ? 'منتج موصى به في هذا القسم' : 'Featured Pick'}
                          </span>
                          <Link
                            href={`/${locale}/products/${encodeURIComponent(inlineProduct.slug)}`}
                            className={styles.inlineProductTitle}
                          >
                            {t(inlineProduct.title)}
                          </Link>
                          <p className={styles.inlineProductSummary}>
                            {t(inlineProduct.shortSummary)}
                          </p>
                        </div>
                      </div>

                      <div className={styles.inlineProductActions}>
                        {inlineProduct.priceAmount !== null && (
                          <span className={`${styles.topPickPrice} tabularNums`}>
                            {formatProductPrice(
                              inlineProduct.priceAmount,
                              inlineProduct.priceCurrency,
                              locale
                            )}
                          </span>
                        )}
                        <a
                          href={`/go/${encodeURIComponent(inlineProduct.slug)}?ref=guide_inline`}
                          target="_blank"
                          rel="sponsored noopener noreferrer"
                          className={styles.tableBuyBtn}
                        >
                          <span>{isAr ? 'اشترِ الآن' : 'Buy Now'}</span>
                          <ArrowUpRight size={13} aria-hidden="true" />
                        </a>
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}

            {/* Interactive Smart Comparison Matrix */}
            {relatedProducts.length > 1 && (
              <ProductComparisonMatrix
                products={relatedProducts}
              />
            )}

            {/* Editor's Verdict / Final Recommendation */}
            <div className={styles.verdictBox}>
              <h2 className={styles.verdictTitle}>
                {isAr
                  ? 'خلاصة وتوصية المحرر'
                  : "Editor's Final Recommendation"}
              </h2>
              <p className={styles.verdictText}>{editorVerdictText}</p>
            </div>

            {/* FAQ Section (Backed by FAQPage Schema) */}
            {faqItems.length > 0 && (
              <section id="guide-faq" className={styles.faqSection}>
                <h2 className={styles.faqHeading}>
                  {isAr
                    ? 'الأسئلة الشائعة حول هذا الدليل'
                    : 'Frequently Asked Questions'}
                </h2>
                <div className={styles.faqList}>
                  {faqItems.map((faq, idx) => (
                    <details
                      key={idx}
                      className={styles.faqItem}
                      open={idx === 0}
                    >
                      <summary className={styles.faqQuestion}>
                        <span>{t(faq.question)}</span>
                        <ChevronDown size={16} aria-hidden="true" />
                      </summary>
                      <p className={styles.faqAnswer}>{t(faq.answer)}</p>
                    </details>
                  ))}
                </div>
              </section>
            )}
          </article>
        </div>

        {/* In-Article Recommended Products Grid */}
        {relatedProducts.length > 0 && (
          <section
            id="recommended-products"
            className={styles.recommendedSection}
            aria-labelledby="recommended-heading"
          >
            <SignatureMotif
              index="02"
              label={
                isAr
                  ? 'المنتجات الموصى بها في هذا الدليل'
                  : 'Products Featured in This Guide'
              }
            />

            <div className={styles.recommendedGrid}>
              {relatedProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  isSaved={isSaved(product.id)}
                  onToggleSave={toggleSave}
                  refContext="guide_detail"
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
