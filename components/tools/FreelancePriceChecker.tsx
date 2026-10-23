'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Briefcase,
  Check,
  ChevronDown,
  Copy,
  FileText,
  Globe,
  RotateCcw,
  Search,
  ShieldCheck,
  X,
  Zap,
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
import { FreelancePriceLogo } from './FreelancePriceLogo';
import styles from './FreelancePriceChecker.module.css';

export interface FreelancePriceCheckerProps {
  locale: 'ar' | 'en';
}

type DisciplineId =
  | 'software_ai'
  | 'uiux_brand'
  | 'marketing_growth'
  | 'content_copy'
  | 'video_motion'
  | 'consulting_ops';

type SeniorityId = 'junior' | 'mid' | 'senior' | 'principal';

type ClientMarketId = 'global_enterprise' | 'regional_mid' | 'local_startup';

type UrgencyId = 'standard' | 'fast' | 'rush';

type ProjectPresetId = 'webapp' | 'brand_ui' | 'campaign' | 'zero';

interface DisciplineMeta {
  id: DisciplineId;
  nameAr: string;
  nameEn: string;
  baseHourlyUsd: number;
}

const DISCIPLINES: DisciplineMeta[] = [
  {
    id: 'software_ai',
    nameAr: 'تطوير البرمجيات والويب والذكاء الاصطناعي',
    nameEn: 'Software, Web & AI Engineering',
    baseHourlyUsd: 55,
  },
  {
    id: 'uiux_brand',
    nameAr: 'تصميم واجهات المستخدم (UI/UX) والهوية البصرية',
    nameEn: 'UI/UX Product Design & Brand Identity',
    baseHourlyUsd: 46,
  },
  {
    id: 'marketing_growth',
    nameAr: 'التسويق الرقمي وإدارة الحملات والنمو',
    nameEn: 'Growth Marketing & Performance Ads',
    baseHourlyUsd: 40,
  },
  {
    id: 'video_motion',
    nameAr: 'المونتاج، الموشن جرافيك والإنتاج المرئي',
    nameEn: 'Video Editing & Motion Graphics',
    baseHourlyUsd: 42,
  },
  {
    id: 'content_copy',
    nameAr: 'كتابة المحتوى الإعلاني والترجمة المتخصصة',
    nameEn: 'Copywriting, Content & Localization',
    baseHourlyUsd: 34,
  },
  {
    id: 'consulting_ops',
    nameAr: 'استشارات الأعمال، الإدارة والتحليل المالي',
    nameEn: 'Business, Strategy & Financial Consulting',
    baseHourlyUsd: 62,
  },
];

const SENIORITY_MULTIPLIERS: Record<
  SeniorityId,
  { mult: number; labelAr: string; labelEn: string }
> = {
  junior: { mult: 0.72, labelAr: 'مبتدئ (1–2 سنة)', labelEn: 'Junior (1–2 yrs)' },
  mid: { mult: 1.0, labelAr: 'متوسط (3–5 سنوات)', labelEn: 'Mid-Level (3–5 yrs)' },
  senior: { mult: 1.42, labelAr: 'خبير (5–8 سنوات)', labelEn: 'Senior (5–8 yrs)' },
  principal: {
    mult: 1.85,
    labelAr: 'استشاري أول (+8 سنوات)',
    labelEn: 'Principal / Lead (8+ yrs)',
  },
};

const MARKET_MULTIPLIERS: Record<
  ClientMarketId,
  { mult: number; labelAr: string; labelEn: string }
> = {
  global_enterprise: {
    mult: 1.35,
    labelAr: 'سوق عالمي / شركات كبرى',
    labelEn: 'Global / Enterprise Client',
  },
  regional_mid: {
    mult: 1.0,
    labelAr: 'سوق إقليمي / شركات متوسطة',
    labelEn: 'Regional Mid-Market Client',
  },
  local_startup: {
    mult: 0.78,
    labelAr: 'شركات ناشئة / سوق محلي',
    labelEn: 'Local / Early Startup',
  },
};

const URGENCY_MULTIPLIERS: Record<
  UrgencyId,
  { mult: number; labelAr: string; labelEn: string }
> = {
  standard: { mult: 1.0, labelAr: 'جدول زمني عادي', labelEn: 'Standard Timeline' },
  fast: { mult: 1.25, labelAr: 'تسليم سريع (+25%)', labelEn: 'Fast-Track (+25%)' },
  rush: { mult: 1.5, labelAr: 'مشروع طارئ (+50%)', labelEn: 'Urgent Rush (+50%)' },
};

interface CurrencyOption {
  code: string;
  symbol: string;
  rateFromUsd: number;
  nameAr: string;
  nameEn: string;
  countryAr: string;
  countryEn: string;
  defaultIncomeUsd: number;
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
    defaultIncomeUsd: 3600,
  },
  {
    code: 'EUR',
    symbol: '€',
    rateFromUsd: 0.92,
    nameAr: 'يورو أوروبي',
    nameEn: 'Euro',
    countryAr: 'الاتحاد الأوروبي',
    countryEn: 'Eurozone',
    defaultIncomeUsd: 3500,
  },
  {
    code: 'GBP',
    symbol: '£',
    rateFromUsd: 0.79,
    nameAr: 'جنيه إسترليني',
    nameEn: 'British Pound',
    countryAr: 'المملكة المتحدة',
    countryEn: 'United Kingdom',
    defaultIncomeUsd: 3600,
  },
  {
    code: 'SAR',
    symbol: 'SAR',
    rateFromUsd: 3.75,
    nameAr: 'ريال سعودي',
    nameEn: 'Saudi Riyal',
    countryAr: 'المملكة العربية السعودية',
    countryEn: 'Saudi Arabia',
    defaultIncomeUsd: 3200,
  },
  {
    code: 'AED',
    symbol: 'AED',
    rateFromUsd: 3.67,
    nameAr: 'درهم إماراتي',
    nameEn: 'UAE Dirham',
    countryAr: 'الإمارات العربية المتحدة',
    countryEn: 'United Arab Emirates',
    defaultIncomeUsd: 3800,
  },
  {
    code: 'QAR',
    symbol: 'QAR',
    rateFromUsd: 3.64,
    nameAr: 'ريال قطري',
    nameEn: 'Qatari Riyal',
    countryAr: 'قطر',
    countryEn: 'Qatar',
    defaultIncomeUsd: 3600,
  },
  {
    code: 'KWD',
    symbol: 'KWD',
    rateFromUsd: 0.31,
    nameAr: 'دينار كويتي',
    nameEn: 'Kuwaiti Dinar',
    countryAr: 'الكويت',
    countryEn: 'Kuwait',
    defaultIncomeUsd: 3600,
  },
  {
    code: 'MAD',
    symbol: 'MAD',
    rateFromUsd: 10,
    nameAr: 'درهم مغربي',
    nameEn: 'Moroccan Dirham',
    countryAr: 'المغرب',
    countryEn: 'Morocco',
    defaultIncomeUsd: 1600,
  },
  {
    code: 'EGP',
    symbol: 'EGP',
    rateFromUsd: 49,
    nameAr: 'جنيه مصري',
    nameEn: 'Egyptian Pound',
    countryAr: 'مصر',
    countryEn: 'Egypt',
    defaultIncomeUsd: 1200,
  },
  {
    code: 'JOD',
    symbol: 'JOD',
    rateFromUsd: 0.71,
    nameAr: 'دينار أردني',
    nameEn: 'Jordanian Dinar',
    countryAr: 'الأردن',
    countryEn: 'Jordan',
    defaultIncomeUsd: 1600,
  },
  {
    code: 'TRY',
    symbol: '₺',
    rateFromUsd: 34,
    nameAr: 'ليرة تركية',
    nameEn: 'Turkish Lira',
    countryAr: 'تركيا',
    countryEn: 'Turkey',
    defaultIncomeUsd: 1800,
  },
  {
    code: 'CAD',
    symbol: 'CA$',
    rateFromUsd: 1.38,
    nameAr: 'دولار كندي',
    nameEn: 'Canadian Dollar',
    countryAr: 'كندا',
    countryEn: 'Canada',
    defaultIncomeUsd: 3600,
  },
  {
    code: 'AUD',
    symbol: 'A$',
    rateFromUsd: 1.52,
    nameAr: 'دولار أسترالي',
    nameEn: 'Australian Dollar',
    countryAr: 'أستراليا',
    countryEn: 'Australia',
    defaultIncomeUsd: 3600,
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
        defaultIncomeUsd: Math.max(1200, city.typicalNetSalaryUsd),
      });
    }
  }
  return Array.from(map.values());
}

const ALL_CURRENCIES = buildGlobalCurrencies();

export function FreelancePriceChecker({ locale }: FreelancePriceCheckerProps) {
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

  // 3. Project Profile & Inputs (All numeric inputs start from min="0" step="1")
  const [activePreset, setActivePreset] = useState<ProjectPresetId>('webapp');
  const [discipline, setDiscipline] = useState<DisciplineId>('software_ai');
  const [seniority, setSeniority] = useState<SeniorityId>('mid');
  const [clientMarket, setClientMarket] = useState<ClientMarketId>('regional_mid');
  const [urgency, setUrgency] = useState<UrgencyId>('standard');

  // Card 2: Execution Hours & Scope/Revision Buffer %
  const [executionHoursInput, setExecutionHoursInput] = useState<string>('35');
  const [revisionBufferPctInput, setRevisionBufferPctInput] = useState<string>('25');

  // Card 3: Freelancer Personal Income Target & Software/Overhead Costs
  const [targetMonthlyIncomeInput, setTargetMonthlyIncomeInput] =
    useState<string>('3200');
  const [monthlyToolsCostInput, setMonthlyToolsCostInput] = useState<string>('180');
  const [billableHoursPerMonthInput, setBillableHoursPerMonthInput] =
    useState<string>('100');

  const [copiedProposal, setCopiedProposal] = useState<boolean>(false);

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

  // Apply Project Preset
  const applyProjectPreset = (
    preset: ProjectPresetId,
    targetCur: CurrencyOption = activeCurrency
  ) => {
    setActivePreset(preset);
    if (preset === 'zero') {
      setExecutionHoursInput('0');
      setRevisionBufferPctInput('0');
      setTargetMonthlyIncomeInput('0');
      setMonthlyToolsCostInput('0');
      setUrgency('standard');
      return;
    }

    const baseIncome = Math.max(
      400,
      Math.round(targetCur.defaultIncomeUsd * targetCur.rateFromUsd)
    );
    const baseTools = Math.max(
      20,
      Math.round(160 * targetCur.rateFromUsd)
    );

    setTargetMonthlyIncomeInput(String(baseIncome));
    setMonthlyToolsCostInput(String(baseTools));
    setBillableHoursPerMonthInput('100');

    if (preset === 'webapp') {
      setDiscipline('software_ai');
      setSeniority('mid');
      setClientMarket('regional_mid');
      setExecutionHoursInput('40');
      setRevisionBufferPctInput('25');
      setUrgency('standard');
    } else if (preset === 'brand_ui') {
      setDiscipline('uiux_brand');
      setSeniority('senior');
      setClientMarket('regional_mid');
      setExecutionHoursInput('28');
      setRevisionBufferPctInput('30');
      setUrgency('standard');
    } else if (preset === 'campaign') {
      setDiscipline('marketing_growth');
      setSeniority('mid');
      setClientMarket('regional_mid');
      setExecutionHoursInput('20');
      setRevisionBufferPctInput('20');
      setUrgency('fast');
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
    applyProjectPreset('webapp', matchedCur);
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

    setTargetMonthlyIncomeInput(scaleStr(targetMonthlyIncomeInput));
    setMonthlyToolsCostInput(scaleStr(monthlyToolsCostInput));

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

  // Dynamic Slider Maximums
  const incomeSliderMax = useMemo(() => {
    const baseMax = Math.round(
      activeCurrency.defaultIncomeUsd * activeCurrency.rateFromUsd * 4
    );
    const currentVal = Number(targetMonthlyIncomeInput) || 0;
    return Math.max(5000, baseMax, Math.ceil(currentVal * 1.25));
  }, [activeCurrency, targetMonthlyIncomeInput]);

  // 4. Bottom-Up + Market-Calibrated Freelance Pricing Engine
  const audit = useMemo(() => {
    const execHours = Math.max(0, Number(executionHoursInput) || 0);
    const bufferPct = Math.min(
      100,
      Math.max(0, Number(revisionBufferPctInput) || 0)
    );
    const targetMonthlyIncome = Math.max(
      0,
      Number(targetMonthlyIncomeInput) || 0
    );
    const monthlyToolsCost = Math.max(0, Number(monthlyToolsCostInput) || 0);
    const billableHoursPerMonth = Math.min(
      260,
      Math.max(10, Number(billableHoursPerMonthInput) || 100)
    );

    const discMeta =
      DISCIPLINES.find((d) => d.id === discipline) || DISCIPLINES[0];
    const senMeta = SENIORITY_MULTIPLIERS[seniority];
    const mktMeta = MARKET_MULTIPLIERS[clientMarket];
    const urgMeta = URGENCY_MULTIPLIERS[urgency];

    // 1. Market Hourly Rate in Local Currency
    const marketHourlyUsd =
      discMeta.baseHourlyUsd * senMeta.mult * mktMeta.mult;
    const marketHourlyLocal = marketHourlyUsd * activeCurrency.rateFromUsd;

    // 2. Freelancer Personal Floor Rate (Bottom-up based on target income + tools + 15% tax/self-employment reserve)
    const requiredGrossMonthly = (targetMonthlyIncome + monthlyToolsCost) * 1.15;
    const personalFloorHourlyLocal =
      billableHoursPerMonth > 0
        ? requiredGrossMonthly / billableHoursPerMonth
        : 0;

    // Effective Recommended Hourly Rate blends market benchmark and personal floor
    const effectiveHourlyLocal =
      personalFloorHourlyLocal > 0
        ? Math.max(
            marketHourlyLocal * 0.85,
            (marketHourlyLocal * 0.65 + personalFloorHourlyLocal * 0.35)
          ) * urgMeta.mult
        : marketHourlyLocal * urgMeta.mult;

    // Total Scoped Hours (Execution + Meetings/Revisions Buffer)
    const bufferHours = execHours * (bufferPct / 100);
    const totalScopedHours = execHours + bufferHours;

    // Cost Breakdown Components of Recommended Fair Price
    const directExecutionValue = execHours * effectiveHourlyLocal;
    const revisionAndScopeValue = bufferHours * effectiveHourlyLocal;
    const overheadAndToolsAllocation =
      billableHoursPerMonth > 0
        ? (monthlyToolsCost / billableHoursPerMonth) * totalScopedHours
        : 0;

    const recommendedFairPrice = Math.round(
      directExecutionValue + revisionAndScopeValue + overheadAndToolsAllocation
    );

    // 3 Tiers
    const minimumWalkAwayPrice = Math.round(
      Math.max(
        execHours * Math.max(personalFloorHourlyLocal, marketHourlyLocal * 0.72),
        recommendedFairPrice * 0.78
      )
    );
    const premiumEnterprisePrice = Math.round(recommendedFairPrice * 1.38);

    // Composition percentages
    const totalDenom = Math.max(1, recommendedFairPrice);
    const execSharePct = Math.min(
      100,
      (directExecutionValue / totalDenom) * 100
    );
    const bufferSharePct = Math.min(
      Math.max(0, 100 - execSharePct),
      (revisionAndScopeValue / totalDenom) * 100
    );
    const overheadSharePct = Math.max(
      0,
      100 - execSharePct - bufferSharePct
    );

    // Payment Milestones (50/50 for smaller projects, 40/30/30 for medium/large)
    const isSmallProject =
      recommendedFairPrice <= 600 * activeCurrency.rateFromUsd;

    const milestones = isSmallProject
      ? [
          {
            pct: 50,
            titleAr: 'الدفعة الأولى (تأكيد التعاقد والبدء)',
            titleEn: 'Upfront Deposit (Contract Kickoff)',
            amount: Math.round(recommendedFairPrice * 0.5),
          },
          {
            pct: 50,
            titleAr: 'الدفعة النهائية (عند التسليم الكامل)',
            titleEn: 'Final Milestone (Upon Final Delivery)',
            amount:
              recommendedFairPrice - Math.round(recommendedFairPrice * 0.5),
          },
        ]
      : [
          {
            pct: 40,
            titleAr: 'الدفعة الأولى (تأكيد الحجز وبدء العمل)',
            titleEn: 'Deposit 1: Project Kickoff & Booking (40%)',
            amount: Math.round(recommendedFairPrice * 0.4),
          },
          {
            pct: 30,
            titleAr: 'الدفعة الثانية (تسليم النسخة الأولية للمراجعة)',
            titleEn: 'Milestone 2: First Draft & Review (30%)',
            amount: Math.round(recommendedFairPrice * 0.3),
          },
          {
            pct: 30,
            titleAr: 'الدفعة الثالثة (الاعتماد والتسليم النهائي)',
            titleEn: 'Milestone 3: Final Approval & Handover (30%)',
            amount:
              recommendedFairPrice -
              Math.round(recommendedFairPrice * 0.4) -
              Math.round(recommendedFairPrice * 0.3),
          },
        ];

    return {
      execHours,
      bufferPct,
      bufferHours,
      totalScopedHours,
      discMeta,
      senMeta,
      mktMeta,
      urgMeta,
      marketHourlyLocal,
      personalFloorHourlyLocal,
      effectiveHourlyLocal,
      directExecutionValue,
      revisionAndScopeValue,
      overheadAndToolsAllocation,
      minimumWalkAwayPrice,
      recommendedFairPrice,
      premiumEnterprisePrice,
      execSharePct,
      bufferSharePct,
      overheadSharePct,
      milestones,
    };
  }, [
    executionHoursInput,
    revisionBufferPctInput,
    targetMonthlyIncomeInput,
    monthlyToolsCostInput,
    billableHoursPerMonthInput,
    discipline,
    seniority,
    clientMarket,
    urgency,
    activeCurrency,
  ]);

  const handleCopyProposal = async () => {
    const proposalText = isAr
      ? [
          `مسودة عرض السعر الاحترافي — AQURIVO Freelance Architect`,
          `────────────────────────────────────────────────────`,
          `• التخصص: ${audit.discMeta.nameAr} (${audit.senMeta.labelAr})`,
          `• إجمالي الساعات المشمولة: ${oneDecFmt.format(
            audit.totalScopedHours
          )} ساعة (${audit.execHours} ساعة تنفيذ + ${oneDecFmt.format(
            audit.bufferHours
          )} ساعة اجتماعات وتعديلات)`,
          `• الباقة الاقتصادية (الحد الأدنى): ${formatMoney(
            audit.minimumWalkAwayPrice
          )}`,
          `• الباقة الاحترافية الموصى بها: ${formatMoney(
            audit.recommendedFairPrice
          )}`,
          `• باقة القيمة العليا / أولوية قصوى: ${formatMoney(
            audit.premiumEnterprisePrice
          )}`,
          `────────────────────────────────────────────────────`,
          `جدول الدفعات المقترح:`,
          ...audit.milestones.map(
            (m) => `  - ${m.titleAr} (${m.pct}%): ${formatMoney(m.amount)}`
          ),
        ].join('\n')
      : [
          `Client Project Proposal — AQURIVO Freelance Architect`,
          `────────────────────────────────────────────────────`,
          `• Discipline: ${audit.discMeta.nameEn} (${audit.senMeta.labelEn})`,
          `• Total Scoped Hours: ${oneDecFmt.format(
            audit.totalScopedHours
          )} hrs (${audit.execHours}h execution + ${oneDecFmt.format(
            audit.bufferHours
          )}h meetings & revisions)`,
          `• Essential Scope Tier: ${formatMoney(audit.minimumWalkAwayPrice)}`,
          `• Recommended Professional Tier: ${formatMoney(
            audit.recommendedFairPrice
          )}`,
          `• Priority Enterprise Tier: ${formatMoney(
            audit.premiumEnterprisePrice
          )}`,
          `────────────────────────────────────────────────────`,
          `Recommended Payment Schedule:`,
          ...audit.milestones.map(
            (m) => `  - ${m.titleEn} (${m.pct}%): ${formatMoney(m.amount)}`
          ),
        ].join('\n');

    try {
      await navigator.clipboard.writeText(proposalText);
      setCopiedProposal(true);
      window.setTimeout(() => setCopiedProposal(false), 2500);
    } catch {
      // Ignore error
    }
  };

  return (
    <div className={styles.studioShell} dir={isAr ? 'rtl' : 'ltr'}>
      {/* 2. STUDIO HEADER BAR: LOGO + GLOBAL CURRENCY DRAWER + PROJECT PRESETS */}
      <div className={styles.studioHeaderBar}>
        <div className={styles.studioHeaderTop}>
          <FreelancePriceLogo size="md" showWordmark locale={locale} />

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
                      ? 'ابحث عن عملة العميل أو عملتك المحلية (USD, EUR, SAR, AED, MAD, EGP)...'
                      : 'Search client or local currency (USD, EUR, GBP, SAR, AED, MAD)...'
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

        {/* Quick Project Templates */}
        <div className={styles.presetsBar}>
          <span className={styles.presetsBarLabel}>
            {isAr ? 'قوالب مشاريع جاهزة:' : 'Quick Project Templates:'}
          </span>
          <div className={styles.presetButtonsRow}>
            <button
              type="button"
              onClick={() => applyProjectPreset('webapp')}
              className={`${styles.presetBtn} ${
                activePreset === 'webapp' ? styles.presetBtnActive : ''
              }`}
            >
              {isAr ? 'تطوير موقع أو تطبيق ويب' : 'Web App Development'}
            </button>
            <button
              type="button"
              onClick={() => applyProjectPreset('brand_ui')}
              className={`${styles.presetBtn} ${
                activePreset === 'brand_ui' ? styles.presetBtnActive : ''
              }`}
            >
              {isAr ? 'تصميم واجهة UI/UX أو هوية' : 'UI/UX & Brand Identity'}
            </button>
            <button
              type="button"
              onClick={() => applyProjectPreset('campaign')}
              className={`${styles.presetBtn} ${
                activePreset === 'campaign' ? styles.presetBtnActive : ''
              }`}
            >
              {isAr ? 'حملة تسويقية / صناعة محتوى' : 'Marketing Campaign'}
            </button>
            <button
              type="button"
              onClick={() => applyProjectPreset('zero')}
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
          {/* CARD 1: DISCIPLINE, SENIORITY & CLIENT MARKET */}
          <section className={styles.inputCard}>
            <div className={styles.cardHeader}>
              <span className={styles.cardStepIndex}>01</span>
              <div className={styles.cardHeaderText}>
                <h2 className={styles.cardTitle}>
                  {isAr
                    ? 'التخصص، مستوى الخبرة، وسوق العميل'
                    : 'Discipline, Seniority & Client Market'}
                </h2>
                <p className={styles.cardHint}>
                  {isAr
                    ? 'اختر تخصصك الدقيق ونوع العميل لمعايرة متوسط سعر الساعة العالمي.'
                    : 'Select your specialization and client tier to calibrate market benchmarks.'}
                </p>
              </div>
            </div>

            <div className={styles.fieldBlock}>
              <label htmlFor="fp-discipline" className={styles.fieldLabel}>
                {isAr ? 'مجال التخصص المهني' : 'Professional Discipline'}
              </label>
              <select
                id="fp-discipline"
                value={discipline}
                onChange={(e) => setDiscipline(e.target.value as DisciplineId)}
                className={styles.selectInput}
              >
                {DISCIPLINES.map((d) => (
                  <option key={d.id} value={d.id}>
                    {isAr ? d.nameAr : d.nameEn}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.fieldBlock}>
              <span className={styles.fieldLabel}>
                {isAr ? 'مستوى الخبرة المهنية' : 'Seniority Level'}
              </span>
              <div className={styles.segmentedGrid2x2}>
                {(Object.keys(SENIORITY_MULTIPLIERS) as SeniorityId[]).map(
                  (key) => {
                    const item = SENIORITY_MULTIPLIERS[key];
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setSeniority(key)}
                        className={`${styles.segmentOptionBtn} ${
                          seniority === key ? styles.segmentOptionBtnActive : ''
                        }`}
                      >
                        {isAr ? item.labelAr : item.labelEn}
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            <div className={styles.fieldBlock}>
              <span className={styles.fieldLabel}>
                {isAr ? 'نطاق سوق العميل المستهدف' : 'Target Client Market'}
              </span>
              <div className={styles.segmentedGrid3}>
                {(Object.keys(MARKET_MULTIPLIERS) as ClientMarketId[]).map(
                  (key) => {
                    const item = MARKET_MULTIPLIERS[key];
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setClientMarket(key)}
                        className={`${styles.segmentOptionBtn} ${
                          clientMarket === key
                            ? styles.segmentOptionBtnActive
                            : ''
                        }`}
                      >
                        {isAr ? item.labelAr : item.labelEn}
                      </button>
                    );
                  }
                )}
              </div>
            </div>
          </section>

          {/* CARD 2: EXECUTION HOURS, REVISION BUFFER & URGENCY */}
          <section className={styles.inputCard}>
            <div className={styles.cardHeader}>
              <span className={styles.cardStepIndexCyan}>02</span>
              <div className={styles.cardHeaderText}>
                <h2 className={styles.cardTitle}>
                  {isAr
                    ? 'ساعات التنفيذ وهامش التعديلات والاستعجال'
                    : 'Execution Hours, Revision Buffer & Urgency'}
                </h2>
                <p className={styles.cardHint}>
                  {isAr
                    ? 'لا تسعّر ساعات التنفيذ فقط؛ أضف هامش الاجتماعات وجولات التعديل.'
                    : 'Never bill raw execution hours alone; include meetings and revision rounds.'}
                </p>
              </div>
            </div>

            <div className={styles.dualFieldGrid}>
              <div className={styles.fieldBlock}>
                <div className={styles.fieldLabelRow}>
                  <label htmlFor="fp-exec-hours" className={styles.fieldLabel}>
                    {isAr
                      ? 'ساعات التنفيذ المباشر للمشروع'
                      : 'Direct Execution Hours'}
                  </label>
                  <span className={styles.fieldLiveValue}>
                    {audit.execHours} {isAr ? 'ساعة' : 'hrs'}
                  </span>
                </div>
                <input
                  id="fp-exec-hours"
                  type="number"
                  min="0"
                  max="2000"
                  step="1"
                  value={executionHoursInput}
                  onChange={(e) => setExecutionHoursInput(e.target.value)}
                  className={styles.numberInput}
                />
                <input
                  type="range"
                  min="0"
                  max="250"
                  step="1"
                  value={Math.min(250, audit.execHours)}
                  onChange={(e) => setExecutionHoursInput(e.target.value)}
                  className={styles.rangeSlider}
                  aria-label={isAr ? 'ساعات التنفيذ' : 'Execution Hours'}
                />
              </div>

              <div className={styles.fieldBlock}>
                <div className={styles.fieldLabelRow}>
                  <label htmlFor="fp-buffer-pct" className={styles.fieldLabel}>
                    {isAr
                      ? 'هامش الاجتماعات والتعديلات (%)'
                      : 'Meetings & Revisions Buffer (%)'}
                  </label>
                  <span className={styles.fieldLiveValueCyan}>
                    +{audit.bufferPct}% ({oneDecFmt.format(audit.bufferHours)}h)
                  </span>
                </div>
                <input
                  id="fp-buffer-pct"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={revisionBufferPctInput}
                  onChange={(e) => setRevisionBufferPctInput(e.target.value)}
                  className={styles.numberInput}
                />
                <input
                  type="range"
                  min="0"
                  max="60"
                  step="1"
                  value={Math.min(60, audit.bufferPct)}
                  onChange={(e) => setRevisionBufferPctInput(e.target.value)}
                  className={styles.rangeSliderCyan}
                  aria-label={isAr ? 'هامش التعديلات' : 'Revision Buffer %'}
                />
              </div>
            </div>

            <div className={styles.fieldBlock}>
              <span className={styles.fieldLabel}>
                {isAr ? 'درجة استعجال العميل' : 'Project Timeline Urgency'}
              </span>
              <div className={styles.segmentedGrid3}>
                {(Object.keys(URGENCY_MULTIPLIERS) as UrgencyId[]).map(
                  (key) => {
                    const item = URGENCY_MULTIPLIERS[key];
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setUrgency(key)}
                        className={`${styles.segmentOptionBtn} ${
                          urgency === key ? styles.segmentOptionBtnActive : ''
                        }`}
                      >
                        {isAr ? item.labelAr : item.labelEn}
                      </button>
                    );
                  }
                )}
              </div>
            </div>
          </section>

          {/* CARD 3: PERSONAL INCOME FLOOR & TOOLS OVERHEAD */}
          <section className={styles.inputCard}>
            <div className={styles.cardHeader}>
              <span className={styles.cardStepIndexAmber}>03</span>
              <div className={styles.cardHeaderText}>
                <h2 className={styles.cardTitle}>
                  {isAr
                    ? 'دخلك الشهري المستهدف وتكاليف أدواتك'
                    : 'Your Target Monthly Income & Tools Overhead'}
                </h2>
                <p className={styles.cardHint}>
                  {isAr
                    ? 'لحساب الحد الأدنى لسعر ساعتك الذي يضمن تغطية حياتك واشتراكاتك.'
                    : 'Calculates your personal walk-away hourly floor to cover income and software costs.'}
                </p>
              </div>
            </div>

            <div className={styles.dualFieldGrid}>
              <div className={styles.fieldBlock}>
                <div className={styles.fieldLabelRow}>
                  <label htmlFor="fp-target-income" className={styles.fieldLabel}>
                    {isAr
                      ? 'دخلك أو راتبك الشهري المستهدف'
                      : 'Target Monthly Net Income'}
                  </label>
                  <span className={styles.fieldLiveValueAmber}>
                    {formatMoney(Number(targetMonthlyIncomeInput) || 0)}
                  </span>
                </div>
                <div className={styles.numberInputRow}>
                  <input
                    id="fp-target-income"
                    type="number"
                    min="0"
                    step="1"
                    value={targetMonthlyIncomeInput}
                    onChange={(e) =>
                      setTargetMonthlyIncomeInput(e.target.value)
                    }
                    className={styles.numberInput}
                  />
                  <span className={styles.inputUnitTag}>{activeCurrency.code}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={incomeSliderMax}
                  step="1"
                  value={Math.min(
                    incomeSliderMax,
                    Number(targetMonthlyIncomeInput) || 0
                  )}
                  onChange={(e) => setTargetMonthlyIncomeInput(e.target.value)}
                  className={styles.rangeSliderAmber}
                  aria-label={isAr ? 'الدخل الشهري المستهدف' : 'Target Monthly Income'}
                />
              </div>

              <div className={styles.fieldBlock}>
                <div className={styles.fieldLabelRow}>
                  <label htmlFor="fp-tools-cost" className={styles.fieldLabel}>
                    {isAr
                      ? 'تكلفة البرامج والاشتراكات شهرياً'
                      : 'Monthly Software & Tools Cost'}
                  </label>
                  <span className={styles.fieldLiveValueAmber}>
                    {formatMoney(Number(monthlyToolsCostInput) || 0)}
                  </span>
                </div>
                <div className={styles.numberInputRow}>
                  <input
                    id="fp-tools-cost"
                    type="number"
                    min="0"
                    step="1"
                    value={monthlyToolsCostInput}
                    onChange={(e) => setMonthlyToolsCostInput(e.target.value)}
                    className={styles.numberInput}
                  />
                  <span className={styles.inputUnitTag}>{activeCurrency.code}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={Math.max(1000, Math.round(incomeSliderMax * 0.25))}
                  step="1"
                  value={Math.min(
                    Math.max(1000, Math.round(incomeSliderMax * 0.25)),
                    Number(monthlyToolsCostInput) || 0
                  )}
                  onChange={(e) => setMonthlyToolsCostInput(e.target.value)}
                  className={styles.rangeSliderAmber}
                  aria-label={isAr ? 'تكلفة البرامج' : 'Monthly Tools Cost'}
                />
              </div>
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN: 3-TIER PROPOSAL DECK & CONTRACT MILESTONES */}
        <div className={styles.reportColumn}>
          {/* 1. SIGNATURE ELEMENT: 3-TIER STRATEGIC PROPOSAL DECK */}
          <section className={styles.heroReportCard}>
            <div className={styles.heroTopRow}>
              <span className={styles.reportKicker}>
                {isAr
                  ? 'باقات التسعير الاستراتيجية الثلاث · جاهزة للعرض على العميل'
                  : '3-TIER STRATEGIC PRICING DECK · CLIENT-READY'}
              </span>
              <span className={styles.scopedHoursSummary}>
                {oneDecFmt.format(audit.totalScopedHours)}{' '}
                {isAr ? 'ساعة إجمالية مشمولة' : 'total scoped hrs'}
              </span>
            </div>

            <div className={styles.threeTiersGrid}>
              {/* Tier 1: Walk-Away Minimum Floor */}
              <div className={styles.tierCardFloor}>
                <span className={styles.tierLabelCyan}>
                  {isAr ? 'الحد الأدنى الآمن' : 'Walk-Away Floor'}
                </span>
                <strong className={styles.tierPriceCyan}>
                  {formatMoney(audit.minimumWalkAwayPrice)}
                </strong>
                <span className={styles.tierSub}>
                  {isAr
                    ? 'أقل سعر يغطي ساعات التنفيذ وتكاليفك دون خسارة (نطاق أساسي فقط)'
                    : 'Minimum viable price covering execution & overhead (strict core scope)'}
                </span>
              </div>

              {/* Tier 2: Recommended Fair Price (Sweet Spot) */}
              <div className={styles.tierCardRecommended}>
                <div className={styles.recommendedHeaderRow}>
                  <span className={styles.tierLabelEmerald}>
                    {isAr ? 'السعر العادل الموصى به' : 'Recommended Fair Price'}
                  </span>
                  <ShieldCheck size={16} className={styles.iconEmerald} />
                </div>
                <strong className={styles.tierPriceEmerald}>
                  {formatMoney(audit.recommendedFairPrice)}
                </strong>
                <span className={styles.tierSub}>
                  {isAr
                    ? `شامل ${audit.execHours} ساعة تنفيذ + ${oneDecFmt.format(
                        audit.bufferHours
                      )} ساعة اجتماعات وتعديلات وتغطية الأدوات`
                    : `Includes ${audit.execHours}h execution + ${oneDecFmt.format(
                        audit.bufferHours
                      )}h revisions buffer & tools`}
                </span>
              </div>

              {/* Tier 3: Premium Value / Enterprise Tier */}
              <div className={styles.tierCardPremium}>
                <span className={styles.tierLabelAmber}>
                  {isAr ? 'باقة القيمة العليا / الشركات' : 'Premium / Enterprise'}
                </span>
                <strong className={styles.tierPriceAmber}>
                  {formatMoney(audit.premiumEnterprisePrice)}
                </strong>
                <span className={styles.tierSub}>
                  {isAr
                    ? 'تشمل أولوية قصوى في التنفيذ، تسليم أسرع، ودعم فني بعد التسليم'
                    : 'Includes priority turnaround, extended revisions & post-launch support'}
                </span>
              </div>
            </div>

            {/* Hourly Rate Benchmark Strip (Market vs Personal Floor vs Effective) */}
            <div className={styles.hourlyComparisonStrip}>
              <div className={styles.hourlyStatBox}>
                <span className={styles.hourlyStatLabel}>
                  {isAr
                    ? 'سعر ساعتك الشخصي (نقطة التعادل)'
                    : 'Your Personal Floor Hourly Rate'}
                </span>
                <strong className={styles.hourlyStatValCyan}>
                  {formatMoney(audit.personalFloorHourlyLocal, 1)}/
                  {isAr ? 'س' : 'hr'}
                </strong>
              </div>

              <div className={styles.hourlyStatBox}>
                <span className={styles.hourlyStatLabel}>
                  {isAr ? 'متوسط سعر الساعة في السوق' : 'Market Benchmark Hourly Rate'}
                </span>
                <strong className={styles.hourlyStatValNeutral}>
                  {formatMoney(audit.marketHourlyLocal, 1)}/{isAr ? 'س' : 'hr'}
                </strong>
              </div>

              <div className={styles.hourlyStatBox}>
                <span className={styles.hourlyStatLabel}>
                  {isAr
                    ? 'سعر الساعة المعتمد في العرض'
                    : 'Effective Proposal Hourly Rate'}
                </span>
                <strong className={styles.hourlyStatValEmerald}>
                  {formatMoney(audit.effectiveHourlyLocal, 1)}/
                  {isAr ? 'س' : 'hr'}
                </strong>
              </div>
            </div>
          </section>

          {/* 2. PROJECT COST ANATOMY BAR */}
          <section className={styles.reportSectionCard}>
            <div className={styles.sectionHeaderRow}>
              <div>
                <h3 className={styles.sectionTitle}>
                  {isAr
                    ? 'تشريح تسعيرة المشروع (كيف تكوّن السعر الموصى به؟)'
                    : 'Project Cost Anatomy (How Your Price Is Built)'}
                </h3>
                <p className={styles.sectionSub}>
                  {isAr
                    ? 'تفصيل شفاف يوضح للعميل ولك كيف يتوزع إجمالي السعر بين التنفيذ، المراجعات، وتكاليف التشغيل.'
                    : 'Transparent breakdown showing execution value, revision buffer, and tools allocation.'}
                </p>
              </div>
              <Briefcase size={18} className={styles.sectionIconTeal} />
            </div>

            <div className={styles.anatomyBarTrack}>
              {audit.execSharePct > 0 && (
                <div
                  className={styles.anatomyFillEmerald}
                  style={{ width: `${audit.execSharePct}%` }}
                />
              )}
              {audit.bufferSharePct > 0 && (
                <div
                  className={styles.anatomyFillCyan}
                  style={{ width: `${audit.bufferSharePct}%` }}
                />
              )}
              {audit.overheadSharePct > 0 && (
                <div
                  className={styles.anatomyFillAmber}
                  style={{ width: `${audit.overheadSharePct}%` }}
                />
              )}
            </div>

            <div className={styles.anatomyLegendGrid}>
              <div className={styles.anatomyLegendBox}>
                <div className={styles.legendTitleRow}>
                  <span className={styles.dotEmerald} />
                  <span>
                    {isAr ? 'التنفيذ المباشر' : 'Direct Execution'} (
                    {audit.execHours}h)
                  </span>
                </div>
                <strong>{formatMoney(audit.directExecutionValue)}</strong>
              </div>

              <div className={styles.anatomyLegendBox}>
                <div className={styles.legendTitleRow}>
                  <span className={styles.dotCyan} />
                  <span>
                    {isAr ? 'الاجتماعات والتعديلات' : 'Revisions & Meetings'} (
                    {oneDecFmt.format(audit.bufferHours)}h)
                  </span>
                </div>
                <strong>{formatMoney(audit.revisionAndScopeValue)}</strong>
              </div>

              <div className={styles.anatomyLegendBox}>
                <div className={styles.legendTitleRow}>
                  <span className={styles.dotAmber} />
                  <span>
                    {isAr ? 'تغطية البرامج والتشغيل' : 'Tools & Overhead Share'}
                  </span>
                </div>
                <strong>{formatMoney(audit.overheadAndToolsAllocation)}</strong>
              </div>
            </div>
          </section>

          {/* 3. RECOMMENDED PAYMENT MILESTONES SCHEDULE */}
          <section className={styles.reportSectionCard}>
            <div className={styles.sectionHeaderRow}>
              <div>
                <h3 className={styles.sectionTitle}>
                  {isAr
                    ? 'جدول الدفعات التعاقدية المقترح لحماية حقوقك'
                    : 'Recommended Contract Payment Milestones'}
                </h3>
                <p className={styles.sectionSub}>
                  {isAr
                    ? 'لا تبدأ أي مشروع بدون دفعة مقدمة؛ هذا الجدول يحمي وقتك ويضمن التزام العميل.'
                    : 'Never start without an upfront deposit; this milestone schedule protects your cash flow.'}
                </p>
              </div>
              <FileText size={18} className={styles.sectionIconTeal} />
            </div>

            <div className={styles.milestonesList}>
              {audit.milestones.map((m, idx) => (
                <div key={idx} className={styles.milestoneRow}>
                  <div className={styles.milestoneLeft}>
                    <span className={styles.milestoneIndex}>0{idx + 1}</span>
                    <div className={styles.milestoneTextCol}>
                      <strong>{isAr ? m.titleAr : m.titleEn}</strong>
                      <small>
                        {m.pct}%{' '}
                        {isAr
                          ? 'من إجمالي قيمة العقد الموصى به'
                          : 'of total recommended contract'}
                      </small>
                    </div>
                  </div>
                  <strong className={styles.milestoneAmountVal}>
                    {formatMoney(m.amount)}
                  </strong>
                </div>
              ))}
            </div>

            <p className={styles.negotiationTipBox}>
              <Zap size={15} className={styles.tipIcon} />
              <span>
                {isAr
                  ? `نصيحة تفاوضية: قدم للعميل الباقات الثلاث معاً؛ وجود باقة القيمة العليا (${formatMoney(
                      audit.premiumEnterprisePrice
                    )}) يجعل السعر الموصى به (${formatMoney(
                      audit.recommendedFairPrice
                    )}) يبدو الخيار الأكثر توازناً ومنطقية.`
                  : `Negotiation Tip: Always present all 3 tiers together. Anchoring with the Enterprise tier (${formatMoney(
                      audit.premiumEnterprisePrice
                    )}) makes your Recommended Price (${formatMoney(
                      audit.recommendedFairPrice
                    )}) the natural, high-value choice.`}
              </span>
            </p>
          </section>

          {/* 4. ACTION FOOTER BAR */}
          <div className={styles.actionFooterBar}>
            <button
              type="button"
              onClick={handleCopyProposal}
              className={styles.copyReportBtn}
            >
              {copiedProposal ? (
                <>
                  <Check size={16} aria-hidden="true" />
                  <span>
                    {isAr
                      ? 'تم نسخ مسودة عرض السعر بنجاح'
                      : 'Client Proposal Copied'}
                  </span>
                </>
              ) : (
                <>
                  <Copy size={16} aria-hidden="true" />
                  <span>
                    {isAr
                      ? 'نسخ مسودة عرض السعر وجدول الدفعات'
                      : 'Copy Client Proposal & Payment Schedule'}
                  </span>
                </>
              )}
            </button>

            <Link
              href={`/${locale}/tools/real-salary-calculator`}
              className={styles.crossToolLinkBtn}
            >
              <span>
                {isAr
                  ? 'احسب صافي دخلك الحقيقي بعد مصاريف المعيشة ↖'
                  : 'Calculate Your Net Disposable Income ↗'}
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FreelancePriceChecker;
