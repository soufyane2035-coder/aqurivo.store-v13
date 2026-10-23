'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeftRight,
  ChevronDown,
  Compass,
  Globe,
  Search,
  X,
} from 'lucide-react';
import type { Product } from '@/types';
import {
  type BrowserProductSnapshot,
  fetchBrowserCatalogSnapshots,
  getBrowserViewedProducts,
  recordBrowserProductView,
  searchBrowserProductSnapshots,
} from '@/lib/viewedProductsStorage';
import {
  type GlobalCityBenchmark,
  type GlobalRegionId,
  GLOBAL_CITIES_DATA,
  GLOBAL_REGIONS,
  detectBrowserCityBenchmark,
  searchGlobalCities,
} from '@/lib/globalCostOfLivingData';
import styles from './CostOfLivingCompare.module.css';

export interface CostOfLivingCompareProps {
  locale: 'ar' | 'en';
}

type HousingMode = 'rent_center' | 'rent_suburb' | 'owned_home';
type HouseholdMode = 'single' | 'couple' | 'family';
type DisplayCurrencyMode = 'origin' | 'target' | 'usd';

export function CostOfLivingCompare({ locale }: CostOfLivingCompareProps) {
  const isAr = locale === 'ar';

  // Store Viewed Ribbon + Smart Search
  const [viewedProducts, setViewedProducts] = useState<BrowserProductSnapshot[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<BrowserProductSnapshot[]>([]);
  const [isProductSearchOpen, setIsProductSearchOpen] = useState<boolean>(false);
  const [productSearchQuery, setProductSearchQuery] = useState<string>('');
  const [isLoadingCatalog, setIsLoadingCatalog] = useState<boolean>(false);
  const productSearchInputRef = useRef<HTMLInputElement | null>(null);
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

  // Global Cities & Browser Auto-Detection State
  const [originCityId, setOriginCityId] = useState<string>('london_gb');
  const [targetCityId, setTargetCityId] = useState<string>('new_york_us');
  const [detectedBadgeText, setDetectedBadgeText] = useState<string>('');
  const [hasAutoDetected, setHasAutoDetected] = useState<boolean>(false);

  // Interactive Smart City Picker Drawer ('origin' | 'target' | null)
  const [activePicker, setActivePicker] = useState<'origin' | 'target' | null>(null);
  const [citySearchQuery, setCitySearchQuery] = useState<string>('');
  const [regionFilter, setRegionFilter] = useState<GlobalRegionId | 'all'>('all');
  const citySearchInputRef = useRef<HTMLInputElement | null>(null);

  // User Financial & Lifestyle Calibration
  const [salaryInput, setSalaryInput] = useState<string>('3500');
  const [housingMode, setHousingMode] = useState<HousingMode>('rent_center');
  const [householdMode, setHouseholdMode] = useState<HouseholdMode>('single');
  const [displayCurrencyMode, setDisplayCurrencyMode] =
    useState<DisplayCurrencyMode>('origin');

  const originCity = useMemo(
    () =>
      GLOBAL_CITIES_DATA.find((c) => c.id === originCityId) ||
      GLOBAL_CITIES_DATA[0],
    [originCityId]
  );

  const targetCity = useMemo(
    () =>
      GLOBAL_CITIES_DATA.find((c) => c.id === targetCityId) ||
      GLOBAL_CITIES_DATA[1],
    [targetCityId]
  );

  // Run browser location detection once on mount
  useEffect(() => {
    if (hasAutoDetected) return;
    const { detectedCity, suggestedTargetCity, detectedTimezone } =
      detectBrowserCityBenchmark();
    setOriginCityId(detectedCity.id);
    setTargetCityId(suggestedTargetCity.id);
    const localTypicalSalary = Math.max(
      1,
      Math.round(detectedCity.typicalNetSalaryUsd * detectedCity.rateFromUsd)
    );
    setSalaryInput(String(localTypicalSalary));
    setDetectedBadgeText(detectedTimezone);
    setHasAutoDetected(true);
  }, [hasAutoDetected]);

  // Load browser-viewed store products
  useEffect(() => {
    const syncViewed = () => {
      const list = getBrowserViewedProducts();
      setViewedProducts(list);
    };
    syncViewed();
    window.addEventListener('aqurivo:viewed-products-updated', syncViewed);
    window.addEventListener('storage', syncViewed);
    return () => {
      window.removeEventListener('aqurivo:viewed-products-updated', syncViewed);
      window.removeEventListener('storage', syncViewed);
    };
  }, []);

  // Preload catalog in background for instant smart product search
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

  // Focus product search input when opened
  useEffect(() => {
    if (isProductSearchOpen) {
      const timer = window.setTimeout(() => {
        productSearchInputRef.current?.focus();
      }, 40);
      return () => window.clearTimeout(timer);
    }
  }, [isProductSearchOpen]);

  // Focus city search input when picker opens
  useEffect(() => {
    if (activePicker) {
      const timer = window.setTimeout(() => {
        citySearchInputRef.current?.focus();
      }, 40);
      return () => window.clearTimeout(timer);
    }
  }, [activePicker]);

  // Strictly Western numerals ('en-US')
  const intFmt = useMemo(
    () =>
      new Intl.NumberFormat('en-US', {
        maximumFractionDigits: 0,
      }),
    []
  );

  const oneDecFmt = useMemo(
    () =>
      new Intl.NumberFormat('en-US', {
        maximumFractionDigits: 1,
      }),
    []
  );

  const formatCurrencyAmount = (
    amountUsd: number,
    modeOverride?: DisplayCurrencyMode
  ): string => {
    const safeUsd = Number.isFinite(amountUsd) ? amountUsd : 0;
    const activeMode = modeOverride || displayCurrencyMode;

    if (activeMode === 'usd') {
      return `$${intFmt.format(Math.round(safeUsd))}`;
    }

    const cityRef = activeMode === 'target' ? targetCity : originCity;
    const converted = Math.round(safeUsd * cityRef.rateFromUsd);
    const formatted = intFmt.format(converted);

    if (
      cityRef.currencySymbol === '$' ||
      cityRef.currencySymbol === '€' ||
      cityRef.currencySymbol === '£'
    ) {
      return `${cityRef.currencySymbol}${formatted}`;
    }
    return `${formatted} ${cityRef.currencyCode}`;
  };

  // Filtered store products for the top ribbon
  const displayedStoreProducts = useMemo(() => {
    const trimmed = productSearchQuery.trim();
    if (!isProductSearchOpen && !trimmed) {
      return viewedProducts;
    }

    const map = new Map<string, BrowserProductSnapshot>();
    for (const item of viewedProducts) {
      map.set(item.slug, item);
    }
    for (const item of catalogProducts) {
      if (!map.has(item.slug)) {
        map.set(item.slug, item);
      } else {
        const existing = map.get(item.slug)!;
        if (!existing.searchKeywords && item.searchKeywords) {
          map.set(item.slug, {
            ...existing,
            searchKeywords: item.searchKeywords,
          });
        }
      }
    }

    const allPool = Array.from(map.values());
    if (!trimmed) return allPool;
    return searchBrowserProductSnapshots(allPool, trimmed);
  }, [isProductSearchOpen, productSearchQuery, viewedProducts, catalogProducts]);

  // Filtered global cities for the smart country/city selector
  const filteredCities = useMemo(() => {
    return searchGlobalCities(GLOBAL_CITIES_DATA, citySearchQuery, regionFilter);
  }, [citySearchQuery, regionFilter]);

  // Group filtered cities by country for clean visual scanning
  const groupedCountries = useMemo(() => {
    const map = new Map<
      string,
      {
        countryCode: string;
        countryAr: string;
        countryEn: string;
        currencyCode: string;
        cities: GlobalCityBenchmark[];
      }
    >();

    for (const city of filteredCities) {
      const existing = map.get(city.countryCode);
      if (existing) {
        existing.cities.push(city);
      } else {
        map.set(city.countryCode, {
          countryCode: city.countryCode,
          countryAr: city.countryAr,
          countryEn: city.countryEn,
          currencyCode: city.currencyCode,
          cities: [city],
        });
      }
    }
    return Array.from(map.values());
  }, [filteredCities]);

  // Ribbon mouse drag + wheel scroll handlers
  const handleRibbonMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const track = ribbonTrackRef.current;
    if (!track || e.button !== 0) return;
    dragStateRef.current = {
      isDown: true,
      startX: e.pageX,
      startScrollLeft: track.scrollLeft,
      movedDistance: 0,
    };
  };

  const handleRibbonMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const state = dragStateRef.current;
    const track = ribbonTrackRef.current;
    if (!state.isDown || !track) return;
    const deltaX = e.pageX - state.startX;
    state.movedDistance = Math.max(state.movedDistance, Math.abs(deltaX));
    if (state.movedDistance > 5) {
      if (!isDraggingRibbon) setIsDraggingRibbon(true);
      e.preventDefault();
      track.scrollLeft = state.startScrollLeft - deltaX;
    }
  };

  const handleRibbonMouseUpOrLeave = () => {
    if (dragStateRef.current.isDown) {
      dragStateRef.current.isDown = false;
      if (isDraggingRibbon) {
        window.setTimeout(() => setIsDraggingRibbon(false), 0);
      }
    }
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
    if (!track) return;
    if (track.scrollWidth <= track.clientWidth) return;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      track.scrollLeft += isAr ? -e.deltaY : e.deltaY;
    }
  };

  const handleSelectOriginCity = (city: GlobalCityBenchmark) => {
    const prevRate = originCity.rateFromUsd;
    const nextRate = city.rateFromUsd;
    const currentNum = Number(salaryInput);
    if (Number.isFinite(currentNum) && currentNum > 0) {
      const usdVal = currentNum / prevRate;
      setSalaryInput(String(Math.max(1, Math.round(usdVal * nextRate))));
    } else {
      setSalaryInput(
        String(Math.max(1, Math.round(city.typicalNetSalaryUsd * nextRate)))
      );
    }
    setOriginCityId(city.id);
    setActivePicker(null);
    setCitySearchQuery('');
  };

  const handleSelectTargetCity = (city: GlobalCityBenchmark) => {
    setTargetCityId(city.id);
    setActivePicker(null);
    setCitySearchQuery('');
  };

  const handleSwapCities = () => {
    const prevOrigin = originCity;
    const prevTarget = targetCity;
    const currentSalaryNum = Number(salaryInput);
    const usdSalary =
      Number.isFinite(currentSalaryNum) && currentSalaryNum >= 0
        ? currentSalaryNum / prevOrigin.rateFromUsd
        : prevTarget.typicalNetSalaryUsd;

    setOriginCityId(prevTarget.id);
    setTargetCityId(prevOrigin.id);
    setSalaryInput(
      String(Math.max(0, Math.round(usdSalary * prevTarget.rateFromUsd)))
    );
  };

  const handleReDetectBrowserLocation = () => {
    const { detectedCity, detectedTimezone } = detectBrowserCityBenchmark();
    handleSelectOriginCity(detectedCity);
    setDetectedBadgeText(detectedTimezone);
  };

  // Comprehensive 5-Pillar Cost of Living & Purchasing Power Engine
  const report = useMemo(() => {
    const rawSalaryLocal = Number(salaryInput);
    const safeSalaryLocal =
      Number.isFinite(rawSalaryLocal) && rawSalaryLocal >= 0
        ? rawSalaryLocal
        : 0;
    const salaryUsd = safeSalaryLocal / originCity.rateFromUsd;

    // Multipliers based on household size & housing mode
    const householdNonRentMult =
      householdMode === 'single' ? 1 : householdMode === 'couple' ? 1.65 : 2.35;
    const householdRentMult =
      householdMode === 'single' ? 1 : householdMode === 'couple' ? 1.25 : 1.75;

    const computeCityBasketUsd = (city: GlobalCityBenchmark) => {
      const housingUsd =
        housingMode === 'owned_home'
          ? 0
          : housingMode === 'rent_center'
            ? city.baseUsd.rentCenter * householdRentMult
            : city.baseUsd.rentSuburb * householdRentMult;

      const groceriesUsd = city.baseUsd.groceries * householdNonRentMult;
      const transportUsd = city.baseUsd.transport * householdNonRentMult;
      const utilitiesUsd =
        city.baseUsd.utilities *
        (householdMode === 'single' ? 1 : householdMode === 'couple' ? 1.3 : 1.6);
      const diningUsd = city.baseUsd.diningLifestyle * householdNonRentMult;

      const totalMonthlyCostUsd =
        housingUsd + groceriesUsd + transportUsd + utilitiesUsd + diningUsd;

      return {
        housingUsd,
        groceriesUsd,
        transportUsd,
        utilitiesUsd,
        diningUsd,
        totalMonthlyCostUsd: Math.max(1, totalMonthlyCostUsd),
      };
    };

    const originBasket = computeCityBasketUsd(originCity);
    const targetBasket = computeCityBasketUsd(targetCity);

    const costRatio =
      targetBasket.totalMonthlyCostUsd / originBasket.totalMonthlyCostUsd;
    const overallPctDiff = (costRatio - 1) * 100;

    // Equivalent salary needed in Target City to keep the exact same standard of living
    const equivalentSalaryUsd = salaryUsd * costRatio;
    const equivalentSalaryOriginCurrency =
      equivalentSalaryUsd * originCity.rateFromUsd;
    const equivalentSalaryTargetCurrency =
      equivalentSalaryUsd * targetCity.rateFromUsd;

    // Monthly Disposable Surplus / Deficit in Origin vs Target (if keeping current income)
    const originMonthlySurplusUsd = salaryUsd - originBasket.totalMonthlyCostUsd;
    const targetMonthlySurplusIfSameIncomeUsd =
      salaryUsd - targetBasket.totalMonthlyCostUsd;

    // Local Purchasing Power Index (How many standard baskets the typical local salary buys)
    const originLocalPurchasingPower =
      (originCity.typicalNetSalaryUsd / originBasket.totalMonthlyCostUsd) * 100;
    const targetLocalPurchasingPower =
      (targetCity.typicalNetSalaryUsd / targetBasket.totalMonthlyCostUsd) * 100;

    // 5-Pillar Category Comparison Array
    const pillars = [
      {
        id: 'housing',
        titleAr:
          housingMode === 'owned_home'
            ? 'السكن والإيجار الشهري (مملوك — 0)'
            : housingMode === 'rent_center'
              ? 'السكن والإيجار الشهري (وسط المدينة)'
              : 'السكن والإيجار الشهري (خارج المركز)',
        titleEn:
          housingMode === 'owned_home'
            ? 'Monthly Housing & Rent (Owned — 0)'
            : housingMode === 'rent_center'
              ? 'Monthly Housing & Rent (City Center)'
              : 'Monthly Housing & Rent (Outside Center)',
        originUsd: originBasket.housingUsd,
        targetUsd: targetBasket.housingUsd,
        pctDiff:
          originBasket.housingUsd > 0
            ? ((targetBasket.housingUsd - originBasket.housingUsd) /
                originBasket.housingUsd) *
              100
            : 0,
      },
      {
        id: 'groceries',
        titleAr: 'الغذاء والتموين والسوبرماركت الشهري',
        titleEn: 'Monthly Groceries & Household Supplies',
        originUsd: originBasket.groceriesUsd,
        targetUsd: targetBasket.groceriesUsd,
        pctDiff:
          ((targetBasket.groceriesUsd - originBasket.groceriesUsd) /
            originBasket.groceriesUsd) *
          100,
      },
      {
        id: 'transport',
        titleAr: 'المواصلات والتنقل والوقود شهرياً',
        titleEn: 'Monthly Transit, Fuel & Local Mobility',
        originUsd: originBasket.transportUsd,
        targetUsd: targetBasket.transportUsd,
        pctDiff:
          ((targetBasket.transportUsd - originBasket.transportUsd) /
            originBasket.transportUsd) *
          100,
      },
      {
        id: 'utilities',
        titleAr: 'الفواتير، الكهرباء، التكييف والإنترنت',
        titleEn: 'Utilities, Energy, Cooling & Fiber Internet',
        originUsd: originBasket.utilitiesUsd,
        targetUsd: targetBasket.utilitiesUsd,
        pctDiff:
          ((targetBasket.utilitiesUsd - originBasket.utilitiesUsd) /
            originBasket.utilitiesUsd) *
          100,
      },
      {
        id: 'dining',
        titleAr: 'المطاعم، القهوة، الترفيه وجودة الحياة',
        titleEn: 'Dining Out, Coffee, Fitness & Lifestyle',
        originUsd: originBasket.diningUsd,
        targetUsd: targetBasket.diningUsd,
        pctDiff:
          ((targetBasket.diningUsd - originBasket.diningUsd) /
            originBasket.diningUsd) *
          100,
      },
    ];

    const sliderMaxLocal = Math.max(
      5000,
      Math.round(originCity.typicalNetSalaryUsd * originCity.rateFromUsd * 4)
    );

    return {
      safeSalaryLocal,
      salaryUsd,
      sliderMaxLocal,
      originBasket,
      targetBasket,
      costRatio,
      overallPctDiff,
      equivalentSalaryUsd,
      equivalentSalaryOriginCurrency,
      equivalentSalaryTargetCurrency,
      originMonthlySurplusUsd,
      targetMonthlySurplusIfSameIncomeUsd,
      originLocalPurchasingPower,
      targetLocalPurchasingPower,
      pillars,
    };
  }, [salaryInput, originCity, targetCity, housingMode, householdMode]);

  return (
    <div className={styles.atlasWrapper} dir={isAr ? 'rtl' : 'ltr'}>
      {/* 2. SMART BROWSER AUTO-DETECTION & CURRENCY DISPLAY BAR */}
      <div className={styles.topTelemetryDeck}>
        <div className={styles.browserLocateCluster}>
          <span className={styles.locatePulseDot} aria-hidden="true" />
          <span className={styles.locateStatusText}>
            {isAr
              ? `تم التعرف الذكي على موقع متصفحك: ${originCity.countryAr} — ${originCity.cityAr}`
              : `Browser location auto-detected: ${originCity.cityEn}, ${originCity.countryEn}`}
            {detectedBadgeText ? ` (${detectedBadgeText})` : ''}
          </span>
          <button
            type="button"
            onClick={handleReDetectBrowserLocation}
            className={styles.reDetectBtn}
          >
            <Compass width={13} height={13} aria-hidden="true" />
            <span>{isAr ? 'تحديد موقعي الحالي' : 'Detect My City'}</span>
          </button>
        </div>

        <div className={styles.currencySwitchGroup}>
          <span className={styles.currencySwitchLabel}>
            {isAr ? 'عملة التقرير:' : 'Report Currency:'}
          </span>
          <div className={styles.currencyToggleRow} dir="ltr">
            <button
              type="button"
              onClick={() => setDisplayCurrencyMode('origin')}
              className={`${styles.currencyModeBtn} ${
                displayCurrencyMode === 'origin'
                  ? styles.currencyModeBtnActive
                  : ''
              }`}
            >
              {originCity.currencyCode} ({isAr ? 'مدينتك' : 'Origin'})
            </button>
            <button
              type="button"
              onClick={() => setDisplayCurrencyMode('target')}
              className={`${styles.currencyModeBtn} ${
                displayCurrencyMode === 'target'
                  ? styles.currencyModeBtnActive
                  : ''
              }`}
            >
              {targetCity.currencyCode} ({isAr ? 'الوجهة' : 'Target'})
            </button>
            <button
              type="button"
              onClick={() => setDisplayCurrencyMode('usd')}
              className={`${styles.currencyModeBtn} ${
                displayCurrencyMode === 'usd' ? styles.currencyModeBtnActive : ''
              }`}
            >
              USD ($)
            </button>
          </div>
        </div>
      </div>

      {/* 3. MAIN ARCHITECTURAL WORKBENCH GRID */}
      <div className={styles.studioGrid}>
        {/* LEFT COLUMN: GLOBAL CITY SELECTORS + SALARY & LIFESTYLE CALIBRATION */}
        <div className={styles.controlsColumn}>
          <section className={styles.panelCard}>
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.panelStep}>
                  {isAr
                    ? 'القسم 01 • اختيار الدولة والمدينة العالمية'
                    : 'SECTION 01 • GLOBAL COUNTRY & CITY SELECTION'}
                </span>
                <h2 className={styles.panelTitle}>
                  {isAr
                    ? 'قارن بين مدينتك الحالية وأي دولة أو مدينة في العالم'
                    : 'Compare Your Current City with Any Destination Worldwide'}
                </h2>
              </div>
              <span className={styles.panelHint}>
                {isAr ? 'تغطية عالمية شاملة' : 'Worldwide Index'}
              </span>
            </div>

            {/* TWIN CITY SELECTOR CARDS WITH SWAP BUTTON */}
            <div className={styles.twinCitySelectorStack}>
              {/* ORIGIN CITY SELECTOR BUTTON */}
              <div className={styles.citySelectWrapper}>
                <span className={styles.citySelectKicker}>
                  {isAr
                    ? 'موقعك الحالي (الدولة والمدينة)'
                    : 'Your Current Location (Country & City)'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setActivePicker((prev) =>
                      prev === 'origin' ? null : 'origin'
                    );
                    setCitySearchQuery('');
                    setRegionFilter('all');
                  }}
                  aria-expanded={activePicker === 'origin'}
                  className={`${styles.cityPickerTrigger} ${
                    activePicker === 'origin'
                      ? styles.cityPickerTriggerActive
                      : ''
                  }`}
                >
                  <div className={styles.cityTriggerMain}>
                    <span className={styles.countryIsoBadge} dir="ltr">
                      {originCity.countryCode}
                    </span>
                    <div className={styles.cityTriggerTitles}>
                      <strong className={styles.cityTriggerName}>
                        {isAr ? originCity.cityAr : originCity.cityEn}
                      </strong>
                      <span className={styles.cityTriggerCountry}>
                        {isAr ? originCity.countryAr : originCity.countryEn} •{' '}
                        <span dir="ltr">{originCity.currencyCode}</span>
                      </span>
                    </div>
                  </div>
                  <div className={styles.cityTriggerAction}>
                    <span className={styles.citySearchHintBadge}>
                      <Search width={12} height={12} />
                      <span>{isAr ? 'تغيير أو بحث' : 'Search / Change'}</span>
                    </span>
                    <ChevronDown
                      width={16}
                      height={16}
                      className={
                        activePicker === 'origin' ? styles.chevronRotated : ''
                      }
                    />
                  </div>
                </button>
              </div>

              {/* SWAP ORIGIN ⇄ TARGET BUTTON */}
              <div className={styles.swapRow}>
                <button
                  type="button"
                  onClick={handleSwapCities}
                  className={styles.swapCitiesBtn}
                  title={
                    isAr
                      ? 'تبديل المدينة الحالية مع مدينة الوجهة'
                      : 'Swap current city and destination city'
                  }
                >
                  <ArrowLeftRight width={14} height={14} />
                  <span>{isAr ? 'عكس المقارنة بين المدينتين' : 'Swap Cities'}</span>
                </button>
              </div>

              {/* TARGET CITY SELECTOR BUTTON */}
              <div className={styles.citySelectWrapper}>
                <span className={styles.citySelectKickerGold}>
                  {isAr
                    ? 'الوجهة التي تريد الذهاب أو الانتقال إليها (الدولة والمدينة)'
                    : 'Destination Country & City You Want to Explore'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setActivePicker((prev) =>
                      prev === 'target' ? null : 'target'
                    );
                    setCitySearchQuery('');
                    setRegionFilter('all');
                  }}
                  aria-expanded={activePicker === 'target'}
                  className={`${styles.cityPickerTrigger} ${
                    activePicker === 'target'
                      ? styles.cityPickerTriggerActiveGold
                      : ''
                  }`}
                >
                  <div className={styles.cityTriggerMain}>
                    <span className={styles.countryIsoBadgeGold} dir="ltr">
                      {targetCity.countryCode}
                    </span>
                    <div className={styles.cityTriggerTitles}>
                      <strong className={styles.cityTriggerName}>
                        {isAr ? targetCity.cityAr : targetCity.cityEn}
                      </strong>
                      <span className={styles.cityTriggerCountry}>
                        {isAr ? targetCity.countryAr : targetCity.countryEn} •{' '}
                        <span dir="ltr">{targetCity.currencyCode}</span>
                      </span>
                    </div>
                  </div>
                  <div className={styles.cityTriggerAction}>
                    <span className={styles.citySearchHintBadge}>
                      <Search width={12} height={12} />
                      <span>{isAr ? 'تغيير أو بحث' : 'Search / Change'}</span>
                    </span>
                    <ChevronDown
                      width={16}
                      height={16}
                      className={
                        activePicker === 'target' ? styles.chevronRotated : ''
                      }
                    />
                  </div>
                </button>
              </div>
            </div>

            {/* EXPANDABLE GLOBAL COUNTRY & CITY SMART SEARCH MODAL/DRAWER */}
            {activePicker !== null && (
              <div
                className={styles.globalPickerDrawer}
                role="dialog"
                aria-label={
                  activePicker === 'origin'
                    ? isAr
                      ? 'ابحث واختر دولتك ومدينتك الحالية'
                      : 'Search and select your current country & city'
                    : isAr
                      ? 'ابحث واختر دولة ومدينة الوجهة'
                      : 'Search and select destination country & city'
                }
              >
                <div className={styles.pickerDrawerHeader}>
                  <div className={styles.pickerDrawerTitleRow}>
                    <Globe width={16} height={16} className={styles.pickerGlobeIcon} />
                    <strong className={styles.pickerDrawerTitle}>
                      {activePicker === 'origin'
                        ? isAr
                          ? 'اختر دولتك ومدينتك الحالية من القائمة أو ابحث فوراً'
                          : 'Select Your Current Country & City'
                        : isAr
                          ? 'اختر الدولة والمدينة التي تريد الذهاب إليها'
                          : 'Select Destination Country & City'}
                    </strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActivePicker(null)}
                    className={styles.pickerCloseBtn}
                    aria-label={isAr ? 'إغلاق القائمة' : 'Close selector'}
                  >
                    <X width={15} height={15} />
                  </button>
                </div>

                {/* Smart Search Input */}
                <div className={styles.pickerSearchBox}>
                  <Search width={15} height={15} className={styles.pickerSearchIcon} />
                  <input
                    ref={citySearchInputRef}
                    type="search"
                    value={citySearchQuery}
                    onChange={(e) => setCitySearchQuery(e.target.value)}
                    placeholder={
                      isAr
                        ? 'ابحث باسم الدولة أو المدينة أو العملة (مثال: ألمانيا، طوكيو، نيويورك، المغرب، EUR)...'
                        : 'Search any country, city, or currency (e.g. Germany, Tokyo, New York, Morocco, EUR)...'
                    }
                    className={styles.pickerSearchInput}
                  />
                  {citySearchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setCitySearchQuery('');
                        citySearchInputRef.current?.focus();
                      }}
                      className={styles.pickerClearSearchBtn}
                    >
                      <X width={12} height={12} />
                    </button>
                  )}
                </div>

                {/* Continent / Region Filter Tabs */}
                <div className={styles.regionTabsRow}>
                  {GLOBAL_REGIONS.map((reg) => (
                    <button
                      key={reg.id}
                      type="button"
                      onClick={() => setRegionFilter(reg.id)}
                      className={`${styles.regionTabBtn} ${
                        regionFilter === reg.id ? styles.regionTabBtnActive : ''
                      }`}
                    >
                      {isAr ? reg.labelAr : reg.labelEn}
                    </button>
                  ))}
                </div>

                {/* Grouped Countries & Cities List */}
                <div className={styles.countriesScrollList}>
                  {groupedCountries.length > 0 ? (
                    groupedCountries.map((group) => (
                      <div
                        key={group.countryCode}
                        className={styles.countryGroupBlock}
                      >
                        <div className={styles.countryGroupHeader}>
                          <span className={styles.countryGroupCode} dir="ltr">
                            {group.countryCode}
                          </span>
                          <span className={styles.countryGroupName}>
                            {isAr ? group.countryAr : group.countryEn}
                          </span>
                          <span className={styles.countryGroupCurrency} dir="ltr">
                            {group.currencyCode}
                          </span>
                        </div>

                        <div className={styles.countryCitiesGrid}>
                          {group.cities.map((city) => {
                            const isSelected =
                              (activePicker === 'origin' &&
                                city.id === originCityId) ||
                              (activePicker === 'target' &&
                                city.id === targetCityId);
                            return (
                              <button
                                key={city.id}
                                type="button"
                                onClick={() =>
                                  activePicker === 'origin'
                                    ? handleSelectOriginCity(city)
                                    : handleSelectTargetCity(city)
                                }
                                className={`${styles.cityOptionBtn} ${
                                  isSelected ? styles.cityOptionBtnActive : ''
                                }`}
                              >
                                <span className={styles.cityOptionName}>
                                  {isAr ? city.cityAr : city.cityEn}
                                </span>
                                <span
                                  dir="ltr"
                                  className={styles.cityOptionCostTag}
                                >
                                  ~${intFmt.format(
                                    city.baseUsd.rentCenter +
                                      city.baseUsd.groceries +
                                      city.baseUsd.transport +
                                      city.baseUsd.utilities +
                                      city.baseUsd.diningLifestyle
                                  )}
                                  /mo
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className={styles.pickerEmptyState}>
                      {isAr
                        ? 'لم نجد دولة أو مدينة تطابق بحثك. جرب كتابة اسم الدولة أو القارة.'
                        : 'No matching country or city found. Try searching by country name.'}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className={styles.divider} />

            {/* MONTHLY SALARY INPUT (STARTS AT 0, STEP 1 AS REQUESTED) */}
            <div className={styles.controlBlock}>
              <div className={styles.controlTopRow}>
                <label htmlFor="col-salary-input" className={styles.controlLabel}>
                  <span>
                    {isAr
                      ? `دخلك أو راتبك الشهري الحالي في ${originCity.cityAr}`
                      : `Your Current Monthly Income in ${originCity.cityEn}`}
                  </span>
                  <span className={styles.controlSublabel}>
                    {isAr
                      ? `بعملة ${originCity.countryAr} (${originCity.currencyCode}) • متوسط الدخل المحلي الصافي تقريباً ${intFmt.format(
                          Math.round(
                            originCity.typicalNetSalaryUsd *
                              originCity.rateFromUsd
                          )
                        )} ${originCity.currencyCode}`
                      : `In ${originCity.currencyCode} • Typical local net salary is ~${intFmt.format(
                          Math.round(
                            originCity.typicalNetSalaryUsd *
                              originCity.rateFromUsd
                          )
                        )} ${originCity.currencyCode}`}
                  </span>
                </label>

                <div className={styles.numberInputWrap} dir="ltr">
                  <span className={styles.currencySymbol}>
                    {originCity.currencyCode}
                  </span>
                  <input
                    id="col-salary-input"
                    type="number"
                    min="0"
                    step="1"
                    value={salaryInput}
                    onChange={(e) => setSalaryInput(e.target.value)}
                    className={styles.inlineNumberInput}
                  />
                </div>
              </div>

              <input
                type="range"
                min={0}
                max={report.sliderMaxLocal}
                step={1}
                value={Math.min(
                  report.sliderMaxLocal,
                  Math.max(0, report.safeSalaryLocal)
                )}
                onChange={(e) => setSalaryInput(e.target.value)}
                className={styles.rangeSlider}
                aria-label={isAr ? 'مؤشر الدخل الشهري' : 'Monthly income slider'}
              />
            </div>

            <div className={styles.divider} />

            {/* LIFESTYLE & HOUSING CALIBRATION */}
            <div className={styles.dualSubGrid}>
              <div className={styles.subFieldBlock}>
                <span className={styles.subFieldLabel}>
                  {isAr ? 'نمط السكن والإيجار' : 'Housing & Rent Arrangement'}
                </span>
                <div className={styles.segmentedColumn}>
                  <button
                    type="button"
                    onClick={() => setHousingMode('rent_center')}
                    className={`${styles.segmentOptionBtn} ${
                      housingMode === 'rent_center'
                        ? styles.segmentOptionBtnActive
                        : ''
                    }`}
                  >
                    {isAr
                      ? 'إيجار شقة في وسط المدينة'
                      : 'Rent Apartment in City Center'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setHousingMode('rent_suburb')}
                    className={`${styles.segmentOptionBtn} ${
                      housingMode === 'rent_suburb'
                        ? styles.segmentOptionBtnActive
                        : ''
                    }`}
                  >
                    {isAr
                      ? 'إيجار شقة خارج المركز (أوفر)'
                      : 'Rent Outside Center (Suburb)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setHousingMode('owned_home')}
                    className={`${styles.segmentOptionBtn} ${
                      housingMode === 'owned_home'
                        ? styles.segmentOptionBtnActive
                        : ''
                    }`}
                  >
                    {isAr
                      ? 'بدون إيجار (سكن مملوك أو مكفول)'
                      : 'No Rent (Owned / Provided Housing)'}
                  </button>
                </div>
              </div>

              <div className={styles.subFieldBlock}>
                <span className={styles.subFieldLabel}>
                  {isAr
                    ? 'الحالة العائلية (حجم الأسرة)'
                    : 'Household Size & Profile'}
                </span>
                <div className={styles.segmentedColumn}>
                  <button
                    type="button"
                    onClick={() => setHouseholdMode('single')}
                    className={`${styles.segmentOptionBtn} ${
                      householdMode === 'single'
                        ? styles.segmentOptionBtnActive
                        : ''
                    }`}
                  >
                    {isAr ? 'فرد مستقل (شخص واحد)' : 'Single Adult (1 Person)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setHouseholdMode('couple')}
                    className={`${styles.segmentOptionBtn} ${
                      householdMode === 'couple'
                        ? styles.segmentOptionBtnActive
                        : ''
                    }`}
                  >
                    {isAr ? 'زوجان (شخصان)' : 'Couple (2 Adults)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setHouseholdMode('family')}
                    className={`${styles.segmentOptionBtn} ${
                      householdMode === 'family'
                        ? styles.segmentOptionBtnActive
                        : ''
                    }`}
                  >
                    {isAr
                      ? 'عائلة (3 إلى 4 أفراد)'
                      : 'Family (3–4 Members)'}
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN: COMPREHENSIVE COST OF LIVING & PURCHASING POWER REPORT */}
        <div className={styles.verdictColumn}>
          <div
            className={`${styles.verdictStage} ${
              report.overallPctDiff <= 0
                ? styles.verdictTeal
                : report.overallPctDiff <= 25
                  ? styles.verdictBalanced
                  : styles.verdictAmber
            }`}
          >
            {/* Top Report Header */}
            <div className={styles.verdictTopBar}>
              <span className={styles.verdictBadge}>
                {report.overallPctDiff < -2
                  ? isAr
                    ? `معيشة أوفر في ${targetCity.cityAr} بنسبة ${oneDecFmt.format(
                        Math.abs(report.overallPctDiff)
                      )}%`
                    : `${targetCity.cityEn} is ${oneDecFmt.format(
                        Math.abs(report.overallPctDiff)
                      )}% More Affordable`
                  : report.overallPctDiff > 2
                    ? isAr
                      ? `معيشة أغلى في ${targetCity.cityAr} بنسبة +${oneDecFmt.format(
                          report.overallPctDiff
                        )}%`
                      : `${targetCity.cityEn} is +${oneDecFmt.format(
                          report.overallPctDiff
                        )}% More Expensive`
                    : isAr
                      ? 'تكلفة معيشة متقاربة جداً بين المدينتين'
                      : 'Nearly Identical Cost of Living'}
              </span>

              <span dir="ltr" className={styles.routePill}>
                {originCity.countryCode} {originCity.cityEn} ➔{' '}
                {targetCity.countryCode} {targetCity.cityEn}
              </span>
            </div>

            {/* EQUIVALENT SALARY HERO READOUT */}
            <div className={styles.equivalentHeroBox}>
              <span className={styles.equivalentKicker}>
                {isAr
                  ? `الدخل الشهري المعادل في ${targetCity.cityAr} (${targetCity.countryAr}) للحفاظ على نفس مستوى حياتك في ${originCity.cityAr}:`
                  : `Equivalent Monthly Income Needed in ${targetCity.cityEn} (${targetCity.countryEn}) to Match Your Standard of Living in ${originCity.cityEn}:`}
              </span>

              <div className={styles.equivalentDualCurrencies}>
                <div className={styles.eqPrimaryCard}>
                  <span className={styles.eqCardLabel}>
                    {isAr
                      ? `بعملة ${targetCity.cityAr} (${targetCity.currencyCode})`
                      : `In ${targetCity.cityEn} Currency (${targetCity.currencyCode})`}
                  </span>
                  <strong dir="ltr" className={styles.eqPrimaryValue}>
                    {formatCurrencyAmount(report.equivalentSalaryUsd, 'target')}
                  </strong>
                </div>

                <div className={styles.eqSecondaryCard}>
                  <span className={styles.eqCardLabel}>
                    {isAr
                      ? `ما يعادله بعملة ${originCity.cityAr} (${originCity.currencyCode})`
                      : `Equivalent in ${originCity.cityEn} (${originCity.currencyCode})`}
                  </span>
                  <strong dir="ltr" className={styles.eqSecondaryValue}>
                    {formatCurrencyAmount(report.equivalentSalaryUsd, 'origin')}
                  </strong>
                </div>
              </div>

              <p className={styles.equivalentNarrative}>
                {isAr
                  ? `لتحصل في ${targetCity.cityAr} على نفس جودة السكن والغذاء والتنقل والرفاهية التي يمنحها لك مبلغ ${formatCurrencyAmount(
                      report.salaryUsd,
                      'origin'
                    )} في ${originCity.cityAr}، تحتاج إلى دخل شهري قدره ${formatCurrencyAmount(
                      report.equivalentSalaryUsd,
                      'target'
                    )} (أي ما يعادل $${intFmt.format(
                      Math.round(report.equivalentSalaryUsd)
                    )} دولار أمريكي).`
                  : `To enjoy the exact same housing, food, mobility, and lifestyle in ${targetCity.cityEn} that ${formatCurrencyAmount(
                      report.salaryUsd,
                      'origin'
                    )} buys you in ${originCity.cityEn}, you need ${formatCurrencyAmount(
                      report.equivalentSalaryUsd,
                      'target'
                    )} per month (~$${intFmt.format(
                      Math.round(report.equivalentSalaryUsd)
                    )} USD).`}
              </p>
            </div>

            {/* SELECTED STORE PRODUCT PURCHASING POWER COMPARISON (IF ACTIVE) */}
            {selectedViewedProduct && (
              <div className={styles.storeParityBanner}>
                <div className={styles.storeParityTop}>
                  <div>
                    <span className={styles.storeParityKicker}>
                      {isAr
                        ? 'مقارنة القدرة الشرائية لمنتج المتجر المختار'
                        : 'STORE PRODUCT AFFORDABILITY ACROSS BOTH CITIES'}
                    </span>
                    <h4 className={styles.storeParityTitle}>
                      {isAr
                        ? selectedViewedProduct.titleAr
                        : selectedViewedProduct.titleEn}{' '}
                      (
                      <span dir="ltr">
                        {formatCurrencyAmount(selectedViewedProduct.priceUsd)}
                      </span>
                      )
                    </h4>
                  </div>
                  <Link
                    href={`/${locale}/products/${selectedViewedProduct.slug}`}
                    className={styles.storeParityLink}
                  >
                    <span>{isAr ? 'صفحة المنتج' : 'View Product'}</span>
                    <span aria-hidden="true">{isAr ? '↖' : '↗'}</span>
                  </Link>
                </div>

                <div className={styles.storeParityGrid}>
                  <div className={styles.storeParityCell}>
                    <span>
                      {isAr
                        ? `نسبة سعره من متوسط راتب ${originCity.cityAr}`
                        : `Share of typical salary in ${originCity.cityEn}`}
                    </span>
                    <strong dir="ltr">
                      {oneDecFmt.format(
                        (selectedViewedProduct.priceUsd /
                          originCity.typicalNetSalaryUsd) *
                          100
                      )}
                      %
                    </strong>
                  </div>
                  <div className={styles.storeParityCell}>
                    <span>
                      {isAr
                        ? `نسبة سعره من متوسط راتب ${targetCity.cityAr}`
                        : `Share of typical salary in ${targetCity.cityEn}`}
                    </span>
                    <strong dir="ltr">
                      {oneDecFmt.format(
                        (selectedViewedProduct.priceUsd /
                          targetCity.typicalNetSalaryUsd) *
                          100
                      )}
                      %
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {/* MONTHLY COST BASKET & SAVINGS SURPLUS COMPARISON */}
            <div className={styles.basketSummaryGrid}>
              <div className={styles.basketCard}>
                <span className={styles.basketCardKicker}>
                  {isAr
                    ? `تكلفة المعيشة الشهرية التقديرية في ${originCity.cityAr}`
                    : `Est. Monthly Living Basket in ${originCity.cityEn}`}
                </span>
                <strong dir="ltr" className={styles.basketCardValTeal}>
                  {formatCurrencyAmount(report.originBasket.totalMonthlyCostUsd)}
                </strong>
                <span className={styles.basketCardSub}>
                  {report.originMonthlySurplusUsd >= 0
                    ? isAr
                      ? `الفائض المتبقي من دخلك للادخار: +${formatCurrencyAmount(
                          report.originMonthlySurplusUsd
                        )}/شهرياً`
                      : `Monthly savings surplus from your income: +${formatCurrencyAmount(
                          report.originMonthlySurplusUsd
                        )}`
                    : isAr
                      ? `عجز عن تغطية متوسط المعيشة: ${formatCurrencyAmount(
                          report.originMonthlySurplusUsd
                        )}`
                      : `Monthly deficit vs. standard basket: ${formatCurrencyAmount(
                          report.originMonthlySurplusUsd
                        )}`}
                </span>
              </div>

              <div className={styles.basketCard}>
                <span className={styles.basketCardKicker}>
                  {isAr
                    ? `تكلفة نفس مستوى المعيشة في ${targetCity.cityAr}`
                    : `Est. Monthly Living Basket in ${targetCity.cityEn}`}
                </span>
                <strong dir="ltr" className={styles.basketCardValAmber}>
                  {formatCurrencyAmount(report.targetBasket.totalMonthlyCostUsd)}
                </strong>
                <span className={styles.basketCardSub}>
                  {report.targetMonthlySurplusIfSameIncomeUsd >= 0
                    ? isAr
                      ? `الفائض لو انتقلت بنفس دخلك الحالي: +${formatCurrencyAmount(
                          report.targetMonthlySurplusIfSameIncomeUsd
                        )}/شهرياً`
                      : `Surplus if relocating on your current income: +${formatCurrencyAmount(
                          report.targetMonthlySurplusIfSameIncomeUsd
                        )}`
                    : isAr
                      ? `تحتاج زيادة دخل لا تقل عن ${formatCurrencyAmount(
                          Math.abs(report.targetMonthlySurplusIfSameIncomeUsd)
                        )} لتغطية المعيشة`
                      : `Requires at least +${formatCurrencyAmount(
                          Math.abs(report.targetMonthlySurplusIfSameIncomeUsd)
                        )} extra to break even`}
                </span>
              </div>
            </div>

            {/* 5-PILLAR COST BREAKDOWN LEDGER */}
            <div className={styles.pillarsSection}>
              <div className={styles.pillarsHeader}>
                <h3 className={styles.pillarsTitle}>
                  {isAr
                    ? `تفكيك تكلفة القطاعات الخمسة (${originCity.cityAr} مقابل ${targetCity.cityAr})`
                    : `5-Pillar Living Cost Breakdown (${originCity.cityEn} vs. ${targetCity.cityEn})`}
                </h3>
                <span className={styles.pillarsHint}>
                  {isAr
                    ? `بـ ${
                        displayCurrencyMode === 'origin'
                          ? originCity.currencyCode
                          : displayCurrencyMode === 'target'
                            ? targetCity.currencyCode
                            : 'USD'
                      } شهرياً`
                    : `Monthly figures`}
                </span>
              </div>

              <div className={styles.pillarsList}>
                {report.pillars.map((pillar) => {
                  const maxUsd = Math.max(
                    1,
                    pillar.originUsd,
                    pillar.targetUsd
                  );
                  const originWidth = Math.max(
                    4,
                    Math.round((pillar.originUsd / maxUsd) * 100)
                  );
                  const targetWidth = Math.max(
                    4,
                    Math.round((pillar.targetUsd / maxUsd) * 100)
                  );
                  const isCheaperInTarget = pillar.pctDiff <= 0;

                  return (
                    <div key={pillar.id} className={styles.pillarRowCard}>
                      <div className={styles.pillarTopRow}>
                        <span className={styles.pillarName}>
                          {isAr ? pillar.titleAr : pillar.titleEn}
                        </span>
                        <span
                          dir="ltr"
                          className={
                            Math.abs(pillar.pctDiff) < 1
                              ? styles.pillarDeltaNeutral
                              : isCheaperInTarget
                                ? styles.pillarDeltaTeal
                                : styles.pillarDeltaAmber
                          }
                        >
                          {Math.abs(pillar.pctDiff) < 1
                            ? '0%'
                            : `${pillar.pctDiff > 0 ? '+' : ''}${oneDecFmt.format(
                                pillar.pctDiff
                              )}%`}
                        </span>
                      </div>

                      <div className={styles.pillarBarsStack}>
                        {/* Origin Bar */}
                        <div className={styles.pillarBarLine}>
                          <span className={styles.pillarCityTag}>
                            {isAr ? originCity.cityAr : originCity.cityEn}
                          </span>
                          <div className={styles.pillarBarTrack}>
                            <div
                              className={styles.pillarBarFillTeal}
                              style={{ width: `${originWidth}%` }}
                            />
                          </div>
                          <strong dir="ltr" className={styles.pillarAmount}>
                            {formatCurrencyAmount(pillar.originUsd)}
                          </strong>
                        </div>

                        {/* Target Bar */}
                        <div className={styles.pillarBarLine}>
                          <span className={styles.pillarCityTag}>
                            {isAr ? targetCity.cityAr : targetCity.cityEn}
                          </span>
                          <div className={styles.pillarBarTrack}>
                            <div
                              className={styles.pillarBarFillAmber}
                              style={{ width: `${targetWidth}%` }}
                            />
                          </div>
                          <strong dir="ltr" className={styles.pillarAmount}>
                            {formatCurrencyAmount(pillar.targetUsd)}
                          </strong>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* LOCAL SALARY & PURCHASING POWER BENCHMARK FOOTER */}
            <div className={styles.localBenchmarkBox}>
              <div className={styles.localBenchmarkCol}>
                <span className={styles.localBenchmarkLabel}>
                  {isAr
                    ? `متوسط الراتب الصافي المحلي في ${originCity.cityAr}`
                    : `Typical Local Net Salary in ${originCity.cityEn}`}
                </span>
                <strong dir="ltr" className={styles.localBenchmarkVal}>
                  {formatCurrencyAmount(
                    originCity.typicalNetSalaryUsd,
                    'origin'
                  )}{' '}
                  <span className={styles.localUsdSub}>
                    (${intFmt.format(originCity.typicalNetSalaryUsd)})
                  </span>
                </strong>
              </div>

              <div className={styles.localBenchmarkCol}>
                <span className={styles.localBenchmarkLabel}>
                  {isAr
                    ? `متوسط الراتب الصافي المحلي في ${targetCity.cityAr}`
                    : `Typical Local Net Salary in ${targetCity.cityEn}`}
                </span>
                <strong dir="ltr" className={styles.localBenchmarkVal}>
                  {formatCurrencyAmount(
                    targetCity.typicalNetSalaryUsd,
                    'target'
                  )}{' '}
                  <span className={styles.localUsdSub}>
                    (${intFmt.format(targetCity.typicalNetSalaryUsd)})
                  </span>
                </strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CostOfLivingCompare;
