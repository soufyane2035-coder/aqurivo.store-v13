'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Check,
  ChevronDown,
  Copy,
  Flame,
  Globe,
  RotateCcw,
  Search,
  TrendingUp,
  X,
} from 'lucide-react';
import type { Product } from '@/types';
import { GoldenCrossoverIcon } from '@/components/ui/AqurivoContextIcons';
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
import { InvestmentGrowthLogo } from './InvestmentGrowthLogo';
import styles from './InvestmentGrowthCalculator.module.css';

export interface InvestmentGrowthCalculatorProps {
  locale: 'ar' | 'en';
}

type CompoundFrequency = 'monthly' | 'quarterly' | 'annually';

type StrategyPresetId = 'index_etf' | 'conservative_sukuk' | 'aggressive_growth' | 'zero';

interface CurrencyOption {
  code: string;
  symbol: string;
  rateFromUsd: number;
  nameAr: string;
  nameEn: string;
  countryAr: string;
  countryEn: string;
  defaultCapitalUsd: number;
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
    defaultCapitalUsd: 6000,
  },
  {
    code: 'EUR',
    symbol: '€',
    rateFromUsd: 0.92,
    nameAr: 'يورو أوروبي',
    nameEn: 'Euro',
    countryAr: 'الاتحاد الأوروبي',
    countryEn: 'Eurozone',
    defaultCapitalUsd: 6000,
  },
  {
    code: 'GBP',
    symbol: '£',
    rateFromUsd: 0.79,
    nameAr: 'جنيه إسترليني',
    nameEn: 'British Pound',
    countryAr: 'المملكة المتحدة',
    countryEn: 'United Kingdom',
    defaultCapitalUsd: 6000,
  },
  {
    code: 'SAR',
    symbol: 'SAR',
    rateFromUsd: 3.75,
    nameAr: 'ريال سعودي',
    nameEn: 'Saudi Riyal',
    countryAr: 'المملكة العربية السعودية',
    countryEn: 'Saudi Arabia',
    defaultCapitalUsd: 6000,
  },
  {
    code: 'AED',
    symbol: 'AED',
    rateFromUsd: 3.67,
    nameAr: 'درهم إماراتي',
    nameEn: 'UAE Dirham',
    countryAr: 'الإمارات العربية المتحدة',
    countryEn: 'United Arab Emirates',
    defaultCapitalUsd: 7000,
  },
  {
    code: 'QAR',
    symbol: 'QAR',
    rateFromUsd: 3.64,
    nameAr: 'ريال قطري',
    nameEn: 'Qatari Riyal',
    countryAr: 'قطر',
    countryEn: 'Qatar',
    defaultCapitalUsd: 7000,
  },
  {
    code: 'KWD',
    symbol: 'KWD',
    rateFromUsd: 0.31,
    nameAr: 'دينار كويتي',
    nameEn: 'Kuwaiti Dinar',
    countryAr: 'الكويت',
    countryEn: 'Kuwait',
    defaultCapitalUsd: 7000,
  },
  {
    code: 'MAD',
    symbol: 'MAD',
    rateFromUsd: 10,
    nameAr: 'درهم مغربي',
    nameEn: 'Moroccan Dirham',
    countryAr: 'المغرب',
    countryEn: 'Morocco',
    defaultCapitalUsd: 3000,
  },
  {
    code: 'EGP',
    symbol: 'EGP',
    rateFromUsd: 49,
    nameAr: 'جنيه مصري',
    nameEn: 'Egyptian Pound',
    countryAr: 'مصر',
    countryEn: 'Egypt',
    defaultCapitalUsd: 2000,
  },
  {
    code: 'JOD',
    symbol: 'JOD',
    rateFromUsd: 0.71,
    nameAr: 'دينار أردني',
    nameEn: 'Jordanian Dinar',
    countryAr: 'الأردن',
    countryEn: 'Jordan',
    defaultCapitalUsd: 3000,
  },
  {
    code: 'TRY',
    symbol: '₺',
    rateFromUsd: 34,
    nameAr: 'ليرة تركية',
    nameEn: 'Turkish Lira',
    countryAr: 'تركيا',
    countryEn: 'Turkey',
    defaultCapitalUsd: 3500,
  },
  {
    code: 'CAD',
    symbol: 'CA$',
    rateFromUsd: 1.38,
    nameAr: 'دولار كندي',
    nameEn: 'Canadian Dollar',
    countryAr: 'كندا',
    countryEn: 'Canada',
    defaultCapitalUsd: 6000,
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
        defaultCapitalUsd: Math.max(2000, city.typicalNetSalaryUsd * 2),
      });
    }
  }
  return Array.from(map.values());
}

const ALL_CURRENCIES = buildGlobalCurrencies();

export interface YearlyWealthPoint {
  year: number;
  monthlyContributionThisYear: number;
  totalContributed: number;
  totalProfit: number;
  nominalBalance: number;
  realPurchasingPower: number;
  isProfitHigherThanPrincipal: boolean;
}

export function InvestmentGrowthCalculator({
  locale,
}: InvestmentGrowthCalculatorProps) {
  const isAr = locale === 'ar';

  // 1. Store Viewed Ribbon + Smart Bilingual Search
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

  // 3. Inputs (All start at min="0" step="1")
  const [activePreset, setActivePreset] = useState<StrategyPresetId>('index_etf');
  const [initialCapitalInput, setInitialCapitalInput] = useState<string>('6000');
  const [monthlyContribInput, setMonthlyContribInput] = useState<string>('400');
  const [annualStepUpPctInput, setAnnualStepUpPctInput] = useState<string>('3');
  const [yearsInput, setYearsInput] = useState<string>('15');
  const [annualReturnPctInput, setAnnualReturnPctInput] = useState<string>('9');
  const [compoundFreq, setCompoundFreq] = useState<CompoundFrequency>('monthly');
  const [inflationPctInput, setInflationPctInput] = useState<string>('2');

  // Interactive Chart Year Inspection
  const [inspectedYearIndex, setInspectedYearIndex] = useState<number | null>(
    null
  );
  const [copiedReport, setCopiedReport] = useState<boolean>(false);

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

  // Apply Strategy Preset
  const applyStrategyPreset = (
    preset: StrategyPresetId,
    targetCur: CurrencyOption = activeCurrency
  ) => {
    setActivePreset(preset);
    setInspectedYearIndex(null);

    if (preset === 'zero') {
      setInitialCapitalInput('0');
      setMonthlyContribInput('0');
      setAnnualStepUpPctInput('0');
      setYearsInput('10');
      setAnnualReturnPctInput('0');
      setInflationPctInput('0');
      return;
    }

    const baseCap = Math.max(
      500,
      Math.round(targetCur.defaultCapitalUsd * targetCur.rateFromUsd)
    );
    const baseMonthly = Math.max(25, Math.round(baseCap * 0.065));

    setInitialCapitalInput(String(baseCap));
    setMonthlyContribInput(String(baseMonthly));

    if (preset === 'index_etf') {
      setAnnualStepUpPctInput('3');
      setYearsInput('15');
      setAnnualReturnPctInput('9');
      setCompoundFreq('monthly');
      setInflationPctInput('2');
    } else if (preset === 'conservative_sukuk') {
      setAnnualStepUpPctInput('2');
      setYearsInput('10');
      setAnnualReturnPctInput('5');
      setCompoundFreq('quarterly');
      setInflationPctInput('2');
    } else if (preset === 'aggressive_growth') {
      setAnnualStepUpPctInput('5');
      setYearsInput('20');
      setAnnualReturnPctInput('12');
      setCompoundFreq('monthly');
      setInflationPctInput('3');
    }
  };

  // Auto-detect browser currency on first mount
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
    applyStrategyPreset('index_etf', matchedCur);
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

    setInitialCapitalInput(scaleStr(initialCapitalInput));
    setMonthlyContribInput(scaleStr(monthlyContribInput));

    setCurrencyCode(nextCur.code);
    setIsCurrencyDrawerOpen(false);
    setCurrencyQuery('');
  };

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

  // Mouse drag & wheel horizontal scroll
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

  // Invest product's price as Initial Capital to see Opportunity Cost
  const handleSimulateProductOpportunityCost = (
    item: BrowserProductSnapshot,
    fromSearch = false
  ) => {
    setSelectedViewedProduct(item);
    const localPrice = Math.max(
      1,
      Math.round(item.priceUsd * activeCurrency.rateFromUsd)
    );
    setInitialCapitalInput(String(localPrice));

    if (fromSearch) {
      const updated = recordBrowserProductView(item);
      setViewedProducts(updated);
    }
  };

  const capitalSliderMax = useMemo(() => {
    const baseMax = Math.round(
      activeCurrency.defaultCapitalUsd * activeCurrency.rateFromUsd * 5
    );
    const currentVal = Number(initialCapitalInput) || 0;
    return Math.max(15000, baseMax, Math.ceil(currentVal * 1.25));
  }, [activeCurrency, initialCapitalInput]);

  // 4. Multi-Layer Compound Wealth & Crossover Mathematical Engine
  const simulation = useMemo(() => {
    const initialCapital = Math.max(0, Number(initialCapitalInput) || 0);
    const baseMonthly = Math.max(0, Number(monthlyContribInput) || 0);
    const stepUpPct = Math.min(
      50,
      Math.max(0, Number(annualStepUpPctInput) || 0)
    );
    const horizonYears = Math.min(
      50,
      Math.max(1, Math.round(Number(yearsInput) || 10))
    );
    const annualReturnPct = Math.min(
      40,
      Math.max(0, Number(annualReturnPctInput) || 0)
    );
    const inflationPct = Math.min(
      25,
      Math.max(0, Number(inflationPctInput) || 0)
    );

    const points: YearlyWealthPoint[] = [];
    let balance = initialCapital;
    let totalContributed = initialCapital;
    let currentMonthlyContrib = baseMonthly;
    let crossoverYear: number | null = null;

    const rAnnual = annualReturnPct / 100;
    const infAnnual = inflationPct / 100;

    for (let y = 1; y <= horizonYears; y++) {
      if (y > 1 && stepUpPct > 0) {
        currentMonthlyContrib = currentMonthlyContrib * (1 + stepUpPct / 100);
      }

      if (compoundFreq === 'monthly') {
        const rMonth = rAnnual / 12;
        for (let m = 0; m < 12; m++) {
          balance = (balance + currentMonthlyContrib) * (1 + rMonth);
          totalContributed += currentMonthlyContrib;
        }
      } else if (compoundFreq === 'quarterly') {
        const rQuarter = rAnnual / 4;
        for (let q = 0; q < 4; q++) {
          const quarterContrib = currentMonthlyContrib * 3;
          balance = (balance + quarterContrib) * (1 + rQuarter);
          totalContributed += quarterContrib;
        }
      } else {
        const yearContrib = currentMonthlyContrib * 12;
        balance = (balance + yearContrib) * (1 + rAnnual);
        totalContributed += yearContrib;
      }

      const totalProfit = Math.max(0, balance - totalContributed);
      const realPurchasingPower =
        infAnnual > 0 ? balance / Math.pow(1 + infAnnual, y) : balance;

      const isProfitHigher =
        totalProfit > totalContributed && totalContributed > 0;
      if (isProfitHigher && crossoverYear === null) {
        crossoverYear = y;
      }

      points.push({
        year: y,
        monthlyContributionThisYear: Math.round(currentMonthlyContrib),
        totalContributed: Math.round(totalContributed),
        totalProfit: Math.round(totalProfit),
        nominalBalance: Math.round(balance),
        realPurchasingPower: Math.round(realPurchasingPower),
        isProfitHigherThanPrincipal: isProfitHigher,
      });
    }

    const finalPoint = points[points.length - 1] || {
      year: horizonYears,
      monthlyContributionThisYear: baseMonthly,
      totalContributed: initialCapital,
      totalProfit: 0,
      nominalBalance: initialCapital,
      realPurchasingPower: initialCapital,
      isProfitHigherThanPrincipal: false,
    };

    const wealthMultiplier =
      finalPoint.totalContributed > 0
        ? finalPoint.nominalBalance / finalPoint.totalContributed
        : 1;

    const principalSharePct =
      finalPoint.nominalBalance > 0
        ? Math.min(
            100,
            (finalPoint.totalContributed / finalPoint.nominalBalance) * 100
          )
        : 0;
    const profitSharePct = Math.max(0, 100 - principalSharePct);

    // 4% Safe Withdrawal Rule (Monthly Passive Retirement Income)
    const safeMonthlyPassiveNominal = (finalPoint.nominalBalance * 0.04) / 12;
    const safeMonthlyPassiveReal =
      (finalPoint.realPurchasingPower * 0.04) / 12;

    return {
      initialCapital,
      baseMonthly,
      stepUpPct,
      horizonYears,
      annualReturnPct,
      inflationPct,
      points,
      finalPoint,
      crossoverYear,
      wealthMultiplier,
      principalSharePct,
      profitSharePct,
      safeMonthlyPassiveNominal,
      safeMonthlyPassiveReal,
    };
  }, [
    initialCapitalInput,
    monthlyContribInput,
    annualStepUpPctInput,
    yearsInput,
    annualReturnPctInput,
    compoundFreq,
    inflationPctInput,
  ]);

  const inspectedPoint =
    inspectedYearIndex !== null && simulation.points[inspectedYearIndex]
      ? simulation.points[inspectedYearIndex]
      : simulation.finalPoint;

  const handleCopyReport = async () => {
    const text = isAr
      ? [
          `تقرير AQURIVO لنمو الاستثمار والعائد المركب`,
          `────────────────────────────────────────`,
          `• رأس المال الأولي: ${formatMoney(simulation.initialCapital)} | الإيداع الشهري: ${formatMoney(
            simulation.baseMonthly
          )}`,
          `• المدة: ${simulation.horizonYears} سنة | العائد السنوي: ${simulation.annualReturnPct}%`,
          `• إجمالي الثروة النهائية (اسمي): ${formatMoney(
            simulation.finalPoint.nominalBalance
          )} (${oneDecFmt.format(simulation.wealthMultiplier)}x مضاعف)`,
          `• القوة الشرائية الحقيقية بأموال اليوم: ${formatMoney(
            simulation.finalPoint.realPurchasingPower
          )}`,
          `• إجمالي ما أودعته من جيبك: ${formatMoney(
            simulation.finalPoint.totalContributed
          )}`,
          `• صافي الأرباح المركبة المتولدة: +${formatMoney(
            simulation.finalPoint.totalProfit
          )}`,
          `• الدخل السلبي المستدام شهرياً (قاعدة 4%): ${formatMoney(
            simulation.safeMonthlyPassiveNominal
          )}/شهر`,
        ].join('\n')
      : [
          `AQURIVO Investment Growth & Compound Wealth Report`,
          `────────────────────────────────────────`,
          `• Initial Capital: ${formatMoney(simulation.initialCapital)} | Monthly Deposit: ${formatMoney(
            simulation.baseMonthly
          )}`,
          `• Horizon: ${simulation.horizonYears} yrs | Expected Return: ${simulation.annualReturnPct}%`,
          `• Final Nominal Portfolio: ${formatMoney(
            simulation.finalPoint.nominalBalance
          )} (${oneDecFmt.format(simulation.wealthMultiplier)}x Multiplier)`,
          `• Real Purchasing Power (Today's Money): ${formatMoney(
            simulation.finalPoint.realPurchasingPower
          )}`,
          `• Total Principal Contributed: ${formatMoney(
            simulation.finalPoint.totalContributed
          )}`,
          `• Total Compound Profit Generated: +${formatMoney(
            simulation.finalPoint.totalProfit
          )}`,
          `• 4% Safe Monthly Passive Income: ${formatMoney(
            simulation.safeMonthlyPassiveNominal
          )}/mo`,
        ].join('\n');

    try {
      await navigator.clipboard.writeText(text);
      setCopiedReport(true);
      window.setTimeout(() => setCopiedReport(false), 2500);
    } catch {
      // Ignore error
    }
  };

  const maxChartY = Math.max(1, simulation.finalPoint.nominalBalance);

  return (
    <div className={styles.studioShell} dir={isAr ? 'rtl' : 'ltr'}>
      {/* 2. STUDIO HEADER BAR */}
      <div className={styles.studioHeaderBar}>
        <div className={styles.studioHeaderTop}>
          <InvestmentGrowthLogo size="md" showWordmark locale={locale} />

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
                      ? 'ابحث عن أي دولة أو عملة (USD, EUR, SAR, AED, MAD, EGP)...'
                      : 'Search any country or currency (USD, EUR, GBP, SAR, AED, MAD)...'
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

        {/* Strategy Presets Bar */}
        <div className={styles.presetsBar}>
          <span className={styles.presetsBarLabel}>
            {isAr ? 'استراتيجيات استثمارية مرجعية:' : 'Reference Strategies:'}
          </span>
          <div className={styles.presetButtonsRow}>
            <button
              type="button"
              onClick={() => applyStrategyPreset('index_etf')}
              className={`${styles.presetBtn} ${
                activePreset === 'index_etf' ? styles.presetBtnActive : ''
              }`}
            >
              {isAr
                ? 'صناديق المؤشرات العالمية (9% سنوياً)'
                : 'Global Index ETFs (9% / yr)'}
            </button>
            <button
              type="button"
              onClick={() => applyStrategyPreset('conservative_sukuk')}
              className={`${styles.presetBtn} ${
                activePreset === 'conservative_sukuk'
                  ? styles.presetBtnActive
                  : ''
              }`}
            >
              {isAr
                ? 'استثمار محافظ / صكوك وعوائد (5%)'
                : 'Conservative Sukuk / Bonds (5%)'}
            </button>
            <button
              type="button"
              onClick={() => applyStrategyPreset('aggressive_growth')}
              className={`${styles.presetBtn} ${
                activePreset === 'aggressive_growth'
                  ? styles.presetBtnActive
                  : ''
              }`}
            >
              {isAr
                ? 'محفظة نمو طويل الأجل (12% سنوياً)'
                : 'Long-Term Growth (12% / yr)'}
            </button>
            <button
              type="button"
              onClick={() => applyStrategyPreset('zero')}
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

      {/* 3. WORKBENCH 2-COLUMN GRID */}
      <div className={styles.workbenchGrid}>
        {/* LEFT COLUMN: INPUT DECK */}
        <div className={styles.inputDeckColumn}>
          {/* CARD 1: CAPITAL & CONTRIBUTIONS */}
          <section className={styles.inputCard}>
            <div className={styles.cardHeader}>
              <span className={styles.cardStepIndexCyan}>01</span>
              <div className={styles.cardHeaderText}>
                <h2 className={styles.cardTitle}>
                  {isAr
                    ? 'رأس المال الأولي والإيداعات الشهرية'
                    : 'Initial Capital & Monthly Contributions'}
                </h2>
                <p className={styles.cardHint}>
                  {isAr
                    ? 'تبدأ جميع الحقول من 0 وتزداد بمقدار 1 بدقة كاملة.'
                    : 'All fields start from 0 and increment precisely by 1.'}
                </p>
              </div>
            </div>

            <div className={styles.fieldBlock}>
              <div className={styles.fieldLabelRow}>
                <label htmlFor="ig-initial-cap" className={styles.fieldLabel}>
                  {isAr ? 'مبلغ الاستثمار الابتدائي' : 'Initial Capital Amount'}
                </label>
                <span className={styles.fieldLiveValueCyan}>
                  {formatMoney(simulation.initialCapital)}
                </span>
              </div>
              <div className={styles.numberInputRow}>
                <input
                  id="ig-initial-cap"
                  type="number"
                  min="0"
                  step="1"
                  value={initialCapitalInput}
                  onChange={(e) => setInitialCapitalInput(e.target.value)}
                  className={styles.numberInput}
                />
                <span className={styles.inputUnitTag}>{activeCurrency.code}</span>
              </div>
              <input
                type="range"
                min="0"
                max={capitalSliderMax}
                step="1"
                value={Math.min(capitalSliderMax, simulation.initialCapital)}
                onChange={(e) => setInitialCapitalInput(e.target.value)}
                className={styles.rangeSliderCyan}
                aria-label={isAr ? 'مبلغ الاستثمار الابتدائي' : 'Initial Capital'}
              />
            </div>

            <div className={styles.dualFieldGrid}>
              <div className={styles.fieldBlock}>
                <div className={styles.fieldLabelRow}>
                  <label htmlFor="ig-monthly-add" className={styles.fieldLabel}>
                    {isAr ? 'الإيداع الشهري المنتظم' : 'Monthly Contribution'}
                  </label>
                  <span className={styles.fieldLiveValue}>
                    {formatMoney(simulation.baseMonthly)}/{isAr ? 'ش' : 'mo'}
                  </span>
                </div>
                <div className={styles.numberInputRow}>
                  <input
                    id="ig-monthly-add"
                    type="number"
                    min="0"
                    step="1"
                    value={monthlyContribInput}
                    onChange={(e) => setMonthlyContribInput(e.target.value)}
                    className={styles.numberInput}
                  />
                  <span className={styles.inputUnitTag}>{activeCurrency.code}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={Math.max(2500, Math.round(capitalSliderMax * 0.25))}
                  step="1"
                  value={Math.min(
                    Math.max(2500, Math.round(capitalSliderMax * 0.25)),
                    simulation.baseMonthly
                  )}
                  onChange={(e) => setMonthlyContribInput(e.target.value)}
                  className={styles.rangeSlider}
                  aria-label={isAr ? 'الإيداع الشهري' : 'Monthly Contribution'}
                />
              </div>

              <div className={styles.fieldBlock}>
                <div className={styles.fieldLabelRow}>
                  <label htmlFor="ig-stepup" className={styles.fieldLabel}>
                    {isAr
                      ? 'زيادة الإيداع سنوياً (%)'
                      : 'Annual Deposit Step-Up (%)'}
                  </label>
                  <span className={styles.fieldLiveValue}>
                    +{simulation.stepUpPct}%/{isAr ? 'سنة' : 'yr'}
                  </span>
                </div>
                <input
                  id="ig-stepup"
                  type="number"
                  min="0"
                  max="50"
                  step="1"
                  value={annualStepUpPctInput}
                  onChange={(e) => setAnnualStepUpPctInput(e.target.value)}
                  className={styles.numberInputPlain}
                />
                <input
                  type="range"
                  min="0"
                  max="20"
                  step="1"
                  value={Math.min(20, simulation.stepUpPct)}
                  onChange={(e) => setAnnualStepUpPctInput(e.target.value)}
                  className={styles.rangeSlider}
                  aria-label={isAr ? 'نسبة الزيادة السنوية' : 'Annual Step-Up %'}
                />
              </div>
            </div>
          </section>

          {/* CARD 2: HORIZON, RETURN & COMPOUNDING FREQUENCY */}
          <section className={styles.inputCard}>
            <div className={styles.cardHeader}>
              <span className={styles.cardStepIndexEmerald}>02</span>
              <div className={styles.cardHeaderText}>
                <h2 className={styles.cardTitle}>
                  {isAr
                    ? 'الأفق الزمني، معدل العائد، والتضخم'
                    : 'Investment Horizon, Annual Return & Inflation'}
                </h2>
                <p className={styles.cardHint}>
                  {isAr
                    ? 'حدد عدد السنوات ونسبة العائد ودورية إعادة استثمار الأرباح.'
                    : 'Set your timeline, expected return, compounding frequency, and inflation.'}
                </p>
              </div>
            </div>

            <div className={styles.dualFieldGrid}>
              <div className={styles.fieldBlock}>
                <div className={styles.fieldLabelRow}>
                  <label htmlFor="ig-years" className={styles.fieldLabel}>
                    {isAr ? 'مدة الاستثمار (بالسنوات)' : 'Horizon (Years)'}
                  </label>
                  <span className={styles.fieldLiveValue}>
                    {simulation.horizonYears} {isAr ? 'سنة' : 'yrs'}
                  </span>
                </div>
                <input
                  id="ig-years"
                  type="number"
                  min="1"
                  max="50"
                  step="1"
                  value={yearsInput}
                  onChange={(e) => {
                    setYearsInput(e.target.value);
                    setInspectedYearIndex(null);
                  }}
                  className={styles.numberInputPlain}
                />
                <input
                  type="range"
                  min="1"
                  max="50"
                  step="1"
                  value={simulation.horizonYears}
                  onChange={(e) => {
                    setYearsInput(e.target.value);
                    setInspectedYearIndex(null);
                  }}
                  className={styles.rangeSlider}
                  aria-label={isAr ? 'عدد السنوات' : 'Investment Horizon Years'}
                />
              </div>

              <div className={styles.fieldBlock}>
                <div className={styles.fieldLabelRow}>
                  <label htmlFor="ig-return" className={styles.fieldLabel}>
                    {isAr ? 'العائد السنوي المتوقع (%)' : 'Expected Return (%)'}
                  </label>
                  <span className={styles.fieldLiveValue}>
                    {simulation.annualReturnPct}%
                  </span>
                </div>
                <input
                  id="ig-return"
                  type="number"
                  min="0"
                  max="40"
                  step="1"
                  value={annualReturnPctInput}
                  onChange={(e) => setAnnualReturnPctInput(e.target.value)}
                  className={styles.numberInputPlain}
                />
                <input
                  type="range"
                  min="0"
                  max="25"
                  step="1"
                  value={Math.min(25, simulation.annualReturnPct)}
                  onChange={(e) => setAnnualReturnPctInput(e.target.value)}
                  className={styles.rangeSlider}
                  aria-label={isAr ? 'العائد السنوي' : 'Expected Annual Return %'}
                />
              </div>
            </div>

            <div className={styles.dualFieldGrid}>
              <div className={styles.fieldBlock}>
                <span className={styles.fieldLabel}>
                  {isAr ? 'دورية تراكم الأرباح' : 'Compounding Frequency'}
                </span>
                <div className={styles.freqSwitchRow}>
                  <button
                    type="button"
                    onClick={() => setCompoundFreq('monthly')}
                    className={`${styles.freqBtn} ${
                      compoundFreq === 'monthly' ? styles.freqBtnActive : ''
                    }`}
                  >
                    {isAr ? 'شهري' : 'Monthly'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCompoundFreq('quarterly')}
                    className={`${styles.freqBtn} ${
                      compoundFreq === 'quarterly' ? styles.freqBtnActive : ''
                    }`}
                  >
                    {isAr ? 'ربع سنوي' : 'Quarterly'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCompoundFreq('annually')}
                    className={`${styles.freqBtn} ${
                      compoundFreq === 'annually' ? styles.freqBtnActive : ''
                    }`}
                  >
                    {isAr ? 'سنوي' : 'Annually'}
                  </button>
                </div>
              </div>

              <div className={styles.fieldBlock}>
                <div className={styles.fieldLabelRow}>
                  <label htmlFor="ig-inflation" className={styles.fieldLabel}>
                    {isAr
                      ? 'التضخم السنوي المتوقع (%)'
                      : 'Expected Inflation (%)'}
                  </label>
                  <span className={styles.fieldLiveValueAmber}>
                    {simulation.inflationPct}%
                  </span>
                </div>
                <input
                  id="ig-inflation"
                  type="number"
                  min="0"
                  max="25"
                  step="1"
                  value={inflationPctInput}
                  onChange={(e) => setInflationPctInput(e.target.value)}
                  className={styles.numberInputPlain}
                />
              </div>
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN: FUTURE WEALTH HERO, CROSSOVER POINT & MULTI-LAYER CHART */}
        <div className={styles.reportColumn}>
          {/* 1. FUTURE WEALTH HERO CARD */}
          <section className={styles.heroReportCard}>
            <div className={styles.heroTopRow}>
              <span className={styles.reportKicker}>
                {isAr
                  ? 'الثروة المستقبلية المتوقعة · القيمة الاسمية مقابل القوة الشرائية'
                  : 'PROJECTED PORTFOLIO · NOMINAL WEALTH VS. REAL PURCHASING POWER'}
              </span>
              <span className={styles.multiplierText}>
                {oneDecFmt.format(simulation.wealthMultiplier)}x{' '}
                {isAr ? 'مضاعف رأس المال' : 'Wealth Multiplier'}
              </span>
            </div>

            <div className={styles.heroDualBoxGrid}>
              <div className={styles.heroPrimaryBox}>
                <span className={styles.heroBoxLabel}>
                  {isAr
                    ? `إجمالي رصيد المحفظة بعد ${simulation.horizonYears} سنة`
                    : `Final Portfolio Value After ${simulation.horizonYears} Years`}
                </span>
                <strong className={styles.heroPrimaryValue}>
                  {formatMoney(simulation.finalPoint.nominalBalance)}
                </strong>
                <span className={styles.heroBoxSub}>
                  {isAr
                    ? `القوة الشرائية الحقيقية بأموال اليوم: ${formatMoney(
                        simulation.finalPoint.realPurchasingPower
                      )}`
                    : `Real purchasing power in today's money: ${formatMoney(
                        simulation.finalPoint.realPurchasingPower
                      )}`}
                </span>
              </div>

              {/* 4% Safe Withdrawal Monthly Passive Income */}
              <div className={styles.heroPassiveBox}>
                <div className={styles.passiveHeaderRow}>
                  <span className={styles.passiveLabel}>
                    {isAr
                      ? 'الراتب التقاعدي السلبي (قاعدة 4%)'
                      : '4% Safe Monthly Passive Income'}
                  </span>
                  <Flame size={16} className={styles.iconAmber} />
                </div>
                <strong className={styles.passiveValue}>
                  {formatMoney(simulation.safeMonthlyPassiveNominal)}
                  <small>/{isAr ? 'شهر' : 'mo'}</small>
                </strong>
                <span className={styles.heroBoxSub}>
                  {isAr
                    ? `يعادل ${formatMoney(
                        simulation.safeMonthlyPassiveReal
                      )} شهرياً بقوة شراء اليوم دون المساس بأصل المحفظة`
                    : `Equals ${formatMoney(
                        simulation.safeMonthlyPassiveReal
                      )}/mo in today's purchasing power forever`}
                </span>
              </div>
            </div>

            {/* Crossover Milestone Callout */}
            <div className={styles.crossoverBanner}>
              <GoldenCrossoverIcon size={19} className={styles.iconAmber} />
              <span>
                {simulation.crossoverYear !== null
                  ? isAr
                    ? `نقطة التحول الذهبية: في السنة رقم (${simulation.crossoverYear}) ستتجاوز أرباحك المركبة إجمالي كل ما دفعته من جيبك الشخصي — هنا تبدأ أموالك بالعمل بدلاً عنك!`
                    : `Golden Crossover Point: In Year ${simulation.crossoverYear}, your cumulative compound profits officially overtake your total personal deposits!`
                  : isAr
                  ? `للوصول إلى "نقطة التحول الذهبية" (حيث تتجاوز الأرباح إيداعاتك)، جرب زيادة مدة الاستثمار أو نسبة العائد السنوي.`
                  : `To reach the "Golden Crossover Point" (where compound profits exceed your deposits), extend your horizon or return rate.`}
              </span>
            </div>

            {/* Principal vs Profit Composition Bar */}
            <div className={styles.compositionWrap}>
              <div className={styles.compositionHeader}>
                <span>
                  {isAr ? 'إيداعاتك من جيبك:' : 'Your Principal:'}{' '}
                  <strong>
                    {formatMoney(simulation.finalPoint.totalContributed)} (
                    {oneDecFmt.format(simulation.principalSharePct)}%)
                  </strong>
                </span>
                <span>
                  {isAr ? 'صافي الأرباح المركبة:' : 'Compound Profit:'}{' '}
                  <strong className={styles.textEmerald}>
                    +{formatMoney(simulation.finalPoint.totalProfit)} (
                    {oneDecFmt.format(simulation.profitSharePct)}%)
                  </strong>
                </span>
              </div>
              <div className={styles.compositionTrack}>
                <div
                  className={styles.compSegPrincipal}
                  style={{ width: `${simulation.principalSharePct}%` }}
                />
                <div
                  className={styles.compSegProfit}
                  style={{ width: `${simulation.profitSharePct}%` }}
                />
              </div>
            </div>
          </section>

          {/* 2. INTERACTIVE MULTI-LAYER WEALTH CHART */}
          <section className={styles.reportSectionCard}>
            <div className={styles.sectionHeaderRow}>
              <div>
                <h3 className={styles.sectionTitle}>
                  {isAr
                    ? 'منحنى تراكم الثروة سنة بسنة (مرر أو اضغط لمعاينة أي سنة)'
                    : 'Interactive Year-by-Year Wealth Trajectory (Hover or Click)'}
                </h3>
                <p className={styles.sectionSub}>
                  {isAr
                    ? 'السماوي يمثل إيداعاتك الشخصية، والأخضر الزمردي يمثل الأرباح المركبة المضافة فوقها.'
                    : 'Sky-cyan shows your personal contributions; emerald shows compound profit stacked on top.'}
                </p>
              </div>
              <TrendingUp size={18} className={styles.iconEmerald} />
            </div>

            {/* Inspected Year Live Readout */}
            <div className={styles.inspectedYearBar}>
              <span className={styles.inspectedYearBadge}>
                {isAr
                  ? `بيانات السنة ${inspectedPoint.year}`
                  : `Year ${inspectedPoint.year} Snapshot`}
              </span>
              <div className={styles.inspectedStatsRow}>
                <span>
                  {isAr ? 'إيداعاتك:' : 'Contributed:'}{' '}
                  <strong>{formatMoney(inspectedPoint.totalContributed)}</strong>
                </span>
                <span>
                  {isAr ? 'الأرباح:' : 'Profit:'}{' '}
                  <strong className={styles.textEmerald}>
                    +{formatMoney(inspectedPoint.totalProfit)}
                  </strong>
                </span>
                <span>
                  {isAr ? 'الإجمالي:' : 'Total:'}{' '}
                  <strong className={styles.textAmber}>
                    {formatMoney(inspectedPoint.nominalBalance)}
                  </strong>
                </span>
              </div>
            </div>

            {/* Interactive Stacked Bar Chart */}
            <div className={styles.chartContainer}>
              <div className={styles.barsFlexStage}>
                {simulation.points.map((pt, idx) => {
                  const totalHeightPct = Math.max(
                    4,
                    (pt.nominalBalance / maxChartY) * 100
                  );
                  const principalPartPct =
                    pt.nominalBalance > 0
                      ? (pt.totalContributed / pt.nominalBalance) * 100
                      : 100;
                  const profitPartPct = Math.max(0, 100 - principalPartPct);
                  const isCrossover = pt.year === simulation.crossoverYear;
                  const isInspected = inspectedPoint.year === pt.year;

                  return (
                    <button
                      key={pt.year}
                      type="button"
                      onMouseEnter={() => setInspectedYearIndex(idx)}
                      onClick={() => setInspectedYearIndex(idx)}
                      className={`${styles.yearBarColumnBtn} ${
                        isInspected ? styles.yearBarColumnActive : ''
                      }`}
                      title={`${isAr ? 'السنة' : 'Year'} ${pt.year}: ${formatMoney(
                        pt.nominalBalance
                      )}`}
                    >
                      <div
                        className={styles.yearBarStack}
                        style={{ height: `${totalHeightPct}%` }}
                      >
                        <div
                          className={styles.barProfitTop}
                          style={{ height: `${profitPartPct}%` }}
                        />
                        <div
                          className={styles.barPrincipalBottom}
                          style={{ height: `${principalPartPct}%` }}
                        />
                      </div>
                      {isCrossover && (
                        <span
                          className={styles.crossoverDotMarker}
                          title={
                            isAr ? 'نقطة التحول الذهبية' : 'Crossover Year'
                          }
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* 3. ACTION FOOTER BAR */}
          <div className={styles.actionFooterBar}>
            <button
              type="button"
              onClick={handleCopyReport}
              className={styles.copyReportBtn}
            >
              {copiedReport ? (
                <>
                  <Check size={16} aria-hidden="true" />
                  <span>
                    {isAr
                      ? 'تم نسخ التقرير الاستثماري بنجاح'
                      : 'Investment Report Copied'}
                  </span>
                </>
              ) : (
                <>
                  <Copy size={16} aria-hidden="true" />
                  <span>
                    {isAr
                      ? 'نسخ تقرير نمو الاستثمار المفصل'
                      : 'Copy Full Investment Growth Report'}
                  </span>
                </>
              )}
            </button>

            <Link
              href={`/${locale}/tools/savings-goal-calculator`}
              className={styles.crossToolLinkBtn}
            >
              <span>
                {isAr
                  ? 'خطط لهدف ادخاري محدد بالمحطات الزمنية ↖'
                  : 'Plan a Specific Milestone Savings Goal ↗'}
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InvestmentGrowthCalculator;
