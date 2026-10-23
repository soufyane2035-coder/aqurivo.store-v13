'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Check,
  ChevronDown,
  Clock,
  Copy,
  Globe,
  RotateCcw,
  Search,
  Sliders,
  TrendingUp,
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
  GLOBAL_CITIES_DATA,
  detectBrowserCityBenchmark,
} from '@/lib/globalCostOfLivingData';
import { RealSalaryLogo } from './RealSalaryLogo';
import styles from './RealSalaryCalculator.module.css';

export interface RealSalaryCalculatorProps {
  locale: 'ar' | 'en';
}

export interface CurrencyOption {
  code: string;
  symbol: string;
  rateFromUsd: number;
  nameAr: string;
  nameEn: string;
  countryAr: string;
  countryEn: string;
  defaultSalaryUsd: number;
}

type PresetProfileId = 'commuter' | 'hybrid' | 'remote' | 'zero';

type HealthVerdictId = 'sovereign' | 'balanced' | 'strained' | 'critical' | 'zero';

const EXTRA_CURRENCIES: CurrencyOption[] = [
  {
    code: 'USD',
    symbol: '$',
    rateFromUsd: 1,
    nameAr: 'دولار أمريكي',
    nameEn: 'US Dollar',
    countryAr: 'الولايات المتحدة / عالمي',
    countryEn: 'United States / Global',
    defaultSalaryUsd: 3200,
  },
  {
    code: 'EUR',
    symbol: '€',
    rateFromUsd: 0.92,
    nameAr: 'يورو أوروبي',
    nameEn: 'Euro',
    countryAr: 'الاتحاد الأوروبي',
    countryEn: 'Eurozone',
    defaultSalaryUsd: 3100,
  },
  {
    code: 'GBP',
    symbol: '£',
    rateFromUsd: 0.79,
    nameAr: 'جنيه إسترليني',
    nameEn: 'British Pound',
    countryAr: 'المملكة المتحدة',
    countryEn: 'United Kingdom',
    defaultSalaryUsd: 3400,
  },
  {
    code: 'SAR',
    symbol: 'SAR',
    rateFromUsd: 3.75,
    nameAr: 'ريال سعودي',
    nameEn: 'Saudi Riyal',
    countryAr: 'المملكة العربية السعودية',
    countryEn: 'Saudi Arabia',
    defaultSalaryUsd: 2800,
  },
  {
    code: 'AED',
    symbol: 'AED',
    rateFromUsd: 3.67,
    nameAr: 'درهم إماراتي',
    nameEn: 'UAE Dirham',
    countryAr: 'الإمارات العربية المتحدة',
    countryEn: 'United Arab Emirates',
    defaultSalaryUsd: 3500,
  },
  {
    code: 'QAR',
    symbol: 'QAR',
    rateFromUsd: 3.64,
    nameAr: 'ريال قطري',
    nameEn: 'Qatari Riyal',
    countryAr: 'قطر',
    countryEn: 'Qatar',
    defaultSalaryUsd: 3600,
  },
  {
    code: 'KWD',
    symbol: 'KWD',
    rateFromUsd: 0.31,
    nameAr: 'دينار كويتي',
    nameEn: 'Kuwaiti Dinar',
    countryAr: 'الكويت',
    countryEn: 'Kuwait',
    defaultSalaryUsd: 3500,
  },
  {
    code: 'BHD',
    symbol: 'BHD',
    rateFromUsd: 0.38,
    nameAr: 'دينار بحريني',
    nameEn: 'Bahraini Dinar',
    countryAr: 'البحرين',
    countryEn: 'Bahrain',
    defaultSalaryUsd: 2600,
  },
  {
    code: 'OMR',
    symbol: 'OMR',
    rateFromUsd: 0.385,
    nameAr: 'ريال عماني',
    nameEn: 'Omani Rial',
    countryAr: 'سلطنة عمان',
    countryEn: 'Oman',
    defaultSalaryUsd: 2400,
  },
  {
    code: 'MAD',
    symbol: 'MAD',
    rateFromUsd: 10,
    nameAr: 'درهم مغربي',
    nameEn: 'Moroccan Dirham',
    countryAr: 'المغرب',
    countryEn: 'Morocco',
    defaultSalaryUsd: 1100,
  },
  {
    code: 'EGP',
    symbol: 'EGP',
    rateFromUsd: 49,
    nameAr: 'جنيه مصري',
    nameEn: 'Egyptian Pound',
    countryAr: 'مصر',
    countryEn: 'Egypt',
    defaultSalaryUsd: 650,
  },
  {
    code: 'JOD',
    symbol: 'JOD',
    rateFromUsd: 0.71,
    nameAr: 'دينار أردني',
    nameEn: 'Jordanian Dinar',
    countryAr: 'الأردن',
    countryEn: 'Jordan',
    defaultSalaryUsd: 1100,
  },
  {
    code: 'DZD',
    symbol: 'DZD',
    rateFromUsd: 134,
    nameAr: 'دينار جزائري',
    nameEn: 'Algerian Dinar',
    countryAr: 'الجزائر',
    countryEn: 'Algeria',
    defaultSalaryUsd: 750,
  },
  {
    code: 'TND',
    symbol: 'TND',
    rateFromUsd: 3.1,
    nameAr: 'دينار تونسي',
    nameEn: 'Tunisian Dinar',
    countryAr: 'تونس',
    countryEn: 'Tunisia',
    defaultSalaryUsd: 800,
  },
  {
    code: 'IQD',
    symbol: 'IQD',
    rateFromUsd: 1310,
    nameAr: 'دينار عراقي',
    nameEn: 'Iraqi Dinar',
    countryAr: 'العراق',
    countryEn: 'Iraq',
    defaultSalaryUsd: 900,
  },
  {
    code: 'TRY',
    symbol: '₺',
    rateFromUsd: 34,
    nameAr: 'ليرة تركية',
    nameEn: 'Turkish Lira',
    countryAr: 'تركيا',
    countryEn: 'Turkey',
    defaultSalaryUsd: 1200,
  },
  {
    code: 'CAD',
    symbol: 'CA$',
    rateFromUsd: 1.38,
    nameAr: 'دولار كندي',
    nameEn: 'Canadian Dollar',
    countryAr: 'كندا',
    countryEn: 'Canada',
    defaultSalaryUsd: 3300,
  },
  {
    code: 'AUD',
    symbol: 'A$',
    rateFromUsd: 1.52,
    nameAr: 'دولار أسترالي',
    nameEn: 'Australian Dollar',
    countryAr: 'أستراليا',
    countryEn: 'Australia',
    defaultSalaryUsd: 3500,
  },
  {
    code: 'CHF',
    symbol: 'CHF',
    rateFromUsd: 0.88,
    nameAr: 'فرنك سويسري',
    nameEn: 'Swiss Franc',
    countryAr: 'سويسرا',
    countryEn: 'Switzerland',
    defaultSalaryUsd: 5800,
  },
  {
    code: 'JPY',
    symbol: '¥',
    rateFromUsd: 152,
    nameAr: 'ين ياباني',
    nameEn: 'Japanese Yen',
    countryAr: 'اليابان',
    countryEn: 'Japan',
    defaultSalaryUsd: 2700,
  },
  {
    code: 'CNY',
    symbol: '¥',
    rateFromUsd: 7.2,
    nameAr: 'يوان صيني',
    nameEn: 'Chinese Yuan',
    countryAr: 'الصين',
    countryEn: 'China',
    defaultSalaryUsd: 1800,
  },
  {
    code: 'INR',
    symbol: '₹',
    rateFromUsd: 84,
    nameAr: 'روبية هندية',
    nameEn: 'Indian Rupee',
    countryAr: 'الهند',
    countryEn: 'India',
    defaultSalaryUsd: 950,
  },
  {
    code: 'BRL',
    symbol: 'R$',
    rateFromUsd: 5.6,
    nameAr: 'ريال برازيلي',
    nameEn: 'Brazilian Real',
    countryAr: 'البرازيل',
    countryEn: 'Brazil',
    defaultSalaryUsd: 1100,
  },
  {
    code: 'SGD',
    symbol: 'S$',
    rateFromUsd: 1.34,
    nameAr: 'دولار سنغافوري',
    nameEn: 'Singapore Dollar',
    countryAr: 'سنغافورة',
    countryEn: 'Singapore',
    defaultSalaryUsd: 4200,
  },
  {
    code: 'MYR',
    symbol: 'RM',
    rateFromUsd: 4.4,
    nameAr: 'رينغيت ماليزي',
    nameEn: 'Malaysian Ringgit',
    countryAr: 'ماليزيا',
    countryEn: 'Malaysia',
    defaultSalaryUsd: 1300,
  },
];

function buildGlobalCurrencyCatalog(): CurrencyOption[] {
  const map = new Map<string, CurrencyOption>();
  for (const c of EXTRA_CURRENCIES) {
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
        defaultSalaryUsd: city.typicalNetSalaryUsd,
      });
    }
  }
  return Array.from(map.values());
}

const ALL_CURRENCIES = buildGlobalCurrencyCatalog();

export function RealSalaryCalculator({ locale }: RealSalaryCalculatorProps) {
  const isAr = locale === 'ar';

  // 1. Store Viewed Ribbon + Smart Bilingual/Typo-Tolerant Product Search
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

  // 3. Preset & Interactive Inputs (Every slider/input starts at min="0" step="1")
  const [activePreset, setActivePreset] = useState<PresetProfileId>('commuter');

  // Card 1: Gross Salary & Work Schedule
  const [grossSalaryInput, setGrossSalaryInput] = useState<string>('3200');
  const [weeklyDaysInput, setWeeklyDaysInput] = useState<string>('5');
  const [dailyHoursInput, setDailyHoursInput] = useState<string>('8');

  // Card 2: Work-Related Hidden Time & Costs
  const [commuteMinutesInput, setCommuteMinutesInput] = useState<string>('75');
  const [prepMinutesInput, setPrepMinutesInput] = useState<string>('35');
  const [transportCostInput, setTransportCostInput] = useState<string>('220');
  const [workMealsCostInput, setWorkMealsCostInput] = useState<string>('180');

  // Card 3: Fixed Living Pillars (Housing & Utilities/Obligations)
  const [housingCostInput, setHousingCostInput] = useState<string>('950');
  const [fixedBillsInput, setFixedBillsInput] = useState<string>('320');

  // Interactive What-If Simulator (0% to 100% reduction in commute & work friction)
  const [remoteSavingsPct, setRemoteSavingsPct] = useState<number>(50);

  // Copy Report state
  const [copiedReport, setCopiedReport] = useState<boolean>(false);

  const activeCurrency = useMemo(
    () =>
      ALL_CURRENCIES.find((c) => c.code === currencyCode) || ALL_CURRENCIES[0],
    [currencyCode]
  );

  // Formatters (Western numerals 'en-US' for crisp tabular legibility)
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

  const twoDecFmt = useMemo(
    () =>
      new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    []
  );

  const formatMoney = (val: number, decimals = 0) => {
    const safe = Number.isFinite(val) ? val : 0;
    const formatted =
      decimals === 2
        ? twoDecFmt.format(safe)
        : decimals === 1
        ? oneDecFmt.format(safe)
        : intFmt.format(Math.round(safe));

    if (
      activeCurrency.symbol === '$' ||
      activeCurrency.symbol === '€' ||
      activeCurrency.symbol === '£'
    ) {
      return `${activeCurrency.symbol}${formatted}`;
    }
    return `${formatted} ${activeCurrency.symbol}`;
  };

  // Apply a preset profile scaled to the current currency
  const applyPresetProfile = (
    preset: PresetProfileId,
    targetCurrency: CurrencyOption = activeCurrency
  ) => {
    setActivePreset(preset);
    if (preset === 'zero') {
      setGrossSalaryInput('0');
      setWeeklyDaysInput('5');
      setDailyHoursInput('8');
      setCommuteMinutesInput('0');
      setPrepMinutesInput('0');
      setTransportCostInput('0');
      setWorkMealsCostInput('0');
      setHousingCostInput('0');
      setFixedBillsInput('0');
      return;
    }

    const baseSalaryLocal = Math.max(
      100,
      Math.round(targetCurrency.defaultSalaryUsd * targetCurrency.rateFromUsd)
    );

    if (preset === 'commuter') {
      setGrossSalaryInput(String(baseSalaryLocal));
      setWeeklyDaysInput('5');
      setDailyHoursInput('8');
      setCommuteMinutesInput('80');
      setPrepMinutesInput('40');
      setTransportCostInput(String(Math.round(baseSalaryLocal * 0.075)));
      setWorkMealsCostInput(String(Math.round(baseSalaryLocal * 0.06)));
      setHousingCostInput(String(Math.round(baseSalaryLocal * 0.3)));
      setFixedBillsInput(String(Math.round(baseSalaryLocal * 0.1)));
    } else if (preset === 'hybrid') {
      setGrossSalaryInput(String(baseSalaryLocal));
      setWeeklyDaysInput('5');
      setDailyHoursInput('8');
      setCommuteMinutesInput('40');
      setPrepMinutesInput('20');
      setTransportCostInput(String(Math.round(baseSalaryLocal * 0.04)));
      setWorkMealsCostInput(String(Math.round(baseSalaryLocal * 0.035)));
      setHousingCostInput(String(Math.round(baseSalaryLocal * 0.29)));
      setFixedBillsInput(String(Math.round(baseSalaryLocal * 0.1)));
    } else if (preset === 'remote') {
      setGrossSalaryInput(String(baseSalaryLocal));
      setWeeklyDaysInput('5');
      setDailyHoursInput('8');
      setCommuteMinutesInput('0');
      setPrepMinutesInput('10');
      setTransportCostInput('0');
      setWorkMealsCostInput(String(Math.round(baseSalaryLocal * 0.015)));
      setHousingCostInput(String(Math.round(baseSalaryLocal * 0.28)));
      setFixedBillsInput(String(Math.round(baseSalaryLocal * 0.11)));
    }
  };

  // Auto-detect user's currency and city from browser on first mount
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
    applyPresetProfile('commuter', matchedCur);
    setHasAutoDetected(true);
  }, [hasAutoDetected, isAr]);

  // Switch currency and convert existing non-zero inputs smoothly
  const handleSelectCurrency = (nextCur: CurrencyOption) => {
    if (nextCur.code === currencyCode) {
      setIsCurrencyDrawerOpen(false);
      return;
    }

    const prevRate = activeCurrency.rateFromUsd || 1;
    const nextRate = nextCur.rateFromUsd || 1;
    const ratio = nextRate / prevRate;

    const scaleValue = (raw: string) => {
      const n = Number(raw);
      if (!Number.isFinite(n) || n <= 0) return '0';
      return String(Math.max(1, Math.round(n * ratio)));
    };

    setGrossSalaryInput(scaleValue(grossSalaryInput));
    setTransportCostInput(scaleValue(transportCostInput));
    setWorkMealsCostInput(scaleValue(workMealsCostInput));
    setHousingCostInput(scaleValue(housingCostInput));
    setFixedBillsInput(scaleValue(fixedBillsInput));

    setCurrencyCode(nextCur.code);
    setIsCurrencyDrawerOpen(false);
    setCurrencyQuery('');
  };

  // Focus currency search input when drawer opens
  useEffect(() => {
    if (isCurrencyDrawerOpen) {
      const timer = window.setTimeout(() => {
        currencySearchInputRef.current?.focus();
      }, 40);
      return () => window.clearTimeout(timer);
    }
  }, [isCurrencyDrawerOpen]);

  // Filtered currencies in smart search drawer
  const filteredCurrencies = useMemo(() => {
    const q = currencyQuery.trim().toLowerCase();
    if (!q) return ALL_CURRENCIES;
    return ALL_CURRENCIES.filter((c) => {
      const hay = `${c.code} ${c.symbol} ${c.nameAr} ${c.nameEn} ${c.countryAr} ${c.countryEn}`.toLowerCase();
      return hay.includes(q);
    });
  }, [currencyQuery]);

  // Load browser-viewed products on mount
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

  // Preload catalog in background for smart product search
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

  // Smart product search results
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

  // Desktop mouse drag + wheel horizontal scroll for product ribbon
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

  const handleSelectProduct = (
    item: BrowserProductSnapshot,
    fromSearch = false
  ) => {
    setSelectedViewedProduct(item);
    if (fromSearch) {
      const updated = recordBrowserProductView(item);
      setViewedProducts(updated);
    }
  };

  // Dynamic Slider Maximums (Allows starting at 0 and increasing smoothly by 1)
  const salarySliderMax = useMemo(() => {
    const baseMax = Math.round(
      activeCurrency.defaultSalaryUsd * activeCurrency.rateFromUsd * 4
    );
    const currentVal = Number(grossSalaryInput) || 0;
    return Math.max(5000, baseMax, Math.ceil(currentVal * 1.25));
  }, [activeCurrency, grossSalaryInput]);

  const expenseSliderMax = useMemo(() => {
    const gross = Number(grossSalaryInput) || 0;
    const baseMax = Math.round(
      activeCurrency.defaultSalaryUsd * activeCurrency.rateFromUsd * 1.5
    );
    return Math.max(2000, baseMax, gross);
  }, [activeCurrency, grossSalaryInput]);

  // 4. Core Real Salary & Workday Anatomy Mathematical Engine
  const report = useMemo(() => {
    const grossSalary = Math.max(0, Number(grossSalaryInput) || 0);
    const weeklyDays = Math.min(7, Math.max(0, Number(weeklyDaysInput) || 0));
    const dailyOfficialHours = Math.min(
      24,
      Math.max(0, Number(dailyHoursInput) || 0)
    );
    const commuteMinutes = Math.min(
      600,
      Math.max(0, Number(commuteMinutesInput) || 0)
    );
    const prepMinutes = Math.min(
      360,
      Math.max(0, Number(prepMinutesInput) || 0)
    );

    const transportCost = Math.max(0, Number(transportCostInput) || 0);
    const workMealsCost = Math.max(0, Number(workMealsCostInput) || 0);
    const housingCost = Math.max(0, Number(housingCostInput) || 0);
    const fixedBills = Math.max(0, Number(fixedBillsInput) || 0);

    const weeksPerMonth = 4.3333;
    const monthlyWorkDays = weeklyDays * weeksPerMonth;
    const officialMonthlyHours = dailyOfficialHours * monthlyWorkDays;

    const dailyHiddenHours = (commuteMinutes + prepMinutes) / 60;
    const hiddenMonthlyHours = dailyHiddenHours * monthlyWorkDays;
    const totalInvestedMonthlyHours = officialMonthlyHours + hiddenMonthlyHours;

    const totalWorkDirectCost = transportCost + workMealsCost;
    const totalLivingFixedCost = housingCost + fixedBills;
    const totalMonthlyObligations = totalWorkDirectCost + totalLivingFixedCost;

    // Net Salary after work expenses only (True Wage per Vicki Robin / Your Money or Your Life)
    const netAfterWorkExpenses = grossSalary - totalWorkDirectCost;
    // Net Free Disposable Surplus after BOTH Fixed Living + Work Expenses
    const netFreeSalary = grossSalary - totalMonthlyObligations;

    // 1. Nominal Hourly Rate (Gross Salary / Official Contract Hours)
    const nominalHourlyWage =
      officialMonthlyHours > 0 ? grossSalary / officialMonthlyHours : 0;

    // 2. True Job Hourly Wage ((Gross - Work Expenses) / Total Invested Hours incl. Commute)
    const trueJobHourlyWage =
      totalInvestedMonthlyHours > 0
        ? Math.max(0, netAfterWorkExpenses) / totalInvestedMonthlyHours
        : 0;

    // 3. Net Free Disposable Hourly Value (What stays in your pocket per hour of life invested)
    const netFreeHourlyValue =
      totalInvestedMonthlyHours > 0
        ? Math.max(0, netFreeSalary) / totalInvestedMonthlyHours
        : 0;

    const wageDropPct =
      nominalHourlyWage > 0
        ? Math.max(
            0,
            Math.min(
              100,
              ((nominalHourlyWage - netFreeHourlyValue) / nominalHourlyWage) *
                100
            )
          )
        : 0;

    const jobFrictionDropPct =
      nominalHourlyWage > 0
        ? Math.max(
            0,
            Math.min(
              100,
              ((nominalHourlyWage - trueJobHourlyWage) / nominalHourlyWage) *
                100
            )
          )
        : 0;

    // Percentage shares of Gross Salary
    const livingSharePct =
      grossSalary > 0
        ? Math.min(100, (totalLivingFixedCost / grossSalary) * 100)
        : 0;
    const workDrainSharePct =
      grossSalary > 0
        ? Math.min(
            Math.max(0, 100 - livingSharePct),
            (totalWorkDirectCost / grossSalary) * 100
          )
        : 0;
    const freeSurplusSharePct =
      grossSalary > 0
        ? Math.max(0, 100 - livingSharePct - workDrainSharePct)
        : 0;

    // Workday Anatomy (Out of Daily Official Hours, e.g., 8 hours)
    const hoursForLivingPerDay =
      dailyOfficialHours * (livingSharePct / 100);
    const hoursForWorkDrainPerDay =
      dailyOfficialHours * (workDrainSharePct / 100);
    const hoursForSelfPerDay =
      dailyOfficialHours * (freeSurplusSharePct / 100);

    // Clock time simulation starting at 09:00 AM
    const formatClockOffset = (offsetHours: number) => {
      const baseMinutes = 9 * 60 + Math.round(offsetHours * 60);
      const normalized = ((baseMinutes % 1440) + 1440) % 1440;
      const hh24 = Math.floor(normalized / 60);
      const mm = normalized % 60;
      const periodAr = hh24 >= 12 ? 'م' : 'ص';
      const periodEn = hh24 >= 12 ? 'PM' : 'AM';
      const hh12 = hh24 % 12 === 0 ? 12 : hh24 % 12;
      const mmStr = String(mm).padStart(2, '0');
      return isAr
        ? `${hh12}:${mmStr} ${periodAr}`
        : `${hh12}:${mmStr} ${periodEn}`;
    };

    const startWorkClock = formatClockOffset(0);
    const finishLivingClock = formatClockOffset(hoursForLivingPerDay);
    const startWorkingForSelfClock = formatClockOffset(
      hoursForLivingPerDay + hoursForWorkDrainPerDay
    );
    const endWorkClock = formatClockOffset(dailyOfficialHours);

    // Annual Commute & Hidden Work Drain
    const annualWorkDays = weeklyDays * 52;
    const annualCommuteAndPrepHours = dailyHiddenHours * annualWorkDays;
    const annualFullDaysOnRoad = annualCommuteAndPrepHours / 24;
    const annualWorkWeeksLostToRoad =
      dailyOfficialHours > 0
        ? annualCommuteAndPrepHours / (dailyOfficialHours * Math.max(1, weeklyDays))
        : 0;
    const annualDirectWorkSpend = totalWorkDirectCost * 12;

    // What-If Remote / Optimization Scenario
    const savingRatio = remoteSavingsPct / 100;
    const savedMonthlyMoney = totalWorkDirectCost * savingRatio;
    const savedAnnualMoney = savedMonthlyMoney * 12;
    const savedMonthlyHours = hiddenMonthlyHours * savingRatio;
    const savedAnnualHours = annualCommuteAndPrepHours * savingRatio;

    const optimizedMonthlyHours = Math.max(
      1,
      totalInvestedMonthlyHours - savedMonthlyHours
    );
    const optimizedNetFreeSalary = netFreeSalary + savedMonthlyMoney;
    const optimizedNetHourlyValue =
      optimizedMonthlyHours > 0
        ? Math.max(0, optimizedNetFreeSalary) / optimizedMonthlyHours
        : 0;
    const hourlyBoostPct =
      netFreeHourlyValue > 0
        ? ((optimizedNetHourlyValue - netFreeHourlyValue) /
            netFreeHourlyValue) *
          100
        : 0;

    // Health Verdict
    let verdictId: HealthVerdictId = 'balanced';
    if (grossSalary <= 0 || officialMonthlyHours <= 0) {
      verdictId = 'zero';
    } else if (netFreeSalary < 0) {
      verdictId = 'critical';
    } else if (freeSurplusSharePct >= 45) {
      verdictId = 'sovereign';
    } else if (freeSurplusSharePct >= 25) {
      verdictId = 'balanced';
    } else {
      verdictId = 'strained';
    }

    return {
      grossSalary,
      weeklyDays,
      dailyOfficialHours,
      commuteMinutes,
      prepMinutes,
      transportCost,
      workMealsCost,
      housingCost,
      fixedBills,
      monthlyWorkDays,
      officialMonthlyHours,
      hiddenMonthlyHours,
      totalInvestedMonthlyHours,
      totalWorkDirectCost,
      totalLivingFixedCost,
      totalMonthlyObligations,
      netAfterWorkExpenses,
      netFreeSalary,
      nominalHourlyWage,
      trueJobHourlyWage,
      netFreeHourlyValue,
      wageDropPct,
      jobFrictionDropPct,
      livingSharePct,
      workDrainSharePct,
      freeSurplusSharePct,
      hoursForLivingPerDay,
      hoursForWorkDrainPerDay,
      hoursForSelfPerDay,
      startWorkClock,
      finishLivingClock,
      startWorkingForSelfClock,
      endWorkClock,
      annualCommuteAndPrepHours,
      annualFullDaysOnRoad,
      annualWorkWeeksLostToRoad,
      annualDirectWorkSpend,
      savedMonthlyMoney,
      savedAnnualMoney,
      savedMonthlyHours,
      savedAnnualHours,
      optimizedNetHourlyValue,
      hourlyBoostPct,
      verdictId,
    };
  }, [
    grossSalaryInput,
    weeklyDaysInput,
    dailyHoursInput,
    commuteMinutesInput,
    prepMinutesInput,
    transportCostInput,
    workMealsCostInput,
    housingCostInput,
    fixedBillsInput,
    remoteSavingsPct,
    isAr,
  ]);

  // Format hours into readable "X ساعة و Y دقيقة" / "Xh Ym"
  const formatHoursAndMinutes = (decimalHours: number) => {
    const safe = Math.max(0, Number.isFinite(decimalHours) ? decimalHours : 0);
    const totalMinutes = Math.round(safe * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    if (isAr) {
      if (h === 0) return `${m} دقيقة`;
      if (m === 0) return `${h} س`;
      return `${h} س و ${m} د`;
    }
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  // Copy full analytical summary to clipboard
  const handleCopyReport = async () => {
    const summaryText = isAr
      ? [
          `تقرير AQURIVO للراتب الحقيقي وقيمة الساعة`,
          `────────────────────────────────────────`,
          `• الراتب الشهري الإجمالي: ${formatMoney(report.grossSalary)}`,
          `• صافي الراتب الحر المتبقي: ${formatMoney(report.netFreeSalary)} (${oneDecFmt.format(
            report.freeSurplusSharePct
          )}%)`,
          `• أجر الساعة الاسمي على الورق: ${formatMoney(
            report.nominalHourlyWage,
            2
          )}`,
          `• قيمة الساعة الحقيقية الصافية: ${formatMoney(
            report.netFreeHourlyValue,
            2
          )}`,
          `• إجمالي الساعات المستثمرة شهرياً (شاملاً الطريق): ${oneDecFmt.format(
            report.totalInvestedMonthlyHours
          )} ساعة`,
          `• بدء العمل لصالح نفسك يومياً: بعد الساعة ${report.startWorkingForSelfClock}`,
          `• استنزاف الطريق السنوي: ${intFmt.format(
            Math.round(report.annualCommuteAndPrepHours)
          )} ساعة (${oneDecFmt.format(report.annualFullDaysOnRoad)} يوم كامل)`,
        ].join('\n')
      : [
          `AQURIVO Real Salary & Hourly Value Report`,
          `────────────────────────────────────────`,
          `• Gross Monthly Salary: ${formatMoney(report.grossSalary)}`,
          `• True Net Free Surplus: ${formatMoney(report.netFreeSalary)} (${oneDecFmt.format(
            report.freeSurplusSharePct
          )}%)`,
          `• Nominal Hourly Wage on Paper: ${formatMoney(
            report.nominalHourlyWage,
            2
          )}`,
          `• True Net Hourly Value: ${formatMoney(
            report.netFreeHourlyValue,
            2
          )}`,
          `• Total Monthly Invested Hours (incl. commute): ${oneDecFmt.format(
            report.totalInvestedMonthlyHours
          )} hrs`,
          `• Time You Start Working for Yourself Daily: After ${report.startWorkingForSelfClock}`,
          `• Annual Commute Drain: ${intFmt.format(
            Math.round(report.annualCommuteAndPrepHours)
          )} hrs (${oneDecFmt.format(report.annualFullDaysOnRoad)} full days)`,
        ].join('\n');

    try {
      await navigator.clipboard.writeText(summaryText);
      setCopiedReport(true);
      window.setTimeout(() => setCopiedReport(false), 2600);
    } catch {
      // Fallback ignored
    }
  };

  // Selected product cost in true hours
  const selectedProductMetrics = useMemo(() => {
    if (!selectedViewedProduct) return null;
    const localPrice = Math.max(
      1,
      Math.round(selectedViewedProduct.priceUsd * activeCurrency.rateFromUsd)
    );
    const nominalHours =
      report.nominalHourlyWage > 0
        ? localPrice / report.nominalHourlyWage
        : 0;
    const trueHours =
      report.netFreeHourlyValue > 0
        ? localPrice / report.netFreeHourlyValue
        : 0;
    return {
      localPrice,
      nominalHours,
      trueHours,
    };
  }, [selectedViewedProduct, activeCurrency, report]);

  return (
    <div className={styles.studioShell} dir={isAr ? 'rtl' : 'ltr'}>
      {/* 2. STUDIO HEADER BAR: BRAND EMBLEM + GLOBAL CURRENCY PICKER + SCENARIO PRESETS */}
      <div className={styles.studioHeaderBar}>
        <div className={styles.studioHeaderTop}>
          <RealSalaryLogo size="md" showWordmark locale={locale} />

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

        {/* Smart Global Currency Search Drawer */}
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
                      ? 'ابحث عن أي دولة أو عملة (مثال: ريال، درهم، دولار، يورو، المغرب، مصر، USD)...'
                      : 'Search any country or currency (e.g. USD, EUR, SAR, MAD, GBP, Japan)...'
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

        {/* Quick Scenario Presets */}
        <div className={styles.presetsBar}>
          <span className={styles.presetsBarLabel}>
            {isAr ? 'قوالب سريعة للمعايرة:' : 'Quick Calibration Presets:'}
          </span>
          <div className={styles.presetButtonsRow}>
            <button
              type="button"
              onClick={() => applyPresetProfile('commuter')}
              className={`${styles.presetBtn} ${
                activePreset === 'commuter' ? styles.presetBtnActive : ''
              }`}
            >
              {isAr
                ? 'موظف حضوري في مدينة مزدحمة'
                : 'On-Site City Commuter'}
            </button>
            <button
              type="button"
              onClick={() => applyPresetProfile('hybrid')}
              className={`${styles.presetBtn} ${
                activePreset === 'hybrid' ? styles.presetBtnActive : ''
              }`}
            >
              {isAr ? 'نظام عمل هجين (Hybrid)' : 'Hybrid Schedule'}
            </button>
            <button
              type="button"
              onClick={() => applyPresetProfile('remote')}
              className={`${styles.presetBtn} ${
                activePreset === 'remote' ? styles.presetBtnActive : ''
              }`}
            >
              {isAr ? 'عمل عن بُعد بالكامل (Remote)' : '100% Remote Work'}
            </button>
            <button
              type="button"
              onClick={() => applyPresetProfile('zero')}
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

      {/* 3. MAIN WORKBENCH GRID: LEFT INPUT DECK & RIGHT LIVE ANALYTICAL REPORT */}
      <div className={styles.workbenchGrid}>
        {/* LEFT COLUMN: 3 STRUCTURED INPUT CARDS */}
        <div className={styles.inputDeckColumn}>
          {/* CARD 1: GROSS INCOME & OFFICIAL SCHEDULE */}
          <section className={styles.inputCard}>
            <div className={styles.cardHeader}>
              <span className={styles.cardStepIndex}>01</span>
              <div className={styles.cardHeaderText}>
                <h2 className={styles.cardTitle}>
                  {isAr
                    ? 'الدخل الشهري وساعات العمل الرسمية'
                    : 'Monthly Gross Income & Official Schedule'}
                </h2>
                <p className={styles.cardHint}>
                  {isAr
                    ? 'تبدأ جميع الحقول والمنزلقات من 0 وتزداد بدقة رقم 1.'
                    : 'All fields and sliders start from 0 and increment precisely by 1.'}
                </p>
              </div>
            </div>

            {/* Gross Monthly Salary */}
            <div className={styles.fieldBlock}>
              <div className={styles.fieldLabelRow}>
                <label htmlFor="rs-gross-salary" className={styles.fieldLabel}>
                  {isAr ? 'دخلك أو راتبك الشهري الإجمالي' : 'Gross Monthly Salary'}
                </label>
                <span className={styles.fieldLiveValue}>
                  {formatMoney(report.grossSalary)}
                </span>
              </div>

              <div className={styles.numberInputRow}>
                <input
                  id="rs-gross-salary"
                  type="number"
                  min="0"
                  step="1"
                  value={grossSalaryInput}
                  onChange={(e) => setGrossSalaryInput(e.target.value)}
                  className={styles.numberInput}
                />
                <span className={styles.inputUnitTag}>{activeCurrency.code}</span>
              </div>

              <input
                type="range"
                min="0"
                max={salarySliderMax}
                step="1"
                value={Math.min(salarySliderMax, report.grossSalary)}
                onChange={(e) => setGrossSalaryInput(e.target.value)}
                className={styles.rangeSlider}
                aria-label={isAr ? 'الراتب الشهري' : 'Gross Monthly Salary'}
              />
            </div>

            {/* Work Days Per Week & Daily Official Hours */}
            <div className={styles.dualFieldGrid}>
              <div className={styles.fieldBlock}>
                <div className={styles.fieldLabelRow}>
                  <label htmlFor="rs-weekly-days" className={styles.fieldLabel}>
                    {isAr ? 'أيام العمل في الأسبوع' : 'Work Days / Week'}
                  </label>
                  <span className={styles.fieldLiveValue}>
                    {report.weeklyDays} {isAr ? 'أيام' : 'days'}
                  </span>
                </div>
                <input
                  id="rs-weekly-days"
                  type="number"
                  min="0"
                  max="7"
                  step="1"
                  value={weeklyDaysInput}
                  onChange={(e) => setWeeklyDaysInput(e.target.value)}
                  className={styles.numberInput}
                />
                <div className={styles.quickSegmentRow}>
                  {[4, 5, 6, 7].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setWeeklyDaysInput(String(d))}
                      className={`${styles.segmentOptionBtn} ${
                        report.weeklyDays === d
                          ? styles.segmentOptionBtnActive
                          : ''
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.fieldBlock}>
                <div className={styles.fieldLabelRow}>
                  <label htmlFor="rs-daily-hours" className={styles.fieldLabel}>
                    {isAr ? 'ساعات الدوام يومياً' : 'Official Hours / Day'}
                  </label>
                  <span className={styles.fieldLiveValue}>
                    {report.dailyOfficialHours} {isAr ? 'ساعات' : 'hrs'}
                  </span>
                </div>
                <input
                  id="rs-daily-hours"
                  type="number"
                  min="0"
                  max="24"
                  step="1"
                  value={dailyHoursInput}
                  onChange={(e) => setDailyHoursInput(e.target.value)}
                  className={styles.numberInput}
                />
                <div className={styles.quickSegmentRow}>
                  {[6, 7, 8, 9, 10].map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setDailyHoursInput(String(h))}
                      className={`${styles.segmentOptionBtn} ${
                        report.dailyOfficialHours === h
                          ? styles.segmentOptionBtnActive
                          : ''
                      }`}
                    >
                      {h}h
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* CARD 2: HIDDEN WORK & COMMUTE DRAIN */}
          <section className={styles.inputCard}>
            <div className={styles.cardHeader}>
              <span className={styles.cardStepIndexCoral}>02</span>
              <div className={styles.cardHeaderText}>
                <h2 className={styles.cardTitle}>
                  {isAr
                    ? 'الوقت والتكلفة الخفية للعمل (استنزاف الوظيفة)'
                    : 'Work-Related Hidden Time & Direct Costs'}
                </h2>
                <p className={styles.cardHint}>
                  {isAr
                    ? 'وقت المواصلات والاستعداد والمصاريف التي تدفعها فقط لأنك تذهب للعمل.'
                    : 'Commute time, daily prep, and money spent solely to perform your job.'}
                </p>
              </div>
            </div>

            <div className={styles.dualFieldGrid}>
              {/* Commute Time per Day in Minutes */}
              <div className={styles.fieldBlock}>
                <div className={styles.fieldLabelRow}>
                  <label htmlFor="rs-commute-mins" className={styles.fieldLabel}>
                    {isAr
                      ? 'وقت الطريق يومياً (ذهاب وإياب بالدقائق)'
                      : 'Daily Round-Trip Commute (mins)'}
                  </label>
                  <span className={styles.fieldLiveValueCoral}>
                    {report.commuteMinutes} {isAr ? 'دقيقة' : 'min'}
                  </span>
                </div>
                <input
                  id="rs-commute-mins"
                  type="number"
                  min="0"
                  max="600"
                  step="1"
                  value={commuteMinutesInput}
                  onChange={(e) => setCommuteMinutesInput(e.target.value)}
                  className={styles.numberInput}
                />
                <input
                  type="range"
                  min="0"
                  max="240"
                  step="1"
                  value={Math.min(240, report.commuteMinutes)}
                  onChange={(e) => setCommuteMinutesInput(e.target.value)}
                  className={styles.rangeSliderCoral}
                  aria-label={isAr ? 'وقت الطريق يومياً' : 'Daily Commute Minutes'}
                />
              </div>

              {/* Daily Prep & Unpaid Overtime Minutes */}
              <div className={styles.fieldBlock}>
                <div className={styles.fieldLabelRow}>
                  <label htmlFor="rs-prep-mins" className={styles.fieldLabel}>
                    {isAr
                      ? 'وقت التحضير أو التأخير غير المدفوع (دقائق)'
                      : 'Daily Prep / Unpaid Buffer (mins)'}
                  </label>
                  <span className={styles.fieldLiveValueCoral}>
                    {report.prepMinutes} {isAr ? 'دقيقة' : 'min'}
                  </span>
                </div>
                <input
                  id="rs-prep-mins"
                  type="number"
                  min="0"
                  max="360"
                  step="1"
                  value={prepMinutesInput}
                  onChange={(e) => setPrepMinutesInput(e.target.value)}
                  className={styles.numberInput}
                />
                <input
                  type="range"
                  min="0"
                  max="180"
                  step="1"
                  value={Math.min(180, report.prepMinutes)}
                  onChange={(e) => setPrepMinutesInput(e.target.value)}
                  className={styles.rangeSliderCoral}
                  aria-label={isAr ? 'وقت التحضير يومياً' : 'Daily Prep Minutes'}
                />
              </div>
            </div>

            <div className={styles.dualFieldGrid}>
              {/* Monthly Commuting / Fuel Cost */}
              <div className={styles.fieldBlock}>
                <div className={styles.fieldLabelRow}>
                  <label htmlFor="rs-transport-cost" className={styles.fieldLabel}>
                    {isAr
                      ? 'تكلفة المواصلات والوقود شهرياً'
                      : 'Monthly Commute & Fuel Cost'}
                  </label>
                  <span className={styles.fieldLiveValueCoral}>
                    {formatMoney(report.transportCost)}
                  </span>
                </div>
                <div className={styles.numberInputRow}>
                  <input
                    id="rs-transport-cost"
                    type="number"
                    min="0"
                    step="1"
                    value={transportCostInput}
                    onChange={(e) => setTransportCostInput(e.target.value)}
                    className={styles.numberInput}
                  />
                  <span className={styles.inputUnitTag}>{activeCurrency.code}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={Math.max(500, Math.round(expenseSliderMax * 0.4))}
                  step="1"
                  value={Math.min(
                    Math.max(500, Math.round(expenseSliderMax * 0.4)),
                    report.transportCost
                  )}
                  onChange={(e) => setTransportCostInput(e.target.value)}
                  className={styles.rangeSliderCoral}
                  aria-label={isAr ? 'تكلفة المواصلات' : 'Monthly Transport Cost'}
                />
              </div>

              {/* Monthly Work Meals, Coffee & Attire */}
              <div className={styles.fieldBlock}>
                <div className={styles.fieldLabelRow}>
                  <label htmlFor="rs-meals-cost" className={styles.fieldLabel}>
                    {isAr
                      ? 'مصاريف يوم العمل (قهوة، غداء، مستلزمات)'
                      : 'Workday Meals, Coffee & Attire'}
                  </label>
                  <span className={styles.fieldLiveValueCoral}>
                    {formatMoney(report.workMealsCost)}
                  </span>
                </div>
                <div className={styles.numberInputRow}>
                  <input
                    id="rs-meals-cost"
                    type="number"
                    min="0"
                    step="1"
                    value={workMealsCostInput}
                    onChange={(e) => setWorkMealsCostInput(e.target.value)}
                    className={styles.numberInput}
                  />
                  <span className={styles.inputUnitTag}>{activeCurrency.code}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={Math.max(500, Math.round(expenseSliderMax * 0.4))}
                  step="1"
                  value={Math.min(
                    Math.max(500, Math.round(expenseSliderMax * 0.4)),
                    report.workMealsCost
                  )}
                  onChange={(e) => setWorkMealsCostInput(e.target.value)}
                  className={styles.rangeSliderCoral}
                  aria-label={isAr ? 'مصاريف يوم العمل' : 'Workday Meals & Coffee'}
                />
              </div>
            </div>
          </section>

          {/* CARD 3: FIXED LIVING PILLARS */}
          <section className={styles.inputCard}>
            <div className={styles.cardHeader}>
              <span className={styles.cardStepIndexAmber}>03</span>
              <div className={styles.cardHeaderText}>
                <h2 className={styles.cardTitle}>
                  {isAr
                    ? 'الالتزامات المعيشية الأساسية الثابتة'
                    : 'Fixed Monthly Living Pillars'}
                </h2>
                <p className={styles.cardHint}>
                  {isAr
                    ? 'السكن والفواتير والالتزامات الثابتة التي تقتطع من راتبك كل شهر.'
                    : 'Housing, utilities, and essential fixed obligations deducted every month.'}
                </p>
              </div>
            </div>

            <div className={styles.dualFieldGrid}>
              {/* Monthly Rent / Housing */}
              <div className={styles.fieldBlock}>
                <div className={styles.fieldLabelRow}>
                  <label htmlFor="rs-housing-cost" className={styles.fieldLabel}>
                    {isAr
                      ? 'السكن أو الإيجار الشهري'
                      : 'Monthly Rent / Housing'}
                  </label>
                  <span className={styles.fieldLiveValueAmber}>
                    {formatMoney(report.housingCost)}
                  </span>
                </div>
                <div className={styles.numberInputRow}>
                  <input
                    id="rs-housing-cost"
                    type="number"
                    min="0"
                    step="1"
                    value={housingCostInput}
                    onChange={(e) => setHousingCostInput(e.target.value)}
                    className={styles.numberInput}
                  />
                  <span className={styles.inputUnitTag}>{activeCurrency.code}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={expenseSliderMax}
                  step="1"
                  value={Math.min(expenseSliderMax, report.housingCost)}
                  onChange={(e) => setHousingCostInput(e.target.value)}
                  className={styles.rangeSliderAmber}
                  aria-label={isAr ? 'الإيجار الشهري' : 'Monthly Housing Cost'}
                />
              </div>

              {/* Monthly Fixed Bills */}
              <div className={styles.fieldBlock}>
                <div className={styles.fieldLabelRow}>
                  <label htmlFor="rs-fixed-bills" className={styles.fieldLabel}>
                    {isAr
                      ? 'الفواتير والالتزامات الثابتة (كهرباء، إنترنت، أقساط)'
                      : 'Fixed Bills (Power, Internet, Obligations)'}
                  </label>
                  <span className={styles.fieldLiveValueAmber}>
                    {formatMoney(report.fixedBills)}
                  </span>
                </div>
                <div className={styles.numberInputRow}>
                  <input
                    id="rs-fixed-bills"
                    type="number"
                    min="0"
                    step="1"
                    value={fixedBillsInput}
                    onChange={(e) => setFixedBillsInput(e.target.value)}
                    className={styles.numberInput}
                  />
                  <span className={styles.inputUnitTag}>{activeCurrency.code}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={expenseSliderMax}
                  step="1"
                  value={Math.min(expenseSliderMax, report.fixedBills)}
                  onChange={(e) => setFixedBillsInput(e.target.value)}
                  className={styles.rangeSliderAmber}
                  aria-label={isAr ? 'الفواتير الثابتة' : 'Fixed Monthly Bills'}
                />
              </div>
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN: LIVE ANALYTICAL REPORT & VISUAL DIAGNOSTICS */}
        <div className={styles.reportColumn}>
          {/* 1. HERO COMPARISON CARD: NOMINAL VS TRUE NET HOURLY VALUE */}
          <section className={styles.heroReportCard}>
            <div className={styles.heroReportTopRow}>
              <span className={styles.reportKicker}>
                {isAr
                  ? 'المقارنة الكاشفة · القيمة الاسمية مقابل القيمة الحقيقية'
                  : 'EXECUTIVE VERDICT · NOMINAL VS. TRUE HOURLY VALUE'}
              </span>

              <span
                className={`${styles.verdictStatusText} ${
                  styles[`verdict_${report.verdictId}`]
                }`}
              >
                {report.verdictId === 'sovereign'
                  ? isAr
                    ? 'كفاءة مالية ممتازة وفائض حر قوي'
                    : 'Sovereign Efficiency & High Surplus'
                  : report.verdictId === 'balanced'
                  ? isAr
                    ? 'توازن مالي جيد وقابل للتحسين'
                    : 'Balanced Net Retention'
                  : report.verdictId === 'strained'
                  ? isAr
                    ? 'استنزاف مرتفع من الالتزامات والطريق'
                    : 'High Obligation & Commute Drain'
                  : report.verdictId === 'critical'
                  ? isAr
                    ? 'تنبيه: المصاريف تتجاوز الدخل الشهري'
                    : 'Alert: Expenses Exceed Monthly Income'
                  : isAr
                  ? 'أدخل راتبك لبدء التشريح المالي'
                  : 'Enter your salary to begin diagnostic'}
              </span>
            </div>

            <div className={styles.heroWageDualGrid}>
              {/* Nominal Wage on Paper */}
              <div className={styles.wageCompareBoxMuted}>
                <span className={styles.wageBoxLabel}>
                  {isAr
                    ? 'قيمة ساعتك الاسمية على الورق'
                    : 'Nominal Hourly Wage on Paper'}
                </span>
                <strong className={styles.wageBoxValueMuted}>
                  {formatMoney(report.nominalHourlyWage, 2)}
                  <small>/{isAr ? 'ساعة' : 'hr'}</small>
                </strong>
                <span className={styles.wageBoxSub}>
                  {isAr
                    ? `بناءً على ${intFmt.format(
                        Math.round(report.officialMonthlyHours)
                      )} ساعة رسمية فقط دون حساب الطريق والمصاريف`
                    : `Based on ${intFmt.format(
                        Math.round(report.officialMonthlyHours)
                      )} official contract hours before friction`}
                </span>
              </div>

              {/* True Net Disposable Hourly Value */}
              <div className={styles.wageCompareBoxPrimary}>
                <div className={styles.wageBoxHeaderInline}>
                  <span className={styles.wageBoxLabelPrimary}>
                    {isAr
                      ? 'قيمة ساعتك الحقيقية الصافية (ما يبقى لك)'
                      : 'True Net Hourly Value (What You Keep)'}
                  </span>
                  {report.wageDropPct > 0 && (
                    <span className={styles.erosionDeltaText}>
                      -{oneDecFmt.format(report.wageDropPct)}%
                    </span>
                  )}
                </div>

                <strong className={styles.wageBoxValuePrimary}>
                  {formatMoney(report.netFreeHourlyValue, 2)}
                  <small>/{isAr ? 'ساعة' : 'hr'}</small>
                </strong>

                <span className={styles.wageBoxSubPrimary}>
                  {isAr
                    ? `مقابل ${oneDecFmt.format(
                        report.totalInvestedMonthlyHours
                      )} ساعة مستثمرة شهرياً وبعد خصم السكن وتكاليف العمل`
                    : `Across ${oneDecFmt.format(
                        report.totalInvestedMonthlyHours
                      )} total hours/mo after housing & work costs`}
                </span>
              </div>
            </div>

            {/* Secondary 3-Metric Strip */}
            <div className={styles.heroMetricsStrip}>
              <div className={styles.stripMetricItem}>
                <span className={styles.stripMetricLabel}>
                  {isAr ? 'صافي الراتب الحر المتبقي' : 'Net Free Take-Home Pay'}
                </span>
                <strong
                  className={
                    report.netFreeSalary >= 0
                      ? styles.stripMetricValTeal
                      : styles.stripMetricValCoral
                  }
                >
                  {formatMoney(report.netFreeSalary)}
                </strong>
              </div>

              <div className={styles.stripMetricItem}>
                <span className={styles.stripMetricLabel}>
                  {isAr
                    ? 'أجر الساعة بعد مصاريف العمل فقط'
                    : 'Hourly Wage After Work Costs Only'}
                </span>
                <strong className={styles.stripMetricValNeutral}>
                  {formatMoney(report.trueJobHourlyWage, 2)}/{isAr ? 'س' : 'hr'}
                </strong>
              </div>

              <div className={styles.stripMetricItem}>
                <span className={styles.stripMetricLabel}>
                  {isAr
                    ? 'نسبة ما تحتفظ به لنفسك'
                    : 'Net Retention Ratio'}
                </span>
                <strong className={styles.stripMetricValTeal}>
                  {oneDecFmt.format(report.freeSurplusSharePct)}%
                </strong>
              </div>
            </div>

            {/* Selected Store Product Instant Evaluation Banner (if a product was clicked) */}
            {selectedViewedProduct && selectedProductMetrics && (
              <div className={styles.selectedProductCallout}>
                <div className={styles.selectedProductInfo}>
                  <span className={styles.selectedProductTitle}>
                    {isAr
                      ? `فحص المنتج المختار: ${selectedViewedProduct.titleAr || selectedViewedProduct.nameAr}`
                      : `Selected Product Check: ${selectedViewedProduct.titleEn || selectedViewedProduct.nameEn}`}
                  </span>
                  <span className={styles.selectedProductCalc}>
                    {isAr
                      ? `سعره (${formatMoney(
                          selectedProductMetrics.localPrice
                        )}) يساوي ${oneDecFmt.format(
                          selectedProductMetrics.nominalHours
                        )} ساعة على الورق، لكنه يتطلب فعلياً ${oneDecFmt.format(
                          selectedProductMetrics.trueHours
                        )} ساعة من صافي عملك الحر!`
                      : `Priced at ${formatMoney(
                          selectedProductMetrics.localPrice
                        )}, it takes ${oneDecFmt.format(
                          selectedProductMetrics.nominalHours
                        )} hrs on paper, but ${oneDecFmt.format(
                          selectedProductMetrics.trueHours
                        )} hrs of your true net hourly value!`}
                  </span>
                </div>
                <Link
                  href={`/${locale}/tools/work-time-value-calculator?price=${selectedViewedProduct.priceUsd}`}
                  className={styles.selectedProductLink}
                >
                  {isAr ? 'تحليل كامل للمنتج ↖' : 'Full Product Audit ↗'}
                </Link>
              </div>
            )}
          </section>

          {/* 2. SIGNATURE ELEMENT: WORKDAY ANATOMY BAR (شريط تشريح يوم العمل) */}
          <section className={styles.reportSectionCard}>
            <div className={styles.sectionHeaderRow}>
              <div>
                <h3 className={styles.sectionTitle}>
                  {isAr
                    ? `خريطة تشريح يوم عملك (${report.dailyOfficialHours} ساعات رسمية)`
                    : `Your ${report.dailyOfficialHours}-Hour Workday Anatomy`}
                </h3>
                <p className={styles.sectionSub}>
                  {isAr
                    ? 'لمن تعمل في كل ساعة من ساعات دوامك اليومي؟ ومتى تبدأ العمل لصالح نفسك؟'
                    : 'Who gets paid for each hour of your workday, and when do you start working for yourself?'}
                </p>
              </div>
              <Clock size={18} className={styles.sectionIconTeal} />
            </div>

            {/* Interactive Segmented Capsule Bar */}
            <div className={styles.workdayAnatomyTrack}>
              {report.livingSharePct > 0 && (
                <div
                  className={styles.anatomySegmentLiving}
                  style={{ width: `${report.livingSharePct}%` }}
                  title={
                    isAr
                      ? `السكن والفواتير: ${oneDecFmt.format(
                          report.livingSharePct
                        )}%`
                      : `Housing & Bills: ${oneDecFmt.format(
                          report.livingSharePct
                        )}%`
                  }
                />
              )}
              {report.workDrainSharePct > 0 && (
                <div
                  className={styles.anatomySegmentWorkDrain}
                  style={{ width: `${report.workDrainSharePct}%` }}
                  title={
                    isAr
                      ? `تكاليف العمل والطريق: ${oneDecFmt.format(
                          report.workDrainSharePct
                        )}%`
                      : `Work & Commute Drain: ${oneDecFmt.format(
                          report.workDrainSharePct
                        )}%`
                  }
                />
              )}
              {report.freeSurplusSharePct > 0 && (
                <div
                  className={styles.anatomySegmentSelf}
                  style={{ width: `${report.freeSurplusSharePct}%` }}
                  title={
                    isAr
                      ? `صافي ما تعمل به لنفسك: ${oneDecFmt.format(
                          report.freeSurplusSharePct
                        )}%`
                      : `Working for Yourself: ${oneDecFmt.format(
                          report.freeSurplusSharePct
                        )}%`
                  }
                />
              )}
            </div>

            {/* 3 Timeline Breakdown Rows */}
            <div className={styles.workdayTimelineGrid}>
              <div className={styles.timelineItemAmber}>
                <div className={styles.timelineItemTop}>
                  <span className={styles.timelineDotAmber} />
                  <span className={styles.timelineRange}>
                    {report.startWorkClock} — {report.finishLivingClock}
                  </span>
                </div>
                <strong className={styles.timelineDuration}>
                  {formatHoursAndMinutes(report.hoursForLivingPerDay)}
                </strong>
                <span className={styles.timelineDesc}>
                  {isAr
                    ? 'تعمل فيها لتسديد السكن والفواتير الثابتة'
                    : 'Worked to pay housing & fixed bills'}
                </span>
              </div>

              <div className={styles.timelineItemCoral}>
                <div className={styles.timelineItemTop}>
                  <span className={styles.timelineDotCoral} />
                  <span className={styles.timelineRange}>
                    {report.finishLivingClock} — {report.startWorkingForSelfClock}
                  </span>
                </div>
                <strong className={styles.timelineDuration}>
                  {formatHoursAndMinutes(report.hoursForWorkDrainPerDay)}
                </strong>
                <span className={styles.timelineDesc}>
                  {isAr
                    ? 'تعمل فيها لتغطية المواصلات ومصاريف الدوام'
                    : 'Worked to pay for commuting & workday meals'}
                </span>
              </div>

              <div className={styles.timelineItemTeal}>
                <div className={styles.timelineItemTop}>
                  <span className={styles.timelineDotTeal} />
                  <span className={styles.timelineRange}>
                    {report.startWorkingForSelfClock} — {report.endWorkClock}
                  </span>
                </div>
                <strong className={styles.timelineDurationTeal}>
                  {formatHoursAndMinutes(report.hoursForSelfPerDay)}
                </strong>
                <span className={styles.timelineDesc}>
                  {isAr
                    ? 'تعمل فيها فعلياً لصالح نفسك وادخارك الحر'
                    : 'Worked purely for yourself & your financial freedom'}
                </span>
              </div>
            </div>

            <p className={styles.storyNarrativeBox}>
              {report.grossSalary <= 0
                ? isAr
                  ? 'أدخل راتبك الشهري أعلاه لنرسم لك خريطة ساعات دوامك اليومي بدقة.'
                  : 'Enter your monthly salary above to generate your exact workday timeline.'
                : report.netFreeSalary <= 0
                ? isAr
                  ? 'تنبيه مالي: التزاماتك الحالية ومصاريف الطريق تستهلك كامل ساعات دوامك اليومي. راجع محاكي التحسين أدناه لاستعادة فائضك المالي.'
                  : 'Financial alert: Your current fixed bills and work expenses consume your entire workday. Check the simulator below to reclaim your surplus.'
                : isAr
                ? `إذا بدأ دوامك الساعة ${report.startWorkClock}، فإنك تعمل حتى الساعة ${report.startWorkingForSelfClock} لتسديد التزامات السكن والفواتير وتكلفة الذهاب للعمل، ثم تبدأ العمل لصالح نفسك ومستقبلك المالي من الساعة ${report.startWorkingForSelfClock} حتى ${report.endWorkClock}.`
                : `If your workday starts at ${report.startWorkClock}, every minute until ${report.startWorkingForSelfClock} goes toward paying housing, bills, and commuting costs. You officially start earning for yourself from ${report.startWorkingForSelfClock} until ${report.endWorkClock}.`}
            </p>
          </section>

          {/* 3. SALARY FLOW WATERFALL & 50/30/20 BENCHMARK AUDIT */}
          <section className={styles.reportSectionCard}>
            <div className={styles.sectionHeaderRow}>
              <div>
                <h3 className={styles.sectionTitle}>
                  {isAr
                    ? 'شريط تدفق الراتب ومعيار التوازن المالي (50 / 30 / 20)'
                    : 'Salary Waterfall & 50/30/20 Financial Health Audit'}
                </h3>
                <p className={styles.sectionSub}>
                  {isAr
                    ? 'مقارنة توزيع راتبك الفعلي مع القاعدة العالمية: 50% للأساسيات، 30% لنمط الحياة، و20% للادخار.'
                    : 'Comparing your income distribution against the global 50% Needs / 30% Lifestyle / 20% Savings rule.'}
                </p>
              </div>
            </div>

            <div className={styles.pillarComparisonList}>
              {/* Row 1: Fixed Living Needs vs 50% Target */}
              <div className={styles.pillarCompareItem}>
                <div className={styles.pillarCompareHeader}>
                  <span className={styles.pillarCompareTitle}>
                    {isAr
                      ? 'الالتزامات المعيشية الثابتة (السكن والفواتير)'
                      : 'Fixed Living Pillars (Housing & Bills)'}
                  </span>
                  <span className={styles.pillarCompareStats}>
                    <strong>{formatMoney(report.totalLivingFixedCost)}</strong> ·{' '}
                    {oneDecFmt.format(report.livingSharePct)}%{' '}
                    <small>
                      ({isAr ? 'المعيار الآمن ≤ 50%' : 'Benchmark ≤ 50%'})
                    </small>
                  </span>
                </div>
                <div className={styles.pillarBarTrack}>
                  <div
                    className={styles.pillarBarFillAmber}
                    style={{ width: `${Math.min(100, report.livingSharePct)}%` }}
                  />
                </div>
              </div>

              {/* Row 2: Work & Commute Friction vs 10% Target */}
              <div className={styles.pillarCompareItem}>
                <div className={styles.pillarCompareHeader}>
                  <span className={styles.pillarCompareTitle}>
                    {isAr
                      ? 'استنزاف العمل المباشر (المواصلات ووجبات الدوام)'
                      : 'Direct Work Drain (Commute & Workday Meals)'}
                  </span>
                  <span className={styles.pillarCompareStats}>
                    <strong>{formatMoney(report.totalWorkDirectCost)}</strong> ·{' '}
                    {oneDecFmt.format(report.workDrainSharePct)}%{' '}
                    <small>
                      ({isAr ? 'المعيار المثالي ≤ 10%' : 'Benchmark ≤ 10%'})
                    </small>
                  </span>
                </div>
                <div className={styles.pillarBarTrack}>
                  <div
                    className={styles.pillarBarFillCoral}
                    style={{
                      width: `${Math.min(100, report.workDrainSharePct)}%`,
                    }}
                  />
                </div>
              </div>

              {/* Row 3: Net Free Income (For 30% Lifestyle + 20% Wealth Building) */}
              <div className={styles.pillarCompareItem}>
                <div className={styles.pillarCompareHeader}>
                  <span className={styles.pillarCompareTitle}>
                    {isAr
                      ? 'الفائض الحر الصافي (للحياة الشخصية والادخار)'
                      : 'Net Free Surplus (Personal Lifestyle & Wealth)'}
                  </span>
                  <span className={styles.pillarCompareStats}>
                    <strong>{formatMoney(Math.max(0, report.netFreeSalary))}</strong>{' '}
                    · {oneDecFmt.format(report.freeSurplusSharePct)}%{' '}
                    <small>
                      ({isAr ? 'الهدف الصحي ≥ 40%' : 'Target ≥ 40%'})
                    </small>
                  </span>
                </div>
                <div className={styles.pillarBarTrack}>
                  <div
                    className={styles.pillarBarFillTeal}
                    style={{
                      width: `${Math.min(100, report.freeSurplusSharePct)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* 4. ANNUAL COMMUTE DRAIN + INTERACTIVE WHAT-IF REMOTE SIMULATOR */}
          <section className={styles.reportSectionCard}>
            <div className={styles.sectionHeaderRow}>
              <div>
                <h3 className={styles.sectionTitle}>
                  {isAr
                    ? 'نصف القصة الخفي: استنزاف الطريق السنوي ومحاكي التحسين'
                    : 'The Hidden Half: Annual Commute Drain & What-If Simulator'}
                </h3>
                <p className={styles.sectionSub}>
                  {isAr
                    ? `أنت تستثمر ${oneDecFmt.format(
                        report.totalInvestedMonthlyHours
                      )} ساعة شهرياً في وظيفتك (${intFmt.format(
                        Math.round(report.officialMonthlyHours)
                      )} ساعة رسمية + ${oneDecFmt.format(
                        report.hiddenMonthlyHours
                      )} ساعة في الطريق والتحضير).`
                    : `You invest ${oneDecFmt.format(
                        report.totalInvestedMonthlyHours
                      )} hours/month in your job (${intFmt.format(
                        Math.round(report.officialMonthlyHours)
                      )} official hrs + ${oneDecFmt.format(
                        report.hiddenMonthlyHours
                      )} hrs commuting & prepping).`}
                </p>
              </div>
              <Sliders size={18} className={styles.sectionIconTeal} />
            </div>

            <div className={styles.annualDrainGrid}>
              <div className={styles.annualStatBox}>
                <span className={styles.annualStatLabel}>
                  {isAr
                    ? 'ساعات الطريق والتحضير سنوياً'
                    : 'Annual Commute & Prep Hours'}
                </span>
                <strong className={styles.annualStatValueCoral}>
                  {intFmt.format(Math.round(report.annualCommuteAndPrepHours))}{' '}
                  <small>{isAr ? 'ساعة/سنة' : 'hrs/yr'}</small>
                </strong>
                <span className={styles.annualStatSub}>
                  {isAr
                    ? `تعادل ${oneDecFmt.format(
                        report.annualFullDaysOnRoad
                      )} يوماً كاملاً (24 ساعة) أو ${oneDecFmt.format(
                        report.annualWorkWeeksLostToRoad
                      )} أسابيع عمل!`
                    : `Equals ${oneDecFmt.format(
                        report.annualFullDaysOnRoad
                      )} full 24h days or ${oneDecFmt.format(
                        report.annualWorkWeeksLostToRoad
                      )} work weeks!`}
                </span>
              </div>

              <div className={styles.annualStatBox}>
                <span className={styles.annualStatLabel}>
                  {isAr
                    ? 'الإنفاق المباشر للذهاب للعمل سنوياً'
                    : 'Annual Direct Cost of Going to Work'}
                </span>
                <strong className={styles.annualStatValueAmber}>
                  {formatMoney(report.annualDirectWorkSpend)}
                </strong>
                <span className={styles.annualStatSub}>
                  {isAr
                    ? 'مجموع تكاليف المواصلات والوقود ووجبات العمل خلال 12 شهراً'
                    : 'Total spent on transport, fuel, and workday meals over 12 months'}
                </span>
              </div>
            </div>

            {/* Interactive What-If Slider */}
            <div className={styles.whatIfSimulatorBox}>
              <div className={styles.whatIfHeader}>
                <span className={styles.whatIfTitle}>
                  <TrendingUp size={15} aria-hidden="true" />
                  <span>
                    {isAr
                      ? `محاكي العمل الهجين / عن بُعد: ماذا لو قللت وقت وتكلفة الطريق بنسبة ${remoteSavingsPct}%؟`
                      : `What-If Hybrid/Remote Simulator: Cut commute & work costs by ${remoteSavingsPct}%`}
                  </span>
                </span>
                <span className={styles.whatIfPctText}>{remoteSavingsPct}%</span>
              </div>

              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={remoteSavingsPct}
                onChange={(e) => setRemoteSavingsPct(Number(e.target.value))}
                className={styles.rangeSlider}
                aria-label={
                  isAr
                    ? 'نسبة تقليل وقت وتكلفة المواصلات'
                    : 'Commute and work cost reduction percentage'
                }
              />

              <div className={styles.whatIfResultsGrid}>
                <div className={styles.whatIfResultItem}>
                  <span className={styles.whatIfResultLabel}>
                    {isAr ? 'قيمة ساعتك الصافية الجديدة' : 'New True Net Hourly Rate'}
                  </span>
                  <strong className={styles.whatIfResultValTeal}>
                    {formatMoney(report.optimizedNetHourlyValue, 2)}/
                    {isAr ? 'س' : 'hr'}{' '}
                    {report.hourlyBoostPct > 0 && (
                      <small>
                        (+{oneDecFmt.format(report.hourlyBoostPct)}%)
                      </small>
                    )}
                  </strong>
                </div>

                <div className={styles.whatIfResultItem}>
                  <span className={styles.whatIfResultLabel}>
                    {isAr ? 'الوفر المالي السنوي المباشر' : 'Annual Cash Saved'}
                  </span>
                  <strong className={styles.whatIfResultValTeal}>
                    +{formatMoney(report.savedAnnualMoney)}
                  </strong>
                </div>

                <div className={styles.whatIfResultItem}>
                  <span className={styles.whatIfResultLabel}>
                    {isAr ? 'الوقت المسترد لحياتك سنوياً' : 'Life Hours Reclaimed / Yr'}
                  </span>
                  <strong className={styles.whatIfResultValTeal}>
                    +{intFmt.format(Math.round(report.savedAnnualHours))}{' '}
                    {isAr ? 'ساعة' : 'hrs'}
                  </strong>
                </div>
              </div>
            </div>
          </section>

          {/* 5. ACTION BAR: COPY DETAILED REPORT + CROSS-TOOL NAVIGATION */}
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
                      ? 'تم نسخ التقرير المالي بنجاح'
                      : 'Financial Report Copied'}
                  </span>
                </>
              ) : (
                <>
                  <Copy size={16} aria-hidden="true" />
                  <span>
                    {isAr
                      ? 'نسخ التقرير المالي المفصل'
                      : 'Copy Detailed Financial Report'}
                  </span>
                </>
              )}
            </button>

            <Link
              href={`/${locale}/tools/work-time-value-calculator`}
              className={styles.crossToolLinkBtn}
            >
              <span>
                {isAr
                  ? 'افحص سعر أي منتج بقيمة ساعتك الحقيقية ↖'
                  : 'Test Any Product Against Your Hourly Value ↗'}
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RealSalaryCalculator;
