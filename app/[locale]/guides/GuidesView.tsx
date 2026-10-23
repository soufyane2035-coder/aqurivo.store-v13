'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Cpu,
  Dumbbell,
  HeartPulse,
  Home,
  LayoutGrid,
  Search,
  Shirt,
  Sparkles,
  X,
} from 'lucide-react';
import type { Article, Category } from '@/types';
import { useI18n } from '@/i18n/I18nProvider';
import { formatNumber } from '@/lib/format';
import { searchAndRankArticles } from '@/lib/productSearch';
import { SiteHeader } from '@/components/sections/SiteHeader';
import { SiteFooter } from '@/components/sections/SiteFooter';
import { SignatureMotif } from '@/components/ui/SignatureMotif';
import { EditorialIssueCard } from '@/components/ui/EditorialIssueCard';
import { EmptyState } from '@/components/ui/EmptyState';
import styles from './GuidesView.module.css';

function renderGuideCategoryIcon(slug: string, nameAr = '', nameEn = '') {
  const key = `${slug} ${nameAr} ${nameEn}`.toLowerCase();
  if (
    key.includes('electron') ||
    key.includes('tech') ||
    key.includes('إلكترونيات') ||
    key.includes('تقنية')
  ) {
    return <Cpu size={14} aria-hidden="true" />;
  }
  if (
    key.includes('home') ||
    key.includes('kitchen') ||
    key.includes('منزل') ||
    key.includes('مطبخ')
  ) {
    return <Home size={14} aria-hidden="true" />;
  }
  if (
    key.includes('health') ||
    key.includes('beauty') ||
    key.includes('care') ||
    key.includes('صحة') ||
    key.includes('عناية')
  ) {
    return <HeartPulse size={14} aria-hidden="true" />;
  }
  if (
    key.includes('sport') ||
    key.includes('fitness') ||
    key.includes('رياضة') ||
    key.includes('لياقة')
  ) {
    return <Dumbbell size={14} aria-hidden="true" />;
  }
  if (
    key.includes('fashion') ||
    key.includes('apparel') ||
    key.includes('style') ||
    key.includes('موضة') ||
    key.includes('أزياء')
  ) {
    return <Shirt size={14} aria-hidden="true" />;
  }
  return <Sparkles size={14} aria-hidden="true" />;
}

interface GuidesViewProps {
  articles: Article[];
  categories: Category[];
}

export function GuidesView({ articles, categories }: GuidesViewProps) {
  const { locale, messages, t } = useI18n();
  const isAr = locale === 'ar';
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredArticles = useMemo(() => {
    let list = articles;
    if (selectedCategory !== 'all') {
      list = list.filter(
        (a) =>
          a.categorySlug === selectedCategory || a.categoryId === selectedCategory
      );
    }
    if (searchQuery.trim()) {
      return searchAndRankArticles(list, searchQuery);
    }
    return list;
  }, [articles, selectedCategory, searchQuery]);

  const featuredArticle = filteredArticles[0];
  const restArticles = filteredArticles.slice(1);

  return (
    <div className={styles.pageShell}>
      <SiteHeader />

      <main id="main-content" className={`siteContainer ${styles.main}`}>
        <header className={styles.header}>
          <SignatureMotif index="01" label={messages.nav.guides} />
          <h1 className={styles.title}>
            {isAr
              ? 'أدلة الشراء والمراجعات التحريرية'
              : 'Editorial Buying Guides & Deep Dives'}
          </h1>
          <p className={styles.subtitle}>
            {isAr
              ? 'مقارنات عملية ومراجعات متأنية تساعدك على اختيار المنتج الأنسب لاحتياجك الفعلي بأفضل سعر وقبل الشراء.'
              : 'Practical comparisons, specs breakdowns, and thoughtful evaluations to help you make confident buying decisions.'}
          </p>

          <div className={styles.controlsToolbar}>
            {/* Real-time Article Search Bar */}
            <div className={styles.searchWrap}>
              <Search size={16} className={styles.searchIcon} aria-hidden="true" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  isAr
                    ? 'ابحث في دلائل الشراء والمقارنات...'
                    : 'Search buying guides & comparisons...'
                }
                aria-label={
                  isAr ? 'البحث في دلائل الشراء' : 'Search buying guides'
                }
                className={styles.searchInput}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className={styles.clearSearchBtn}
                  aria-label={isAr ? 'مسح البحث' : 'Clear search'}
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {categories.length > 0 && (
              <div
                className={styles.filterBar}
                role="tablist"
                aria-label={
                  isAr ? 'تصفية الأدلة حسب الفئة' : 'Filter guides by category'
                }
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={selectedCategory === 'all'}
                  onClick={() => setSelectedCategory('all')}
                  className={`${styles.filterBtn} ${
                    selectedCategory === 'all' ? styles.filterBtnActive : ''
                  }`}
                >
                  <span className={styles.filterBtnIcon}>
                    <LayoutGrid size={14} aria-hidden="true" />
                  </span>
                  <span>{messages.filters.allCategories}</span>
                  <span className={`${styles.filterBtnCount} tabularNums`}>
                    {formatNumber(articles.length, locale)}
                  </span>
                </button>
                {categories.map((cat) => {
                  const isActive = selectedCategory === cat.slug;
                  const count = articles.filter(
                    (a) =>
                      a.categorySlug === cat.slug ||
                      a.categoryId === cat.slug ||
                      a.categoryId === cat.id
                  ).length;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() =>
                        setSelectedCategory((prev) =>
                          prev === cat.slug ? 'all' : cat.slug
                        )
                      }
                      className={`${styles.filterBtn} ${
                        isActive ? styles.filterBtnActive : ''
                      }`}
                    >
                      <span className={styles.filterBtnIcon}>
                        {renderGuideCategoryIcon(cat.slug, cat.name?.ar, cat.name?.en)}
                      </span>
                      <span>{t(cat.name)}</span>
                      {count > 0 && (
                        <span className={`${styles.filterBtnCount} tabularNums`}>
                          {formatNumber(count, locale)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </header>

        {/* All Guides Grid */}
        <section className={styles.articlesSection} aria-live="polite">
          <SignatureMotif
            label={isAr ? 'جميع الأدلة والمراجعات' : 'All Buying Guides'}
          />

          {articles.length === 0 ? (
            <EmptyState
              title={
                isAr
                  ? 'نعمل حالياً على إعداد أولى أدلة الشراء'
                  : 'Our editorial team is preparing the first buying guides'
              }
              description={
                isAr
                  ? 'نكتب مراجعاتنا بناءً على بحث وتدقيق حقيقي في مواصفات المنتجات وتجارب الاستخدام. تصفح دليل المنتجات المنتقاة أو تعرف على منهجيتنا.'
                  : 'Every guide is written after thorough research into product specifications and real-world reliability. Explore our product directory or read about our method.'
              }
              primaryActionLabel={messages.nav.products}
              primaryActionHref={`/${locale}/products`}
              secondaryActionLabel={messages.nav.ourMethod}
              secondaryActionHref={`/${locale}/about`}
            />
          ) : filteredArticles.length === 0 ? (
            <EmptyState
              title={
                isAr
                  ? 'لم نجد أدلة شراء تطابق بحثك أو هذه الفئة'
                  : 'No buying guides match your search or category'
              }
              description={
                isAr
                  ? 'جرب كلمة بحث أخرى أو اعرض جميع الأدلة المنشورة.'
                  : 'Try another search term or view all published guides.'
              }
              primaryActionLabel={messages.filters.allCategories}
              onPrimaryAction={() => {
                setSelectedCategory('all');
                setSearchQuery('');
              }}
            />
          ) : (
            <div className={styles.grid}>
              {filteredArticles.map((article) => (
                <EditorialIssueCard key={article.id} article={article} />
              ))}
            </div>
          )}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
