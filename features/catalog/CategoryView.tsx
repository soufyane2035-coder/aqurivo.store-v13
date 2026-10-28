'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { Article, Category, PartnerSource, Product } from '@/types';
import { useI18n } from '@/i18n/I18nProvider';
import { useSaved } from '@/features/saved/SavedProvider';
import { SiteHeader } from '@/components/sections/SiteHeader';
import { SiteFooter } from '@/components/sections/SiteFooter';
import { SignatureMotif } from '@/components/ui/SignatureMotif';
import { ProductCard } from '@/components/ui/ProductCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { FilterBar } from '@/components/FilterBar/FilterBar';
import styles from './CategoryView.module.css';

interface CategoryViewProps {
  category: Category;
  products: Product[];
  articles: Article[];
  sources: PartnerSource[];
  productCount: number;
  initialResultCount: number;
  hasMore: boolean;
  nextCursor: string | null;
  previousCursor: string | null;
  initialQuery: string;
  initialStore: string;
  initialSort: string;
  initialMaxPrice: number | null;
  initialCursor: string | null;
}

export function CategoryView({
  category,
  products: initialProducts,
  articles,
  sources,
  productCount,
  initialResultCount,
  hasMore: initialHasMore,
  nextCursor: initialNextCursor,
  previousCursor: initialPreviousCursor,
  initialQuery,
  initialStore,
  initialSort,
  initialMaxPrice,
  initialCursor,
}: CategoryViewProps) {
  const { locale, messages, t, currency } = useI18n();
  const { isSaved, toggleSave } = useSaved();
  const [products, setProducts] = useState(initialProducts);
  const [query, setQuery] = useState(initialQuery);
  const [sortBy, setSortBy] = useState(initialSort);
  const [maxPrice, setMaxPrice] = useState<number | null>(initialMaxPrice);
  const [store, setStore] = useState(initialStore);
  const [filterBarKey, setFilterBarKey] = useState(0);
  const [total, setTotal] = useState(initialResultCount);
  const [hasMoreProducts, setHasMoreProducts] = useState(initialHasMore);
  const [nextPageCursor, setNextPageCursor] = useState(initialNextCursor);
  const [cursorHistory, setCursorHistory] = useState<(string | null)[]>(
    initialCursor ? [initialPreviousCursor, initialCursor] : [null]
  );
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const firstFilterSignature = useRef(JSON.stringify([initialQuery, initialStore, initialSort, initialMaxPrice]));
  const activeRequest = useRef<AbortController | null>(null);

  const handleFilterChange = useCallback(
    (filters: {
      query: string;
      sortBy: string;
      maxPrice: number | null;
      store: string;
    }) => {
      setQuery(filters.query);
      setSortBy(filters.sortBy);
      setMaxPrice(filters.maxPrice);
      setStore(filters.store);
    },
    []
  );

  const loadPage = useCallback(async (cursor: string | null) => {
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    setIsLoading(true);
    setLoadError(null);
    const params = new URLSearchParams({ category: category.slug });
    if (query.trim()) params.set('q', query.trim());
    if (store !== 'all') params.set('source', store);
    if (sortBy !== 'newest') params.set('sort', sortBy);
    if (maxPrice !== null) params.set('maxPrice', String(maxPrice));
    if (currency) params.set('currency', currency);
    if (cursor) params.set('cursor', cursor);
    try {
      const response = await fetch(`/api/catalog?${params.toString()}`, { signal: controller.signal });
      if (!response.ok) throw new Error('Unable to load category products.');
      const data = (await response.json()) as {
        products: Product[];
        total: number;
        hasMore: boolean;
        nextCursor: string | null;
      };
      if (!controller.signal.aborted) {
        setProducts(data.products);
        setTotal(data.total);
        setHasMoreProducts(data.hasMore);
        setNextPageCursor(data.nextCursor);
        const urlParams = new URLSearchParams(window.location.search);
        for (const key of ['q', 'source', 'sort', 'maxPrice', 'cursor']) urlParams.delete(key);
        if (query.trim()) urlParams.set('q', query.trim());
        if (store !== 'all') urlParams.set('source', store);
        if (sortBy !== 'newest') urlParams.set('sort', sortBy);
        if (maxPrice !== null) urlParams.set('maxPrice', String(maxPrice));
        if (cursor) urlParams.set('cursor', cursor);
        const queryString = urlParams.toString();
        window.history.replaceState(null, '', `${window.location.pathname}${queryString ? `?${queryString}` : ''}`);
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        setLoadError(error instanceof Error ? error.message : 'Unable to load category products.');
      }
    } finally {
      if (!controller.signal.aborted) setIsLoading(false);
    }
  }, [category.slug, currency, maxPrice, query, sortBy, store]);

  const filterSignature = JSON.stringify([query, store, sortBy, maxPrice, currency]);
  useEffect(() => {
    if (firstFilterSignature.current === filterSignature) {
      firstFilterSignature.current = '';
      return;
    }
    setCursorHistory([null]);
    const timer = window.setTimeout(() => void loadPage(null), query.trim() ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [filterSignature, loadPage, query]);

  const resetFilters = () => {
    setQuery('');
    setSortBy('newest');
    setMaxPrice(null);
    setStore('all');
    setFilterBarKey((key) => key + 1);
  };

  return (
    <div className={styles.pageShell}>
      <SiteHeader />

      <main id="main-content" className={`siteContainer ${styles.main}`}>
        <header className={styles.header}>
          <SignatureMotif index="01" label={messages.nav.collections} />
          <h1 className={styles.title}>{t(category.name)}</h1>
          <p className={styles.description}>{t(category.description)}</p>
        </header>

        <FilterBar
          key={filterBarKey}
          onFilterChange={handleFilterChange}
          totalProducts={productCount}
          filteredCount={total}
          initialQuery={filterBarKey === 0 ? initialQuery : ''}
          initialStore={filterBarKey === 0 ? initialStore : 'all'}
          initialSort={filterBarKey === 0 ? initialSort : 'newest'}
          initialMaxPrice={filterBarKey === 0 ? initialMaxPrice : null}
          products={products}
          sources={sources}
          articles={articles}
        />

        <section className={styles.section}>
          <SignatureMotif index="02" label={messages.nav.products} />
          {loadError && <p role="alert">{loadError}</p>}
          {isLoading && <p role="status">{locale === 'ar' ? 'جارٍ تحميل المنتجات...' : 'Loading products...'}</p>}
          {products.length > 0 ? (
            <div className={styles.productGrid}>
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  isSaved={isSaved(product.id)}
                  onToggleSave={toggleSave}
                  refContext={`category_${category.slug}`}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title={
                productCount > 0
                  ? messages.empty.noSearchMatchTitle
                  : messages.empty.catalogTitle
              }
              description={
                productCount > 0
                  ? messages.empty.noSearchMatchDescription
                  : messages.empty.catalogDescription
              }
              primaryActionLabel={
                productCount > 0
                  ? messages.filters.resetFilters
                  : messages.nav.products
              }
              primaryActionHref={
                productCount > 0 ? undefined : `/${locale}/products`
              }
              onPrimaryAction={productCount > 0 ? resetFilters : undefined}
            />
          )}
          {total > 0 && (
            <nav className={styles.pagination} aria-label={locale === 'ar' ? 'صفحات المنتجات' : 'Product pages'}>
              <button
                type="button"
                onClick={() => {
                  const cursor = cursorHistory[cursorHistory.length - 2] || null;
                  setCursorHistory((previous) => previous.slice(0, -1));
                  void loadPage(cursor);
                }}
                disabled={cursorHistory.length <= 1 || isLoading}
              >
                {locale === 'ar' ? 'السابق' : 'Previous'}
              </button>
              <span aria-live="polite">
                {locale === 'ar' ? `عرض ${products.length} من ${total}` : `Showing ${products.length} of ${total}`}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (!nextPageCursor) return;
                  setCursorHistory((previous) => [...previous, nextPageCursor]);
                  void loadPage(nextPageCursor);
                }}
                disabled={!hasMoreProducts || isLoading}
              >
                {locale === 'ar' ? 'التالي' : 'Next'}
              </button>
            </nav>
          )}
        </section>

        {articles.length > 0 && (
          <section className={styles.section}>
            <SignatureMotif index="03" label={messages.nav.guides} />
            <div className={styles.articlesGrid}>
              {articles.map((article) => (
                <Link
                  key={article.id}
                  href={`/${locale}/guides/${encodeURIComponent(article.slug)}`}
                  className={`${styles.articleCard} hoverLift`}
                >
                  <h3 className={styles.articleTitle}>{t(article.title)}</h3>
                  <p className={styles.articleExcerpt}>{t(article.excerpt)}</p>
                  <span className={`${styles.readingTime} tabularNums`}>
                    {article.readingTimeMinutes}{' '}
                    {locale === 'ar' ? 'دقائق قراءة' : 'min read'}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
