'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  rankProductsForVisitor,
  recordVisitorInterest,
  searchAndRankArticles,
  searchAndRankProducts,
} from '@/lib/productSearch';
import { filterCatalogProducts, sortCatalogProducts } from '@/lib/catalogFilters';
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
  initialCategorySlug?: string;
  initialSourceSlug?: string;
  initialSearchQuery?: string;
}

export function CatalogView({
  initialProducts,
  categories,
  sources,
  articles = [],
  initialCategorySlug = 'all',
  initialSourceSlug = 'all',
  initialSearchQuery = '',
}: CatalogViewProps) {
  const { locale, messages, t, currency } = useI18n();
  const { isSaved, toggleSave } = useSaved();

  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [selectedCategory, setSelectedCategory] = useState(initialCategorySlug);
  const [selectedSource, setSelectedSource] = useState(initialSourceSlug);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<string>('newest');
  const [filterBarKey, setFilterBarKey] = useState(0);
  const [visitorReady, setVisitorReady] = useState(false);
  const [randomSeed, setRandomSeed] = useState(1);
  const [intentTick, setIntentTick] = useState(0);

  useEffect(() => {
    setProducts(initialProducts);
  }, [initialProducts]);

  useEffect(() => {
    setVisitorReady(true);
    setRandomSeed(Math.floor(Math.random() * 1000000) + 2);
    if (products.length > 0) {
      seedBrowserSeenProducts(products.slice(0, 12));
    }

    const handleIntentUpdate = () => {
      setIntentTick((prev) => prev + 1);
    };
    window.addEventListener('aqurivo:session-intent-updated', handleIntentUpdate);
    return () => {
      window.removeEventListener('aqurivo:session-intent-updated', handleIntentUpdate);
    };
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

  const matchedArticles = useMemo(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed || articles.length === 0) return [];
    return searchAndRankArticles(articles, trimmed, products);
  }, [articles, searchQuery, products]);

  const filteredProducts = useMemo(() => {
    const strictBase = filterCatalogProducts(products, {
      category: selectedCategory,
      store: selectedSource,
      maxPrice,
      currency,
    });

    if (searchQuery.trim()) {
      const searchedList = searchAndRankProducts(strictBase, searchQuery, articles);
      if (sortBy === 'newest') {
        return searchedList;
      }
      return sortCatalogProducts(searchedList, sortBy, currency);
    }

    if (sortBy === 'newest' && visitorReady) {
      return rankProductsForVisitor(strictBase, {
        activeCategorySlug: selectedCategory !== 'all' ? selectedCategory : undefined,
      });
    }

    return sortCatalogProducts(strictBase, sortBy, currency);
  }, [
    products,
    articles,
    maxPrice,
    searchQuery,
    selectedCategory,
    selectedSource,
    sortBy,
    visitorReady,
    intentTick,
    currency,
  ]);

  const categoryProductCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cat of categories) {
      counts[cat.slug] = products.filter(
        (p) => p.categorySlug === cat.slug || p.categoryId === cat.slug || p.categoryId === cat.id
      ).length;
    }
    return counts;
  }, [categories, products]);

  const interleavedFeed = useMemo(
    () => buildInterleavedProductFeed(filteredProducts, articles, randomSeed),
    [filteredProducts, articles, randomSeed]
  );

  const resetAllFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedSource('all');
    setMaxPrice(null);
    setSortBy('newest');
    setFilterBarKey((k) => k + 1);
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
            totalProducts={products.length}
            filteredCount={filteredProducts.length}
            initialQuery={filterBarKey === 0 ? initialSearchQuery : ''}
            initialStore={filterBarKey === 0 ? initialSourceSlug : 'all'}
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
                    {formatNumber(products.length, locale)}
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
          {products.length === 0 ? (
            <EmptyState
              title={messages.empty.catalogTitle}
              description={messages.empty.catalogDescription}
              primaryActionLabel={messages.nav.ourMethod}
              primaryActionHref={`/${locale}/about`}
              secondaryActionLabel={messages.nav.contact}
              secondaryActionHref={`/${locale}/contact`}
            />
          ) : filteredProducts.length === 0 ? (
            <EmptyState
              title={messages.empty.noSearchMatchTitle}
              description={messages.empty.noSearchMatchDescription}
              primaryActionLabel={messages.filters.resetFilters}
              onPrimaryAction={resetAllFilters}
            />
          ) : (
            <div className={styles.productGrid}>
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
        </section>
      </main>

      <SiteFooter productsCount={products.length} />
    </div>
  );
}
