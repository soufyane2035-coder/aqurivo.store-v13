'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Cpu,
  Dumbbell,
  HeartPulse,
  Home,
  LayoutGrid,
  Shirt,
  Sparkles,
} from 'lucide-react';
import type { Article, Category, PartnerSource, Product } from '@/types';
import { useI18n } from '@/i18n/I18nProvider';
import { useSaved } from '@/features/saved/SavedProvider';
import { formatNumber } from '@/lib/format';
import { SiteHeader } from '@/components/sections/SiteHeader';
import { SiteFooter } from '@/components/sections/SiteFooter';
import { SignatureMotif } from '@/components/ui/SignatureMotif';
import { ProductCard } from '@/components/ui/ProductCard';
import { EditorialIssueCard } from '@/components/ui/EditorialIssueCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { FilterBar } from '@/components/FilterBar/FilterBar';
import {
  buildInterleavedProductFeed,
  recordVisitorInterest,
} from '@/lib/productSearch';
import { seedBrowserSeenProducts } from '@/lib/viewedProductsStorage';
import styles from './CatalogView.module.css';

function renderCategoryIcon(slug: string, nameAr = '', nameEn = '') {
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

interface CatalogViewProps {
  initialProducts: Product[];
  categories: Category[];
  sources: PartnerSource[];
  articles?: Article[];
  totalProducts: number;
  catalogProductCount: number;
  hasMore: boolean;
  nextCursor: string | null;
  previousCursor: string | null;
  categoryProductCounts: Record<string, number>;
  initialMatchedArticles: Article[];
  initialCategorySlug?: string;
  initialSourceSlug?: string;
  initialSearchQuery?: string;
  initialSort?: string;
  initialMaxPrice?: number | null;
  initialCursor?: string | null;
}

export function CatalogView({
  initialProducts,
  categories,
  sources,
  articles = [],
  totalProducts: initialTotal,
  catalogProductCount,
  hasMore: initialHasMore,
  nextCursor: initialNextCursor,
  previousCursor: initialPreviousCursor,
  categoryProductCounts,
  initialMatchedArticles,
  initialCategorySlug = 'all',
  initialSourceSlug = 'all',
  initialSearchQuery = '',
  initialSort = 'newest',
  initialMaxPrice = null,
  initialCursor = null,
}: CatalogViewProps) {
  const { locale, messages, t, currency } = useI18n();
  const { isSaved, toggleSave } = useSaved();

  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [matchedArticles, setMatchedArticles] = useState(initialMatchedArticles);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [selectedCategory, setSelectedCategory] = useState(initialCategorySlug);
  const [selectedSource, setSelectedSource] = useState(initialSourceSlug);
  const [maxPrice, setMaxPrice] = useState<number | null>(initialMaxPrice);
  const [sortBy, setSortBy] = useState(initialSort);
  const [filterBarKey, setFilterBarKey] = useState(0);
  const [randomSeed, setRandomSeed] = useState(1);
  const [totalMatching, setTotalMatching] = useState(initialTotal);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [cursorHistory, setCursorHistory] = useState<(string | null)[]>(
    initialCursor ? [initialPreviousCursor, initialCursor] : [null]
  );
  const [isLoadingPage, setIsLoadingPage] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const firstFilterSignature = useRef(
    JSON.stringify([initialSearchQuery, initialCategorySlug, initialSourceSlug, initialMaxPrice, initialSort, currency])
  );
  const activeRequest = useRef<AbortController | null>(null);

  useEffect(() => {
    setProducts(initialProducts);
    setMatchedArticles(initialMatchedArticles);
    setTotalMatching(initialTotal);
    setHasMore(initialHasMore);
    setNextCursor(initialNextCursor);
    setCursorHistory(initialCursor ? [initialPreviousCursor, initialCursor] : [null]);
  }, [initialProducts, initialMatchedArticles, initialTotal, initialHasMore, initialNextCursor, initialCursor, initialPreviousCursor]);

  useEffect(() => {
    setRandomSeed(Math.floor(Math.random() * 1000000) + 2);
    if (products.length > 0) {
      seedBrowserSeenProducts(products.slice(0, 12));
    }
  }, [products]);

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed && selectedCategory === 'all') return;
    const timer = window.setTimeout(() => {
      recordVisitorInterest({
        query: trimmed || undefined,
        categorySlug: selectedCategory !== 'all' ? selectedCategory : undefined,
        products,
      });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchQuery, selectedCategory, products]);

  const handleFilterChange = useCallback(
    (filters: {
      query: string;
      sortBy: string;
      maxPrice: number | null;
      store: string;
    }) => {
      setSearchQuery(filters.query);
      setSortBy(filters.sortBy);
      setMaxPrice(filters.maxPrice);
      setSelectedSource(filters.store);
    },
    []
  );

  const filterSignature = JSON.stringify([
    searchQuery,
    selectedCategory,
    selectedSource,
    maxPrice,
    sortBy,
    currency,
  ]);

  const updateUrl = useCallback((cursor: string | null) => {
    const params = new URLSearchParams(window.location.search);
    for (const key of ['q', 'category', 'source', 'sort', 'maxPrice', 'cursor']) {
      params.delete(key);
    }
    if (searchQuery.trim()) params.set('q', searchQuery.trim());
    if (selectedCategory !== 'all') params.set('category', selectedCategory);
    if (selectedSource !== 'all') params.set('source', selectedSource);
    if (sortBy !== 'newest') params.set('sort', sortBy);
    if (maxPrice !== null) params.set('maxPrice', String(maxPrice));
    if (cursor) params.set('cursor', cursor);
    const query = params.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}`);
  }, [maxPrice, searchQuery, selectedCategory, selectedSource, sortBy]);

  const loadCatalogPage = useCallback(async (cursor: string | null) => {
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    setIsLoadingPage(true);
    setLoadError(null);
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set('q', searchQuery.trim());
    if (selectedCategory !== 'all') params.set('category', selectedCategory);
    if (selectedSource !== 'all') params.set('source', selectedSource);
    if (sortBy !== 'newest') params.set('sort', sortBy);
    if (maxPrice !== null) params.set('maxPrice', String(maxPrice));
    if (currency) params.set('currency', currency);
    if (cursor) params.set('cursor', cursor);
    try {
      const response = await fetch(`/api/catalog?${params.toString()}`, { signal: controller.signal });
      if (!response.ok) throw new Error('Unable to load catalog results.');
      const data = (await response.json()) as {
        products: Product[];
        total: number;
        hasMore: boolean;
        nextCursor: string | null;
        previousCursor: string | null;
        matchedArticles: Article[];
      };
      setProducts(data.products);
      setMatchedArticles(data.matchedArticles);
      setTotalMatching(data.total);
      setHasMore(data.hasMore);
      setNextCursor(data.nextCursor);
      updateUrl(cursor);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setLoadError(error instanceof Error ? error.message : 'Unable to load catalog results.');
    } finally {
      if (!controller.signal.aborted) setIsLoadingPage(false);
    }
  }, [currency, maxPrice, searchQuery, selectedCategory, selectedSource, sortBy, updateUrl]);

  useEffect(() => {
    if (firstFilterSignature.current === filterSignature) {
      firstFilterSignature.current = '';
      return;
    }
    setCursorHistory([null]);
    const timer = window.setTimeout(() => {
      void loadCatalogPage(null);
    }, searchQuery.trim() ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [filterSignature, loadCatalogPage, searchQuery]);

  const interleavedFeed = useMemo(
    () => buildInterleavedProductFeed(products, articles, randomSeed),
    [products, articles, randomSeed]
  );

  const resetAllFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedSource('all');
    setMaxPrice(null);
    setSortBy('newest');
    setFilterBarKey((k) => k + 1);
  };

  const changePage = (cursor: string | null, direction: 'next' | 'previous') => {
    if (direction === 'next') {
      setCursorHistory((previous) => [...previous, cursor]);
    } else {
      setCursorHistory((previous) => previous.slice(0, -1));
    }
    void loadCatalogPage(cursor);
    document.getElementById('catalog-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className={styles.pageShell}>
      <SiteHeader />

      <main id="main-content" className={`siteContainer ${styles.main}`}>
        <header className={styles.pageHeader}>
          <SignatureMotif index="01" label={messages.nav.products} />
          <h1 className={styles.pageTitle}>
            {locale === 'ar'
              ? 'دليل المنتجات المنتقاة'
              : 'Curated Product Directory'}
          </h1>
          <p className={styles.pageSubtitle}>{messages.meta.defaultDescription}</p>
        </header>

        {/* Unified Compact Search, Filter & Sleek Category Pills Strip */}
        <section className={styles.filterPanel} aria-label="Product Filters">
          <FilterBar
            key={filterBarKey}
            onFilterChange={handleFilterChange}
            totalProducts={catalogProductCount}
            filteredCount={totalMatching}
            initialQuery={filterBarKey === 0 ? initialSearchQuery : ''}
            initialStore={filterBarKey === 0 ? initialSourceSlug : 'all'}
            initialSort={filterBarKey === 0 ? initialSort : 'newest'}
            initialMaxPrice={filterBarKey === 0 ? initialMaxPrice : null}
            products={products}
            sources={sources}
            articles={articles}
          />

          {categories.length > 0 && (
            <div className={styles.categoryRibbonWrap}>
              <div
                className={styles.categoryRibbonTrack}
                role="tablist"
                aria-label="Filter by category"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={selectedCategory === 'all'}
                  onClick={() => setSelectedCategory('all')}
                  className={`${styles.categoryPill} ${
                    selectedCategory === 'all' ? styles.categoryPillActive : ''
                  }`}
                >
                  <span className={styles.categoryPillIcon}>
                    <LayoutGrid size={14} aria-hidden="true" />
                  </span>
                  <span className={styles.categoryPillLabel}>
                    {messages.filters.allCategories}
                  </span>
                  <span className={`${styles.categoryPillCount} tabularNums`}>
                    {formatNumber(catalogProductCount, locale)}
                  </span>
                </button>

                {categories.map((cat) => {
                  const isActive = selectedCategory === cat.slug;
                  const count = categoryProductCounts[cat.slug] ?? 0;
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
                      className={`${styles.categoryPill} ${
                        isActive ? styles.categoryPillActive : ''
                      }`}
                    >
                      <span className={styles.categoryPillIcon}>
                        {renderCategoryIcon(
                          cat.slug,
                          cat.name?.ar,
                          cat.name?.en
                        )}
                      </span>
                      <span className={styles.categoryPillLabel}>
                        {t(cat.name)}
                      </span>
                      {count > 0 && (
                        <span className={`${styles.categoryPillCount} tabularNums`}>
                          {formatNumber(count, locale)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* Results Grid or Empty State */}
        <section className={styles.resultsSection} aria-live="polite">
          {searchQuery.trim().length > 0 && matchedArticles.length > 0 && (
            <div className={styles.searchMatchedGuidesBlock}>
              <div className={styles.searchMatchedGuidesHeader}>
                <span>
                  {locale === 'ar'
                    ? `مقالات وأدلة شراء مطابقة لبحثك (${matchedArticles.length})`
                    : `Matching Buying Guides & Articles (${matchedArticles.length})`}
                </span>
              </div>
              <div className={styles.searchMatchedGuidesGrid}>
                {matchedArticles.slice(0, 3).map((article) => (
                  <EditorialIssueCard key={`cat-search-art-${article.id}`} article={article} />
                ))}
              </div>
            </div>
          )}
          {loadError && <p role="alert">{loadError}</p>}
          {isLoadingPage && <p role="status">{locale === 'ar' ? 'جارٍ تحميل النتائج...' : 'Loading results...'}</p>}
          {catalogProductCount === 0 ? (
            <EmptyState
              title={messages.empty.catalogTitle}
              description={messages.empty.catalogDescription}
              primaryActionLabel={messages.nav.ourMethod}
              primaryActionHref={`/${locale}/about`}
              secondaryActionLabel={messages.nav.contact}
              secondaryActionHref={`/${locale}/contact`}
            />
          ) : totalMatching === 0 ? (
            <EmptyState
              title={messages.empty.noSearchMatchTitle}
              description={messages.empty.noSearchMatchDescription}
              primaryActionLabel={messages.filters.resetFilters}
              onPrimaryAction={resetAllFilters}
            />
          ) : (
            <div id="catalog-results" className={styles.productGrid}>
              {interleavedFeed.map((entry, idx) =>
                entry.type === 'product' ? (
                  <ProductCard
                    key={entry.product.id}
                    product={entry.product}
                    isSaved={isSaved(entry.product.id)}
                    onToggleSave={toggleSave}
                    refContext="catalog_directory"
                  />
                ) : (
                  <div
                    key={`inline-guide-${entry.article.id}-${idx}`}
                    className={styles.inlineGuideRow}
                  >
                    <EditorialIssueCard
                      article={entry.article}
                      matchedProduct={entry.matchedProduct}
                    />
                  </div>
                )
              )}
            </div>
          )}
          {totalMatching > 0 && (
            <nav className={styles.pagination} aria-label={locale === 'ar' ? 'صفحات المنتجات' : 'Product pages'}>
              <button
                type="button"
                onClick={() => changePage(cursorHistory[cursorHistory.length - 2] || null, 'previous')}
                disabled={cursorHistory.length <= 1 || isLoadingPage}
              >
                {locale === 'ar' ? 'السابق' : 'Previous'}
              </button>
              <span aria-live="polite">
                {locale === 'ar'
                  ? `عرض ${products.length} من ${formatNumber(totalMatching, locale)}`
                  : `Showing ${products.length} of ${formatNumber(totalMatching, locale)}`}
              </span>
              <button
                type="button"
                onClick={() => nextCursor && changePage(nextCursor, 'next')}
                disabled={!hasMore || isLoadingPage}
              >
                {locale === 'ar' ? 'التالي' : 'Next'}
              </button>
            </nav>
          )}
        </section>
      </main>

      <SiteFooter productsCount={catalogProductCount} />
    </div>
  );
}
