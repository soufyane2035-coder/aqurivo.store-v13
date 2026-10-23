'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Search, X } from 'lucide-react';
import type { Product } from '@/types';
import {
  type BrowserProductSnapshot,
  fetchBrowserCatalogSnapshots,
  getBrowserViewedProducts,
  recordBrowserProductView,
  searchBrowserProductSnapshots,
} from '@/lib/viewedProductsStorage';
import { WorthBuyingLogo } from './WorthBuyingLogo';
import styles from './IsItWorthBuying.module.css';

interface IsItWorthBuyingProps {
  locale: 'ar' | 'en';
  initialPrice?: number;
}

type CategoryId = 'tech' | 'fashion' | 'home' | 'fitness';

interface CategoryConfig {
  id: CategoryId;
  nameAr: string;
  nameEn: string;
  benchmarkCostPerUse: number;
  defaultPrice: number;
  defaultUsesPerMonth: number;
  defaultYears: number;
  defaultResalePct: number;
  alternativeNameAr: string;
  alternativeNameEn: string;
  iconPath: string;
}

const CATEGORIES: CategoryConfig[] = [
  {
    id: 'tech',
    nameAr: 'تقنية وإلكترونيات',
    nameEn: 'Tech & Gadgets',
    benchmarkCostPerUse: 0.85,
    defaultPrice: 450,
    defaultUsesPerMonth: 25,
    defaultYears: 3,
    defaultResalePct: 35,
    alternativeNameAr: 'المعيار القياسي للأجهزة اليومية',
    alternativeNameEn: 'Daily tech device benchmark',
    iconPath:
      'M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6zm-2 11h20v2H2v-2z',
  },
  {
    id: 'fashion',
    nameAr: 'ملابس وساعات',
    nameEn: 'Apparel & Watches',
    benchmarkCostPerUse: 1.6,
    defaultPrice: 160,
    defaultUsesPerMonth: 6,
    defaultYears: 3,
    defaultResalePct: 20,
    alternativeNameAr: 'معيار تكلفة الارتداء الواحدة',
    alternativeNameEn: 'Standard cost-per-wear benchmark',
    iconPath:
      'M16 3l5 3-2 4-3-1v11H8V9L5 10 3 6l5-3a4 4 0 0 0 8 0z',
  },
  {
    id: 'home',
    nameAr: 'قهوة وأجهزة منزلية',
    nameEn: 'Home & Coffee Gear',
    benchmarkCostPerUse: 0.55,
    defaultPrice: 240,
    defaultUsesPerMonth: 30,
    defaultYears: 4,
    defaultResalePct: 25,
    alternativeNameAr: 'مقارنة بشراء قهوة أو خدمة خارجية',
    alternativeNameEn: 'Compared to buying cafe/external service',
    iconPath:
      'M18 8h1a4 4 0 0 1 0 8h-1v1a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8h14zm0 2v4h1a2 2 0 0 0 0-4h-1zM6 3h10v2H6V3z',
  },
  {
    id: 'fitness',
    nameAr: 'رياضة وهوايات',
    nameEn: 'Fitness & Hobbies',
    benchmarkCostPerUse: 1.25,
    defaultPrice: 200,
    defaultUsesPerMonth: 12,
    defaultYears: 2.5,
    defaultResalePct: 30,
    alternativeNameAr: 'مقارنة بجلسة نادي أو استئجار معدات',
    alternativeNameEn: 'Compared to gym pass or gear rental',
    iconPath:
      'M6.5 6.5L17.5 17.5M3 10l7-7m4 18l7-7M2 6l4-4m12 20l4-4',
  },
];

interface PresetScenario {
  id: string;
  labelAr: string;
  labelEn: string;
  category: CategoryId;
  price: number;
  usesPerMonth: number;
  years: number;
  resalePct: number;
  replacesRecurring: boolean;
  buyWithoutDiscount: boolean;
  fitsBudget: boolean;
}

const PRESETS: PresetScenario[] = [
  {
    id: 'headphones',
    labelAr: 'سماعات عازلة للضوضاء ($320)',
    labelEn: 'ANC Headphones ($320)',
    category: 'tech',
    price: 320,
    usesPerMonth: 28,
    years: 3,
    resalePct: 30,
    replacesRecurring: false,
    buyWithoutDiscount: true,
    fitsBudget: true,
  },
  {
    id: 'espresso',
    labelAr: 'ماكينة إسبريسو منزلية ($280)',
    labelEn: 'Home Espresso Maker ($280)',
    category: 'home',
    price: 280,
    usesPerMonth: 30,
    years: 4,
    resalePct: 25,
    replacesRecurring: true,
    buyWithoutDiscount: true,
    fitsBudget: true,
  },
  {
    id: 'jacket',
    labelAr: 'معطف مناسبات فاخر ($260)',
    labelEn: 'Occasion Designer Coat ($260)',
    category: 'fashion',
    price: 260,
    usesPerMonth: 2,
    years: 2,
    resalePct: 15,
    replacesRecurring: false,
    buyWithoutDiscount: false,
    fitsBudget: true,
  },
  {
    id: 'treadmill',
    labelAr: 'جهاز مشي منزلي ($490)',
    labelEn: 'Folding Walking Pad ($490)',
    category: 'fitness',
    price: 490,
    usesPerMonth: 16,
    years: 3,
    resalePct: 30,
    replacesRecurring: true,
    buyWithoutDiscount: true,
    fitsBudget: true,
  },
];

const FREQ_OPTIONS = [
  { uses: 30, titleAr: 'يومياً', titleEn: 'Daily', metaAr: '30/شهر', metaEn: '30/mo' },
  { uses: 12, titleAr: 'عدة مرات أسبوعياً', titleEn: 'Few times/wk', metaAr: '12/شهر', metaEn: '12/mo' },
  { uses: 4, titleAr: 'أسبوعياً', titleEn: 'Weekly', metaAr: '4/شهر', metaEn: '4/mo' },
  { uses: 1, titleAr: 'مناسبات فقط', titleEn: 'Rarely', metaAr: '1/شهر', metaEn: '1/mo' },
];

function inferCategoryFromProduct(snap: BrowserProductSnapshot): CategoryId {
  const combined = `${snap.categorySlug} ${snap.titleAr} ${snap.titleEn}`.toLowerCase();
  if (
    combined.includes('fashion') ||
    combined.includes('watch') ||
    combined.includes('apparel') ||
    combined.includes('shoe') ||
    combined.includes('ملابس') ||
    combined.includes('ساع') ||
    combined.includes('حذاء') ||
    combined.includes('معطف') ||
    combined.includes('عطر')
  ) {
    return 'fashion';
  }
  if (
    combined.includes('home') ||
    combined.includes('kitchen') ||
    combined.includes('coffee') ||
    combined.includes('منزل') ||
    combined.includes('مطبخ') ||
    combined.includes('قهو') ||
    combined.includes('مكنس')
  ) {
    return 'home';
  }
  if (
    combined.includes('fitness') ||
    combined.includes('sport') ||
    combined.includes('health') ||
    combined.includes('gym') ||
    combined.includes('رياض') ||
    combined.includes('لياق') ||
    combined.includes('صحة')
  ) {
    return 'fitness';
  }
  return 'tech';
}

export function IsItWorthBuying({ locale, initialPrice }: IsItWorthBuyingProps) {
  const isAr = locale === 'ar';

  const [viewedProducts, setViewedProducts] = useState<BrowserProductSnapshot[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<BrowserProductSnapshot[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoadingCatalog, setIsLoadingCatalog] = useState<boolean>(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const ribbonTrackRef = useRef<HTMLDivElement | null>(null);
  const [isDraggingRibbon, setIsDraggingRibbon] = useState<boolean>(false);
  const dragStateRef = useRef<{
    isDown: boolean;
    startX: number;
    startScrollLeft: number;
    movedDistance: number;
  }>({
    isDown: false,
    startX: 0,
    startScrollLeft: 0,
    movedDistance: 0,
  });
  const [selectedViewedProduct, setSelectedViewedProduct] =
    useState<BrowserProductSnapshot | null>(null);
  const [failedThumbIds, setFailedThumbIds] = useState<Record<string, boolean>>({});

  const [activePreset, setActivePreset] = useState<string>('headphones');
  const [categoryId, setCategoryId] = useState<CategoryId>('tech');
  const [priceInput, setPriceInput] = useState<string>('320');
  const [usesPerMonth, setUsesPerMonth] = useState<number>(28);
  const [years, setYears] = useState<number>(3);
  const [resalePct, setResalePct] = useState<number>(30);

  // 3-Second Impulse Filter toggles
  const [replacesRecurring, setReplacesRecurring] = useState<boolean>(false);
  const [buyWithoutDiscount, setBuyWithoutDiscount] = useState<boolean>(true);
  const [fitsBudget, setFitsBudget] = useState<boolean>(true);

  const applyViewedProduct = (snap: BrowserProductSnapshot, fromSearch = false) => {
    const detectedCatId = inferCategoryFromProduct(snap);
    const catConfig =
      CATEGORIES.find((c) => c.id === detectedCatId) || CATEGORIES[0];

    setSelectedViewedProduct(snap);
    if (fromSearch) {
      recordBrowserProductView(snap);
      setViewedProducts(getBrowserViewedProducts());
    }
    setActivePreset('');
    setCategoryId(detectedCatId);
    setPriceInput(String(snap.priceUsd));
    setUsesPerMonth(catConfig.defaultUsesPerMonth);
    setYears(catConfig.defaultYears);
    setResalePct(catConfig.defaultResalePct);
    setReplacesRecurring(detectedCatId === 'home' || detectedCatId === 'fitness');
    setBuyWithoutDiscount(!(snap.discount && snap.discount >= 40));
    setFitsBudget(snap.priceUsd <= 350);
  };

  useEffect(() => {
    const stored = getBrowserViewedProducts();
    setViewedProducts(stored);

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const querySlug = params.get('productSlug')?.trim();
      if (querySlug) {
        const matched = stored.find((item) => item.slug === querySlug);
        if (matched) {
          applyViewedProduct(matched);
          return;
        }
      }
      const queryPrice = Number(params.get('price')) || Number(initialPrice);
      if (Number.isFinite(queryPrice) && queryPrice > 0) {
        setSelectedViewedProduct(null);
        setActivePreset('');
        setPriceInput(String(Math.round(queryPrice * 100) / 100));
        setFitsBudget(queryPrice <= 350);
        return;
      }
    }

    // If the visitor has an explicitly viewed product in their browser, auto-load it first!
    const topExplicit = stored.find((item) => item.isExplicitlyViewed);
    if (topExplicit) {
      applyViewedProduct(topExplicit);
    }
  }, []);

  // Pre-load full store catalog on mount so smart search and product keywords are ready immediately
  useEffect(() => {
    let active = true;
    setIsLoadingCatalog(true);
    fetchBrowserCatalogSnapshots()
      .then((snapshots) => {
        if (!active) return;
        setCatalogProducts(snapshots);
        const refreshed = getBrowserViewedProducts();
        if (refreshed.length > 0) {
          setViewedProducts(refreshed);
        }
      })
      .finally(() => {
        if (active) setIsLoadingCatalog(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const toggleSearchDrawer = () => {
    setIsSearchOpen((prev) => {
      const next = !prev;
      if (next) {
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 40);
      } else {
        setSearchQuery('');
      }
      return next;
    });
  };

  // Desktop mouse drag-to-scroll & wheel horizontal scroll handlers for the product ribbon
  const handleRibbonMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const track = ribbonTrackRef.current;
    if (!track) return;
    dragStateRef.current = {
      isDown: true,
      startX: e.pageX,
      startScrollLeft: track.scrollLeft,
      movedDistance: 0,
    };
  };

  const handleRibbonMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragStateRef.current.isDown) return;
    const track = ribbonTrackRef.current;
    if (!track) return;
    const deltaX = e.pageX - dragStateRef.current.startX;
    dragStateRef.current.movedDistance = Math.max(
      dragStateRef.current.movedDistance,
      Math.abs(deltaX)
    );
    if (dragStateRef.current.movedDistance > 5) {
      if (!isDraggingRibbon) setIsDraggingRibbon(true);
      e.preventDefault();
      track.scrollLeft = dragStateRef.current.startScrollLeft - deltaX;
    }
  };

  const handleRibbonMouseUpOrLeave = () => {
    if (!dragStateRef.current.isDown) return;
    dragStateRef.current.isDown = false;
    if (isDraggingRibbon) setIsDraggingRibbon(false);
  };

  const handleRibbonClickCapture = (e: React.MouseEvent<HTMLDivElement>) => {
    if (dragStateRef.current.movedDistance > 6) {
      e.preventDefault();
      e.stopPropagation();
      dragStateRef.current.movedDistance = 0;
    }
  };

  const handleRibbonWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const track = ribbonTrackRef.current;
    if (!track || track.scrollWidth <= track.clientWidth + 2) return;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      track.scrollLeft += isAr ? -e.deltaY : e.deltaY;
    }
  };

  // Filtered product list: shows viewed products normally, or smart-searches across all store + viewed products when search is active
  const displayedProducts = useMemo(() => {
    const trimmed = searchQuery.trim();
    if (!isSearchOpen && !trimmed) {
      return viewedProducts.length > 0 ? viewedProducts : catalogProducts;
    }

    const mergedMap = new Map<string, BrowserProductSnapshot>();
    for (const item of viewedProducts) {
      mergedMap.set(item.slug, item);
    }
    for (const item of catalogProducts) {
      const existing = mergedMap.get(item.slug);
      if (!existing) {
        mergedMap.set(item.slug, item);
      } else if (!existing.searchKeywords && item.searchKeywords) {
        mergedMap.set(item.slug, {
          ...existing,
          searchKeywords: item.searchKeywords,
        });
      }
    }
    const allPool = Array.from(mergedMap.values());

    if (!trimmed) {
      return allPool;
    }

    return searchBrowserProductSnapshots(allPool, trimmed);
  }, [viewedProducts, catalogProducts, isSearchOpen, searchQuery]);

  const activeCategory = useMemo(
    () => CATEGORIES.find((c) => c.id === categoryId) || CATEGORIES[0],
    [categoryId]
  );

  const applyCategory = (cat: CategoryConfig) => {
    setCategoryId(cat.id);
    setActivePreset('');
  };

  const applyPreset = (preset: PresetScenario) => {
    setSelectedViewedProduct(null);
    setActivePreset(preset.id);
    setCategoryId(preset.category);
    setPriceInput(String(preset.price));
    setUsesPerMonth(preset.usesPerMonth);
    setYears(preset.years);
    setResalePct(preset.resalePct);
    setReplacesRecurring(preset.replacesRecurring);
    setBuyWithoutDiscount(preset.buyWithoutDiscount);
    setFitsBudget(preset.fitsBudget);
  };

  const parsedPrice = Number(priceInput);
  const hasInvalidInput =
    !Number.isFinite(parsedPrice) ||
    parsedPrice <= 0 ||
    usesPerMonth <= 0 ||
    years <= 0;

  const analysis = useMemo(() => {
    const safePrice = Number.isFinite(parsedPrice) && parsedPrice > 0 ? parsedPrice : 0;
    const totalMonths = Math.max(1, Math.round(years * 12));
    const totalUses = Math.max(1, Math.round(usesPerMonth * totalMonths));
    const resaleValue = safePrice * (resalePct / 100);
    const netCost = Math.max(0, safePrice - resaleValue);

    const grossCostPerUse = safePrice / totalUses;
    const netCostPerUse = netCost / totalUses;

    const benchmark = activeCategory.benchmarkCostPerUse;
    const ratio = netCostPerUse / benchmark;

    // Calculate base score (0 to 100) from cost-per-use vs category benchmark
    let rawScore = 100 - ratio * 34;
    if (replacesRecurring) rawScore += 12;
    if (buyWithoutDiscount) {
      rawScore += 6;
    } else {
      rawScore -= 14;
    }
    if (fitsBudget) {
      rawScore += 6;
    } else {
      rawScore -= 18;
    }

    const score = Math.max(5, Math.min(99, Math.round(rawScore)));

    // Break-even uses & month (when netCost / uses <= benchmark * 1.15)
    const targetCostPerUse = benchmark * 1.15;
    const breakEvenUses = Math.max(1, Math.ceil(netCost / targetCostPerUse));
    const breakEvenMonths = Math.ceil(breakEvenUses / Math.max(1, usesPerMonth));
    const reachesBreakEven = breakEvenUses <= totalUses;

    // Build decay curve points across 8 checkpoints of totalMonths
    const curvePoints: { month: number; cpu: number }[] = [];
    const steps = 8;
    for (let i = 1; i <= steps; i++) {
      const m = Math.max(1, Math.round((totalMonths / steps) * i));
      const u = Math.max(1, m * usesPerMonth);
      curvePoints.push({
        month: m,
        cpu: netCost / u,
      });
    }

    const tier: 'smart' | 'consider' | 'impulse' =
      score >= 72 ? 'smart' : score >= 46 ? 'consider' : 'impulse';

    return {
      safePrice,
      totalMonths,
      totalUses,
      resaleValue,
      netCost,
      grossCostPerUse,
      netCostPerUse,
      benchmark,
      score,
      tier,
      breakEvenUses,
      breakEvenMonths,
      reachesBreakEven,
      curvePoints,
    };
  }, [
    parsedPrice,
    years,
    usesPerMonth,
    resalePct,
    activeCategory,
    replacesRecurring,
    buyWithoutDiscount,
    fitsBudget,
  ]);

  // Always use Western Latin numerals (0123456789) in both Arabic and English modes
  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    []
  );

  const intFormatter = useMemo(
    () => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }),
    []
  );

  // Arc math for semi-circle gauge
  const arcRadius = 78;
  const arcCircumference = Math.PI * arcRadius;
  const strokeDashoffset =
    arcCircumference - (analysis.score / 100) * arcCircumference;

  const gaugeStrokeColor =
    analysis.tier === 'smart'
      ? 'var(--color-accent-primary)'
      : analysis.tier === 'consider'
        ? 'var(--color-accent-gold)'
        : 'var(--color-danger)';

  // SVG Curve coordinates
  const maxCurveCpu = Math.max(
    analysis.curvePoints[0]?.cpu || 1,
    analysis.benchmark * 2
  );
  const svgWidth = 320;
  const svgHeight = 96;
  const padX = 14;
  const padY = 12;

  const polylinePoints = analysis.curvePoints
    .map((pt, idx) => {
      const x =
        padX +
        (idx / Math.max(1, analysis.curvePoints.length - 1)) *
          (svgWidth - padX * 2);
      const normalizedY = Math.min(1, pt.cpu / maxCurveCpu);
      const y = padY + (1 - normalizedY) * (svgHeight - padY * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const benchmarkY =
    padY +
    (1 - Math.min(1, analysis.benchmark / maxCurveCpu)) *
      (svgHeight - padY * 2);

  return (
    <div className={styles.labWrapper}>
      {/* Smart Browser Viewed Products — Sleek Architectural Horizontal Ribbon Dock */}
      <div className={styles.presetBar}>
        <div className={styles.presetHeaderRow}>
          <div className={styles.presetLabelWrap}>
            <span className={styles.telemetryDiamond} aria-hidden="true">
              ◆
            </span>
            <span className={styles.presetLabel}>
              {viewedProducts.length > 0
                ? isAr
                  ? 'افحص منتجاً شاهدته بنقرة:'
                  : '1-Click Store Value Check:'
                : isAr
                  ? 'جرّب سيناريو واقعي بنقرة:'
                  : 'Try a 1-click scenario:'}
            </span>
            <button
              type="button"
              onClick={toggleSearchDrawer}
              aria-expanded={isSearchOpen}
              aria-label={
                isAr
                  ? isSearchOpen
                    ? 'إغلاق البحث في المنتجات'
                    : 'البحث في منتجات المتجر'
                  : isSearchOpen
                    ? 'Close product search'
                    : 'Search store products'
              }
              title={
                isAr
                  ? 'ابحث عن أي منتج في المتجر'
                  : 'Search any product in the store'
              }
              className={`${styles.storeSearchTriggerBtn} ${
                isSearchOpen ? styles.storeSearchTriggerBtnActive : ''
              }`}
            >
              {isSearchOpen ? (
                <X className={styles.storeSearchTriggerIcon} aria-hidden="true" />
              ) : (
                <Search className={styles.storeSearchTriggerIcon} aria-hidden="true" />
              )}
              <span className={styles.storeSearchTriggerText}>
                {isAr ? (isSearchOpen ? 'إغلاق' : 'بحث') : isSearchOpen ? 'Close' : 'Search'}
              </span>
            </button>
          </div>

          <div className={styles.storeHeaderActions}>
            {selectedViewedProduct ? (
              <Link
                href={`/${locale}/products/${encodeURIComponent(
                  selectedViewedProduct.slug
                )}`}
                className={styles.activeProductCompactLink}
              >
                <span>
                  {isAr ? 'صفحة المنتج المحدد' : 'Selected Product'}
                </span>
                <span aria-hidden="true">{isAr ? '↖' : '↗'}</span>
              </Link>
            ) : (
              <Link href={`/${locale}/products`} className={styles.browseStoreLink}>
                {isAr ? 'تصفح المتجر ←' : 'Explore Store →'}
              </Link>
            )}
          </div>
        </div>

        {/* Expandable Architectural Search Bar */}
        {isSearchOpen && (
          <div className={styles.storeSearchDrawer}>
            <div className={styles.storeSearchInputBox}>
              <Search className={styles.storeSearchInputIcon} aria-hidden="true" />
              <input
                ref={searchInputRef}
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                spellCheck={false}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                placeholder={
                  isAr
                    ? 'ابحث بأي كلمة بالعربية أو الإنجليزية (مثل: pc أو سماعة أو ماوس)...'
                    : 'Smart search in English or Arabic (e.g. pc, mini, headphones)...'
                }
                className={styles.storeSearchInput}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    searchInputRef.current?.focus();
                  }}
                  aria-label={isAr ? 'مسح البحث' : 'Clear search'}
                  className={styles.storeSearchClearBtn}
                >
                  <X className={styles.storeSearchClearIcon} aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Browser-Stored & Searchable Store Products Horizontal Ribbon */}
        {displayedProducts.length > 0 ? (
          <div
            ref={ribbonTrackRef}
            onMouseDown={handleRibbonMouseDown}
            onMouseMove={handleRibbonMouseMove}
            onMouseUp={handleRibbonMouseUpOrLeave}
            onMouseLeave={handleRibbonMouseUpOrLeave}
            onClickCapture={handleRibbonClickCapture}
            onWheel={handleRibbonWheel}
            className={`${styles.viewedRibbonTrack} ${
              isDraggingRibbon ? styles.viewedRibbonTrackDragging : ''
            }`}
            role="region"
            aria-label={
              isAr ? 'منتجات المتجر للفحص الفوري' : 'Store products for instant inspection'
            }
          >
            {displayedProducts.map((item) => {
              const itemTitle = isAr ? item.titleAr : item.titleEn;
              const isSelected = selectedViewedProduct?.slug === item.slug;
              const showThumb = Boolean(
                item.imageUrl && !failedThumbIds[item.slug]
              );

              return (
                <button
                  key={item.slug}
                  type="button"
                  draggable={false}
                  onClick={() => applyViewedProduct(item, isSearchOpen)}
                  aria-pressed={isSelected}
                  className={`${styles.viewedCapsule} ${
                    isSelected ? styles.viewedCapsuleActive : ''
                  }`}
                >
                  <div className={styles.viewedThumbWrap}>
                    {showThumb ? (
                      <img
                        src={item.imageUrl}
                        alt={itemTitle}
                        draggable={false}
                        className={styles.viewedThumbImg}
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        onError={() =>
                          setFailedThumbIds((prev) => ({
                            ...prev,
                            [item.slug]: true,
                          }))
                        }
                      />
                    ) : (
                      <span className={styles.viewedThumbFallback}>
                        {itemTitle.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    {isSelected && (
                      <span className={styles.activeCornerDot} aria-hidden="true" />
                    )}
                  </div>

                  <div className={styles.viewedCapsuleBody}>
                    <div className={styles.viewedTitleRow}>
                      <span className={styles.viewedTitle}>{itemTitle}</span>
                    </div>

                    <div className={styles.viewedMetaRow}>
                      <span dir="ltr" className={styles.viewedPrice}>
                        {currencyFormatter.format(item.priceUsd)}
                      </span>

                      {item.discount && item.discount > 0 && (
                        <span dir="ltr" className={styles.viewedDiscountTag}>
                          -{item.discount}%
                        </span>
                      )}

                      {isSelected && (
                        <span className={styles.activeInspectBadge}>
                          {isAr ? 'قيد الفحص' : 'Active'}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : isSearchOpen ? (
          <div className={styles.storeSearchEmpty}>
            <span>
              {isLoadingCatalog
                ? isAr
                  ? 'جاري تحميل منتجات المتجر...'
                  : 'Loading store products...'
                : isAr
                  ? 'لا يوجد منتج مطابق لبحثك حالياً.'
                  : 'No matching store product found.'}
            </span>
          </div>
        ) : null}

        {/* Built-in Quick Scenarios (Only shown if visitor hasn't viewed products yet, or as a compact single-line scroll) */}
        <div
          className={
            viewedProducts.length > 0 ? styles.presetScenariosRow : undefined
          }
        >
          {viewedProducts.length > 0 && (
            <span className={styles.presetSubTitle}>
              {isAr ? 'أمثلة سريعة:' : 'Presets:'}
            </span>
          )}
          <div className={styles.presetButtons}>
            {PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset)}
                className={`${styles.presetBtn} ${
                  activePreset === preset.id ? styles.presetBtnActive : ''
                }`}
              >
                {isAr ? preset.labelAr : preset.labelEn}
              </button>
            ))}
          </div>
        </div>
      </div>

      {hasInvalidInput && (
        <div className={styles.errorBox} role="alert">
          {isAr
            ? 'يرجى إدخال سعر منتج صحيح أكبر من صفر لحساب القرار بدقة.'
            : 'Please enter a valid product price greater than zero.'}
        </div>
      )}

      <div className={styles.studioGrid}>
        {/* Interactive Controls Column */}
        <div className={styles.controlsColumn}>
          {/* Step 1: Category Benchmark */}
          <section className={styles.panelCard}>
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.panelStep}>
                  {isAr ? 'الخطوة 01' : 'Step 01'}
                </span>
                <h2 className={styles.panelTitle}>
                  {isAr ? 'اختر فئة المنتج لضبط معيار المقارنة' : 'Select Product Category Benchmark'}
                </h2>
              </div>
              <span className={styles.panelHint}>
                {isAr ? activeCategory.alternativeNameAr : activeCategory.alternativeNameEn}
              </span>
            </div>

            <div className={styles.categoryGrid}>
              {CATEGORIES.map((cat) => {
                const isSelected = cat.id === categoryId;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => applyCategory(cat)}
                    className={`${styles.categoryBtn} ${
                      isSelected ? styles.categoryBtnActive : ''
                    }`}
                  >
                    <span className={styles.categoryIcon} aria-hidden="true">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d={cat.iconPath} />
                      </svg>
                    </span>
                    <span className={styles.categoryName}>
                      {isAr ? cat.nameAr : cat.nameEn}
                    </span>
                    <span className={styles.categoryBench}>
                      {isAr
                        ? `المعيار: $${cat.benchmarkCostPerUse}/استخدام`
                        : `Bench: $${cat.benchmarkCostPerUse}/use`}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Step 2: Price, Usage Frequency & Lifespan */}
          <section className={styles.panelCard}>
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.panelStep}>
                  {isAr ? 'الخطوة 02' : 'Step 02'}
                </span>
                <h2 className={styles.panelTitle}>
                  {isAr ? 'السعر، وتيرة الاستخدام، وقيمة إعادة البيع' : 'Price, Usage Cadence & Resale Recovery'}
                </h2>
              </div>
              <span className={styles.panelHint}>
                {isAr ? 'يتحدث لحظياً أثناء التحريك' : 'Updates live as you slide'}
              </span>
            </div>

            {/* Price Control */}
            <div className={styles.controlBlock}>
              <div className={styles.controlTopRow}>
                <label htmlFor="worth-price-input" className={styles.controlLabel}>
                  <span>{isAr ? 'سعر المنتج الحالي' : 'Product Price'}</span>
                  <span className={styles.controlSublabel}>
                    {isAr ? 'اكتب أي رقم أو حرّك المؤشر' : 'Type any amount or drag the slider'}
                  </span>
                </label>
                <div className={styles.numberInputWrap}>
                  <span className={styles.currencySymbol}>$</span>
                  <input
                    id="worth-price-input"
                    type="number"
                    min="1"
                    step="any"
                    className={styles.inlineNumberInput}
                    value={priceInput}
                    onChange={(e) => {
                      setPriceInput(e.target.value);
                      setActivePreset('');
                      setSelectedViewedProduct(null);
                    }}
                  />
                </div>
              </div>
              <input
                type="range"
                min="15"
                max="2500"
                step="5"
                className={styles.rangeSlider}
                value={Math.min(2500, Math.max(15, analysis.safePrice || 15))}
                onChange={(e) => {
                  setPriceInput(e.target.value);
                  setActivePreset('');
                  setSelectedViewedProduct(null);
                }}
                aria-label={isAr ? 'مؤشر سعر المنتج' : 'Product price slider'}
              />
              <div className={styles.rangeScale}>
                <span>$15</span>
                <span>$500</span>
                <span>$1,250</span>
                <span>$2,500+</span>
              </div>
            </div>

            <div className={styles.divider} />

            {/* Usage Frequency Control */}
            <div className={styles.controlBlock}>
              <div className={styles.controlTopRow}>
                <label htmlFor="worth-uses-slider" className={styles.controlLabel}>
                  <span>{isAr ? 'وتيرة الاستخدام الشهري' : 'Monthly Usage Frequency'}</span>
                  <span className={styles.controlSublabel}>
                    {isAr
                      ? 'كم مرة ستستخدمه فعلياً في الشهر الواحد؟'
                      : 'How often will you realistically use it per month?'}
                  </span>
                </label>
                <div className={styles.numberInputWrap}>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    className={styles.inlineNumberInput}
                    value={usesPerMonth}
                    onChange={(e) => {
                      const val = Math.max(1, Math.min(120, Number(e.target.value) || 1));
                      setUsesPerMonth(val);
                      setActivePreset('');
                    }}
                    aria-label={isAr ? 'عدد مرات الاستخدام شهرياً' : 'Uses per month'}
                  />
                  <span className={styles.unitSuffix}>
                    {isAr ? 'مرة/شهر' : 'uses/mo'}
                  </span>
                </div>
              </div>

              <div className={styles.freqButtons}>
                {FREQ_OPTIONS.map((opt) => {
                  const isCurrent = usesPerMonth === opt.uses;
                  return (
                    <button
                      key={opt.uses}
                      type="button"
                      onClick={() => {
                        setUsesPerMonth(opt.uses);
                        setActivePreset('');
                      }}
                      className={`${styles.freqBtn} ${
                        isCurrent ? styles.freqBtnActive : ''
                      }`}
                    >
                      <span className={styles.freqBtnTitle}>
                        {isAr ? opt.titleAr : opt.titleEn}
                      </span>
                      <span className={styles.freqBtnMeta}>
                        {isAr ? opt.metaAr : opt.metaEn}
                      </span>
                    </button>
                  );
                })}
              </div>

              <input
                id="worth-uses-slider"
                type="range"
                min="1"
                max="60"
                step="1"
                className={styles.rangeSlider}
                value={Math.min(60, usesPerMonth)}
                onChange={(e) => {
                  setUsesPerMonth(Number(e.target.value));
                  setActivePreset('');
                }}
              />
            </div>

            <div className={styles.divider} />

            {/* Lifespan Years Control */}
            <div className={styles.controlBlock}>
              <div className={styles.controlTopRow}>
                <label htmlFor="worth-years-slider" className={styles.controlLabel}>
                  <span>{isAr ? 'العمر الافتراضي المتوقع معك' : 'Expected Ownership Lifespan'}</span>
                  <span className={styles.controlSublabel}>
                    {isAr
                      ? `إجمالي ${intFormatter.format(analysis.totalUses)} استخدام خلال ${analysis.totalMonths} شهراً`
                      : `Total ${intFormatter.format(analysis.totalUses)} uses across ${analysis.totalMonths} months`}
                  </span>
                </label>
                <div className={styles.numberInputWrap}>
                  <input
                    type="number"
                    min="0.5"
                    max="15"
                    step="0.5"
                    className={styles.inlineNumberInput}
                    value={years}
                    onChange={(e) => {
                      const val = Math.max(0.5, Math.min(15, Number(e.target.value) || 0.5));
                      setYears(val);
                      setActivePreset('');
                    }}
                    aria-label={isAr ? 'عدد السنوات المتوقعة' : 'Expected years'}
                  />
                  <span className={styles.unitSuffix}>
                    {isAr ? 'سنوات' : 'years'}
                  </span>
                </div>
              </div>
              <input
                id="worth-years-slider"
                type="range"
                min="0.5"
                max="10"
                step="0.5"
                className={styles.rangeSlider}
                value={Math.min(10, years)}
                onChange={(e) => {
                  setYears(Number(e.target.value));
                  setActivePreset('');
                }}
              />
              <div className={styles.rangeScale}>
                <span>{isAr ? '6 أشهر' : '6 mos'}</span>
                <span>{isAr ? '3 سنوات' : '3 yrs'}</span>
                <span>{isAr ? '6 سنوات' : '6 yrs'}</span>
                <span>{isAr ? '10 سنوات' : '10 yrs'}</span>
              </div>
            </div>

            <div className={styles.divider} />

            {/* Resale Value Control */}
            <div className={styles.controlBlock}>
              <div className={styles.controlTopRow}>
                <label htmlFor="worth-resale-slider" className={styles.controlLabel}>
                  <span>
                    {isAr
                      ? 'قيمة إعادة البيع المستردة لاحقاً (Resale Value)'
                      : 'Estimated Resale Recovery Later'}
                  </span>
                  <span className={styles.controlSublabel}>
                    {isAr
                      ? 'كم بالمئة من سعره يمكنك استرداده لو بعته مستقبلاً؟'
                      : 'What % of the price can you recover if you sell it later?'}
                  </span>
                </label>
                <div className={styles.numberInputWrap}>
                  <span className={styles.inlineNumberInput}>{resalePct}%</span>
                </div>
              </div>
              <input
                id="worth-resale-slider"
                type="range"
                min="0"
                max="70"
                step="5"
                className={styles.rangeSlider}
                value={resalePct}
                onChange={(e) => {
                  setResalePct(Number(e.target.value));
                  setActivePreset('');
                }}
              />
              <div className={styles.resaleSummary}>
                <span>
                  {isAr
                    ? 'المبلغ المسترد عند البيع يخفض التكلفة الصافية إلى:'
                    : 'Resale recovery lowers your true net cost to:'}
                </span>
                <span dir="ltr" className={styles.resaleAmount}>
                  {currencyFormatter.format(analysis.netCost)}{' '}
                  {resalePct > 0
                    ? isAr
                      ? `(-${currencyFormatter.format(analysis.resaleValue)})`
                      : `(-${currencyFormatter.format(analysis.resaleValue)} resale)`
                    : ''}
                </span>
              </div>
            </div>
          </section>

          {/* Step 3: 3-Second Impulse Filter */}
          <section className={styles.panelCard}>
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.panelStep}>
                  {isAr ? 'الخطوة 03' : 'Step 03'}
                </span>
                <h2 className={styles.panelTitle}>
                  {isAr ? 'اختبار النزوة العاطفية (3 ثوانٍ)' : '3-Second Impulse Filter'}
                </h2>
              </div>
              <span className={styles.panelHint}>
                {isAr ? 'يكشف الشراء الوهمي' : 'Filters out FOMO buying'}
              </span>
            </div>

            <div className={styles.impulseList}>
              <button
                type="button"
                role="switch"
                aria-checked={replacesRecurring}
                onClick={() => setReplacesRecurring((v) => !v)}
                className={`${styles.impulseToggle} ${
                  replacesRecurring ? styles.impulseToggleActive : ''
                }`}
              >
                <div className={styles.impulseTextGroup}>
                  <span className={styles.impulseQuestion}>
                    {isAr
                      ? 'هل يغنيك هذا المنتج عن دفع اشتراك أو شراء متكرر؟'
                      : 'Does this replace a recurring subscription or daily purchase?'}
                  </span>
                  <span className={styles.impulseImpact}>
                    {isAr
                      ? 'مثال: ماكينة قهوة تغنيك عن المقهى، أو أداة تغنيك عن نادي (+12 نقطة جدارة)'
                      : 'e.g., Espresso machine replacing cafe runs (+12 Worth-It score)'}
                  </span>
                </div>
                <span className={styles.switchTrack}>
                  <span className={styles.switchThumb} />
                </span>
              </button>

              <button
                type="button"
                role="switch"
                aria-checked={buyWithoutDiscount}
                onClick={() => setBuyWithoutDiscount((v) => !v)}
                className={`${styles.impulseToggle} ${
                  buyWithoutDiscount ? styles.impulseToggleActive : ''
                }`}
              >
                <div className={styles.impulseTextGroup}>
                  <span className={styles.impulseQuestion}>
                    {isAr
                      ? 'لو لم يكن عليه عرض أو تخفيض اليوم، هل كنت ستفكر في شرائه؟'
                      : 'Would you still want this item if it were NOT on sale today?'}
                  </span>
                  <span className={styles.impulseImpact}>
                    {isAr
                      ? 'يحمي ميزانيتك من خدعة العروض الوهمية المؤقتة'
                      : 'Protects your wallet from artificial discount urgency'}
                  </span>
                </div>
                <span className={styles.switchTrack}>
                  <span className={styles.switchThumb} />
                </span>
              </button>

              <button
                type="button"
                role="switch"
                aria-checked={fitsBudget}
                onClick={() => setFitsBudget((v) => !v)}
                className={`${styles.impulseToggle} ${
                  fitsBudget ? styles.impulseToggleActive : ''
                }`}
              >
                <div className={styles.impulseTextGroup}>
                  <span className={styles.impulseQuestion}>
                    {isAr
                      ? 'هل يمكنك دفع ثمنه بالكامل اليوم دون لمس مدخرات الطوارئ؟'
                      : 'Can you pay for it in cash today without touching emergency savings?'}
                  </span>
                  <span className={styles.impulseImpact}>
                    {isAr
                      ? 'القاعدة الذهبية: الشراء الذكي لا يربك التزاماتك الأساسية'
                      : 'Golden rule: A smart purchase never stresses monthly essentials'}
                  </span>
                </div>
                <span className={styles.switchTrack}>
                  <span className={styles.switchThumb} />
                </span>
              </button>
            </div>
          </section>
        </div>

        {/* Sticky Live Verdict Column */}
        <aside className={styles.verdictColumn} aria-live="polite">
          <div
            className={`${styles.verdictCard} ${
              analysis.tier === 'smart'
                ? styles.verdictCardSmart
                : analysis.tier === 'consider'
                  ? styles.verdictCardConsider
                  : styles.verdictCardImpulse
            }`}
          >
            {/* Official Tool Seal Header */}
            <div className={styles.verdictSealBar}>
              <WorthBuyingLogo size="sm" locale={locale} />
              <span className={styles.verdictSealTag}>
                {isAr ? 'ختم قرار AQURIVO الذكي' : 'AQURIVO VERDICT SEAL'}
              </span>
            </div>

            {/* Semi-Circular Score Gauge */}
            <div className={styles.gaugeSection}>
              <div className={styles.gaugeSvgWrap}>
                <svg
                  className={styles.gaugeSvg}
                  viewBox="0 0 200 115"
                  aria-hidden="true"
                >
                  {/* Background Track Arc */}
                  <path
                    d="M 22 100 A 78 78 0 0 1 178 100"
                    fill="none"
                    stroke="var(--color-bg-muted)"
                    strokeWidth="12"
                    strokeLinecap="round"
                  />
                  {/* Active Score Arc */}
                  <path
                    d="M 22 100 A 78 78 0 0 1 178 100"
                    fill="none"
                    stroke={gaugeStrokeColor}
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={arcCircumference}
                    strokeDashoffset={strokeDashoffset}
                    style={{ transition: 'stroke-dashoffset 0.35s ease, stroke 0.25s ease' }}
                  />
                </svg>
                <div className={styles.gaugeCenterOverlay}>
                  <span dir="ltr" className={styles.scoreValue}>
                    {analysis.score}
                  </span>
                  <span className={styles.scoreOut}>
                    {isAr ? 'مؤشر الجدارة / 100' : 'WORTH-IT SCORE / 100'}
                  </span>
                </div>
              </div>

              <h3
                className={`${styles.verdictTitle} ${
                  analysis.tier === 'smart'
                    ? styles.verdictTitleSmart
                    : analysis.tier === 'consider'
                      ? styles.verdictTitleConsider
                      : styles.verdictTitleImpulse
                }`}
              >
                {analysis.tier === 'smart'
                  ? isAr
                    ? 'يستحق الشراء بثقة ✓'
                    : 'Smart Buy — Worth It ✓'
                  : analysis.tier === 'consider'
                    ? isAr
                      ? 'قرار متوازن — تمهّل قليلاً'
                      : 'Borderline Value — Consider Carefully'
                    : isAr
                      ? 'فكّر مجدداً — تكلفة الاستخدام مرتفعة ✗'
                      : 'Skip or Wait — High Cost Per Use ✗'}
              </h3>

              <p className={styles.verdictSubtitle}>
                {analysis.tier === 'smart'
                  ? isAr
                    ? `تكلفة الاستخدام الصافية (${currencyFormatter.format(analysis.netCostPerUse)}) أقل من معيار فئة «${activeCategory.nameAr}» (${currencyFormatter.format(analysis.benchmark)}).`
                    : `Your net cost per use (${currencyFormatter.format(analysis.netCostPerUse)}) beats the ${activeCategory.nameEn} benchmark (${currencyFormatter.format(analysis.benchmark)}).`
                  : analysis.tier === 'consider'
                    ? isAr
                      ? `المنتج قريب من حد التعادل لفئة «${activeCategory.nameAr}». يصبح صفقة رابحة إذا التزمت باستخدامه بانتظام.`
                      : `Close to the ${activeCategory.nameEn} benchmark. It pays off only if you stick to consistent usage.`
                    : isAr
                      ? `كل استخدام يكلفك ${currencyFormatter.format(analysis.netCostPerUse)}، وهو أعلى بكثير من المعدل الطبيعي لهذه الفئة (${currencyFormatter.format(analysis.benchmark)}).`
                      : `Each use costs ${currencyFormatter.format(analysis.netCostPerUse)}, well above the healthy benchmark (${currencyFormatter.format(analysis.benchmark)}) for this category.`}
              </p>
            </div>

            {/* Key Metrics */}
            <div className={styles.metricsPair}>
              <div className={styles.metricBox}>
                <span className={styles.metricLabel}>
                  {isAr ? 'التكلفة الصافية لكل استخدام' : 'Net Cost Per Use'}
                </span>
                <span dir="ltr" className={styles.metricNumber}>
                  {currencyFormatter.format(analysis.netCostPerUse)}
                </span>
                <span className={styles.metricSub}>
                  {resalePct > 0
                    ? isAr
                      ? `قبل البيع: ${currencyFormatter.format(analysis.grossCostPerUse)}`
                      : `Gross: ${currencyFormatter.format(analysis.grossCostPerUse)}/use`
                    : isAr
                      ? 'بدون قيمة إعادة بيع'
                      : 'Assuming $0 resale'}
                </span>
              </div>

              <div className={styles.metricBox}>
                <span className={styles.metricLabel}>
                  {isAr ? 'إجمالي مرات الاستخدام' : 'Total Lifetime Uses'}
                </span>
                <span dir="ltr" className={styles.metricNumberGold}>
                  {intFormatter.format(analysis.totalUses)}
                </span>
                <span className={styles.metricSub}>
                  {isAr
                    ? `خلال ${analysis.totalMonths} شهراً`
                    : `Over ${analysis.totalMonths} months`}
                </span>
              </div>
            </div>

            {/* Category Benchmark Bar */}
            <div className={styles.benchmarkBox}>
              <div className={styles.benchmarkTop}>
                <span>
                  {isAr
                    ? `مقارنة بمعيار ${activeCategory.nameAr}`
                    : `vs. ${activeCategory.nameEn} Benchmark`}
                </span>
                <strong dir="ltr">
                  {currencyFormatter.format(analysis.netCostPerUse)} /{' '}
                  {currencyFormatter.format(analysis.benchmark)}
                </strong>
              </div>
              <div className={styles.benchmarkTrack}>
                <div
                  className={styles.benchmarkFill}
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(12, (analysis.benchmark / Math.max(0.05, analysis.netCostPerUse)) * 60)
                    )}%`,
                    backgroundColor: gaugeStrokeColor,
                  }}
                />
              </div>
            </div>

            {/* Break-Even Decay Curve */}
            <div className={styles.chartBox}>
              <div className={styles.chartHeader}>
                <span className={styles.chartTitle}>
                  {isAr ? 'منحنى انخفاض التكلفة ونقطة التعادل' : 'Cost-Per-Use Decay & Break-Even'}
                </span>
                <span className={styles.chartMilestone}>
                  {analysis.reachesBreakEven
                    ? isAr
                      ? `نقطة التعادل: الشهر ${analysis.breakEvenMonths}`
                      : `Break-even: Month ${analysis.breakEvenMonths}`
                    : isAr
                      ? 'يتطلب استخداماً أكثر للتعادل'
                      : 'Needs higher usage to break even'}
                </span>
              </div>

              <svg
                className={styles.curveSvg}
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                role="img"
                aria-label={
                  isAr
                    ? 'رسم بياني يوضح انخفاض تكلفة الاستخدام بمرور الأشهر'
                    : 'Chart showing cost per use dropping over months'
                }
              >
                {/* Benchmark Reference Dashed Line */}
                <line
                  x1={padX}
                  y1={benchmarkY}
                  x2={svgWidth - padX}
                  y2={benchmarkY}
                  stroke="var(--color-accent-gold)"
                  strokeWidth="1.2"
                  strokeDasharray="4 4"
                />
                {/* Decay Polyline */}
                <polyline
                  fill="none"
                  stroke="var(--color-accent-primary)"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={polylinePoints}
                />
                {/* Data nodes */}
                {analysis.curvePoints.map((pt, idx) => {
                  const x =
                    padX +
                    (idx / Math.max(1, analysis.curvePoints.length - 1)) *
                      (svgWidth - padX * 2);
                  const normalizedY = Math.min(1, pt.cpu / maxCurveCpu);
                  const y = padY + (1 - normalizedY) * (svgHeight - padY * 2);
                  return (
                    <circle
                      key={pt.month}
                      cx={x}
                      cy={y}
                      r={idx === analysis.curvePoints.length - 1 ? 4.5 : 3}
                      fill={
                        pt.cpu <= analysis.benchmark * 1.15
                          ? 'var(--color-accent-primary)'
                          : 'var(--color-accent-gold)'
                      }
                    />
                  );
                })}
              </svg>

              <div className={styles.chartFooter}>
                {analysis.reachesBreakEven
                  ? isAr
                    ? `بعد ${intFormatter.format(analysis.breakEvenUses)} استخداماً (حوالي الشهر ${analysis.breakEvenMonths})، تنخفض تكلفة الاستخدام تحت الخط الذهبي للمعيار وتصبح صفقة رابحة.`
                    : `After ${intFormatter.format(analysis.breakEvenUses)} uses (~Month ${analysis.breakEvenMonths}), your cost per use drops below the gold benchmark line.`
                  : isAr
                    ? `للوصول إلى نقطة التعادل في هذه الفئة، تحتاج إلى ${intFormatter.format(analysis.breakEvenUses)} استخداماً أو شراء بديل بسعر أقل.`
                    : `To break even in this category, you would need ${intFormatter.format(analysis.breakEvenUses)} total uses or a lower purchase price.`}
              </div>
            </div>

            {/* Cooling-Off Rule Actionable Recommendation */}
            <div className={styles.coolingBox}>
              <div className={styles.coolingIcon} aria-hidden="true">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <div className={styles.coolingContent}>
                <span className={styles.coolingTitle}>
                  {analysis.tier === 'smart'
                    ? isAr
                      ? 'نصيحة AQURIVO: ضوء أخضر للشراء'
                      : 'AQURIVO Rule: Green Light to Buy'
                    : analysis.tier === 'consider'
                      ? isAr
                        ? 'قاعدة الـ 48 ساعة للتأكد'
                        : 'Apply the 48-Hour Cooling Rule'
                      : isAr
                        ? 'قاعدة الـ 14 يوماً لحماية أموالك'
                        : 'Apply the 14-Day Cooling Rule'}
                </span>
                <span className={styles.coolingDesc}>
                  {analysis.tier === 'smart'
                    ? isAr
                      ? 'الأرقام في صالحك تماماً. تأكد فقط من مقارنة السعر بين متجرين قبل الدفع.'
                      : 'The math strongly favors this purchase. Just compare prices across two stores before checkout.'
                    : analysis.tier === 'consider'
                      ? isAr
                        ? 'اترك المنتج في سلة التسوق لمدة 48 ساعة. إذا بقيت متحمساً له بنفس القدر، توكل على الله.'
                        : 'Leave it in your cart for 48 hours. If you still genuinely need it after two days, go ahead.'
                      : isAr
                        ? 'أغلق صفحة الشراء وانتظر 14 يوماً، أو ابحث عن نسخة مستعملة بحالة ممتازة لتخفيض التكلفة للنصف.'
                        : 'Wait 14 days before buying, or look for a certified pre-owned option to cut the cost per use in half.'}
                </span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
