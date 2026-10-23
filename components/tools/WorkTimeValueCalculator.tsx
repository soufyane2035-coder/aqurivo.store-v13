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
import { WorkTimeValueLogo } from './WorkTimeValueLogo';
import styles from './WorkTimeValueCalculator.module.css';

export interface WorkTimeValueCalculatorProps {
  locale: 'ar' | 'en';
  initialPrice?: number;
}

type ChronoMode = 'true_wage' | 'time_roi' | 'smart_alt';

type VerdictTier =
  | 'time_multiplier'
  | 'light_effort'
  | 'balanced_effort'
  | 'heavy_sacrifice'
  | 'life_drain';

type CurrencyCode = 'USD' | 'SAR' | 'AED' | 'MAD' | 'EGP' | 'EUR';

interface CurrencyMeta {
  code: CurrencyCode;
  symbol: string;
  rateFromUsd: number;
  defaultSalary: number;
  defaultPrice: number;
  defaultExpenses: number;
}

const CURRENCIES: Record<CurrencyCode, CurrencyMeta> = {
  USD: {
    code: 'USD',
    symbol: '$',
    rateFromUsd: 1,
    defaultSalary: 2400,
    defaultPrice: 320,
    defaultExpenses: 220,
  },
  SAR: {
    code: 'SAR',
    symbol: 'SAR',
    rateFromUsd: 3.75,
    defaultSalary: 9000,
    defaultPrice: 1200,
    defaultExpenses: 850,
  },
  AED: {
    code: 'AED',
    symbol: 'AED',
    rateFromUsd: 3.67,
    defaultSalary: 11000,
    defaultPrice: 1180,
    defaultExpenses: 950,
  },
  MAD: {
    code: 'MAD',
    symbol: 'MAD',
    rateFromUsd: 10,
    defaultSalary: 9500,
    defaultPrice: 1800,
    defaultExpenses: 900,
  },
  EGP: {
    code: 'EGP',
    symbol: 'EGP',
    rateFromUsd: 49,
    defaultSalary: 22000,
    defaultPrice: 4500,
    defaultExpenses: 2200,
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    rateFromUsd: 0.92,
    defaultSalary: 2300,
    defaultPrice: 300,
    defaultExpenses: 200,
  },
};

const DAILY_HOURS_PILLS = [6, 7, 8, 9, 10, 12];
const WEEKLY_DAYS_PILLS = [4, 5, 6];
const COMMUTE_HOURS_PILLS = [0, 0.5, 1, 1.5, 2, 3];
const MINUTES_SAVED_PILLS = [0, 15, 30, 45, 60, 90, 120];
const USAGE_YEARS_PILLS = [1, 2, 3, 4, 5];

export function WorkTimeValueCalculator({
  locale,
  initialPrice,
}: WorkTimeValueCalculatorProps) {
  const isAr = locale === 'ar';

  // Store Viewed Ribbon + Smart Bilingual/Typo-Tolerant Search
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

  // Currency & Mode State
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [mode, setMode] = useState<ChronoMode>('true_wage');

  // Core Work & Product Inputs
  const [salaryInput, setSalaryInput] = useState<string>('2400');
  const [dailyHoursInput, setDailyHoursInput] = useState<string>('8');
  const [weeklyDaysInput, setWeeklyDaysInput] = useState<string>('5');
  const [itemPriceInput, setItemPriceInput] = useState<string>(
    initialPrice && initialPrice > 0 ? String(initialPrice) : '320'
  );

  // Mode 1: Real Hourly Wage (Job Friction: Commute & Work Expenses)
  const [commuteHoursInput, setCommuteHoursInput] = useState<string>('1.5');
  const [workExpensesInput, setWorkExpensesInput] = useState<string>('220');

  // Mode 2: Time-Back / Productivity ROI
  const [minutesSavedInput, setMinutesSavedInput] = useState<string>('30');
  const [usageYearsInput, setUsageYearsInput] = useState<string>('3');

  // Mode 3: Smart Alternative Comparison
  const [altPriceInput, setAltPriceInput] = useState<string>(
    initialPrice && initialPrice > 0
      ? String(Math.round(initialPrice * 0.65))
      : '210'
  );

  // Interactive Workday Cell Inspection
  const [inspectedDay, setInspectedDay] = useState<number | null>(null);

  const curMeta = CURRENCIES[currency];

  // Strictly Western numerals ('en-US')
  const numberFmt = useMemo(
    () =>
      new Intl.NumberFormat('en-US', {
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

  const intFmt = useMemo(
    () =>
      new Intl.NumberFormat('en-US', {
        maximumFractionDigits: 0,
      }),
    []
  );

  const formatMoney = (val: number, decimals = 0) => {
    const safe = Number.isFinite(val) ? val : 0;
    const formatted =
      decimals > 0 ? twoDecFmt.format(safe) : intFmt.format(Math.round(safe));
    if (currency === 'USD' || currency === 'EUR') {
      return `${curMeta.symbol}${formatted}`;
    }
    return `${formatted} ${curMeta.symbol}`;
  };

  const handleCurrencyChange = (nextCode: CurrencyCode) => {
    if (nextCode === currency) return;
    const prevRate = CURRENCIES[currency].rateFromUsd;
    const nextRate = CURRENCIES[nextCode].rateFromUsd;
    const ratio = nextRate / prevRate;

    const convertStr = (raw: string, fallback: number) => {
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0) return String(fallback);
      if (n === 0) return '0';
      return String(Math.max(1, Math.round(n * ratio)));
    };

    setSalaryInput(convertStr(salaryInput, CURRENCIES[nextCode].defaultSalary));
    setItemPriceInput(convertStr(itemPriceInput, CURRENCIES[nextCode].defaultPrice));
    setWorkExpensesInput(
      convertStr(workExpensesInput, CURRENCIES[nextCode].defaultExpenses)
    );
    setAltPriceInput(
      convertStr(
        altPriceInput,
        Math.round(CURRENCIES[nextCode].defaultPrice * 0.65)
      )
    );
    setCurrency(nextCode);
  };

  // Load browser-viewed products on mount & listen for updates
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

  // Preload store catalog in background for instant smart search
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

  // Focus search input when drawer opens
  useEffect(() => {
    if (isSearchOpen) {
      const timer = window.setTimeout(() => {
        searchInputRef.current?.focus();
      }, 40);
      return () => window.clearTimeout(timer);
    }
  }, [isSearchOpen]);

  // Smart search filtering
  const displayedProducts = useMemo(() => {
    const trimmed = searchQuery.trim();
    if (!isSearchOpen && !trimmed) {
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
  }, [isSearchOpen, searchQuery, viewedProducts, catalogProducts]);

  // Desktop mouse drag + wheel horizontal scroll handlers
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

  const applyViewedProduct = (
    item: BrowserProductSnapshot,
    fromSearch = false
  ) => {
    setSelectedViewedProduct(item);
    const convertedPrice = Math.max(
      1,
      Math.round(item.priceUsd * curMeta.rateFromUsd)
    );
    setItemPriceInput(String(convertedPrice));
    setAltPriceInput(String(Math.max(1, Math.round(convertedPrice * 0.7))));

    if (fromSearch) {
      const updated = recordBrowserProductView(item);
      setViewedProducts(updated);
    }
  };

  // Comprehensive Chrono-Value Analysis Engine
  const analysis = useMemo(() => {
    const salary = Number(salaryInput);
    const dailyHours = Number(dailyHoursInput);
    const weeklyDays = Number(weeklyDaysInput);
    const itemPrice = Number(itemPriceInput);
    const commuteHours = Math.max(0, Number(commuteHoursInput) || 0);
    const workExpenses = Math.max(0, Number(workExpensesInput) || 0);
    const minutesSavedPerDay = Math.max(0, Number(minutesSavedInput) || 0);
    const usageYears = Math.max(0.5, Math.min(15, Number(usageYearsInput) || 1));
    const altPrice = Math.max(0, Number(altPriceInput) || 0);

    const isInvalid =
      !Number.isFinite(salary) ||
      !Number.isFinite(dailyHours) ||
      !Number.isFinite(weeklyDays) ||
      !Number.isFinite(itemPrice) ||
      salary < 0 ||
      dailyHours <= 0 ||
      dailyHours > 24 ||
      weeklyDays <= 0 ||
      weeklyDays > 7 ||
      itemPrice < 0;

    if (isInvalid) {
      return {
        isInvalid: true,
        salary: 0,
        dailyHours: 8,
        weeklyDays: 5,
        itemPrice: 0,
        commuteHours: 0,
        workExpenses: 0,
        nominalMonthlyHours: 1,
        trueMonthlyHours: 1,
        nominalHourlyWage: 0,
        trueHourlyWage: 0,
        wageErosionPct: 0,
        nominalHoursNeeded: 0,
        trueHoursNeeded: 0,
        hiddenFrictionHours: 0,
        nominalDaysNeeded: 0,
        trueDaysNeeded: 0,
        workWeeksNeeded: 0,
        salarySharePct: 0,
        netDisposableSalary: 0,
        disposableSharePct: 0,
        minutesSavedPerDay: 0,
        usageYears: 1,
        lifetimeHoursSaved: 0,
        netLifeHoursDelta: 0,
        breakEvenDays: null as number | null,
        savedTimeMonetaryValue: 0,
        altPrice: 0,
        altHoursSaved: 0,
        altDaysSaved: 0,
        altMoneySaved: 0,
        monthlyWorkDaysCount: 22,
        calendarCells: [] as Array<{
          day: number;
          status: 'item_cost' | 'split' | 'free_income';
          hoursForItem: number;
          cumulativeCost: number;
        }>,
        freedomScore: 50,
        verdictTier: 'balanced_effort' as VerdictTier,
      };
    }

    const weeksPerMonth = 4.3333;
    const monthlyWorkDaysCount = Math.max(4, Math.round(weeklyDays * weeksPerMonth));
    const nominalMonthlyHours = dailyHours * weeklyDays * weeksPerMonth;
    const totalDailyCommittedHours = Math.min(24, dailyHours + commuteHours);
    const trueMonthlyHours = totalDailyCommittedHours * weeklyDays * weeksPerMonth;

    const effectiveExpenses = salary > 0 ? Math.min(workExpenses, Math.max(0, salary - 1)) : 0;
    const netDisposableSalary = salary > 0 ? Math.max(1, salary - effectiveExpenses) : 0;

    const nominalHourlyWage = salary > 0 ? salary / nominalMonthlyHours : 0;
    const trueHourlyWage = netDisposableSalary > 0 ? netDisposableSalary / trueMonthlyHours : 0;

    const wageErosionPct =
      nominalHourlyWage > 0
        ? Math.max(
            0,
            ((nominalHourlyWage - trueHourlyWage) / nominalHourlyWage) * 100
          )
        : 0;

    // Hours & Days needed (Nominal vs True Life-Energy)
    const nominalHoursNeeded =
      nominalHourlyWage > 0 ? itemPrice / nominalHourlyWage : 0;
    const trueHoursNeeded =
      trueHourlyWage > 0 ? itemPrice / trueHourlyWage : 0;
    const hiddenFrictionHours = Math.max(0, trueHoursNeeded - nominalHoursNeeded);

    const nominalDaysNeeded = nominalHoursNeeded / dailyHours;
    // How many actual workdays of net take-home pay it consumes:
    const netEarnedPerWorkday =
      netDisposableSalary > 0 ? netDisposableSalary / monthlyWorkDaysCount : 0;
    const trueDaysNeeded =
      netEarnedPerWorkday > 0 ? itemPrice / netEarnedPerWorkday : 0;
    const workWeeksNeeded = trueDaysNeeded / weeklyDays;

    const salarySharePct = salary > 0 ? (itemPrice / salary) * 100 : 0;
    const disposableSharePct =
      netDisposableSalary > 0 ? (itemPrice / netDisposableSalary) * 100 : 0;

    // Mode 2: Time-Back / Productivity ROI
    const lifetimeHoursSaved = (minutesSavedPerDay * 365 * usageYears) / 60;
    const netLifeHoursDelta = lifetimeHoursSaved - trueHoursNeeded;
    const breakEvenDays =
      minutesSavedPerDay > 0
        ? Math.ceil((trueHoursNeeded * 60) / minutesSavedPerDay)
        : null;
    const savedTimeMonetaryValue = lifetimeHoursSaved * trueHourlyWage;

    // Mode 3: Smart Alternative Comparison
    const altMoneySaved = Math.max(0, itemPrice - altPrice);
    const altHoursSaved = trueHourlyWage > 0 ? altMoneySaved / trueHourlyWage : 0;
    const altDaysSaved =
      netEarnedPerWorkday > 0 ? altMoneySaved / netEarnedPerWorkday : 0;

    // Interactive Work-Month Calendar Grid (up to 30 cells representing the work month)
    const gridCount = Math.min(31, Math.max(12, monthlyWorkDaysCount));
    const fullItemDays = Math.floor(trueDaysNeeded);
    const partialFraction = trueDaysNeeded - fullItemDays;

    const calendarCells = Array.from({ length: gridCount }, (_, idx) => {
      const day = idx + 1;
      let status: 'item_cost' | 'split' | 'free_income' = 'free_income';
      let hoursForItem = 0;

      if (day <= fullItemDays) {
        status = 'item_cost';
        hoursForItem = totalDailyCommittedHours;
      } else if (day === fullItemDays + 1 && partialFraction > 0.04) {
        status = 'split';
        hoursForItem = totalDailyCommittedHours * partialFraction;
      } else {
        status = 'free_income';
        hoursForItem = 0;
      }

      const cumulativeCost = Math.min(itemPrice, day * netEarnedPerWorkday);
      return {
        day,
        status,
        hoursForItem,
        cumulativeCost,
      };
    });

    // Freedom & Chrono Score (0-100) + Verdict Tier
    let freedomScore = Math.round(100 - Math.min(95, disposableSharePct * 1.45));
    if (mode === 'time_roi' && minutesSavedPerDay > 0 && netLifeHoursDelta > 0) {
      freedomScore = Math.min(
        99,
        Math.max(freedomScore, Math.round(78 + Math.min(21, netLifeHoursDelta / 8)))
      );
    }
    freedomScore = Math.max(5, Math.min(99, freedomScore));

    let verdictTier: VerdictTier = 'balanced_effort';
    if (mode === 'time_roi' && minutesSavedPerDay >= 10 && netLifeHoursDelta > 0) {
      verdictTier = 'time_multiplier';
    } else if (disposableSharePct <= 8) {
      verdictTier = 'light_effort';
    } else if (disposableSharePct <= 22) {
      verdictTier = 'balanced_effort';
    } else if (disposableSharePct <= 50) {
      verdictTier = 'heavy_sacrifice';
    } else {
      verdictTier = 'life_drain';
    }

    return {
      isInvalid: false,
      salary,
      dailyHours,
      weeklyDays,
      itemPrice,
      commuteHours,
      workExpenses,
      nominalMonthlyHours,
      trueMonthlyHours,
      nominalHourlyWage,
      trueHourlyWage,
      wageErosionPct,
      nominalHoursNeeded,
      trueHoursNeeded,
      hiddenFrictionHours,
      nominalDaysNeeded,
      trueDaysNeeded,
      workWeeksNeeded,
      salarySharePct,
      netDisposableSalary,
      disposableSharePct,
      minutesSavedPerDay,
      usageYears,
      lifetimeHoursSaved,
      netLifeHoursDelta,
      breakEvenDays,
      savedTimeMonetaryValue,
      altPrice,
      altHoursSaved,
      altDaysSaved,
      altMoneySaved,
      monthlyWorkDaysCount,
      calendarCells,
      freedomScore,
      verdictTier,
    };
  }, [
    salaryInput,
    dailyHoursInput,
    weeklyDaysInput,
    itemPriceInput,
    commuteHoursInput,
    workExpensesInput,
    minutesSavedInput,
    usageYearsInput,
    altPriceInput,
    mode,
  ]);

  const verdictMeta = useMemo(() => {
    switch (analysis.verdictTier) {
      case 'time_multiplier':
        return {
          badgeAr: 'استثمار يشتري لك الوقت • رابح زمنياً',
          badgeEn: 'TIME-MULTIPLIER ASSET • POSITIVE ROI',
          headlineAr: `هذا المنتج لا يستهلك وقتك بل يمنحك +${intFmt.format(
            Math.max(1, Math.round(analysis.netLifeHoursDelta))
          )} ساعة حرة صافية!`,
          headlineEn: `This item doesn't just cost time — it returns +${intFmt.format(
            Math.max(1, Math.round(analysis.netLifeHoursDelta))
          )} net free hours to your life!`,
          summaryAr:
            analysis.breakEvenDays !== null
              ? `رغم أنه يكلفك ${numberFmt.format(
                  analysis.trueHoursNeeded
                )} ساعة عمل حقيقية لشرائه، إلا أنه يسترد كامل تكلفته الزمنية خلال ${
                  analysis.breakEvenDays
                } يوماً فقط، ثم يوفر لك ما يعادل ${formatMoney(
                  analysis.savedTimeMonetaryValue
                )} من وقتك!`
              : '',
          summaryEn:
            analysis.breakEvenDays !== null
              ? `Although it costs ${numberFmt.format(
                  analysis.trueHoursNeeded
                )} real work hours upfront, it reaches time break-even in just ${
                  analysis.breakEvenDays
                } days and generates ${formatMoney(
                  analysis.savedTimeMonetaryValue
                )} worth of reclaimed time!`
              : '',
          toneClass: styles.verdictTeal,
        };
      case 'light_effort':
        return {
          badgeAr: 'تكلفة زمنية خفيفة • قرار مريح',
          badgeEn: 'LIGHT WORKLOAD FOOTPRINT • EASY BUY',
          headlineAr: `يعادل ${numberFmt.format(
            analysis.trueDaysNeeded
          )} يوم عمل فقط — لا يرهق ميزانية شهرك أو وقتك`,
          headlineEn: `Equals just ${numberFmt.format(
            analysis.trueDaysNeeded
          )} workdays — light impact on your month & freedom`,
          summaryAr: `هذا المنتج يقتطع ${numberFmt.format(
            analysis.disposableSharePct
          )}% فقط من صافي دخلك الحقيقي (${numberFmt.format(
            analysis.trueHoursNeeded
          )} ساعة عمل فعلية شاملة المواصلات)، مما يترك أغلب أيام شهرك حرة لك.`,
          summaryEn: `Consumes only ${numberFmt.format(
            analysis.disposableSharePct
          )}% of your net take-home pay (${numberFmt.format(
            analysis.trueHoursNeeded
          )} real hours including commute), leaving almost your entire month untouched.`,
          toneClass: styles.verdictTeal,
        };
      case 'balanced_effort':
        return {
          badgeAr: 'جهد مهني متوازن • يحتاج وعياً بالاستخدام',
          badgeEn: 'BALANCED LABOR COST • MINDFUL PURCHASE',
          headlineAr: `أنت تبادل ${numberFmt.format(
            analysis.trueDaysNeeded
          )} أيام كاملة من تعبك ومواصلاتك مقابل هذا المنتج`,
          headlineEn: `You are trading ${numberFmt.format(
            analysis.trueDaysNeeded
          )} full workdays of effort & commute for this item`,
          summaryAr: `على الورق يبدو أنه يكلف ${numberFmt.format(
            analysis.nominalHoursNeeded
          )} ساعة، لكن بعد حساب المواصلات ومصاريف العمل فهو يكلفك فعلياً ${numberFmt.format(
            analysis.trueHoursNeeded
          )} ساعة من حياتك. يستحق الشراء إذا كان يخدمك يومياً.`,
          summaryEn: `On paper it looks like ${numberFmt.format(
            analysis.nominalHoursNeeded
          )} hrs, but after commute and job expenses it truly costs ${numberFmt.format(
            analysis.trueHoursNeeded
          )} hrs of life energy. Worth it if used frequently.`,
          toneClass: styles.verdictBalanced,
        };
      case 'heavy_sacrifice':
        return {
          badgeAr: 'تنبيه: يلتهم حصة كبيرة من تعب شهرك',
          badgeEn: 'WARNING: HEAVY MONTHLY LABOR SACRIFICE',
          headlineAr: `سيتعيّن عليك الدوام لمدة ${numberFmt.format(
            analysis.trueDaysNeeded
          )} يوم عمل كامل حصرياً لسداد ثمنه!`,
          headlineEn: `You must work ${numberFmt.format(
            analysis.trueDaysNeeded
          )} full workdays exclusively to pay for this purchase!`,
          summaryAr: `هذا المنتج يستحوذ على ${numberFmt.format(
            analysis.disposableSharePct
          )}% من صافي راتبك الحر (${numberFmt.format(
            analysis.trueHoursNeeded
          )} ساعة حياة فعلية). طبّق قاعدة التريث 72 ساعة أو ابحث عن بديل يوفّر عليك أيام عملك.`,
          summaryEn: `Captures ${numberFmt.format(
            analysis.disposableSharePct
          )}% of your net disposable monthly pay (${numberFmt.format(
            analysis.trueHoursNeeded
          )} real life hours). Apply a 72-hour cooling rule or inspect a value alternative.`,
          toneClass: styles.verdictAmber,
        };
      case 'life_drain':
      default:
        return {
          badgeAr: 'تحذير: استنزاف زمني ومالي مرتفع جداً',
          badgeEn: 'ALERT: SEVERE WORK-TIME DRAIN',
          headlineAr: `يقتطع أكثر من نصف شهر عملك (${numberFmt.format(
            analysis.trueDaysNeeded
          )} يوم دوام كامل)!`,
          headlineEn: `Consumes over half a month of labor (${numberFmt.format(
            analysis.trueDaysNeeded
          )} full workdays)!`,
          summaryAr: `أنت تمنح هذا المنتج ${numberFmt.format(
            analysis.trueHoursNeeded
          )} ساعة من عمرك المهني (${numberFmt.format(
            analysis.disposableSharePct
          )}% من صافي راتبك الشهري). لا تقدم على هذه الخطوة إلا إذا كان أداة عمل تدرّ عليك دخلاً مباشراً.`,
          summaryEn: `You are trading ${numberFmt.format(
            analysis.trueHoursNeeded
          )} hours of your career (${numberFmt.format(
            analysis.disposableSharePct
          )}% of net monthly pay). Avoid unless this is an essential income-generating asset.`,
          toneClass: styles.verdictCrimson,
        };
    }
  }, [
    analysis.verdictTier,
    analysis.netLifeHoursDelta,
    analysis.trueHoursNeeded,
    analysis.breakEvenDays,
    analysis.savedTimeMonetaryValue,
    analysis.trueDaysNeeded,
    analysis.disposableSharePct,
    analysis.nominalHoursNeeded,
    intFmt,
    numberFmt,
    currency,
  ]);

  const activeCalendarCell = useMemo(() => {
    if (!analysis.calendarCells.length) return null;
    if (inspectedDay !== null) {
      return (
        analysis.calendarCells.find((c) => c.day === inspectedDay) ||
        analysis.calendarCells[0]
      );
    }
    const splitOrLastItem =
      analysis.calendarCells.find((c) => c.status === 'split') ||
      [...analysis.calendarCells]
        .reverse()
        .find((c) => c.status === 'item_cost') ||
      analysis.calendarCells[0];
    return splitOrLastItem;
  }, [analysis.calendarCells, inspectedDay]);

  const usdEquivalentPrice = Math.max(
    1,
    Math.round(analysis.itemPrice / curMeta.rateFromUsd)
  );

  return (
    <div className={styles.chronoLabWrapper} dir={isAr ? 'rtl' : 'ltr'}>
      {/* 1. ARCHITECTURAL STORE DOCK (Sleek Horizontal Telemetry Ribbon + Smart Search) */}
      <div className={styles.storeViewedBar}>
        <div className={styles.storeViewedHeader}>
          <div className={styles.storeViewedLabelWrap}>
            <span className={styles.telemetryDiamond} aria-hidden="true">
              ◆
            </span>
            <span className={styles.storeViewedLabel}>
              {viewedProducts.length > 0
                ? isAr
                  ? 'افحص منتجاً شاهدته بوقت عملك بنقرة:'
                  : '1-Click Store Work-Time Check:'
                : isAr
                  ? 'ابحث في منتجات المتجر لفحص تكلفتها بوقت عملك:'
                  : 'Search store products to inspect cost in work hours:'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              setIsSearchOpen((prev) => {
                const next = !prev;
                if (!next) setSearchQuery('');
                return next;
              });
            }}
            aria-expanded={isSearchOpen}
            aria-label={isAr ? 'بحث في منتجات المتجر' : 'Search store products'}
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
              {isAr ? 'بحث' : 'Search'}
            </span>
          </button>
        </div>

        {/* Expandable Smart Search Bar */}
        {isSearchOpen && (
          <div className={styles.storeSearchDrawer}>
            <div className={styles.storeSearchInputBox}>
              <Search className={styles.storeSearchFieldIcon} aria-hidden="true" />
              <input
                ref={searchInputRef}
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  isAr
                    ? 'اكتب أي كلمة، أو اختصار (مثل pc)، حتى مع الأخطاء الإملائية...'
                    : 'Type any keyword, synonym (e.g. pc), or partial word...'
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
                  className={styles.storeSearchClearBtn}
                  aria-label={isAr ? 'مسح البحث' : 'Clear search'}
                >
                  <X width={12} height={12} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Horizontal Product Capsule Track */}
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
              isAr
                ? 'منتجات المتجر للفحص الفوري بوقت العمل'
                : 'Store products for instant work-time inspection'
            }
          >
            {displayedProducts.map((item) => {
              const itemTitle = isAr ? item.titleAr : item.titleEn;
              const isSelected = selectedViewedProduct?.slug === item.slug;
              const showThumb = Boolean(
                item.imageUrl && !failedThumbIds[item.slug]
              );
              const displayItemPrice = formatMoney(
                item.priceUsd * curMeta.rateFromUsd
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
                        {displayItemPrice}
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
      </div>

      {/* 2. TOP BAR: 3-MODE CHRONO-VALUE SWITCHER + CURRENCY SELECTOR */}
      <div className={styles.topControlDeck}>
        <div className={styles.modeSwitcherBar} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'true_wage'}
            onClick={() => setMode('true_wage')}
            className={`${styles.modeTabBtn} ${
              mode === 'true_wage' ? styles.modeTabBtnActive : ''
            }`}
          >
            <span className={styles.modeCode}>01</span>
            <div className={styles.modeTabText}>
              <span className={styles.modeTabTitle}>
                {isAr
                  ? 'كاشف الأجر الحقيقي الصافي للساعة'
                  : 'True vs. Illusionary Hourly Wage'}
              </span>
              <span className={styles.modeTabSub}>
                {isAr
                  ? 'حساب أثر المواصلات ومصاريف العمل الخفية'
                  : 'Factor in commute time & job expenses'}
              </span>
            </div>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={mode === 'time_roi'}
            onClick={() => setMode('time_roi')}
            className={`${styles.modeTabBtn} ${
              mode === 'time_roi' ? styles.modeTabBtnActive : ''
            }`}
          >
            <span className={styles.modeCode}>02</span>
            <div className={styles.modeTabText}>
              <span className={styles.modeTabTitle}>
                {isAr
                  ? 'مُعادل استرداد الوقت والإنتاجية'
                  : 'Time-Back & Productivity ROI'}
              </span>
              <span className={styles.modeTabSub}>
                {isAr
                  ? 'هل يشتري لك هذا المنتج وقتاً حراً؟'
                  : 'Does this item save you daily time?'}
              </span>
            </div>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={mode === 'smart_alt'}
            onClick={() => setMode('smart_alt')}
            className={`${styles.modeTabBtn} ${
              mode === 'smart_alt' ? styles.modeTabBtnActive : ''
            }`}
          >
            <span className={styles.modeCode}>03</span>
            <div className={styles.modeTabText}>
              <span className={styles.modeTabTitle}>
                {isAr
                  ? 'اختبار البديل الذكي واسترداد الأيام'
                  : 'Smart Alternative & Freedom Reclaim'}
              </span>
              <span className={styles.modeTabSub}>
                {isAr
                  ? 'كم يوم دوام تسترد عند اختيار بديل أوفر؟'
                  : 'Workdays reclaimed with a smarter option'}
              </span>
            </div>
          </button>
        </div>

        {/* Multi-Currency Bar */}
        <div className={styles.currencyDeck}>
          <span className={styles.currencyDeckLabel}>
            {isAr ? 'عملة الحساب:' : 'Currency:'}
          </span>
          <div className={styles.currencyPills} dir="ltr">
            {(Object.keys(CURRENCIES) as CurrencyCode[]).map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => handleCurrencyChange(code)}
                className={`${styles.currencyPillBtn} ${
                  currency === code ? styles.currencyPillBtnActive : ''
                }`}
              >
                {code}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. MAIN ARCHITECTURAL WORKBENCH GRID */}
      <div className={styles.studioGrid}>
        {/* LEFT / START COLUMN: CALIBRATION INPUTS */}
        <div className={styles.controlsColumn}>
          <section className={styles.panelCard}>
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.panelStep}>
                  {isAr
                    ? 'القسم 01 • معايرة الدخل وسعر المنتج'
                    : 'SECTION 01 • INCOME & ITEM CALIBRATION'}
                </span>
                <h2 className={styles.panelTitle}>
                  {isAr
                    ? 'بيانات راتبك الشهري، جدول دوامك، وسعر المنتج'
                    : 'Your Monthly Income, Work Schedule & Item Price'}
                </h2>
              </div>
              <span className={styles.panelHint}>
                {isAr ? 'حساب لحظي دقيق' : 'Live Chrono Engine'}
              </span>
            </div>

            {/* CONTROL 1: ITEM PRICE */}
            <div className={styles.controlBlock}>
              <div className={styles.controlTopRow}>
                <label htmlFor="wt-price-input" className={styles.controlLabel}>
                  <span>
                    {isAr
                      ? 'سعر المنتج أو الخدمة المراد فحصها'
                      : 'Product or Service Price to Inspect'}
                  </span>
                  <span className={styles.controlSublabel}>
                    {isAr
                      ? 'اختر منتجاً من الشريط أعلاه أو أدخل السعر مباشرة'
                      : 'Pick a store item above or enter any price'}
                  </span>
                </label>

                <div className={styles.numberInputWrap} dir="ltr">
                  <span className={styles.currencySymbol}>{curMeta.symbol}</span>
                  <input
                    id="wt-price-input"
                    type="number"
                    min="0"
                    step="1"
                    value={itemPriceInput}
                    onChange={(e) => {
                      setItemPriceInput(e.target.value);
                      setSelectedViewedProduct(null);
                    }}
                    className={styles.inlineNumberInput}
                  />
                </div>
              </div>

              <input
                type="range"
                min={0}
                max={Math.max(1000, Math.round(4000 * curMeta.rateFromUsd))}
                step={1}
                value={Math.min(
                  Math.max(1000, Math.round(4000 * curMeta.rateFromUsd)),
                  Math.max(
                    0,
                    Number.isFinite(Number(itemPriceInput))
                      ? Number(itemPriceInput)
                      : 0
                  )
                )}
                onChange={(e) => {
                  setItemPriceInput(e.target.value);
                  setSelectedViewedProduct(null);
                }}
                className={styles.rangeSlider}
                aria-label={isAr ? 'مؤشر سعر المنتج' : 'Item price slider'}
              />
            </div>

            <div className={styles.divider} />

            {/* CONTROL 2: MONTHLY SALARY */}
            <div className={styles.controlBlock}>
              <div className={styles.controlTopRow}>
                <label htmlFor="wt-salary-input" className={styles.controlLabel}>
                  <span>
                    {isAr
                      ? 'دخلك أو راتبك الشهري'
                      : 'Your Monthly Salary / Income'}
                  </span>
                  <span className={styles.controlSublabel}>
                    {isAr
                      ? 'المبلغ الشهري الذي تستلمه من عملك أو نشاطك المهني'
                      : 'Your regular monthly take-home pay or earnings'}
                  </span>
                </label>

                <div className={styles.numberInputWrap} dir="ltr">
                  <span className={styles.currencySymbol}>{curMeta.symbol}</span>
                  <input
                    id="wt-salary-input"
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
                max={Math.max(5000, Math.round(15000 * curMeta.rateFromUsd))}
                step={1}
                value={Math.min(
                  Math.max(5000, Math.round(15000 * curMeta.rateFromUsd)),
                  Math.max(
                    0,
                    Number.isFinite(Number(salaryInput))
                      ? Number(salaryInput)
                      : 0
                  )
                )}
                onChange={(e) => setSalaryInput(e.target.value)}
                className={styles.rangeSlider}
                aria-label={isAr ? 'مؤشر الراتب الشهري' : 'Monthly salary slider'}
              />
            </div>

            <div className={styles.divider} />

            {/* CONTROL 3: DAILY WORK HOURS & WEEKLY WORK DAYS */}
            <div className={styles.dualSubGrid}>
              <div className={styles.subFieldBlock}>
                <label htmlFor="wt-daily-input" className={styles.subFieldLabel}>
                  <span>
                    {isAr ? 'ساعات الدوام اليومية' : 'Official Daily Work Hours'}
                  </span>
                  <span className={styles.subFieldHint}>
                    {isAr ? 'ساعات العمل الرسمية يومياً' : 'Scheduled hours per day'}
                  </span>
                </label>
                <div className={styles.numberInputWrapFull} dir="ltr">
                  <input
                    id="wt-daily-input"
                    type="number"
                    min="1"
                    max="24"
                    step="0.5"
                    value={dailyHoursInput}
                    onChange={(e) => setDailyHoursInput(e.target.value)}
                    className={styles.inlineNumberInputFull}
                  />
                  <span className={styles.unitSuffix}>
                    {isAr ? 'ساعة/يوم' : 'hrs/d'}
                  </span>
                </div>
                <div className={styles.miniPillsRow} dir="ltr">
                  {DAILY_HOURS_PILLS.map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setDailyHoursInput(String(h))}
                      className={`${styles.miniPillBtn} ${
                        Number(dailyHoursInput) === h
                          ? styles.miniPillBtnActiveTeal
                          : ''
                      }`}
                    >
                      {h}h
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.subFieldBlock}>
                <label htmlFor="wt-days-input" className={styles.subFieldLabel}>
                  <span>
                    {isAr ? 'أيام العمل في الأسبوع' : 'Work Days per Week'}
                  </span>
                  <span className={styles.subFieldHint}>
                    {isAr
                      ? `يعادل تقريباً ${analysis.monthlyWorkDaysCount} يوم عمل شهرياً`
                      : `Approx. ${analysis.monthlyWorkDaysCount} workdays/month`}
                  </span>
                </label>
                <div className={styles.numberInputWrapFull} dir="ltr">
                  <input
                    id="wt-days-input"
                    type="number"
                    min="1"
                    max="7"
                    step="1"
                    value={weeklyDaysInput}
                    onChange={(e) => setWeeklyDaysInput(e.target.value)}
                    className={styles.inlineNumberInputFull}
                  />
                  <span className={styles.unitSuffix}>
                    {isAr ? 'أيام/أسبوع' : 'days/wk'}
                  </span>
                </div>
                <div className={styles.miniPillsRow} dir="ltr">
                  {WEEKLY_DAYS_PILLS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setWeeklyDaysInput(String(d))}
                      className={`${styles.miniPillBtn} ${
                        Number(weeklyDaysInput) === d
                          ? styles.miniPillBtnActiveTeal
                          : ''
                      }`}
                    >
                      {d} {isAr ? 'أيام' : 'days'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* DYNAMIC SECOND CARD BASED ON ACTIVE CHRONO MODE */}
          {mode === 'true_wage' && (
            <section className={styles.panelCardGold}>
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.panelStepGold}>
                    {isAr
                      ? 'القسم 02 • استنزاف الوظيفة غير المرئي (الأجر الحقيقي)'
                      : 'SECTION 02 • HIDDEN JOB FRICTION (REAL HOURLY WAGE)'}
                  </span>
                  <h3 className={styles.panelTitle}>
                    {isAr
                      ? 'وقت المواصلات اليومي ومصاريف الذهاب للعمل'
                      : 'Daily Commute Time & Work-Related Expenses'}
                  </h3>
                </div>
              </div>

              <div className={styles.dualSubGrid}>
                <div className={styles.subFieldBlock}>
                  <label htmlFor="wt-commute-input" className={styles.subFieldLabel}>
                    <span>
                      {isAr
                        ? 'وقت المواصلات والتجهيز يومياً (ذهاب وإياب)'
                        : 'Daily Commute & Prep Time (Round-Trip)'}
                    </span>
                    <span className={styles.subFieldHint}>
                      {isAr
                        ? 'وقت مقتطع من يومك لأجل الوظيفة بدون أجر'
                        : 'Unpaid hours spent commuting & preparing'}
                    </span>
                  </label>
                  <div className={styles.numberInputWrapFull} dir="ltr">
                    <input
                      id="wt-commute-input"
                      type="number"
                      min="0"
                      max="10"
                      step="0.5"
                      value={commuteHoursInput}
                      onChange={(e) => setCommuteHoursInput(e.target.value)}
                      className={styles.inlineNumberInputFull}
                    />
                    <span className={styles.unitSuffix}>
                      {isAr ? 'ساعة/يوم' : 'hrs/d'}
                    </span>
                  </div>
                  <div className={styles.miniPillsRow} dir="ltr">
                    {COMMUTE_HOURS_PILLS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCommuteHoursInput(String(c))}
                        className={`${styles.miniPillBtn} ${
                          Number(commuteHoursInput) === c
                            ? styles.miniPillBtnActive
                            : ''
                        }`}
                      >
                        {c === 0 ? (isAr ? 'عن بُعد (0)' : 'Remote (0)') : `${c}h`}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles.subFieldBlock}>
                  <label htmlFor="wt-expenses-input" className={styles.subFieldLabel}>
                    <span>
                      {isAr
                        ? 'مصاريف العمل الشهرية (وقود، مواصلات، قهوة/غداء)'
                        : 'Monthly Job Expenses (Fuel, Transit, Work Meals)'}
                    </span>
                    <span className={styles.subFieldHint}>
                      {isAr
                        ? 'أموال تنفقها شهرياً فقط لأنك تذهب للعمل'
                        : 'Money spent monthly just to perform your job'}
                    </span>
                  </label>
                  <div className={styles.numberInputWrapFull} dir="ltr">
                    <span className={styles.currencySymbol}>{curMeta.symbol}</span>
                    <input
                      id="wt-expenses-input"
                      type="number"
                      min="0"
                      step="10"
                      value={workExpensesInput}
                      onChange={(e) => setWorkExpensesInput(e.target.value)}
                      className={styles.inlineNumberInputFull}
                    />
                  </div>
                </div>
              </div>
            </section>
          )}

          {mode === 'time_roi' && (
            <section className={styles.panelCardTeal}>
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.panelStep}>
                    {isAr
                      ? 'القسم 02 • مُعادل استرداد الوقت والإنتاجية'
                      : 'SECTION 02 • TIME-BACK & PRODUCTIVITY OFFSET'}
                  </span>
                  <h3 className={styles.panelTitle}>
                    {isAr
                      ? 'كم دقيقة يوفر عليك هذا المنتج يومياً؟ (مثل حاسوب أسرع أو أداة ذكية)'
                      : 'How Many Minutes Does This Item Save You Per Day?'}
                  </h3>
                </div>
              </div>

              <div className={styles.dualSubGrid}>
                <div className={styles.subFieldBlock}>
                  <label htmlFor="wt-saved-mins" className={styles.subFieldLabel}>
                    <span>
                      {isAr
                        ? 'الوقت الذي يوفره لك المنتج يومياً (بالدقائق)'
                        : 'Daily Time Saved by This Product (Minutes)'}
                    </span>
                    <span className={styles.subFieldHint}>
                      {isAr
                        ? 'تسريع العمل، اختصار مشاوير، أو أتمتة مهام'
                        : 'Faster workflow, avoided errands, or automation'}
                    </span>
                  </label>
                  <div className={styles.numberInputWrapFull} dir="ltr">
                    <input
                      id="wt-saved-mins"
                      type="number"
                      min="0"
                      max="480"
                      step="5"
                      value={minutesSavedInput}
                      onChange={(e) => setMinutesSavedInput(e.target.value)}
                      className={styles.inlineNumberInputFull}
                    />
                    <span className={styles.unitSuffix}>
                      {isAr ? 'دقيقة/يوم' : 'min/day'}
                    </span>
                  </div>
                  <div className={styles.miniPillsRow} dir="ltr">
                    {MINUTES_SAVED_PILLS.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMinutesSavedInput(String(m))}
                        className={`${styles.miniPillBtn} ${
                          Number(minutesSavedInput) === m
                            ? styles.miniPillBtnActiveTeal
                            : ''
                        }`}
                      >
                        {m}m
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles.subFieldBlock}>
                  <label htmlFor="wt-years-input" className={styles.subFieldLabel}>
                    <span>
                      {isAr
                        ? 'العمر الافتراضي لاستخدام المنتج (بالسنوات)'
                        : 'Expected Product Lifespan (Years)'}
                    </span>
                    <span className={styles.subFieldHint}>
                      {isAr
                        ? 'كم سنة ستستفيد من هذا المنتج؟'
                        : 'How many years will you use this item?'}
                    </span>
                  </label>
                  <div className={styles.numberInputWrapFull} dir="ltr">
                    <input
                      id="wt-years-input"
                      type="number"
                      min="0.5"
                      max="15"
                      step="0.5"
                      value={usageYearsInput}
                      onChange={(e) => setUsageYearsInput(e.target.value)}
                      className={styles.inlineNumberInputFull}
                    />
                    <span className={styles.unitSuffix}>
                      {isAr ? 'سنوات' : 'yrs'}
                    </span>
                  </div>
                  <div className={styles.miniPillsRow} dir="ltr">
                    {USAGE_YEARS_PILLS.map((y) => (
                      <button
                        key={y}
                        type="button"
                        onClick={() => setUsageYearsInput(String(y))}
                        className={`${styles.miniPillBtn} ${
                          Number(usageYearsInput) === y
                            ? styles.miniPillBtnActiveTeal
                            : ''
                        }`}
                      >
                        {y} {isAr ? 'سنة' : 'yr'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          {mode === 'smart_alt' && (
            <section className={styles.panelCardGold}>
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.panelStepGold}>
                    {isAr
                      ? 'القسم 02 • مقارنة البديل الأذكى أو سعر الخصم'
                      : 'SECTION 02 • SMART ALTERNATIVE OR DISCOUNT TARGET'}
                  </span>
                  <h3 className={styles.panelTitle}>
                    {isAr
                      ? 'ماذا لو اخترت موديلاً عملياً أو انتظرت عرض خصم؟'
                      : 'What if you pick a practical tier or wait for a sale?'}
                  </h3>
                </div>
              </div>

              <div className={styles.controlBlock}>
                <div className={styles.controlTopRow}>
                  <label htmlFor="wt-alt-input" className={styles.controlLabel}>
                    <span>
                      {isAr
                        ? 'سعر المنتج البديل أو السعر بعد الخصم'
                        : 'Alternative Product or Discounted Price'}
                    </span>
                    <span className={styles.controlSublabel}>
                      {isAr
                        ? 'شاهد فوراً كم يوم دوام وحرية تسترد باختيارك الذكي'
                        : 'See how many workdays of freedom you reclaim'}
                    </span>
                  </label>

                  <div className={styles.numberInputWrap} dir="ltr">
                    <span className={styles.currencySymbol}>{curMeta.symbol}</span>
                    <input
                      id="wt-alt-input"
                      type="number"
                      min="0"
                      step="any"
                      value={altPriceInput}
                      onChange={(e) => setAltPriceInput(e.target.value)}
                      className={styles.inlineNumberInput}
                    />
                  </div>
                </div>

                <div className={styles.pillsRow} dir="ltr">
                  {[0.5, 0.65, 0.75, 0.85].map((ratio) => {
                    const targetVal = Math.max(
                      1,
                      Math.round(analysis.itemPrice * ratio)
                    );
                    const pctOff = Math.round((1 - ratio) * 100);
                    return (
                      <button
                        key={ratio}
                        type="button"
                        onClick={() => setAltPriceInput(String(targetVal))}
                        className={`${styles.pillBtn} ${
                          Math.abs(Number(altPriceInput) - targetVal) <= 2
                            ? styles.pillBtnActive
                            : ''
                        }`}
                      >
                        -{pctOff}% ({formatMoney(targetVal)})
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>
          )}
        </div>

        {/* RIGHT / END COLUMN: ARCHITECTURAL CHRONO-VALUE VERDICT & CALENDAR */}
        <div className={styles.verdictColumn}>
          {analysis.isInvalid ? (
            <div className={styles.errorBox} role="alert">
              <strong>
                {isAr
                  ? 'يرجى مراجعة الأرقام المدخلة:'
                  : 'Please check your input parameters:'}
              </strong>
              <p>
                {isAr
                  ? 'تأكد من إدخال راتب شهري وسعر منتج وساعات عمل أكبر من الصفر، وأن مصاريف العمل الشهرية أقل من إجمالي الراتب.'
                  : 'Ensure monthly salary, item price, and work hours are greater than zero, and job expenses are less than total salary.'}
              </p>
            </div>
          ) : (
            <div className={`${styles.verdictStage} ${verdictMeta.toneClass}`}>
              {/* Top Verdict Seal Header */}
              <div className={styles.verdictTopBar}>
                <span className={styles.verdictBadge}>
                  {isAr ? verdictMeta.badgeAr : verdictMeta.badgeEn}
                </span>
                <span dir="ltr" className={styles.freedomScorePill}>
                  {isAr ? 'مؤشر الحرية الزمنية:' : 'Time-Freedom Index:'}{' '}
                  <strong>{analysis.freedomScore}/100</strong>
                </span>
              </div>

              <h3 className={styles.verdictHeadline}>
                {isAr ? verdictMeta.headlineAr : verdictMeta.headlineEn}
              </h3>
              <p className={styles.verdictSummary}>
                {isAr ? verdictMeta.summaryAr : verdictMeta.summaryEn}
              </p>

              {/* ACTIVE STORE PRODUCT BANNER (IF SELECTED FROM RIBBON/SEARCH) */}
              {selectedViewedProduct && (
                <div className={styles.activeStoreBanner}>
                  <div className={styles.activeStoreMain}>
                    {selectedViewedProduct.imageUrl &&
                      !failedThumbIds[selectedViewedProduct.slug] && (
                        <img
                          src={selectedViewedProduct.imageUrl}
                          alt={
                            isAr
                              ? selectedViewedProduct.titleAr
                              : selectedViewedProduct.titleEn
                          }
                          className={styles.activeStoreThumb}
                          referrerPolicy="no-referrer"
                        />
                      )}
                    <div className={styles.activeStoreInfo}>
                      <span className={styles.activeStoreKicker}>
                        {isAr
                          ? 'منتج مختار من متجر AQURIVO'
                          : 'SELECTED AQURIVO STORE PRODUCT'}
                      </span>
                      <strong className={styles.activeStoreTitle}>
                        {isAr
                          ? selectedViewedProduct.titleAr
                          : selectedViewedProduct.titleEn}
                      </strong>
                    </div>
                  </div>
                  <Link
                    href={`/${locale}/products/${selectedViewedProduct.slug}`}
                    className={styles.activeStoreLinkBtn}
                  >
                    <span>
                      {isAr ? 'صفحة المنتج في المتجر' : 'View in Store'}
                    </span>
                    <span aria-hidden="true">{isAr ? '↖' : '↗'}</span>
                  </Link>
                </div>
              )}

              {/* WAGE X-RAY COMPARISON: ON-PAPER WAGE VS TRUE NET LIFE-ENERGY WAGE */}
              <div className={styles.wageXrayBox}>
                <div className={styles.wageXrayHeader}>
                  <span className={styles.wageXrayTitle}>
                    {isAr
                      ? 'كاشف قيمة ساعتك: الأجر الاسمي (على الورق) مقابل الأجر الحقيقي الصافي'
                      : 'Hourly Wage X-Ray: Nominal Paper Wage vs. True Net Life Wage'}
                  </span>
                  {analysis.wageErosionPct > 1 && (
                    <span dir="ltr" className={styles.wageErosionTag}>
                      {isAr
                        ? `تآكل خفي -${numberFmt.format(analysis.wageErosionPct)}%`
                        : `-${numberFmt.format(analysis.wageErosionPct)}% job friction`}
                    </span>
                  )}
                </div>

                <div className={styles.wageComparisonGrid}>
                  <div className={styles.wageCardPaper}>
                    <span className={styles.wageCardLabel}>
                      {isAr
                        ? 'أجر ساعتك الاسمي (على الورق)'
                        : 'On-Paper Hourly Wage'}
                    </span>
                    <strong dir="ltr" className={styles.wageCardValueMuted}>
                      {formatMoney(analysis.nominalHourlyWage, 2)}/hr
                    </strong>
                    <span className={styles.wageCardSub}>
                      {isAr
                        ? `يكلفك ${numberFmt.format(
                            analysis.nominalHoursNeeded
                          )} ساعة رسمية فقط`
                        : `Looks like ${numberFmt.format(
                            analysis.nominalHoursNeeded
                          )} official hrs`}
                    </span>
                  </div>

                  <div className={styles.wageCardTrue}>
                    <span className={styles.wageCardLabel}>
                      {isAr
                        ? 'أجر ساعتك الحقيقي الصافي'
                        : 'True Net Life-Energy Wage'}
                    </span>
                    <strong dir="ltr" className={styles.wageCardValueTeal}>
                      {formatMoney(analysis.trueHourlyWage, 2)}/hr
                    </strong>
                    <span className={styles.wageCardSub}>
                      {isAr
                        ? `بعد حسم المواصلات (${numberFmt.format(
                            analysis.commuteHours
                          )} س/يوم) ومصاريف العمل`
                        : `After ${numberFmt.format(
                            analysis.commuteHours
                          )}h/d commute & job costs`}
                    </span>
                  </div>
                </div>
              </div>

              {/* 4-CELL CORE CHRONO METRICS LEDGER */}
              <div className={styles.coreMetricsGrid}>
                <div className={styles.metricCell}>
                  <span className={styles.metricCellLabel}>
                    {isAr
                      ? 'التكلفة الحقيقية بساعات حياتك'
                      : 'True Cost in Life-Work Hours'}
                  </span>
                  <strong dir="ltr" className={styles.metricCellValAmber}>
                    {numberFmt.format(analysis.trueHoursNeeded)}{' '}
                    {isAr ? 'ساعة' : 'hrs'}
                  </strong>
                  <span className={styles.metricCellSub}>
                    {analysis.hiddenFrictionHours >= 0.5
                      ? isAr
                        ? `منها +${numberFmt.format(
                            analysis.hiddenFrictionHours
                          )} ساعة مخفية بسبب المواصلات ومصاريف العمل`
                        : `Includes +${numberFmt.format(
                            analysis.hiddenFrictionHours
                          )} hidden commute/expense hrs`
                      : isAr
                        ? 'مطابق لساعات عملك المباشرة'
                        : 'Matches your direct work hours'}
                  </span>
                </div>

                <div className={styles.metricCell}>
                  <span className={styles.metricCellLabel}>
                    {isAr
                      ? 'عدد أيام الدوام الكاملة المطلوبة'
                      : 'Full Workdays Required'}
                  </span>
                  <strong dir="ltr" className={styles.metricCellValPrimary}>
                    {numberFmt.format(analysis.trueDaysNeeded)}{' '}
                    {isAr ? 'يوم عمل' : 'days'}
                  </strong>
                  <span className={styles.metricCellSub}>
                    {isAr
                      ? `يعادل ${numberFmt.format(
                          analysis.workWeeksNeeded
                        )} أسبوع عمل من جهدك`
                      : `Equals ${numberFmt.format(
                          analysis.workWeeksNeeded
                        )} work weeks of labor`}
                  </span>
                </div>

                <div className={styles.metricCellHighlight}>
                  <div className={styles.metricHighlightTop}>
                    <span className={styles.metricCellLabel}>
                      {isAr
                        ? 'حصة المنتج من صافي راتبك الشهري الحر'
                        : 'Share of Monthly Net Disposable Income'}
                    </span>
                    <strong
                      dir="ltr"
                      className={
                        analysis.disposableSharePct <= 18
                          ? styles.metricCellValTeal
                          : styles.metricCellValAmber
                      }
                    >
                      {numberFmt.format(analysis.disposableSharePct)}%
                    </strong>
                  </div>
                  <div className={styles.shareProgressBarTrack}>
                    <div
                      className={
                        analysis.disposableSharePct <= 18
                          ? styles.shareProgressFillTeal
                          : styles.shareProgressFillAmber
                      }
                      style={{
                        width: `${Math.min(100, Math.max(3, analysis.disposableSharePct))}%`,
                      }}
                    />
                  </div>
                  <span className={styles.metricCellSub}>
                    {isAr
                      ? `${formatMoney(analysis.itemPrice)} من أصل ${formatMoney(
                          analysis.netDisposableSalary
                        )} صافي راتبك بعد مصاريف العمل`
                      : `${formatMoney(analysis.itemPrice)} out of ${formatMoney(
                          analysis.netDisposableSalary
                        )} net pay after job costs`}
                  </span>
                </div>
              </div>

              {/* MODE 2 SPECIAL PANEL: TIME-BACK & PRODUCTIVITY ROI */}
              {mode === 'time_roi' && (
                <div className={styles.roiSpecialBox}>
                  <div className={styles.roiHeader}>
                    <h4 className={styles.roiTitle}>
                      {isAr
                        ? 'ميزان استرداد الوقت (الوقت المبذول للشراء مقابل الوقت الذي يوفره المنتج)'
                        : 'Time-Back Balance (Work Hours Spent vs. Life Hours Saved)'}
                    </h4>
                    {analysis.breakEvenDays !== null && (
                      <span className={styles.roiBreakEvenBadge}>
                        {isAr
                          ? `نقطة التعادل الزمني: ${analysis.breakEvenDays} يوماً`
                          : `Time Break-Even: ${analysis.breakEvenDays} days`}
                      </span>
                    )}
                  </div>

                  <div className={styles.roiComparisonRow}>
                    <div className={styles.roiStatCard}>
                      <span className={styles.roiStatLabel}>
                        {isAr
                          ? 'ساعات العمل المدفوعة للشراء'
                          : 'Work Hours Spent to Buy'}
                      </span>
                      <strong dir="ltr" className={styles.roiStatAmber}>
                        -{numberFmt.format(analysis.trueHoursNeeded)} hrs
                      </strong>
                    </div>

                    <div className={styles.roiStatCard}>
                      <span className={styles.roiStatLabel}>
                        {isAr
                          ? `الساعات التي يوفرها خلال ${analysis.usageYears} سنوات`
                          : `Hours Saved Over ${analysis.usageYears} Years`}
                      </span>
                      <strong dir="ltr" className={styles.roiStatTeal}>
                        +{intFmt.format(Math.round(analysis.lifetimeHoursSaved))} hrs
                      </strong>
                    </div>

                    <div className={styles.roiStatCardHighlight}>
                      <span className={styles.roiStatLabel}>
                        {isAr
                          ? 'صافي الربح الزمني لحياتك'
                          : 'Net Life-Hours Gain'}
                      </span>
                      <strong
                        dir="ltr"
                        className={
                          analysis.netLifeHoursDelta >= 0
                            ? styles.roiStatTeal
                            : styles.roiStatAmber
                        }
                      >
                        {analysis.netLifeHoursDelta >= 0 ? '+' : ''}
                        {intFmt.format(Math.round(analysis.netLifeHoursDelta))} hrs
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              {/* MODE 3 SPECIAL PANEL: SMART ALTERNATIVE FREEDOM RECLAIM */}
              {mode === 'smart_alt' && (
                <div className={styles.roiSpecialBox}>
                  <div className={styles.roiHeader}>
                    <h4 className={styles.roiTitle}>
                      {isAr
                        ? 'مكسب الحرية عند اختيار البديل الأذكى أو انتظار الخصم'
                        : 'Freedom Reclaimed by Choosing the Smarter Alternative'}
                    </h4>
                    <span className={styles.roiBreakEvenBadge}>
                      {isAr
                        ? `وفر مالي فوري: ${formatMoney(analysis.altMoneySaved)}`
                        : `Instant Savings: ${formatMoney(analysis.altMoneySaved)}`}
                    </span>
                  </div>

                  <p className={styles.altNarrative}>
                    {isAr
                      ? `باختيار البديل بسعر ${formatMoney(
                          analysis.altPrice
                        )} بدلاً من ${formatMoney(
                          analysis.itemPrice
                        )}، أنت تسترد فوراً ${numberFmt.format(
                          analysis.altHoursSaved
                        )} ساعة عمل حقيقية — أي أنك تعفي نفسك من ${numberFmt.format(
                          analysis.altDaysSaved
                        )} يوم دوام ومواصلات كامل!`
                      : `By choosing the ${formatMoney(
                          analysis.altPrice
                        )} alternative instead of ${formatMoney(
                          analysis.itemPrice
                        )}, you immediately reclaim ${numberFmt.format(
                          analysis.altHoursSaved
                        )} real work hours — freeing yourself from ${numberFmt.format(
                          analysis.altDaysSaved
                        )} full workdays of labor & commuting!`}
                  </p>
                </div>
              )}

              {/* INTERACTIVE WORK-MONTH CALENDAR GRID */}
              <div className={styles.calendarSection}>
                <div className={styles.calendarHeader}>
                  <h4 className={styles.calendarTitle}>
                    {isAr
                      ? `خريطة شهر عملك البصرية (${analysis.monthlyWorkDaysCount} يوم دوام في الشهر)`
                      : `Visual Work-Month Map (${analysis.monthlyWorkDaysCount} Workdays/Month)`}
                  </h4>
                  <p className={styles.calendarSubtitle}>
                    {analysis.trueDaysNeeded <= analysis.monthlyWorkDaysCount
                      ? isAr
                        ? `بلغة الواقع: أول ${numberFmt.format(
                            analysis.trueDaysNeeded
                          )} يوم دوام في شهرك تذهب بالكامل لدفع ثمن هذا المنتج، وتبقى لك ${numberFmt.format(
                            Math.max(
                              0,
                              analysis.monthlyWorkDaysCount - analysis.trueDaysNeeded
                            )
                          )} يوم دوام لمعيشتك وادخارك.`
                        : `In real terms: Your first ${numberFmt.format(
                            analysis.trueDaysNeeded
                          )} workdays this month go strictly toward paying for this item, leaving ${numberFmt.format(
                            Math.max(
                              0,
                              analysis.monthlyWorkDaysCount - analysis.trueDaysNeeded
                            )
                          )} workdays for your living & savings.`
                      : isAr
                        ? `تنبيه: هذا المنتج يتجاوز راتب شهر عمل كامل! يحتاج إلى ${numberFmt.format(
                            analysis.trueDaysNeeded
                          )} يوم دوام (${numberFmt.format(
                            analysis.trueDaysNeeded / analysis.monthlyWorkDaysCount
                          )} شهر عمل).`
                        : `Heads up: This item exceeds a full month of net work! It requires ${numberFmt.format(
                            analysis.trueDaysNeeded
                          )} workdays (${numberFmt.format(
                            analysis.trueDaysNeeded / analysis.monthlyWorkDaysCount
                          )} work months).`}
                  </p>
                </div>

                {/* Legend */}
                <div className={styles.calendarLegend}>
                  <span className={styles.legendItem}>
                    <span className={styles.legendSwatchAmber} />
                    {isAr
                      ? `أيام دوام تذهب لسداد المنتج (${numberFmt.format(
                          analysis.trueDaysNeeded
                        )} يوم)`
                      : `Workdays paying for item (${numberFmt.format(
                          analysis.trueDaysNeeded
                        )} d)`}
                  </span>
                  <span className={styles.legendItem}>
                    <span className={styles.legendSwatchTeal} />
                    {isAr
                      ? 'أيام دوام صافية لك ولحريتك المالية'
                      : 'Workdays kept for your freedom & savings'}
                  </span>
                </div>

                {/* Interactive Workday Cells */}
                <div
                  className={styles.calendarGrid}
                  dir="ltr"
                  onMouseLeave={() => setInspectedDay(null)}
                >
                  {analysis.calendarCells.map((cell) => {
                    const isActive = activeCalendarCell?.day === cell.day;
                    return (
                      <button
                        key={cell.day}
                        type="button"
                        onMouseEnter={() => setInspectedDay(cell.day)}
                        onClick={() => setInspectedDay(cell.day)}
                        className={`${styles.dayCell} ${
                          cell.status === 'item_cost'
                            ? styles.dayCellAmber
                            : cell.status === 'split'
                              ? styles.dayCellSplit
                              : styles.dayCellTeal
                        } ${isActive ? styles.dayCellActive : ''}`}
                      >
                        <span className={styles.dayCellNum}>D{cell.day}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Live Inspected Workday Readout */}
                {activeCalendarCell && (
                  <div className={styles.calendarReadout}>
                    <span dir="ltr" className={styles.readoutDayBadge}>
                      DAY {activeCalendarCell.day} / {analysis.monthlyWorkDaysCount}
                    </span>
                    <span className={styles.readoutText}>
                      {activeCalendarCell.status === 'item_cost'
                        ? isAr
                          ? `اليوم الوظيفي ${activeCalendarCell.day}: كامل تعب دوامك ومواصلاتك في هذا اليوم يذهب لسداد ثمن المنتج (المسدد حتى نهاية اليوم: ${formatMoney(
                              activeCalendarCell.cumulativeCost
                            )}).`
                          : `Workday ${activeCalendarCell.day}: 100% of your labor & commute today goes toward paying off this item (Paid so far: ${formatMoney(
                              activeCalendarCell.cumulativeCost
                            )}).`
                        : activeCalendarCell.status === 'split'
                          ? isAr
                            ? `اليوم الوظيفي ${activeCalendarCell.day}: تعمل ${numberFmt.format(
                                activeCalendarCell.hoursForItem
                              )} ساعة لإكمال ثمن المنتج، ثم يبدأ دخلك الصافي بالعودة إلى محفظتك!`
                            : `Workday ${activeCalendarCell.day}: You work ${numberFmt.format(
                                activeCalendarCell.hoursForItem
                              )} hrs to finish paying off the item, then start keeping your income!`
                          : isAr
                            ? `اليوم الوظيفي ${activeCalendarCell.day}: ثمن المنتج مسدد بالكامل — أجر هذا اليوم يعود بنسبة 100% لحسابك وادخارك.`
                            : `Workday ${activeCalendarCell.day}: Item is 100% paid off — today's earnings belong entirely to your savings & life.`}
                    </span>
                  </div>
                )}
              </div>

              {/* FOOTER BRIDGES TO SISTER TOOLS */}
              <div className={styles.actionFooterBox}>
                <Link
                  href={`/${locale}/tools/is-it-worth-buying?price=${usdEquivalentPrice}`}
                  className={styles.worthBridgeBtn}
                >
                  <div className={styles.worthBridgeTextCol}>
                    <span className={styles.worthBridgeKicker}>
                      {isAr
                        ? 'فحص القيمة مقابل عدد مرات الاستخدام'
                        : 'INSPECT COST-PER-USE VALUE'}
                    </span>
                    <span className={styles.worthBridgeLabel}>
                      {isAr
                        ? 'انتقل إلى أداة «هل يستحق الشراء؟» لحساب تكلفة الاستخدام الواحد لهذا المنتج'
                        : 'Open "Is It Worth Buying?" to calculate the exact cost-per-use of this item'}
                    </span>
                  </div>
                  <span className={styles.worthBridgeArrow} aria-hidden="true">
                    {isAr ? '↖' : '↗'}
                  </span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default WorkTimeValueCalculator;
