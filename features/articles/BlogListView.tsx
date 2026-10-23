'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Clock } from 'lucide-react';
import type { Article, Category } from '@/types';
import { useI18n } from '@/i18n/I18nProvider';
import { formatCalendarDate } from '@/lib/format';
import { SiteHeader } from '@/components/sections/SiteHeader';
import { SiteFooter } from '@/components/sections/SiteFooter';
import { SignatureMotif } from '@/components/ui/SignatureMotif';
import { EmptyState } from '@/components/ui/EmptyState';
import styles from './BlogListView.module.css';

interface BlogListViewProps {
  articles: Article[];
  categories: Category[];
}

export function BlogListView({ articles, categories }: BlogListViewProps) {
  const { locale, messages, t } = useI18n();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredArticles = useMemo(() => {
    if (selectedCategory === 'all') return articles;
    return articles.filter((a) => a.categorySlug === selectedCategory);
  }, [articles, selectedCategory]);

  return (
    <div className={styles.pageShell}>
      <SiteHeader />

      <main id="main-content" className={`siteContainer ${styles.main}`}>
        <header className={`${styles.header} revealUp`}>
          <SignatureMotif index="01" label={messages.nav.guides} />
          <h1 className={styles.title}>
            {locale === 'ar'
              ? 'أدلة الشراء والمراجعات التحريرية'
              : 'Editorial Buying Guides & Deep Dives'}
          </h1>
          <p className={styles.subtitle}>
            {locale === 'ar'
              ? 'مقارنات عملية ومراجعات متأنية تساعدك على اختيار المنتج الأنسب لاحتياجك الفعلي قبل الشراء.'
              : 'Practical comparisons and thoughtful evaluations to help you choose the right product for your everyday needs.'}
          </p>

          {categories.length > 0 && (
            <div className={styles.filterBar} role="group" aria-label="Filter guides by category">
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`${styles.filterBtn} ${
                  selectedCategory === 'all' ? styles.filterBtnActive : ''
                }`}
              >
                {messages.filters.allCategories}
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.slug)}
                  className={`${styles.filterBtn} ${
                    selectedCategory === cat.slug ? styles.filterBtnActive : ''
                  }`}
                >
                  {t(cat.name)}
                </button>
              ))}
            </div>
          )}
        </header>

        <section className={styles.articlesSection} aria-live="polite">
          <SignatureMotif
            index="02"
            label={
              locale === 'ar'
                ? 'أحدث الأدلة المنشورة'
                : 'Published Guides'
            }
          />

          {articles.length === 0 ? (
            <EmptyState
              title={
                locale === 'ar'
                  ? 'نعمل حالياً على إعداد أولى أدلة الشراء'
                  : 'Our editorial team is preparing the first buying guides'
              }
              description={
                locale === 'ar'
                  ? 'نكتب مراجعاتنا بناءً على بحث وتدقيق حقيقي في مواصفات المنتجات وتجارب الاستخدام. تصفح دليل المنتجات المنتقاة أو تعرف على منهجيتنا.'
                  : 'Every guide is written after thorough research into product specifications and real-world reliability. Explore our product directory or read about our method.'
              }
              primaryActionLabel={messages.nav.products}
              primaryActionHref="/products"
              secondaryActionLabel={messages.nav.ourMethod}
              secondaryActionHref="/about"
            />
          ) : filteredArticles.length === 0 ? (
            <EmptyState
              title={
                locale === 'ar'
                  ? 'لا توجد أدلة شراء في هذه الفئة حالياً'
                  : 'No buying guides in this category yet'
              }
              description={
                locale === 'ar'
                  ? 'اختر فئة أخرى أو اعرض جميع الأدلة المنشورة.'
                  : 'Select another category or view all published guides.'
              }
              primaryActionLabel={messages.filters.allCategories}
              onPrimaryAction={() => setSelectedCategory('all')}
            />
          ) : (
            <div className={styles.grid}>
              {filteredArticles.map((article) => {
                const formattedDate = formatCalendarDate(article.publishedAt, locale);
                return (
                  <article key={article.id} className={`${styles.card} hoverLift`}>
                    <div className={styles.metaRow}>
                      <span className={styles.categoryTag}>{t(article.categoryName)}</span>
                      <span aria-hidden="true">·</span>
                      <span className={`${styles.readTime} tabularNums`}>
                        <Clock size={13} aria-hidden="true" />
                        <span>
                          {article.readingTimeMinutes}{' '}
                          {locale === 'ar' ? 'دقائق قراءة' : 'min read'}
                        </span>
                      </span>
                      {formattedDate && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="tabularNums">{formattedDate}</span>
                        </>
                      )}
                    </div>

                    <h2 className={styles.cardTitle}>
                      <Link
                        href={`/blog/${encodeURIComponent(article.slug)}`}
                        className={styles.cardTitleLink}
                      >
                        {t(article.title)}
                      </Link>
                    </h2>

                    <p className={styles.cardExcerpt}>{t(article.excerpt)}</p>

                    <div className={styles.cardFooter}>
                      <Link
                        href={`/blog/${encodeURIComponent(article.slug)}`}
                        className={styles.readMoreLink}
                      >
                        <span>{locale === 'ar' ? 'اقرأ الدليل الكامل' : 'Read full guide'}</span>
                        <ArrowRight size={15} aria-hidden="true" />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
