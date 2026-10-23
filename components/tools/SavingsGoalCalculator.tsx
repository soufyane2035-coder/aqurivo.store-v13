'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Check,
  ChevronDown,
  Compass,
  Copy,
  Flag,
  Globe,
  RotateCcw,
  Search,
  TrendingUp,
  X,
} from 'lucide-react';
import type { Product } from '@/types';
import { MilestoneRouteIcon } from '@/components/ui/AqurivoContextIcons';
import {
  type BrowserProductSnapshot,
  fetchBrowserCatalogSnapshots,
  getBrowserViewedProducts,
  recordBrowserProductView,
  searchBrowserProductSnapshots,
} from '@/lib/viewedProductsStorage';
import {
  GLOBAL_CITIES_DATA,
  detectBrowserCityBenchmark,
} from '@/lib/globalCostOfLivingData';
import { SavingsGoalLogo } from './SavingsGoalLogo';
import styles from './SavingsGoalCalculator.module.css';

export interface SavingsGoalCalculatorProps {
  locale: 'ar' | 'en';
}

type SolverMode = 'solve_time' | 'solve_monthly';

type GoalPresetId = 'emergency' | 'vehicle_home' | 'dream_trip' | 'business' | 'zero';

interface CurrencyOption {
  code: string;
  symbol: string;
  rateFromUsd: number;
  nameAr: string;
  nameEn: string;
  countryAr: string;
  countryEn: string;
  defaultGoalUsd: number;
}

const CORE_CURRENCIES: CurrencyOption[] = [
  {
    code: 'USD',
    symbol: '$',
    rateFromUsd: 1,
    nameAr: 'دولار أمريكي',
    nameEn: 'US Dollar',
    countryAr: 'الولايات المتحدة / عالمي',
    countryEn: 'United States / Global',
    defaultGoalUsd: 12000,
  },
  {
    code: 'EUR',
    symbol: '€',
    rateFromUsd: 0.92,
    nameAr: 'يورو أوروبي',
    nameEn: 'Euro',
    countryAr: 'الاتحاد الأوروبي',
    countryEn: 'Eurozone',
    defaultGoalUsd: 12000,
  },
  {
    code: 'GBP',
    symbol: '£',
    rateFromUsd: 0.79,
    nameAr: 'جنيه إسترليني',
    nameEn: 'British Pound',
    countryAr: 'المملكة المتحدة',
    countryEn: 'United Kingdom',
    defaultGoalUsd: 12000,
  },
  {
    code: 'SAR',
    symbol: 'SAR',
    rateFromUsd: 3.75,
    nameAr: 'ريال سعودي',
    nameEn: 'Saudi Riyal',
    countryAr: 'المملكة العربية السعودية',
    countryEn: 'Saudi Arabia',
    defaultGoalUsd: 12000,
  },
  {
    code: 'AED',
    symbol: 'AED',
    rateFromUsd: 3.67,
    nameAr: 'درهم إماراتي',
    nameEn: 'UAE Dirham',
    countryAr: 'الإمارات العربية المتحدة',
    countryEn: 'United Arab Emirates',
    defaultGoalUsd: 14000,
  },
  {
    code: 'QAR',
    symbol: 'QAR',
    rateFromUsd: 3.64,
    nameAr: 'ريال قطري',
    nameEn: 'Qatari Riyal',
    countryAr: 'قطر',
    countryEn: 'Qatar',
    defaultGoalUsd: 14000,
  },
  {
    code: 'KWD',
    symbol: 'KWD',
    rateFromUsd: 0.31,
    nameAr: 'دينار كويتي',
    nameEn: 'Kuwaiti Dinar',
    countryAr: 'الكويت',
    countryEn: 'Kuwait',
    defaultGoalUsd: 14000,
  },
  {
    code: 'BHD',
    symbol: 'BHD',
    rateFromUsd: 0.38,
    nameAr: 'دينار بحريني',
    nameEn: 'Bahraini Dinar',
    countryAr: 'البحرين',
    countryEn: 'Bahrain',
    defaultGoalUsd: 10000,
  },
  {
    code: 'OMR',
    symbol: 'OMR',
    rateFromUsd: 0.385,
    nameAr: 'ريال عماني',
    nameEn: 'Omani Rial',
    countryAr: 'سلطنة عمان',
    countryEn: 'Oman',
    defaultGoalUsd: 10000,
  },
  {
    code: 'MAD',
    symbol: 'MAD',
    rateFromUsd: 10,
    nameAr: 'درهم مغربي',
    nameEn: 'Moroccan Dirham',
    countryAr: 'المغرب',
    countryEn: 'Morocco',
    defaultGoalUsd: 5000,
  },
  {
    code: 'EGP',
    symbol: 'EGP',
    rateFromUsd: 49,
    nameAr: 'جنيه مصري',
    nameEn: 'Egyptian Pound',
    countryAr: 'مصر',
    countryEn: 'Egypt',
    defaultGoalUsd: 3500,
  },
  {
    code: 'JOD',
    symbol: 'JOD',
    rateFromUsd: 0.71,
    nameAr: 'دينار أردني',
    nameEn: 'Jordanian Dinar',
    countryAr: 'الأردن',
    countryEn: 'Jordan',
    defaultGoalUsd: 5000,
  },
  {
    code: 'DZD',
    symbol: 'DZD',
    rateFromUsd: 134,
    nameAr: 'دينار جزائري',
    nameEn: 'Algerian Dinar',
    countryAr: 'الجزائر',
    countryEn: 'Algeria',
    defaultGoalUsd: 4000,
  },
  {
    code: 'TND',
    symbol: 'TND',
    rateFromUsd: 3.1,
    nameAr: 'دينار تونسي',
    nameEn: 'Tunisian Dinar',
    countryAr: 'تونس',
    countryEn: 'Tunisia',
    defaultGoalUsd: 4000,
  },
  {
    code: 'TRY',
    symbol: '₺',
    rateFromUsd: 34,
    nameAr: 'ليرة تركية',
    nameEn: 'Turkish Lira',
    countryAr: 'تركيا',
    countryEn: 'Turkey',
    defaultGoalUsd: 6000,
  },
  {
    code: 'CAD',
    symbol: 'CA$',
    rateFromUsd: 1.38,
    nameAr: 'دولار كندي',
    nameEn: 'Canadian Dollar',
    countryAr: 'كندا',
    countryEn: 'Canada',
    defaultGoalUsd: 12000,
  },
  {
    code: 'AUD',
    symbol: 'A$',
    rateFromUsd: 1.52,
    nameAr: 'دولار أسترالي',
    nameEn: 'Australian Dollar',
    countryAr: 'أستراليا',
    countryEn: 'Australia',
    defaultGoalUsd: 12000,
  },
  {
    code: 'CHF',
    symbol: 'CHF',
    rateFromUsd: 0.88,
    nameAr: 'فرنك سويسري',
    nameEn: 'Swiss Franc',
    countryAr: 'سويسرا',
    countryEn: 'Switzerland',
    defaultGoalUsd: 18000,
  },
  {
    code: 'JPY',
    symbol: '¥',
    rateFromUsd: 152,
    nameAr: 'ين ياباني',
    nameEn: 'Japanese Yen',
    countryAr: 'اليابان',
    countryEn: 'Japan',
    defaultGoalUsd: 10000,
  },
];

function buildGlobalCurrencies(): CurrencyOption[] {
  const map = new Map<string, CurrencyOption>();
  for (const c of CORE_CURRENCIES) {
    map.set(c.code, c);
  }
  for (const city of GLOBAL_CITIES_DATA) {
    if (!map.has(city.currencyCode)) {
      map.set(city.currencyCode, {
        code: city.currencyCode,
        symbol: city.currencySymbol,
        rateFromUsd: city.rateFromUsd,
        nameAr: `عملة ${city.countryAr} (${city.currencyCode})`,
        nameEn: `${city.countryEn} (${city.currencyCode})`,
        countryAr: city.countryAr,
        countryEn: city.countryEn,
        defaultGoalUsd: Math.max(3000, city.typicalNetSalaryUsd * 3),
      });
    }
  }
  return Array.from(map.values());
}

const ALL_CURRENCIES = buildGlobalCurrencies();

/**
 * Computes exact months needed to reach `targetAmount` starting from `currentSaved`
 * with `monthlyContribution` and `annualYieldPct` compounded monthly.
 */
function solveMonthsToTarget(
  targetAmount: number,
  currentSaved: number,
  monthlyContribution: number,
  annualYieldPct: number
): number {
  const remaining = targetAmount - currentSaved;
  if (remaining <= 0) return 0;

  const r = Math.max(0, annualYieldPct) / 100 / 12;
  if (r <= 0.000001) {
    if (monthlyContribution <= 0) return Infinity;
    return Math.ceil(remaining / monthlyContribution);
  }

  // With monthly compounding: FV = PV*(1+r)^n + PMT*(((1+r)^n - 1)/r)
  // => (FV + PMT/r) / (PV + PMT/r) = (1+r)^n
  const pmtOverR = monthlyContribution / r;
  const denominator = currentSaved + pmtOverR;
  if (denominator <= 0) return Infinity;

  const ratio = (targetAmount + pmtOverR) / denominator;
  if (ratio <= 1) return 0;

  const exactMonths = Math.log(ratio) / Math.log(1 + r);
  if (!Number.isFinite(exactMonths) || exactMonths < 0) return Infinity;
  return Math.min(1200, Math.ceil(exactMonths));
}

/**
 * Computes exact monthly contribution needed to reach `targetAmount` in `targetMonths`
 * starting from `currentSaved` with `annualYieldPct` compounded monthly.
 */
function solveMonthlyContributionForMonths(
  targetAmount: number,
  currentSaved: number,
  targetMonths: number,
  annualYieldPct: number
): number {
  const n = Math.max(1, Math.round(targetMonths));
  const r = Math.max(0, annualYieldPct) / 100 / 12;

  if (r <= 0.000001) {
    const rem = Math.max(0, targetAmount - currentSaved);
    return rem / n;
  }

  const compoundFactor = Math.pow(1 + r, n);
  const futureValueOfCurrent = currentSaved * compoundFactor;
  const shortfall = targetAmount - futureValueOfCurrent;
  if (shortfall <= 0) return 0;

  const annuityFactor = (compoundFactor - 1) / r;
  return annuityFactor > 0 ? shortfall / annuityFactor : shortfall / n;
}

export function SavingsGoalCalculator({ locale }: SavingsGoalCalculatorProps) {
  const isAr = locale === 'ar';

  // 1. Store Viewed Products Ribbon + Smart Bilingual Typo-Tolerant Search
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

  // 2. Global Currency & Auto-Detection State
  const [currencyCode, setCurrencyCode] = useState<string>('USD');
  const [isCurrencyDrawerOpen, setIsCurrencyDrawerOpen] = useState<boolean>(false);
  const [currencyQuery, setCurrencyQuery] = useState<string>('');
  const [detectedLocationLabel, setDetectedLocationLabel] = useState<string>('');
  const [hasAutoDetected, setHasAutoDetected] = useState<boolean>(false);
  const currencySearchInputRef = useRef<HTMLInputElement | null>(null);

  // 3. Solver Mode & Presets
  const [solverMode, setSolverMode] = useState<SolverMode>('solve_time');
  const [activePreset, setActivePreset] = useState<GoalPresetId>('emergency');

  // Core Numeric Inputs (Start from 0, step by 1)
  const [goalAmountInput, setGoalAmountInput] = useState<string>('12000');
  const [currentSavedInput, setCurrentSavedInput] = useState<string>('2400');
  const [monthlySavingInput, setMonthlySavingInput] = useState<string>('600');
  const [targetMonthsInput, setTargetMonthsInput] = useState<string>('18');

  // Optional Smart Boosters (Annual Return % and Inflation Protection %)
  const [annualYieldInput, setAnnualYieldInput] = useState<string>('4');
  const [inflationRateInput, setInflationRateInput] = useState<string>('0');

  // Interactive Daily Micro-Booster Slider (Extra daily saving units)
  const [extraDailySave, setExtraDailySave] = useState<number>(5);

  const [copiedPlan, setCopiedPlan] = useState<boolean>(false);

  const activeCurrency = useMemo(
    () =>
      ALL_CURRENCIES.find((c) => c.code === currencyCode) || ALL_CURRENCIES[0],
    [currencyCode]
  );

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
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }),
    []
  );

  const formatMoney = (val: number, decimals = 0) => {
    const safe = Number.isFinite(val) ? val : 0;
    const formatted =
      decimals === 1 ? oneDecFmt.format(safe) : intFmt.format(Math.round(safe));
    if (
      activeCurrency.symbol === '$' ||
      activeCurrency.symbol === '€' ||
      activeCurrency.symbol === '£'
    ) {
      return `${activeCurrency.symbol}${formatted}`;
    }
    return `${formatted} ${activeCurrency.symbol}`;
  };

  // Apply Goal Preset
  const applyGoalPreset = (
    preset: GoalPresetId,
    targetCur: CurrencyOption = activeCurrency
  ) => {
    setActivePreset(preset);
    setSelectedViewedProduct(null);

    if (preset === 'zero') {
      setGoalAmountInput('0');
      setCurrentSavedInput('0');
      setMonthlySavingInput('0');
      setTargetMonthsInput('12');
      setAnnualYieldInput('0');
      setInflationRateInput('0');
      return;
    }

    const baseGoal = Math.max(
      500,
      Math.round(targetCur.defaultGoalUsd * targetCur.rateFromUsd)
    );

    if (preset === 'emergency') {
      setGoalAmountInput(String(baseGoal));
      setCurrentSavedInput(String(Math.round(baseGoal * 0.2)));
      setMonthlySavingInput(String(Math.max(10, Math.round(baseGoal * 0.05))));
      setTargetMonthsInput('16');
      setAnnualYieldInput('4');
      setInflationRateInput('0');
    } else if (preset === 'vehicle_home') {
      const highGoal = Math.round(baseGoal * 2.5);
      setGoalAmountInput(String(highGoal));
      setCurrentSavedInput(String(Math.round(highGoal * 0.15)));
      setMonthlySavingInput(String(Math.max(20, Math.round(highGoal * 0.035))));
      setTargetMonthsInput('24');
      setAnnualYieldInput('5');
      setInflationRateInput('2');
    } else if (preset === 'dream_trip') {
      const tripGoal = Math.round(baseGoal * 0.35);
      setGoalAmountInput(String(tripGoal));
      setCurrentSavedInput(String(Math.round(tripGoal * 0.1)));
      setMonthlySavingInput(String(Math.max(10, Math.round(tripGoal * 0.1))));
      setTargetMonthsInput('9');
      setAnnualYieldInput('0');
      setInflationRateInput('0');
    } else if (preset === 'business') {
      const bizGoal = Math.round(baseGoal * 1.8);
      setGoalAmountInput(String(bizGoal));
      setCurrentSavedInput(String(Math.round(bizGoal * 0.25)));
      setMonthlySavingInput(String(Math.max(15, Math.round(bizGoal * 0.045))));
      setTargetMonthsInput('18');
      setAnnualYieldInput('5');
      setInflationRateInput('0');
    }
  };

  // Auto-detect browser city & currency on first mount
  useEffect(() => {
    if (hasAutoDetected) return;
    const { detectedCity } = detectBrowserCityBenchmark();
    const matchedCur =
      ALL_CURRENCIES.find((c) => c.code === detectedCity.currencyCode) ||
      ALL_CURRENCIES[0];

    setCurrencyCode(matchedCur.code);
    setDetectedLocationLabel(
      isAr
        ? `${detectedCity.cityAr}، ${detectedCity.countryAr}`
        : `${detectedCity.cityEn}, ${detectedCity.countryEn}`
    );
    applyGoalPreset('emergency', matchedCur);
    setHasAutoDetected(true);
  }, [hasAutoDetected, isAr]);

  const handleSelectCurrency = (nextCur: CurrencyOption) => {
    if (nextCur.code === currencyCode) {
      setIsCurrencyDrawerOpen(false);
      return;
    }

    const prevRate = activeCurrency.rateFromUsd || 1;
    const nextRate = nextCur.rateFromUsd || 1;
    const ratio = nextRate / prevRate;

    const scaleStr = (raw: string) => {
      const n = Number(raw);
      if (!Number.isFinite(n) || n <= 0) return '0';
      return String(Math.max(1, Math.round(n * ratio)));
    };

    setGoalAmountInput(scaleStr(goalAmountInput));
    setCurrentSavedInput(scaleStr(currentSavedInput));
    setMonthlySavingInput(scaleStr(monthlySavingInput));
    setExtraDailySave((prev) => Math.max(1, Math.round(prev * ratio)));

    setCurrencyCode(nextCur.code);
    setIsCurrencyDrawerOpen(false);
    setCurrencyQuery('');
  };

  // Focus currency search input
  useEffect(() => {
    if (isCurrencyDrawerOpen) {
      const timer = window.setTimeout(() => {
        currencySearchInputRef.current?.focus();
      }, 40);
      return () => window.clearTimeout(timer);
    }
  }, [isCurrencyDrawerOpen]);

  const filteredCurrencies = useMemo(() => {
    const q = currencyQuery.trim().toLowerCase();
    if (!q) return ALL_CURRENCIES;
    return ALL_CURRENCIES.filter((c) => {
      const hay = `${c.code} ${c.symbol} ${c.nameAr} ${c.nameEn} ${c.countryAr} ${c.countryEn}`.toLowerCase();
      return hay.includes(q);
    });
  }, [currencyQuery]);

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

  // Preload catalog in background
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

  useEffect(() => {
    if (isProductSearchOpen) {
      const timer = window.setTimeout(() => {
        productSearchInputRef.current?.focus();
      }, 40);
      return () => window.clearTimeout(timer);
    }
  }, [isProductSearchOpen]);

  const displayedProducts = useMemo(() => {
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
    if (!trimmed) {
      return allPool;
    }

    return searchBrowserProductSnapshots(allPool, trimmed);
  }, [isProductSearchOpen, productSearchQuery, viewedProducts, catalogProducts]);

  // Mouse drag & wheel horizontal scroll for product ribbon
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

  // Set Store Product as Target Savings Goal
  const handleSetProductAsGoal = (
    item: BrowserProductSnapshot,
    fromSearch = false
  ) => {
    setSelectedViewedProduct(item);
    const localPrice = Math.max(
      1,
      Math.round(item.priceUsd * activeCurrency.rateFromUsd)
    );
    setGoalAmountInput(String(localPrice));
    setCurrentSavedInput('0');
    setMonthlySavingInput(String(Math.max(1, Math.round(localPrice / 6))));
    setTargetMonthsInput('6');

    if (fromSearch) {
      const updated = recordBrowserProductView(item);
      setViewedProducts(updated);
    }
  };

  // Dynamic Slider Maximums
  const goalSliderMax = useMemo(() => {
    const baseMax = Math.round(
      activeCurrency.defaultGoalUsd * activeCurrency.rateFromUsd * 4
    );
    const currentGoal = Number(goalAmountInput) || 0;
    return Math.max(10000, baseMax, Math.ceil(currentGoal * 1.25));
  }, [activeCurrency, goalAmountInput]);

  const monthlySliderMax = useMemo(() => {
    const currentGoal = Number(goalAmountInput) || 0;
    const currentMonthly = Number(monthlySavingInput) || 0;
    return Math.max(
      2000,
      Math.round(currentGoal * 0.5),
      Math.ceil(currentMonthly * 1.5)
    );
  }, [goalAmountInput, monthlySavingInput]);

  // 4. Comprehensive Savings Goal & Milestone Engine
  const plan = useMemo(() => {
    const baseGoal = Math.max(0, Number(goalAmountInput) || 0);
    const currentSaved = Math.max(0, Number(currentSavedInput) || 0);
    const userMonthly = Math.max(0, Number(monthlySavingInput) || 0);
    const userTargetMonths = Math.min(
      600,
      Math.max(1, Math.round(Number(targetMonthsInput) || 12))
    );
    const annualYield = Math.min(
      30,
      Math.max(0, Number(annualYieldInput) || 0)
    );
    const inflationRate = Math.min(
      25,
      Math.max(0, Number(inflationRateInput) || 0)
    );

    // Determine effective months & monthly contribution based on mode
    let effectiveMonths = 0;
    let effectiveMonthlySaving = 0;
    let effectiveGoalWithInflation = baseGoal;

    if (solverMode === 'solve_time') {
      effectiveMonthlySaving = userMonthly;
      const rawMonths = solveMonthsToTarget(
        baseGoal,
        currentSaved,
        effectiveMonthlySaving,
        annualYield
      );
      if (Number.isFinite(rawMonths) && inflationRate > 0 && rawMonths > 0) {
        const yearsEst = rawMonths / 12;
        effectiveGoalWithInflation = Math.round(
          baseGoal * Math.pow(1 + inflationRate / 100, yearsEst)
        );
        effectiveMonths = solveMonthsToTarget(
          effectiveGoalWithInflation,
          currentSaved,
          effectiveMonthlySaving,
          annualYield
        );
      } else {
        effectiveMonths = rawMonths;
      }
    } else {
      effectiveMonths = userTargetMonths;
      if (inflationRate > 0) {
        effectiveGoalWithInflation = Math.round(
          baseGoal * Math.pow(1 + inflationRate / 100, effectiveMonths / 12)
        );
      }
      effectiveMonthlySaving = solveMonthlyContributionForMonths(
        effectiveGoalWithInflation,
        currentSaved,
        effectiveMonths,
        annualYield
      );
    }

    const isUnreachable =
      !Number.isFinite(effectiveMonths) ||
      (baseGoal > currentSaved &&
        effectiveMonthlySaving <= 0 &&
        annualYield <= 0);
    const safeMonths = isUnreachable ? 0 : Math.max(0, effectiveMonths);

    // Simulate month-by-month trajectory to calculate exact total deposits & yield earned
    const r = annualYield / 100 / 12;
    let balance = currentSaved;
    let totalDepositsAdded = 0;
    let totalYieldEarned = 0;

    for (let m = 1; m <= safeMonths; m++) {
      const interestThisMonth = balance * r;
      totalYieldEarned += interestThisMonth;
      totalDepositsAdded += effectiveMonthlySaving;
      balance += interestThisMonth + effectiveMonthlySaving;
    }

    const finalProjectedBalance =
      safeMonths === 0
        ? currentSaved
        : Math.max(effectiveGoalWithInflation, balance);

    // Composition percentages of Target Goal
    const denomGoal = Math.max(1, effectiveGoalWithInflation);
    const currentProgressPct =
      effectiveGoalWithInflation > 0
        ? Math.min(100, (currentSaved / denomGoal) * 100)
        : 0;
    const yieldContributionPct =
      effectiveGoalWithInflation > 0
        ? Math.min(
            Math.max(0, 100 - currentProgressPct),
            (totalYieldEarned / denomGoal) * 100
          )
        : 0;
    const depositsContributionPct =
      effectiveGoalWithInflation > 0
        ? Math.max(0, 100 - currentProgressPct - yieldContributionPct)
        : 0;

    // Date formatting helper
    const formatDateAfterMonths = (monthsOffset: number) => {
      if (!Number.isFinite(monthsOffset) || monthsOffset < 0) return '—';
      if (monthsOffset === 0) {
        return isAr ? 'مكتمل الآن ✓' : 'Reached Today ✓';
      }
      const d = new Date();
      d.setMonth(d.getMonth() + Math.round(monthsOffset));
      return d.toLocaleDateString(isAr ? 'ar-MA-u-nu-latn' : 'en-US', {
        month: 'short',
        year: 'numeric',
      });
    };

    const completionDateLabel = isUnreachable
      ? isAr
        ? 'أدخل ادخاراً شهرياً للوصول للهدف'
        : 'Add monthly savings to reach goal'
      : formatDateAfterMonths(safeMonths);

    // 4-Stage Milestone Roadmap (25%, 50%, 75%, 100%)
    const milestoneStages = [0.25, 0.5, 0.75, 1].map((fraction) => {
      const stagePct = Math.round(fraction * 100);
      const stageAmount = Math.round(effectiveGoalWithInflation * fraction);
      const isAlreadyReached =
        effectiveGoalWithInflation > 0 && currentSaved >= stageAmount;
      const mNeeded = isAlreadyReached
        ? 0
        : solveMonthsToTarget(
            stageAmount,
            currentSaved,
            effectiveMonthlySaving,
            annualYield
          );

      return {
        pct: stagePct,
        amount: stageAmount,
        isReached: isAlreadyReached,
        monthsFromNow: Number.isFinite(mNeeded) ? mNeeded : null,
        dateLabel: Number.isFinite(mNeeded)
          ? formatDateAfterMonths(mNeeded)
          : '—',
      };
    });

    // Daily Micro-Booster Simulation (Adding extraDailySave * 30 per month)
    const extraMonthlyFromDaily = extraDailySave * 30;
    const boostedMonthlySaving = effectiveMonthlySaving + extraMonthlyFromDaily;
    const boostedMonths = solveMonthsToTarget(
      effectiveGoalWithInflation,
      currentSaved,
      boostedMonthlySaving,
      annualYield
    );
    const monthsSavedByBooster =
      Number.isFinite(safeMonths) &&
      Number.isFinite(boostedMonths) &&
      safeMonths > boostedMonths
        ? safeMonths - boostedMonths
        : 0;
    const boostedCompletionDate = Number.isFinite(boostedMonths)
      ? formatDateAfterMonths(boostedMonths)
      : '—';

    return {
      baseGoal,
      effectiveGoalWithInflation,
      currentSaved,
      effectiveMonthlySaving,
      dailySavingEquivalent: effectiveMonthlySaving / 30,
      weeklySavingEquivalent: effectiveMonthlySaving / 4.3333,
      annualYield,
      inflationRate,
      isUnreachable,
      safeMonths,
      yearsPortion: Math.floor(safeMonths / 12),
      monthsPortion: safeMonths % 12,
      totalDepositsAdded,
      totalYieldEarned,
      finalProjectedBalance,
      currentProgressPct,
      depositsContributionPct,
      yieldContributionPct,
      completionDateLabel,
      milestoneStages,
      extraMonthlyFromDaily,
      boostedMonthlySaving,
      boostedMonths: Number.isFinite(boostedMonths) ? boostedMonths : 0,
      monthsSavedByBooster,
      boostedCompletionDate,
    };
  }, [
    goalAmountInput,
    currentSavedInput,
    monthlySavingInput,
    targetMonthsInput,
    annualYieldInput,
    inflationRateInput,
    solverMode,
    extraDailySave,
    isAr,
  ]);

  const handleCopyPlan = async () => {
    const text = isAr
      ? [
          `خطة AQURIVO لهدف الادخار وبناء الثروة`,
          `────────────────────────────────────────`,
          `• الهدف المالي المطلوب: ${formatMoney(plan.effectiveGoalWithInflation)}`,
          `• المدخرات المتوفرة حالياً: ${formatMoney(plan.currentSaved)} (${oneDecFmt.format(
            plan.currentProgressPct
          )}%)`,
          `• الادخار الشهري المعتمد: ${formatMoney(plan.effectiveMonthlySaving)} (${formatMoney(
            plan.dailySavingEquivalent,
            1
          )} يومياً)`,
          `• المدة المتوقعة للوصول: ${plan.safeMonths} شهر (${plan.completionDateLabel})`,
          `• العائد التراكمي المكتسب: +${formatMoney(plan.totalYieldEarned)}`,
        ].join('\n')
      : [
          `AQURIVO Savings Goal & Milestone Plan`,
          `────────────────────────────────────────`,
          `• Target Financial Goal: ${formatMoney(plan.effectiveGoalWithInflation)}`,
          `• Current Saved Amount: ${formatMoney(plan.currentSaved)} (${oneDecFmt.format(
            plan.currentProgressPct
          )}%)`,
          `• Monthly Contribution: ${formatMoney(plan.effectiveMonthlySaving)} (${formatMoney(
            plan.dailySavingEquivalent,
            1
          )}/day)`,
          `• Time to Reach Goal: ${plan.safeMonths} months (${plan.completionDateLabel})`,
          `• Projected Compound Yield Earned: +${formatMoney(plan.totalYieldEarned)}`,
        ].join('\n');

    try {
      await navigator.clipboard.writeText(text);
      setCopiedPlan(true);
      window.setTimeout(() => setCopiedPlan(false), 2500);
    } catch {
      // Ignore clipboard error
    }
  };

  return (
    <div className={styles.studioShell} dir={isAr ? 'rtl' : 'ltr'}>
      {/* 1. STORE VIEWED PRODUCTS RIBBON + SMART SEARCH */}
      <div className={styles.storeViewedBar}>
        <div className={styles.storeViewedHeader}>
          <div className={styles.storeViewedLabelWrap}>
            <span className={styles.telemetryDiamond} aria-hidden="true">
              ◆
            </span>
            <span className={styles.storeViewedLabel}>
              {isAr
                ? 'منتجات المتجر — اختر أي منتج لتحويله فوراً إلى خطة ادخار زمنية:'
                : 'Store Products — Click any product to turn it into a milestone savings plan:'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsProductSearchOpen((prev) => !prev)}
            className={`${styles.storeSearchTriggerBtn} ${
              isProductSearchOpen ? styles.storeSearchTriggerBtnActive : ''
            }`}
          >
            <Search className={styles.storeSearchTriggerIcon} />
            <span>{isAr ? 'بحث ذكي عن منتج' : 'Smart Product Search'}</span>
          </button>
        </div>

        {isProductSearchOpen && (
          <div className={styles.storeSearchDrawer}>
            <div className={styles.storeSearchInputBox}>
              <Search className={styles.storeSearchFieldIcon} />
              <input
                ref={productSearchInputRef}
                type="search"
                value={productSearchQuery}
                onChange={(e) => setProductSearchQuery(e.target.value)}
                placeholder={
                  isAr
                    ? 'ابحث بأي كلمة، اختصار (مثل pc، شاشة، لابتوب) حتى مع الأخطاء الإملائية...'
                    : 'Search by any word, middle/last word, or typo (e.g. pc, monitor, laptop)...'
                }
                className={styles.storeSearchInput}
              />
              {productSearchQuery && (
                <button
                  type="button"
                  onClick={() => setProductSearchQuery('')}
                  className={styles.storeSearchClearBtn}
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        )}

        {displayedProducts.length > 0 ? (
          <div
            ref={ribbonTrackRef}
            className={`${styles.viewedRibbonTrack} ${
              isDraggingRibbon ? styles.viewedRibbonTrackDragging : ''
            }`}
            onMouseDown={handleRibbonMouseDown}
            onMouseMove={handleRibbonMouseMove}
            onMouseUp={handleRibbonMouseUpOrLeave}
            onMouseLeave={handleRibbonMouseUpOrLeave}
            onClickCapture={handleRibbonClickCapture}
            onWheel={handleRibbonWheel}
          >
            {displayedProducts.map((item) => {
              const isSelected = selectedViewedProduct?.slug === item.slug;
              const itemTitle = isAr
                ? item.titleAr || item.nameAr
                : item.titleEn || item.nameEn;
              const itemImg = item.imageUrl || item.image;
              const localPrice = Math.max(
                1,
                Math.round(item.priceUsd * activeCurrency.rateFromUsd)
              );

              return (
                <button
                  key={item.slug}
                  type="button"
                  onClick={() =>
                    handleSetProductAsGoal(
                      item,
                      Boolean(productSearchQuery.trim())
                    )
                  }
                  className={`${styles.viewedCapsule} ${
                    isSelected ? styles.viewedCapsuleActive : ''
                  }`}
                >
                  <div className={styles.viewedThumbWrap}>
                    {itemImg && !failedThumbIds[item.slug] ? (
                      <img
                        src={itemImg}
                        alt={itemTitle}
                        className={styles.viewedThumbImg}
                        loading="lazy"
                        draggable={false}
                        referrerPolicy="no-referrer"
                        onError={() =>
                          setFailedThumbIds((prev) => ({
                            ...prev,
                            [item.slug]: true,
                          }))
                        }
                      />
                    ) : (
                      <span className={styles.viewedThumbFallback}>AQ</span>
                    )}
                  </div>

                  <div className={styles.viewedInfo}>
                    <span className={styles.viewedName}>{itemTitle}</span>
                    <span className={styles.viewedMeta}>
                      {formatMoney(localPrice)} ·{' '}
                      {isAr ? 'اجعله هدف ادخارك' : 'Set as Goal'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className={styles.viewedEmptyHint}>
            {isLoadingCatalog
              ? isAr
                ? 'جاري تحميل منتجات المتجر...'
                : 'Loading store products...'
              : productSearchQuery.trim()
                ? isAr
                  ? 'لا يوجد منتج مطابق لبحثك حالياً.'
                  : 'No matching store product found.'
                : isAr
                  ? 'اضغط على "بحث ذكي عن منتج" أعلاه لاختيار أي منتج من المتجر وبناء خطة ادخار للوصول لسعره.'
                  : 'Click "Smart Product Search" above to pick any store product and build a savings plan for it.'}
          </div>
        )}
      </div>

      {/* 2. STUDIO HEADER BAR: LOGO + GLOBAL CURRENCY DRAWER + GOAL PRESETS */}
      <div className={styles.studioHeaderBar}>
        <div className={styles.studioHeaderTop}>
          <SavingsGoalLogo size="md" showWordmark locale={locale} />

          <div className={styles.currencyControlWrap}>
            {detectedLocationLabel && (
              <span className={styles.detectedLocationText}>
                <Globe size={13} aria-hidden="true" />
                <span>
                  {isAr
                    ? `تم ضبط العملة تلقائياً (${detectedLocationLabel})`
                    : `Auto-detected (${detectedLocationLabel})`}
                </span>
              </span>
            )}

            <button
              type="button"
              onClick={() => setIsCurrencyDrawerOpen((prev) => !prev)}
              className={styles.currencySelectTrigger}
              aria-expanded={isCurrencyDrawerOpen}
            >
              <span className={styles.currencyCodeHighlight}>
                {activeCurrency.code}
              </span>
              <span className={styles.currencyNameText}>
                {isAr ? activeCurrency.nameAr : activeCurrency.nameEn}
              </span>
              <ChevronDown size={15} />
            </button>
          </div>
        </div>

        {isCurrencyDrawerOpen && (
          <div className={styles.currencyDrawer}>
            <div className={styles.currencySearchHeader}>
              <div className={styles.currencySearchInputWrap}>
                <Search size={15} className={styles.currencySearchIcon} />
                <input
                  ref={currencySearchInputRef}
                  type="search"
                  value={currencyQuery}
                  onChange={(e) => setCurrencyQuery(e.target.value)}
                  placeholder={
                    isAr
                      ? 'ابحث عن أي دولة أو عملة (مثال: ريال، درهم، دولار، يورو، المغرب، مصر)...'
                      : 'Search any country or currency (e.g. USD, EUR, SAR, MAD, GBP)...'
                  }
                  className={styles.currencySearchInput}
                />
                {currencyQuery && (
                  <button
                    type="button"
                    onClick={() => setCurrencyQuery('')}
                    className={styles.currencyClearBtn}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsCurrencyDrawerOpen(false)}
                className={styles.currencyCloseDrawerBtn}
              >
                {isAr ? 'إغلاق' : 'Close'}
              </button>
            </div>

            <div className={styles.currencyGrid}>
              {filteredCurrencies.map((cur) => {
                const isSelected = cur.code === activeCurrency.code;
                return (
                  <button
                    key={cur.code}
                    type="button"
                    onClick={() => handleSelectCurrency(cur)}
                    className={`${styles.currencyOptionBtn} ${
                      isSelected ? styles.currencyOptionBtnActive : ''
                    }`}
                  >
                    <span className={styles.currencyOptionCode}>{cur.code}</span>
                    <span className={styles.currencyOptionDetails}>
                      <strong>{isAr ? cur.nameAr : cur.nameEn}</strong>
                      <small>{isAr ? cur.countryAr : cur.countryEn}</small>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick Goal Presets */}
        <div className={styles.presetsBar}>
          <span className={styles.presetsBarLabel}>
            {isAr ? 'أهداف جاهزة للمعايرة:' : 'Quick Goal Presets:'}
          </span>
          <div className={styles.presetButtonsRow}>
            <button
              type="button"
              onClick={() => applyGoalPreset('emergency')}
              className={`${styles.presetBtn} ${
                activePreset === 'emergency' ? styles.presetBtnActive : ''
              }`}
            >
              {isAr ? 'صندوق الأمان والطوارئ' : 'Emergency Fund'}
            </button>
            <button
              type="button"
              onClick={() => applyGoalPreset('vehicle_home')}
              className={`${styles.presetBtn} ${
                activePreset === 'vehicle_home' ? styles.presetBtnActive : ''
              }`}
            >
              {isAr ? 'شراء سيارة / دفعة منزل' : 'Car / Home Down Payment'}
            </button>
            <button
              type="button"
              onClick={() => applyGoalPreset('dream_trip')}
              className={`${styles.presetBtn} ${
                activePreset === 'dream_trip' ? styles.presetBtnActive : ''
              }`}
            >
              {isAr ? 'رحلة الأحلام / إجازة' : 'Dream Vacation'}
            </button>
            <button
              type="button"
              onClick={() => applyGoalPreset('business')}
              className={`${styles.presetBtn} ${
                activePreset === 'business' ? styles.presetBtnActive : ''
              }`}
            >
              {isAr ? 'تأسيس مشروع خاص' : 'Launch a Business'}
            </button>
            <button
              type="button"
              onClick={() => applyGoalPreset('zero')}
              className={`${styles.presetBtn} ${
                activePreset === 'zero' ? styles.presetBtnActive : ''
              }`}
            >
              <RotateCcw size={13} aria-hidden="true" />
              <span>
                {isAr ? 'تصفير الحقول (البدء من 0)' : 'Reset All to 0'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. MAIN WORKBENCH 2-COLUMN GRID */}
      <div className={styles.workbenchGrid}>
        {/* LEFT COLUMN: INPUT DECK */}
        <div className={styles.inputDeckColumn}>
          {/* CARD 1: DUAL-MODE SOLVER SWITCHER & PRIMARY GOAL INPUTS */}
          <section className={styles.inputCard}>
            <div className={styles.modeTabsGrid} role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={solverMode === 'solve_time'}
                onClick={() => setSolverMode('solve_time')}
                className={`${styles.modeTabBtn} ${
                  solverMode === 'solve_time' ? styles.modeTabBtnActive : ''
                }`}
              >
                <Compass size={15} aria-hidden="true" />
                <span>
                  {isAr
                    ? 'اعرف متى ستصل لهدفك'
                    : 'Find When You Reach Your Goal'}
                </span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={solverMode === 'solve_monthly'}
                onClick={() => setSolverMode('solve_monthly')}
                className={`${styles.modeTabBtn} ${
                  solverMode === 'solve_monthly' ? styles.modeTabBtnActive : ''
                }`}
              >
                <Flag size={15} aria-hidden="true" />
                <span>
                  {isAr
                    ? 'اعرف كم يجب أن تدخر شهرياً'
                    : 'Find Required Monthly Savings'}
                </span>
              </button>
            </div>

            {/* Target Financial Goal Amount */}
            <div className={styles.fieldBlock}>
              <div className={styles.fieldLabelRow}>
                <label htmlFor="sg-target-goal" className={styles.fieldLabel}>
                  {isAr
                    ? 'قيمة الهدف المالي المطلوب'
                    : 'Target Financial Goal Amount'}
                </label>
                <span className={styles.fieldLiveValue}>
                  {formatMoney(plan.baseGoal)}
                </span>
              </div>

              <div className={styles.numberInputRow}>
                <input
                  id="sg-target-goal"
                  type="number"
                  min="0"
                  step="1"
                  value={goalAmountInput}
                  onChange={(e) => setGoalAmountInput(e.target.value)}
                  className={styles.numberInput}
                />
                <span className={styles.inputUnitTag}>{activeCurrency.code}</span>
              </div>

              <input
                type="range"
                min="0"
                max={goalSliderMax}
                step="1"
                value={Math.min(goalSliderMax, plan.baseGoal)}
                onChange={(e) => setGoalAmountInput(e.target.value)}
                className={styles.rangeSlider}
                aria-label={isAr ? 'قيمة الهدف المالي' : 'Target Financial Goal'}
              />
            </div>

            {/* Amount Saved So Far */}
            <div className={styles.fieldBlock}>
              <div className={styles.fieldLabelRow}>
                <label htmlFor="sg-current-saved" className={styles.fieldLabel}>
                  {isAr
                    ? 'المبلغ المتوفر لديك حالياً كبداية'
                    : 'Current Saved Amount (Starting Balance)'}
                </label>
                <span className={styles.fieldLiveValueCyan}>
                  {formatMoney(plan.currentSaved)}
                </span>
              </div>

              <div className={styles.numberInputRow}>
                <input
                  id="sg-current-saved"
                  type="number"
                  min="0"
                  step="1"
                  value={currentSavedInput}
                  onChange={(e) => setCurrentSavedInput(e.target.value)}
                  className={styles.numberInput}
                />
                <span className={styles.inputUnitTag}>{activeCurrency.code}</span>
              </div>

              <input
                type="range"
                min="0"
                max={Math.max(1000, plan.baseGoal)}
                step="1"
                value={Math.min(Math.max(1000, plan.baseGoal), plan.currentSaved)}
                onChange={(e) => setCurrentSavedInput(e.target.value)}
                className={styles.rangeSliderCyan}
                aria-label={isAr ? 'المدخرات الحالية' : 'Current Saved Amount'}
              />
            </div>

            {/* Mode-Specific Third Field: Either Monthly Saving OR Target Months */}
            {solverMode === 'solve_time' ? (
              <div className={styles.fieldBlock}>
                <div className={styles.fieldLabelRow}>
                  <label htmlFor="sg-monthly-save" className={styles.fieldLabel}>
                    {isAr
                      ? 'المبلغ الذي تستطيع ادخاره كل شهر'
                      : 'Monthly Contribution You Can Save'}
                  </label>
                  <span className={styles.fieldLiveValue}>
                    {formatMoney(plan.effectiveMonthlySaving)}/
                    {isAr ? 'شهر' : 'mo'}
                  </span>
                </div>

                <div className={styles.numberInputRow}>
                  <input
                    id="sg-monthly-save"
                    type="number"
                    min="0"
                    step="1"
                    value={monthlySavingInput}
                    onChange={(e) => setMonthlySavingInput(e.target.value)}
                    className={styles.numberInput}
                  />
                  <span className={styles.inputUnitTag}>{activeCurrency.code}</span>
                </div>

                <input
                  type="range"
                  min="0"
                  max={monthlySliderMax}
                  step="1"
                  value={Math.min(
                    monthlySliderMax,
                    Number(monthlySavingInput) || 0
                  )}
                  onChange={(e) => setMonthlySavingInput(e.target.value)}
                  className={styles.rangeSlider}
                  aria-label={isAr ? 'الادخار الشهري' : 'Monthly Contribution'}
                />
              </div>
            ) : (
              <div className={styles.fieldBlock}>
                <div className={styles.fieldLabelRow}>
                  <label htmlFor="sg-target-months" className={styles.fieldLabel}>
                    {isAr
                      ? 'المدة الزمنية المستهدفة لتحقيق الهدف (بالأشهر)'
                      : 'Target Timeline to Reach Goal (Months)'}
                  </label>
                  <span className={styles.fieldLiveValue}>
                    {targetMonthsInput} {isAr ? 'شهر' : 'months'}
                  </span>
                </div>

                <input
                  id="sg-target-months"
                  type="number"
                  min="1"
                  max="600"
                  step="1"
                  value={targetMonthsInput}
                  onChange={(e) => setTargetMonthsInput(e.target.value)}
                  className={styles.numberInput}
                />

                <input
                  type="range"
                  min="1"
                  max="120"
                  step="1"
                  value={Math.min(120, Math.max(1, Number(targetMonthsInput) || 12))}
                  onChange={(e) => setTargetMonthsInput(e.target.value)}
                  className={styles.rangeSlider}
                  aria-label={isAr ? 'المدة بالأشهر' : 'Target Months'}
                />

                <div className={styles.quickSegmentRow}>
                  {[6, 12, 18, 24, 36, 60].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setTargetMonthsInput(String(m))}
                      className={`${styles.segmentOptionBtn} ${
                        Number(targetMonthsInput) === m
                          ? styles.segmentOptionBtnActive
                          : ''
                      }`}
                    >
                      {m} {isAr ? 'ش' : 'm'}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* CARD 2: SMART BOOSTERS (ANNUAL YIELD & INFLATION PROTECTION) */}
          <section className={styles.inputCard}>
            <div className={styles.cardHeader}>
              <span className={styles.cardStepIndexAmber}>02</span>
              <div className={styles.cardHeaderText}>
                <h2 className={styles.cardTitle}>
                  {isAr
                    ? 'معززات العائد التراكمي وحماية التضخم'
                    : 'Compound Yield & Inflation Protection'}
                </h2>
                <p className={styles.cardHint}>
                  {isAr
                    ? 'أضف عائداً سنوياً (حساب ادخاري أو ودائع) أو نسبة التضخم لحماية القوة الشرائية لهدفك.'
                    : 'Include optional annual return on savings or inflation adjustment to protect purchasing power.'}
                </p>
              </div>
            </div>

            <div className={styles.dualFieldGrid}>
              <div className={styles.fieldBlock}>
                <div className={styles.fieldLabelRow}>
                  <label htmlFor="sg-annual-yield" className={styles.fieldLabel}>
                    {isAr
                      ? 'العائد السنوي المتوقع على المدخرات (%)'
                      : 'Expected Annual Return / Yield (%)'}
                  </label>
                  <span className={styles.fieldLiveValueAmber}>
                    {plan.annualYield}%
                  </span>
                </div>
                <input
                  id="sg-annual-yield"
                  type="number"
                  min="0"
                  max="30"
                  step="1"
                  value={annualYieldInput}
                  onChange={(e) => setAnnualYieldInput(e.target.value)}
                  className={styles.numberInput}
                />
                <input
                  type="range"
                  min="0"
                  max="15"
                  step="1"
                  value={Math.min(15, plan.annualYield)}
                  onChange={(e) => setAnnualYieldInput(e.target.value)}
                  className={styles.rangeSliderAmber}
                  aria-label={isAr ? 'العائد السنوي' : 'Annual Yield Percentage'}
                />
              </div>

              <div className={styles.fieldBlock}>
                <div className={styles.fieldLabelRow}>
                  <label htmlFor="sg-inflation-rate" className={styles.fieldLabel}>
                    {isAr
                      ? 'نسبة التضخم السنوي (حماية القوة الشرائية %)'
                      : 'Annual Inflation Adjustment (%)'}
                  </label>
                  <span className={styles.fieldLiveValueCyan}>
                    {plan.inflationRate}%
                  </span>
                </div>
                <input
                  id="sg-inflation-rate"
                  type="number"
                  min="0"
                  max="25"
                  step="1"
                  value={inflationRateInput}
                  onChange={(e) => setInflationRateInput(e.target.value)}
                  className={styles.numberInput}
                />
                <input
                  type="range"
                  min="0"
                  max="12"
                  step="1"
                  value={Math.min(12, plan.inflationRate)}
                  onChange={(e) => setInflationRateInput(e.target.value)}
                  className={styles.rangeSliderCyan}
                  aria-label={isAr ? 'نسبة التضخم' : 'Annual Inflation Rate'}
                />
              </div>
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN: LIVE ANALYTICAL REPORT & 4-STAGE MILESTONE ROADMAP */}
        <div className={styles.reportColumn}>
          {/* 1. TARGET HORIZON HERO CARD */}
          <section className={styles.heroReportCard}>
            <div className={styles.heroTopRow}>
              <span className={styles.reportKicker}>
                {solverMode === 'solve_time'
                  ? isAr
                    ? 'موعد تحقيق الهدف وخلاصة الخطة الزمنية'
                    : 'TARGET HORIZON & COMPLETION TIMELINE'
                  : isAr
                  ? 'خطة الاستقطاع المطلوبة للوصول في موعدك'
                  : 'REQUIRED CONTRIBUTION SCHEDULE'}
              </span>

              <span className={styles.completionDateText}>
                {plan.completionDateLabel}
              </span>
            </div>

            <div className={styles.heroDualBoxGrid}>
              {solverMode === 'solve_time' ? (
                <div className={styles.heroPrimaryBox}>
                  <span className={styles.heroBoxLabel}>
                    {isAr
                      ? 'المدة الزمنية للوصول إلى الهدف الكامل'
                      : 'Total Time Required to Reach 100% Goal'}
                  </span>
                  <strong className={styles.heroPrimaryValue}>
                    {plan.isUnreachable
                      ? '—'
                      : plan.safeMonths === 0
                      ? isAr
                        ? 'مكتمل الآن ✓'
                        : 'Goal Reached ✓'
                      : isAr
                      ? `${plan.safeMonths} شهر`
                      : `${plan.safeMonths} Months`}
                  </strong>
                  <span className={styles.heroBoxSub}>
                    {plan.safeMonths > 0
                      ? isAr
                        ? `يعادل ${plan.yearsPortion} سنة و ${plan.monthsPortion} أشهر · الوصول في ${plan.completionDateLabel}`
                        : `Equals ${plan.yearsPortion} yrs & ${plan.monthsPortion} mos · Target Date: ${plan.completionDateLabel}`
                      : isAr
                      ? 'اضبط قيمة الهدف أو الادخار الشهري للمعاينة'
                      : 'Adjust your target goal or monthly savings'}
                  </span>
                </div>
              ) : (
                <div className={styles.heroPrimaryBox}>
                  <span className={styles.heroBoxLabel}>
                    {isAr
                      ? 'المبلغ المطلوب ادخاره شهرياً للوصول في الموعد'
                      : 'Required Monthly Savings to Hit Deadline'}
                  </span>
                  <strong className={styles.heroPrimaryValue}>
                    {formatMoney(plan.effectiveMonthlySaving)}
                    <small>/{isAr ? 'شهر' : 'mo'}</small>
                  </strong>
                  <span className={styles.heroBoxSub}>
                    {isAr
                      ? `للوصول إلى ${formatMoney(
                          plan.effectiveGoalWithInflation
                        )} خلال ${plan.safeMonths} شهراً (${
                          plan.completionDateLabel
                        })`
                      : `To reach ${formatMoney(
                          plan.effectiveGoalWithInflation
                        )} in ${plan.safeMonths} months (${
                          plan.completionDateLabel
                        })`}
                  </span>
                </div>
              )}

              {/* Daily & Weekly Micro-Breakdown */}
              <div className={styles.heroSecondaryBox}>
                <span className={styles.heroBoxLabelMuted}>
                  {isAr
                    ? 'تفكيك الادخار إلى خطوات يومية وأسبوعية'
                    : 'Daily & Weekly Micro-Breakdown'}
                </span>
                <div className={styles.microBreakdownRow}>
                  <div>
                    <small>{isAr ? 'يومياً' : 'Per Day'}</small>
                    <strong>
                      {formatMoney(plan.dailySavingEquivalent, 1)}
                    </strong>
                  </div>
                  <div>
                    <small>{isAr ? 'أسبوعياً' : 'Per Week'}</small>
                    <strong>
                      {formatMoney(plan.weeklySavingEquivalent)}
                    </strong>
                  </div>
                </div>
                <span className={styles.heroBoxSub}>
                  {isAr
                    ? `عائد تراكمي مجاني مضاف لمدخراتك: +${formatMoney(
                        plan.totalYieldEarned
                      )}`
                    : `Compound yield added to your savings: +${formatMoney(
                        plan.totalYieldEarned
                      )}`}
                </span>
              </div>
            </div>

            {/* Composition Bar (Current Saved vs New Deposits vs Compound Yield) */}
            <div className={styles.compositionWrap}>
              <div className={styles.compositionHeader}>
                <span>
                  {isAr
                    ? 'مكونات الوصول للهدف المالي:'
                    : 'Goal Funding Composition:'}
                </span>
                <strong>
                  {formatMoney(plan.effectiveGoalWithInflation)}
                  {plan.inflationRate > 0 && (
                    <small>
                      {' '}
                      ({isAr ? 'شاملاً حماية التضخم' : 'Inflation-protected'})
                    </small>
                  )}
                </strong>
              </div>

              <div className={styles.compositionTrack}>
                {plan.currentProgressPct > 0 && (
                  <div
                    className={styles.compSegmentSaved}
                    style={{ width: `${plan.currentProgressPct}%` }}
                  />
                )}
                {plan.depositsContributionPct > 0 && (
                  <div
                    className={styles.compSegmentDeposits}
                    style={{ width: `${plan.depositsContributionPct}%` }}
                  />
                )}
                {plan.yieldContributionPct > 0 && (
                  <div
                    className={styles.compSegmentYield}
                    style={{ width: `${plan.yieldContributionPct}%` }}
                  />
                )}
              </div>

              <div className={styles.compositionLegend}>
                <div className={styles.legendItem}>
                  <span className={styles.legendDotSaved} />
                  <span>
                    {isAr ? 'متوفر حالياً:' : 'Saved Today:'}{' '}
                    <strong>{formatMoney(plan.currentSaved)}</strong> (
                    {oneDecFmt.format(plan.currentProgressPct)}%)
                  </span>
                </div>

                <div className={styles.legendItem}>
                  <span className={styles.legendDotDeposits} />
                  <span>
                    {isAr ? 'إيداعاتك الشهرية:' : 'Monthly Deposits:'}{' '}
                    <strong>{formatMoney(plan.totalDepositsAdded)}</strong> (
                    {oneDecFmt.format(plan.depositsContributionPct)}%)
                  </span>
                </div>

                <div className={styles.legendItem}>
                  <span className={styles.legendDotYield} />
                  <span>
                    {isAr ? 'عوائد مركبة:' : 'Compound Yield:'}{' '}
                    <strong>+{formatMoney(plan.totalYieldEarned)}</strong> (
                    {oneDecFmt.format(plan.yieldContributionPct)}%)
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* 2. SIGNATURE ELEMENT: 4-STAGE MILESTONE ROADMAP (25%, 50%, 75%, 100%) */}
          <section className={styles.reportSectionCard}>
            <div className={styles.sectionHeaderRow}>
              <div>
                <h3 className={styles.sectionTitle}>
                  {isAr
                    ? 'خريطة المحطات الزمنية الأربع (4-Stage Milestone Roadmap)'
                    : '4-Stage Milestone Roadmap (25% · 50% · 75% · 100%)'}
                </h3>
                <p className={styles.sectionSub}>
                  {isAr
                    ? 'قسّم هدفك الكبير إلى 4 محطات مرحلية محفزة لتعرف متى ستعبر كل محطة بالضبط.'
                    : 'Break your big target into 4 motivating checkpoints with exact completion dates.'}
                </p>
              </div>
              <MilestoneRouteIcon size={22} className={styles.sectionIconTeal} />
            </div>

            <div className={styles.milestonesGrid}>
              {plan.milestoneStages.map((stage) => (
                <div
                  key={stage.pct}
                  className={`${styles.milestoneCard} ${
                    stage.isReached ? styles.milestoneCardReached : ''
                  }`}
                >
                  <div className={styles.milestoneCardTop}>
                    <span className={styles.milestonePctText}>
                      {stage.pct}%
                    </span>
                    <span className={styles.milestoneDateText}>
                      {stage.dateLabel}
                    </span>
                  </div>

                  <strong className={styles.milestoneAmount}>
                    {formatMoney(stage.amount)}
                  </strong>

                  <span className={styles.milestoneSub}>
                    {stage.isReached
                      ? isAr
                        ? 'محطة مكتملة بفضل مدخراتك الحالية'
                        : 'Already unlocked with current savings'
                      : stage.monthsFromNow !== null
                      ? isAr
                        ? `بعد ${stage.monthsFromNow} شهر من الآن`
                        : `In ${stage.monthsFromNow} months`
                      : isAr
                      ? 'بانتظار تحديد مبلغ الادخار'
                      : 'Set monthly savings'}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* 3. GOAL BOOSTER SIMULATOR (THE DAILY MICRO-BOOSTER) */}
          <section className={styles.reportSectionCard}>
            <div className={styles.whatIfSimulatorBox}>
              <div className={styles.whatIfHeader}>
                <span className={styles.whatIfTitle}>
                  <TrendingUp size={16} aria-hidden="true" />
                  <span>
                    {isAr
                      ? `مسرّع الهدف الذكي: ماذا لو وفرت ${formatMoney(
                          extraDailySave
                        )} إضافية فقط يومياً؟`
                      : `Smart Goal Booster: What if you saved an extra ${formatMoney(
                          extraDailySave
                        )} per day?`}
                  </span>
                </span>
                <span className={styles.whatIfHighlight}>
                  +{formatMoney(plan.extraMonthlyFromDaily)}/
                  {isAr ? 'شهر' : 'mo'}
                </span>
              </div>

              <input
                type="range"
                min="0"
                max={Math.max(
                  50,
                  Math.round(15 * activeCurrency.rateFromUsd)
                )}
                step="1"
                value={extraDailySave}
                onChange={(e) => setExtraDailySave(Number(e.target.value))}
                className={styles.rangeSliderAmber}
                aria-label={
                  isAr ? 'مبلغ التوفير الإضافي اليومي' : 'Extra daily saving'
                }
              />

              <div className={styles.whatIfResultsGrid}>
                <div className={styles.whatIfResultItem}>
                  <span className={styles.whatIfResultLabel}>
                    {isAr ? 'الوقت المختصر من الخطة' : 'Months Saved Off Timeline'}
                  </span>
                  <strong className={styles.whatIfResultValTeal}>
                    {plan.monthsSavedByBooster > 0
                      ? isAr
                        ? `أبكر بـ ${plan.monthsSavedByBooster} شهر!`
                        : `${plan.monthsSavedByBooster} months earlier!`
                      : isAr
                      ? 'نفس الموعد الحالي'
                      : 'Same timeline'}
                  </strong>
                </div>

                <div className={styles.whatIfResultItem}>
                  <span className={styles.whatIfResultLabel}>
                    {isAr ? 'الموعد الجديد لتحقيق الهدف' : 'New Completion Date'}
                  </span>
                  <strong className={styles.whatIfResultValAmber}>
                    {plan.boostedCompletionDate}
                  </strong>
                </div>

                <div className={styles.whatIfResultItem}>
                  <span className={styles.whatIfResultLabel}>
                    {isAr ? 'إجمالي الادخار الشهري المعزز' : 'Boosted Monthly Saving'}
                  </span>
                  <strong className={styles.whatIfResultValTeal}>
                    {formatMoney(plan.boostedMonthlySaving)}
                  </strong>
                </div>
              </div>
            </div>
          </section>

          {/* 4. ACTION FOOTER BAR */}
          <div className={styles.actionFooterBar}>
            <button
              type="button"
              onClick={handleCopyPlan}
              className={styles.copyReportBtn}
            >
              {copiedPlan ? (
                <>
                  <Check size={16} aria-hidden="true" />
                  <span>
                    {isAr ? 'تم نسخ خطة الادخار بنجاح' : 'Savings Plan Copied'}
                  </span>
                </>
              ) : (
                <>
                  <Copy size={16} aria-hidden="true" />
                  <span>
                    {isAr
                      ? 'نسخ خطة الادخار والمحطات الزمنية'
                      : 'Copy Full Savings & Milestone Plan'}
                  </span>
                </>
              )}
            </button>

            <Link
              href={`/${locale}/tools/investment-growth-calculator`}
              className={styles.crossToolLinkBtn}
            >
              <span>
                {isAr
                  ? 'احسب نمو ثروتك بالعائد المركب طويل الأمد ↖'
                  : 'Simulate Long-Term Compound Wealth Growth ↗'}
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SavingsGoalCalculator;
