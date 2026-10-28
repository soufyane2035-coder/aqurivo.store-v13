'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  totalArticles: number;
  catalogArticleCount: number;
  hasMore: boolean;
  nextCursor: string | null;
  previousCursor: string | null;
  categoryArticleCounts: Record<string, number>;
  initialCategory: string;
  initialQuery: string;
  initialCursor: string | null;
}

export function GuidesView({
  articles: initialArticles,
  categories,
  totalArticles: initialTotal,
  catalogArticleCount,
  hasMore: initialHasMore,
  nextCursor: initialNextCursor,
  previousCursor: initialPreviousCursor,
  categoryArticleCounts,
  initialCategory,
  initialQuery,
  initialCursor,
}: GuidesViewProps) {
  const { locale, messages, t } = useI18n();
  const isAr = locale === 'ar';
  const [articles, setArticles] = useState(initialArticles);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [total, setTotal] = useState(initialTotal);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [cursorHistory, setCursorHistory] = useState<(string | null)[]>(
    initialCursor ? [initialPreviousCursor, initialCursor] : [null]
  );
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const initialFilterSignature = useRef(JSON.stringify([initialCategory, initialQuery]));
  const activeRequest = useRef<AbortController | null>(null);
  const filterSignature = JSON.stringify([selectedCategory, searchQuery]);

  const updateUrl = useCallback((cursor: string | null) => {
    const params = new URLSearchParams(window.location.search);
    for (const key of ['category', 'q', 'cursor']) params.delete(key);
    if (selectedCategory !== 'all') params.set('category', selectedCategory);
    if (searchQuery.trim()) params.set('q', searchQuery.trim());
    if (cursor) params.set('cursor', cursor);
    const query = params.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}`);
  }, [searchQuery, selectedCategory]);

  const loadPage = useCallback(async (cursor: string | null) => {
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    setIsLoading(true);
    setLoadError(null);
    const params = new URLSearchParams();
    if (selectedCategory !== 'all') params.set('category', selectedCategory);
    if (searchQuery.trim()) params.set('q', searchQuery.trim());
    if (cursor) params.set('cursor', cursor);
    try {
      const response = await fetch(`/api/guides?${params.toString()}`, { signal: controller.signal });
      if (!response.ok) throw new Error('Unable to load buying guides.');
      const data = (await response.json()) as {
        items: Article[];
        total: number;
        hasMore: boolean;
        nextCursor: string | null;
      };
      setArticles(data.items);
      setTotal(data.total);
      setHasMore(data.hasMore);
      setNextCursor(data.nextCursor);
      updateUrl(cursor);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setLoadError(error instanceof Error ? error.message : 'Unable to load buying guides.');
    } finally {
      if (!controller.signal.aborted) setIsLoading(false);
    }
  }, [searchQuery, selectedCategory, updateUrl]);

  useEffect(() => {
    if (initialFilterSignature.current === filterSignature) {
      initialFilterSignature.current = '';
      return;
    }
    setCursorHistory([null]);
    const timer = window.setTimeout(() => void loadPage(null), searchQuery.trim() ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [filterSignature, loadPage, searchQuery]);

  const changePage = (cursor: string | null, direction: 'next' | 'previous') => {
    setCursorHistory((previous) =>
      direction === 'next' ? [...previous, cursor] : previous.slice(0, -1)
    );
    void loadPage(cursor);
    document.getElementById('guides-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

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
                    {formatNumber(catalogArticleCount, locale)}
                  </span>
                </button>
                {categories.map((cat) => {
                  const isActive = selectedCategory === cat.slug;
                  const count = categoryArticleCounts[cat.slug] || categoryArticleCounts[cat.id] || 0;
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
        <section id="guides-results" className={styles.articlesSection} aria-live="polite">
          <SignatureMotif
            label={isAr ? 'جميع الأدلة والمراجعات' : 'All Buying Guides'}
          />

          {loadError && <p role="alert">{loadError}</p>}
          {isLoading && <p role="status">{isAr ? 'جارٍ تحميل الأدلة...' : 'Loading guides...'}</p>}
          {catalogArticleCount === 0 ? (
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
          ) : total === 0 ? (
            <EmptyState
              title={isAr ? 'لا توجد أدلة مطابقة لبحثك أو هذه الفئة' : 'No guides match this search or category'}
              description={isAr ? 'جرب كلمة بحث أخرى أو اعرض جميع الأدلة المنشورة.' : 'Try another search term or view all published guides.'}
              primaryActionLabel={messages.filters.allCategories}
              onPrimaryAction={() => {
                setSelectedCategory('all');
                setSearchQuery('');
              }}
            />
          ) : (
            <div className={styles.grid}>
              {articles.map((article) => (
                <EditorialIssueCard key={article.id} article={article} />
              ))}
            </div>
          )}
          {total > 0 && (
            <nav className={styles.pagination} aria-label={isAr ? 'صفحات الأدلة' : 'Guide pages'}>
              <button
                type="button"
                onClick={() => changePage(cursorHistory[cursorHistory.length - 2] || null, 'previous')}
                disabled={cursorHistory.length <= 1 || isLoading}
              >
                {isAr ? 'السابق' : 'Previous'}
              </button>
              <span aria-live="polite">
                {isAr ? `عرض ${articles.length} من ${formatNumber(total, locale)}` : `Showing ${articles.length} of ${formatNumber(total, locale)}`}
              </span>
              <button
                type="button"
                onClick={() => nextCursor && changePage(nextCursor, 'next')}
                disabled={!hasMore || isLoading}
              >
                {isAr ? 'التالي' : 'Next'}
              </button>
            </nav>
          )}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
