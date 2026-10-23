'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { Article, ArticleCardDto, Category, Locale, PartnerSource, Product, ProductCardDto } from '@/types';
import { useI18n } from '@/i18n/I18nProvider';
import { useSaved } from '@/features/saved/SavedProvider';
import { SiteHeader } from '@/components/sections/SiteHeader';
import { SiteFooter } from '@/components/sections/SiteFooter';
import { HeroSection } from '@/components/sections/HeroSection';
import { SignatureMotif } from '@/components/ui/SignatureMotif';
import { ProductCard } from '@/components/ui/ProductCard';
import { EditorialIssueCard } from '@/components/ui/EditorialIssueCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Testimonials } from '@/components/Testimonials/Testimonials';
import type { Testimonial } from '@/lib/testimonials';
import {
  buildInterleavedProductFeed,
  rankProductsForVisitor,
  recordVisitorInterest,
  searchAndRankArticles,
  searchAndRankProducts,
} from '@/lib/productSearch';
import { seedBrowserSeenProducts } from '@/lib/viewedProductsStorage';
import styles from '@/app/page.module.css';

interface HomeClientProps {
  products: Product[];
  categories: Category[];
  articles?: Article[];
  sources?: PartnerSource[];
  testimonials?: Testimonial[];
  heroBackgroundImageUrl?: string;
  pageLocale?: Locale;
}

export function HomeClient({
  products: initialProducts,
  categories,
  articles = [],
  testimonials,
  heroBackgroundImageUrl,
}: HomeClientProps) {
  const { locale, messages } = useI18n();
  const { isSaved, toggleSave } = useSaved();
  const isAr = locale === 'ar';
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [heroSearch, setHeroSearch] = useState('');
  const [selectedCategorySlug, setSelectedCategorySlug] = useState('');
  const [visitorReady, setVisitorReady] = useState(false);
  const [randomSeed, setRandomSeed] = useState(1);
  const [intentTick, setIntentTick] = useState(0);

  // Sync when initialProducts prop updates
  useEffect(() => {
    setProducts(initialProducts);
  }, [initialProducts]);

  useEffect(() => {
    setVisitorReady(true);
    setRandomSeed(Math.floor(Math.random() * 1000000) + 2);

    const handleIntentUpdate = () => {
      setIntentTick((prev) => prev + 1);
    };
    window.addEventListener('aqurivo:session-intent-updated', handleIntentUpdate);
    return () => {
      window.removeEventListener('aqurivo:session-intent-updated', handleIntentUpdate);
    };
  }, []);

  useEffect(() => {
    const trimmed = heroSearch.trim();
    if (!trimmed && !selectedCategorySlug) return;
    const timer = window.setTimeout(() => {
      recordVisitorInterest({
        query: trimmed || undefined,
        categorySlug: selectedCategorySlug || undefined,
        products,
      });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [heroSearch, selectedCategorySlug, products]);

  const handleChipSelect = (query: string, slug?: string) => {
    const targetSlug = slug || query;
    if (selectedCategorySlug === targetSlug) {
      setSelectedCategorySlug('');
      setHeroSearch('');
    } else {
      setSelectedCategorySlug(targetSlug);
      setHeroSearch('');
      recordVisitorInterest({ categorySlug: targetSlug, products });
    }
  };

  const matchedArticles = useMemo(() => {
    const trimmed = heroSearch.trim();
    if (!trimmed || articles.length === 0) return [];
    return searchAndRankArticles(articles, trimmed, products);
  }, [articles, heroSearch, products]);

  const displayProducts = useMemo(() => {
    if (heroSearch.trim()) {
      const searched = searchAndRankProducts(products, heroSearch, articles);
      if (selectedCategorySlug) {
        const catMatches = searched.filter(
          (p) =>
            p.categorySlug === selectedCategorySlug ||
            p.categoryId === selectedCategorySlug
        );
        const otherMatches = searched.filter(
          (p) =>
            p.categorySlug !== selectedCategorySlug &&
            p.categoryId !== selectedCategorySlug
        );
        return catMatches.length > 0 ? [...catMatches, ...otherMatches] : searched;
      }
      return searched.length > 0 ? searched : products;
    }

    if (selectedCategorySlug) {
      const exactCategoryProducts = products.filter(
        (p) =>
          p.categorySlug === selectedCategorySlug ||
          p.categoryId === selectedCategorySlug
      );
      const list = exactCategoryProducts.length > 0 ? exactCategoryProducts : products;
      return visitorReady
        ? rankProductsForVisitor(list, { activeCategorySlug: selectedCategorySlug })
        : list;
    }

    if (visitorReady) {
      return rankProductsForVisitor(products);
    }

    return products;
  }, [products, articles, heroSearch, selectedCategorySlug, visitorReady, intentTick]);

  const interleavedFeed = useMemo(
    () => buildInterleavedProductFeed(displayProducts, articles, randomSeed),
    [displayProducts, articles, randomSeed]
  );

  useEffect(() => {
    if (!visitorReady || displayProducts.length === 0) return;
    seedBrowserSeenProducts(displayProducts.slice(0, 8));
  }, [visitorReady, displayProducts]);

  return (
    <div className={styles.pageShell}>
      <SiteHeader />

      {/* Hero with Search Bar and Dynamic Category Chips */}
      <HeroSection
        backgroundImageUrl={heroBackgroundImageUrl}
        products={products}
        articles={articles}
        categories={categories}
        searchQuery={heroSearch}
        onSearchChange={(q) => {
          setHeroSearch(q);
          if (q.trim()) setSelectedCategorySlug('');
        }}
        activeChip={selectedCategorySlug}
        onChipSelect={handleChipSelect}
        pageLocale={locale}
      />

      <main id="main-content" className={`siteContainer ${styles.main}`}>
        {/* Section 01: Dynamic Products & Search Results Feed (Directly below Hero) */}
        <section id="home-products-section" className={styles.catalogSection}>
          <SignatureMotif
            label={
              heroSearch.trim()
                ? isAr
                  ? `نتائج البحث والتوصيات لـ "${heroSearch.trim()}"`
                  : `Search Results & Picks for "${heroSearch.trim()}"`
                : selectedCategorySlug
                  ? categories.find((c) => c.slug === selectedCategorySlug)?.name?.[locale] ||
                    messages.nav.products
                  : isAr
                    ? 'أحدث المنتجات والعروض'
                    : 'Products & Live Deals'
            }
            subtleText={
              products.length > 0
                ? isAr
                  ? 'مراجعات مستقلة وروابط مباشرة للمتجر الأصلي'
                  : 'Independent notes & direct store links'
                : undefined
            }
          />

          {/* Matching Buying Guides & Review Articles when searching */}
          {heroSearch.trim().length > 0 && matchedArticles.length > 0 && (
            <div className={styles.searchMatchedGuidesBlock}>
              <div className={styles.searchMatchedGuidesHeader}>
                <span>
                  {isAr
                    ? `مقالات وأدلة شراء مطابقة لبحثك (${matchedArticles.length})`
                    : `Matching Buying Guides & Articles (${matchedArticles.length})`}
                </span>
              </div>
              <div className={styles.guidesGrid}>
                {matchedArticles.slice(0, 3).map((article) => (
                  <EditorialIssueCard key={`search-art-${article.id}`} article={article} />
                ))}
              </div>
            </div>
          )}

          {displayProducts.length > 0 ? (
            <div className={styles.productGrid}>
              {interleavedFeed.map((entry, idx) =>
                entry.type === 'product' ? (
                  <ProductCard
                    key={entry.product.id}
                    product={entry.product}
                    isSaved={isSaved(entry.product.id)}
                    onToggleSave={toggleSave}
                    refContext="home_featured"
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
          ) : (
            <EmptyState
              title={messages.empty.catalogTitle}
              description={messages.empty.catalogDescription}
              primaryActionLabel={messages.nav.ourMethod}
              primaryActionHref={`/${locale}/about`}
              secondaryActionLabel={messages.nav.contact}
              secondaryActionHref={`/${locale}/contact`}
            />
          )}
        </section>

        {/* Section 02: Latest Editorial Buying Guides ("أحدث أدلة الشراء والمقارنات") */}
        {articles.length > 0 && (
          <section className={styles.guidesSection} aria-labelledby="home-guides-heading">
            <div className={styles.sectionHeaderRow}>
              <SignatureMotif
                label={isAr ? 'أدلة الشراء والمقارنات' : 'Buying Guides & Reviews'}
                subtleText={isAr ? 'مراجعات متأنية قبل الشراء' : 'In-depth product deep dives'}
              />
              <Link href={`/${locale}/guides`} className={styles.viewAllLink}>
                <span>{isAr ? 'عرض جميع الأدلة' : 'View All Guides'}</span>
                {isAr ? <ArrowLeft size={14} aria-hidden="true" /> : <ArrowRight size={14} aria-hidden="true" />}
              </Link>
            </div>

            <div className={styles.guidesGrid}>
              {articles.slice(0, 3).map((article, idx) => (
                <EditorialIssueCard
                  key={article.id}
                  article={article}
                  indexNumber={idx + 1}
                />
              ))}
            </div>
          </section>
        )}

        {/* Section 03: Interactive Visitor Testimonials ("ماذا يقول زوارنا") */}
        <Testimonials
          initialTestimonials={testimonials}
          sectionIndex={articles.length > 0 ? '03' : '02'}
        />
      </main>

      <SiteFooter productsCount={products.length} />
    </div>
  );
}
