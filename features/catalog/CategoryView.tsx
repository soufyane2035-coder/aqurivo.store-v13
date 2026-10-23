'use client';

import React, { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import type { Article, Category, PartnerSource, Product } from '@/types';
import { useI18n } from '@/i18n/I18nProvider';
import { useSaved } from '@/features/saved/SavedProvider';
import { filterCatalogProducts, sortCatalogProducts } from '@/lib/catalogFilters';
import { searchAndRankProducts } from '@/lib/productSearch';
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
}

export function CategoryView({ category, products, articles, sources }: CategoryViewProps) {
  const { locale, messages, t, currency } = useI18n();
  const { isSaved, toggleSave } = useSaved();
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [store, setStore] = useState('all');
  const [filterBarKey, setFilterBarKey] = useState(0);

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

  const filteredProducts = useMemo(() => {
    const filtered = filterCatalogProducts(products, {
      category: 'all',
      store,
      maxPrice,
      currency,
    });
    const searched = query.trim()
      ? searchAndRankProducts(filtered, query, articles)
      : filtered;

    return sortBy === 'newest'
      ? searched
      : sortCatalogProducts(searched, sortBy, currency);
  }, [articles, currency, maxPrice, products, query, sortBy, store]);

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
          totalProducts={products.length}
          filteredCount={filteredProducts.length}
          products={products}
          sources={sources}
          articles={articles}
        />

        <section className={styles.section}>
          <SignatureMotif index="02" label={messages.nav.products} />
          {filteredProducts.length > 0 ? (
            <div className={styles.productGrid}>
              {filteredProducts.map((product) => (
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
                products.length > 0
                  ? messages.empty.noSearchMatchTitle
                  : messages.empty.catalogTitle
              }
              description={
                products.length > 0
                  ? messages.empty.noSearchMatchDescription
                  : messages.empty.catalogDescription
              }
              primaryActionLabel={
                products.length > 0
                  ? messages.filters.resetFilters
                  : messages.nav.products
              }
              primaryActionHref={
                products.length > 0 ? undefined : `/${locale}/products`
              }
              onPrimaryAction={products.length > 0 ? resetFilters : undefined}
            />
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
