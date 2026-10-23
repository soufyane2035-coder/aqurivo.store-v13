'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Award,
  Check,
  ChevronDown,
  Copy,
  Globe,
  RotateCcw,
  Search,
  Table,
  TrendingDown,
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
import { LoanComparisonLogo } from './LoanComparisonLogo';
import styles from './LoanComparison.module.css';

export interface LoanComparisonProps {
  locale: 'ar' | 'en';
}

type InterestMethod = 'reducing' | 'flat';

type LoanPresetId = 'auto_short_vs_long' | 'mortgage_rate_gap' | 'reducing_vs_flat' | 'zero';

interface CurrencyOption {
  code: string;
  symbol: string;
  rateFromUsd: number;
  nameAr: string;
  nameEn: string;
  countryAr: string;
  countryEn: string;
  defaultLoanUsd: number;
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
    defaultLoanUsd: 35000,
  },
  {
    code: 'EUR',
    symbol: '€',
    rateFromUsd: 0.92,
    nameAr: 'يورو أوروبي',
    nameEn: 'Euro',
    countryAr: 'الاتحاد الأوروبي',
    countryEn: 'Eurozone',
    defaultLoanUsd: 35000,
  },
  {
    code: 'GBP',
    symbol: '£',
    rateFromUsd: 0.79,
    nameAr: 'جنيه إسترليني',
    nameEn: 'British Pound',
    countryAr: 'المملكة المتحدة',
    countryEn: 'United Kingdom',
    defaultLoanUsd: 35000,
  },
  {
    code: 'SAR',
    symbol: 'SAR',
    rateFromUsd: 3.75,
    nameAr: 'ريال سعودي',
    nameEn: 'Saudi Riyal',
    countryAr: 'المملكة العربية السعودية',
    countryEn: 'Saudi Arabia',
    defaultLoanUsd: 32000,
  },
  {
    code: 'AED',
    symbol: 'AED',
    rateFromUsd: 3.67,
    nameAr: 'درهم إماراتي',
    nameEn: 'UAE Dirham',
    countryAr: 'الإمارات العربية المتحدة',
    countryEn: 'United Arab Emirates',
    defaultLoanUsd: 35000,
  },
  {
    code: 'QAR',
    symbol: 'QAR',
    rateFromUsd: 3.64,
    nameAr: 'ريال قطري',
    nameEn: 'Qatari Riyal',
    countryAr: 'قطر',
    countryEn: 'Qatar',
    defaultLoanUsd: 35000,
  },
  {
    code: 'KWD',
    symbol: 'KWD',
    rateFromUsd: 0.31,
    nameAr: 'دينار كويتي',
    nameEn: 'Kuwaiti Dinar',
    countryAr: 'الكويت',
    countryEn: 'Kuwait',
    defaultLoanUsd: 35000,
  },
  {
    code: 'MAD',
    symbol: 'MAD',
    rateFromUsd: 10,
    nameAr: 'درهم مغربي',
    nameEn: 'Moroccan Dirham',
    countryAr: 'المغرب',
    countryEn: 'Morocco',
    defaultLoanUsd: 18000,
  },
  {
    code: 'EGP',
    symbol: 'EGP',
    rateFromUsd: 49,
    nameAr: 'جنيه مصري',
    nameEn: 'Egyptian Pound',
    countryAr: 'مصر',
    countryEn: 'Egypt',
    defaultLoanUsd: 12000,
  },
  {
    code: 'JOD',
    symbol: 'JOD',
    rateFromUsd: 0.71,
    nameAr: 'دينار أردني',
    nameEn: 'Jordanian Dinar',
    countryAr: 'الأردن',
    countryEn: 'Jordan',
    defaultLoanUsd: 18000,
  },
  {
    code: 'TRY',
    symbol: '₺',
    rateFromUsd: 34,
    nameAr: 'ليرة تركية',
    nameEn: 'Turkish Lira',
    countryAr: 'تركيا',
    countryEn: 'Turkey',
    defaultLoanUsd: 16000,
  },
  {
    code: 'CAD',
    symbol: 'CA$',
    rateFromUsd: 1.38,
    nameAr: 'دولار كندي',
    nameEn: 'Canadian Dollar',
    countryAr: 'كندا',
    countryEn: 'Canada',
    defaultLoanUsd: 35000,
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
        defaultLoanUsd: Math.max(8000, city.typicalNetSalaryUsd * 10),
      });
    }
  }
  return Array.from(map.values());
}

const ALL_CURRENCIES = buildGlobalCurrencies();

export interface AnnualAmortizationRow {
  year: number;
  paymentTotal: number;
  principalPaid: number;
  interestPaid: number;
  endingBalance: number;
}

export interface LoanOfferEvaluation {
  principal: number;
  annualRate: number;
  months: number;
  method: InterestMethod;
  upfrontFees: number;
  monthlyPayment: number;
  totalInterest: number;
  totalCostWithFees: number;
  principalSharePct: number;
  interestSharePct: number;
  feesSharePct: number;
  annualSchedule: AnnualAmortizationRow[];
  earlyPayoffMonthsSaved: number;
  earlyPayoffInterestSaved: number;
}

function evaluateLoanOffer(
  principal: number,
  annualRate: number,
  months: number,
  method: InterestMethod,
  upfrontFees: number,
  extraMonthlyPayment: number
): LoanOfferEvaluation {
  const safePrincipal = Math.max(0, principal);
  const safeMonths = Math.max(1, Math.round(months));
  const safeRate = Math.max(0, annualRate);
  const safeFees = Math.max(0, upfrontFees);
  const safeExtra = Math.max(0, extraMonthlyPayment);

  if (safePrincipal <= 0) {
    return {
      principal: 0,
      annualRate: safeRate,
      months: safeMonths,
      method,
      upfrontFees: safeFees,
      monthlyPayment: 0,
      totalInterest: 0,
      totalCostWithFees: safeFees,
      principalSharePct: 0,
      interestSharePct: 0,
      feesSharePct: safeFees > 0 ? 100 : 0,
      annualSchedule: [],
      earlyPayoffMonthsSaved: 0,
      earlyPayoffInterestSaved: 0,
    };
  }

  let monthlyPayment = 0;
  let totalInterest = 0;
  const annualSchedule: AnnualAmortizationRow[] = [];

  if (method === 'flat' || safeRate <= 0.0001) {
    // Flat Rate (نسبة مرابحة ثابتة على أصل المبلغ) or 0% interest
    const years = safeMonths / 12;
    totalInterest =
      safeRate <= 0.0001 ? 0 : safePrincipal * (safeRate / 100) * years;
    monthlyPayment = (safePrincipal + totalInterest) / safeMonths;

    const monthlyPrincipal = safePrincipal / safeMonths;
    const monthlyInterest = totalInterest / safeMonths;
    let remainingPrincipal = safePrincipal;

    const totalYears = Math.ceil(safeMonths / 12);
    for (let y = 1; y <= totalYears; y++) {
      const monthsInYear = Math.min(12, safeMonths - (y - 1) * 12);
      const pPaid = monthlyPrincipal * monthsInYear;
      const iPaid = monthlyInterest * monthsInYear;
      remainingPrincipal = Math.max(0, remainingPrincipal - pPaid);
      annualSchedule.push({
        year: y,
        paymentTotal: pPaid + iPaid,
        principalPaid: pPaid,
        interestPaid: iPaid,
        endingBalance: remainingPrincipal,
      });
    }
  } else {
    // Reducing Balance (رصيد متناقص قياسي)
    const r = safeRate / 100 / 12;
    const factor = Math.pow(1 + r, safeMonths);
    monthlyPayment = (safePrincipal * r * factor) / (factor - 1);

    let balance = safePrincipal;
    let currentYear = 1;
    let yearPrincipal = 0;
    let yearInterest = 0;

    for (let m = 1; m <= safeMonths; m++) {
      const interestM = balance * r;
      const principalM = Math.min(balance, monthlyPayment - interestM);
      balance = Math.max(0, balance - principalM);
      totalInterest += interestM;
      yearPrincipal += principalM;
      yearInterest += interestM;

      if (m % 12 === 0 || m === safeMonths) {
        annualSchedule.push({
          year: currentYear,
          paymentTotal: yearPrincipal + yearInterest,
          principalPaid: yearPrincipal,
          interestPaid: yearInterest,
          endingBalance: balance,
        });
        currentYear += 1;
        yearPrincipal = 0;
        yearInterest = 0;
      }
    }
  }

  // Simulate Early Payoff with extraMonthlyPayment
  let earlyPayoffMonthsSaved = 0;
  let earlyPayoffInterestSaved = 0;

  if (safeExtra > 0 && monthlyPayment > 0) {
    if (method === 'reducing' && safeRate > 0.0001) {
      const r = safeRate / 100 / 12;
      let bal = safePrincipal;
      let mCount = 0;
      let accelInterest = 0;
      while (bal > 0.01 && mCount < safeMonths) {
        mCount += 1;
        const intM = bal * r;
        accelInterest += intM;
        const pM = monthlyPayment + safeExtra - intM;
        if (pM <= 0) break;
        bal = Math.max(0, bal - pM);
      }
      earlyPayoffMonthsSaved = Math.max(0, safeMonths - mCount);
      earlyPayoffInterestSaved = Math.max(0, totalInterest - accelInterest);
    } else {
      const newMonths = Math.ceil(
        (safePrincipal + totalInterest) / (monthlyPayment + safeExtra)
      );
      earlyPayoffMonthsSaved = Math.max(0, safeMonths - newMonths);
    }
  }

  const totalCostWithFees = safePrincipal + totalInterest + safeFees;
  const denom = Math.max(1, totalCostWithFees);
  const principalSharePct = (safePrincipal / denom) * 100;
  const interestSharePct = (totalInterest / denom) * 100;
  const feesSharePct = Math.max(
    0,
    100 - principalSharePct - interestSharePct
  );

  return {
    principal: safePrincipal,
    annualRate: safeRate,
    months: safeMonths,
    method,
    upfrontFees: safeFees,
    monthlyPayment,
    totalInterest,
    totalCostWithFees,
    principalSharePct,
    interestSharePct,
    feesSharePct,
    annualSchedule,
    earlyPayoffMonthsSaved,
    earlyPayoffInterestSaved,
  };
}

export function LoanComparison({ locale }: LoanComparisonProps) {
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

  // 3. Loan Inputs (All start at min="0" step="1")
  const [activePreset, setActivePreset] =
    useState<LoanPresetId>('auto_short_vs_long');
  const [principalInput, setPrincipalInput] = useState<string>('35000');

  // Offer A
  const [rateAInput, setRateAInput] = useState<string>('5');
  const [monthsAInput, setMonthsAInput] = useState<string>('48');
  const [methodA, setMethodA] = useState<InterestMethod>('reducing');
  const [feesAInput, setFeesAInput] = useState<string>('350');

  // Offer B
  const [rateBInput, setRateBInput] = useState<string>('4');
  const [monthsBInput, setMonthsBInput] = useState<string>('72');
  const [methodB, setMethodB] = useState<InterestMethod>('reducing');
  const [feesBInput, setFeesBInput] = useState<string>('950');

  // Extra Monthly Payment Simulator
  const [extraMonthlyInput, setExtraMonthlyInput] = useState<string>('100');

  // Amortization Table View ('A' | 'B')
  const [scheduleOfferTab, setScheduleOfferTab] = useState<'A' | 'B'>('A');
  const [copiedComparison, setCopiedComparison] = useState<boolean>(false);

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

  // Apply Preset Scenario
  const applyLoanPreset = (
    preset: LoanPresetId,
    targetCur: CurrencyOption = activeCurrency
  ) => {
    setActivePreset(preset);
    if (preset === 'zero') {
      setPrincipalInput('0');
      setRateAInput('0');
      setMonthsAInput('12');
      setFeesAInput('0');
      setRateBInput('0');
      setMonthsBInput('12');
      setFeesBInput('0');
      setExtraMonthlyInput('0');
      return;
    }

    const baseLoan = Math.max(
      2000,
      Math.round(targetCur.defaultLoanUsd * targetCur.rateFromUsd)
    );
    setPrincipalInput(String(baseLoan));
    setExtraMonthlyInput(String(Math.max(10, Math.round(baseLoan * 0.004))));

    if (preset === 'auto_short_vs_long') {
      setRateAInput('5');
      setMonthsAInput('48');
      setMethodA('reducing');
      setFeesAInput(String(Math.round(baseLoan * 0.01)));

      setRateBInput('4');
      setMonthsBInput('72');
      setMethodB('reducing');
      setFeesBInput(String(Math.round(baseLoan * 0.025)));
    } else if (preset === 'mortgage_rate_gap') {
      const homeLoan = Math.round(baseLoan * 4);
      setPrincipalInput(String(homeLoan));
      setRateAInput('5');
      setMonthsAInput('180');
      setMethodA('reducing');
      setFeesAInput(String(Math.round(homeLoan * 0.01)));

      setRateBInput('6');
      setMonthsBInput('180');
      setMethodB('reducing');
      setFeesBInput('0');
    } else if (preset === 'reducing_vs_flat') {
      setRateAInput('6');
      setMonthsAInput('60');
      setMethodA('reducing');
      setFeesAInput(String(Math.round(baseLoan * 0.01)));

      setRateBInput('4');
      setMonthsBInput('60');
      setMethodB('flat');
      setFeesBInput(String(Math.round(baseLoan * 0.01)));
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
    applyLoanPreset('auto_short_vs_long', matchedCur);
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

    setPrincipalInput(scaleStr(principalInput));
    setFeesAInput(scaleStr(feesAInput));
    setFeesBInput(scaleStr(feesBInput));
    setExtraMonthlyInput(scaleStr(extraMonthlyInput));

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

  const handleSelectProductForFinancing = (
    item: BrowserProductSnapshot,
    fromSearch = false
  ) => {
    setSelectedViewedProduct(item);
    const localPrice = Math.max(
      1,
      Math.round(item.priceUsd * activeCurrency.rateFromUsd)
    );
    setPrincipalInput(String(localPrice));
    setMonthsAInput('12');
    setMonthsBInput('24');
    setFeesAInput('0');
    setFeesBInput('0');

    if (fromSearch) {
      const updated = recordBrowserProductView(item);
      setViewedProducts(updated);
    }
  };

  const loanSliderMax = useMemo(() => {
    const baseMax = Math.round(
      activeCurrency.defaultLoanUsd * activeCurrency.rateFromUsd * 4
    );
    const currentVal = Number(principalInput) || 0;
    return Math.max(25000, baseMax, Math.ceil(currentVal * 1.25));
  }, [activeCurrency, principalInput]);

  // 4. Evaluate Both Offers
  const comparison = useMemo(() => {
    const principal = Math.max(0, Number(principalInput) || 0);
    const extraMonthly = Math.max(0, Number(extraMonthlyInput) || 0);

    const offerA = evaluateLoanOffer(
      principal,
      Number(rateAInput) || 0,
      Number(monthsAInput) || 12,
      methodA,
      Number(feesAInput) || 0,
      extraMonthly
    );

    const offerB = evaluateLoanOffer(
      principal,
      Number(rateBInput) || 0,
      Number(monthsBInput) || 12,
      methodB,
      Number(feesBInput) || 0,
      extraMonthly
    );

    const totalCostSavings = Math.abs(
      offerA.totalCostWithFees - offerB.totalCostWithFees
    );
    const monthlyPaymentDiff = Math.abs(
      offerA.monthlyPayment - offerB.monthlyPayment
    );

    const winnerTotalCost: 'A' | 'B' | 'tie' =
      Math.abs(offerA.totalCostWithFees - offerB.totalCostWithFees) < 1
        ? 'tie'
        : offerA.totalCostWithFees < offerB.totalCostWithFees
        ? 'A'
        : 'B';

    const lowerMonthlyOffer: 'A' | 'B' | 'tie' =
      Math.abs(offerA.monthlyPayment - offerB.monthlyPayment) < 1
        ? 'tie'
        : offerA.monthlyPayment < offerB.monthlyPayment
        ? 'A'
        : 'B';

    // Detect "Low Monthly Payment Illusion" (One offer has a lower monthly payment, but costs significantly more overall)
    const hasIllusionTrap =
      winnerTotalCost !== 'tie' &&
      lowerMonthlyOffer !== 'tie' &&
      winnerTotalCost !== lowerMonthlyOffer &&
      totalCostSavings > 0;

    return {
      principal,
      extraMonthly,
      offerA,
      offerB,
      totalCostSavings,
      monthlyPaymentDiff,
      winnerTotalCost,
      lowerMonthlyOffer,
      hasIllusionTrap,
    };
  }, [
    principalInput,
    rateAInput,
    monthsAInput,
    methodA,
    feesAInput,
    rateBInput,
    monthsBInput,
    methodB,
    feesBInput,
    extraMonthlyInput,
  ]);

  const activeSchedule =
    scheduleOfferTab === 'A'
      ? comparison.offerA.annualSchedule
      : comparison.offerB.annualSchedule;

  const handleCopyComparison = async () => {
    const text = isAr
      ? [
          `تقرير AQURIVO لمقارنة القروض والتمويل`,
          `────────────────────────────────────────`,
          `• مبلغ التمويل الأساسي: ${formatMoney(comparison.principal)}`,
          `• العرض أ (${comparison.offerA.months} شهر - ${
            comparison.offerA.annualRate
          }%): القسط ${formatMoney(
            comparison.offerA.monthlyPayment
          )} | إجمالي التكلفة والرسوم: ${formatMoney(
            comparison.offerA.totalCostWithFees
          )}`,
          `• العرض ب (${comparison.offerB.months} شهر - ${
            comparison.offerB.annualRate
          }%): القسط ${formatMoney(
            comparison.offerB.monthlyPayment
          )} | إجمالي التكلفة والرسوم: ${formatMoney(
            comparison.offerB.totalCostWithFees
          )}`,
          `• الفارق الصافي في التكلفة الكلية: ${formatMoney(
            comparison.totalCostSavings
          )} لصالح ${
            comparison.winnerTotalCost === 'A'
              ? 'العرض أ'
              : comparison.winnerTotalCost === 'B'
              ? 'العرض ب'
              : 'التعادل'
          }`,
        ].join('\n')
      : [
          `AQURIVO Loan & Financing Comparison Report`,
          `────────────────────────────────────────`,
          `• Principal Amount: ${formatMoney(comparison.principal)}`,
          `• Offer A (${comparison.offerA.months} mos @ ${
            comparison.offerA.annualRate
          }%): Monthly ${formatMoney(
            comparison.offerA.monthlyPayment
          )} | Total Cost + Fees: ${formatMoney(
            comparison.offerA.totalCostWithFees
          )}`,
          `• Offer B (${comparison.offerB.months} mos @ ${
            comparison.offerB.annualRate
          }%): Monthly ${formatMoney(
            comparison.offerB.monthlyPayment
          )} | Total Cost + Fees: ${formatMoney(
            comparison.offerB.totalCostWithFees
          )}`,
          `• Net Total Savings: ${formatMoney(
            comparison.totalCostSavings
          )} in favor of ${
            comparison.winnerTotalCost === 'A'
              ? 'Offer A'
              : comparison.winnerTotalCost === 'B'
              ? 'Offer B'
              : 'Tie'
          }`,
        ].join('\n');

    try {
      await navigator.clipboard.writeText(text);
      setCopiedComparison(true);
      window.setTimeout(() => setCopiedComparison(false), 2500);
    } catch {
      // Ignore error
    }
  };

  return (
    <div className={styles.studioShell} dir={isAr ? 'rtl' : 'ltr'}>
      {/* 2. STUDIO HEADER BAR */}
      <div className={styles.studioHeaderBar}>
        <div className={styles.studioHeaderTop}>
          <LoanComparisonLogo size="md" showWordmark locale={locale} />

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

        {/* Quick Scenario Presets */}
        <div className={styles.presetsBar}>
          <span className={styles.presetsBarLabel}>
            {isAr ? 'سيناريوهات مقارنة جاهزة:' : 'Quick Comparison Scenarios:'}
          </span>
          <div className={styles.presetButtonsRow}>
            <button
              type="button"
              onClick={() => applyLoanPreset('auto_short_vs_long')}
              className={`${styles.presetBtn} ${
                activePreset === 'auto_short_vs_long'
                  ? styles.presetBtnActive
                  : ''
              }`}
            >
              {isAr
                ? 'تمويل سيارة: 4 سنوات مقابل 6 سنوات'
                : 'Auto Loan: 4 Yrs vs. 6 Yrs'}
            </button>
            <button
              type="button"
              onClick={() => applyLoanPreset('reducing_vs_flat')}
              className={`${styles.presetBtn} ${
                activePreset === 'reducing_vs_flat'
                  ? styles.presetBtnActive
                  : ''
              }`}
            >
              {isAr
                ? 'رصيد متناقص 6% مقابل نسبة ثابتة 4%'
                : 'Reducing 6% vs. Flat Rate 4%'}
            </button>
            <button
              type="button"
              onClick={() => applyLoanPreset('mortgage_rate_gap')}
              className={`${styles.presetBtn} ${
                activePreset === 'mortgage_rate_gap'
                  ? styles.presetBtnActive
                  : ''
              }`}
            >
              {isAr
                ? 'تمويل عقاري: فارق 1% في الفائدة'
                : 'Mortgage: 1% Rate Difference'}
            </button>
            <button
              type="button"
              onClick={() => applyLoanPreset('zero')}
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
        {/* LEFT COLUMN: PRINCIPAL + DUAL OFFER CARDS + EARLY PAYOFF INPUT */}
        <div className={styles.inputDeckColumn}>
          {/* CARD 1: PRINCIPAL LOAN AMOUNT */}
          <section className={styles.inputCard}>
            <div className={styles.fieldBlock}>
              <div className={styles.fieldLabelRow}>
                <label htmlFor="lc-principal" className={styles.fieldLabel}>
                  {isAr
                    ? 'مبلغ القرض أو التمويل المطلوب (يبدأ من 0 ويزيد بـ 1)'
                    : 'Loan Principal Amount (Starts at 0, step by 1)'}
                </label>
                <span className={styles.fieldLiveValue}>
                  {formatMoney(comparison.principal)}
                </span>
              </div>

              <div className={styles.numberInputRow}>
                <input
                  id="lc-principal"
                  type="number"
                  min="0"
                  step="1"
                  value={principalInput}
                  onChange={(e) => setPrincipalInput(e.target.value)}
                  className={styles.numberInput}
                />
                <span className={styles.inputUnitTag}>{activeCurrency.code}</span>
              </div>

              <input
                type="range"
                min="0"
                max={loanSliderMax}
                step="1"
                value={Math.min(loanSliderMax, comparison.principal)}
                onChange={(e) => setPrincipalInput(e.target.value)}
                className={styles.rangeSlider}
                aria-label={isAr ? 'مبلغ القرض' : 'Loan Principal Amount'}
              />
            </div>
          </section>

          {/* CARD 2: OFFER A DETAILS */}
          <section className={styles.inputCardOfferA}>
            <div className={styles.cardHeader}>
              <span className={styles.cardStepIndexEmerald}>A</span>
              <div className={styles.cardHeaderText}>
                <h2 className={styles.cardTitle}>
                  {isAr ? 'تفاصيل العرض الأول (العرض أ)' : 'Loan Offer A Details'}
                </h2>
                <p className={styles.cardHint}>
                  {isAr
                    ? 'حدد نسبة الفائدة، طريقة الاحتساب، المدة بالأشهر، والرسوم الإدارية.'
                    : 'Set interest rate, calculation method, term in months, and upfront fees.'}
                </p>
              </div>
            </div>

            <div className={styles.methodSwitchRow}>
              <button
                type="button"
                onClick={() => setMethodA('reducing')}
                className={`${styles.methodBtn} ${
                  methodA === 'reducing' ? styles.methodBtnActive : ''
                }`}
              >
                {isAr
                  ? 'رصيد متناقص (Reducing)'
                  : 'Reducing Balance'}
              </button>
              <button
                type="button"
                onClick={() => setMethodA('flat')}
                className={`${styles.methodBtn} ${
                  methodA === 'flat' ? styles.methodBtnActive : ''
                }`}
              >
                {isAr ? 'نسبة ثابتة (Flat Rate)' : 'Flat Rate'}
              </button>
            </div>

            <div className={styles.threeColsGrid}>
              <div className={styles.fieldBlock}>
                <label htmlFor="lc-rate-a" className={styles.fieldLabel}>
                  {isAr ? 'الفائدة السنوية (%)' : 'Annual Rate (%)'}
                </label>
                <input
                  id="lc-rate-a"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={rateAInput}
                  onChange={(e) => setRateAInput(e.target.value)}
                  className={styles.numberInputPlain}
                />
              </div>

              <div className={styles.fieldBlock}>
                <label htmlFor="lc-months-a" className={styles.fieldLabel}>
                  {isAr ? 'المدة (بالأشهر)' : 'Term (Months)'}
                </label>
                <input
                  id="lc-months-a"
                  type="number"
                  min="1"
                  max="480"
                  step="1"
                  value={monthsAInput}
                  onChange={(e) => setMonthsAInput(e.target.value)}
                  className={styles.numberInputPlain}
                />
              </div>

              <div className={styles.fieldBlock}>
                <label htmlFor="lc-fees-a" className={styles.fieldLabel}>
                  {isAr ? 'الرسوم الإدارية' : 'Admin Fees'}
                </label>
                <input
                  id="lc-fees-a"
                  type="number"
                  min="0"
                  step="1"
                  value={feesAInput}
                  onChange={(e) => setFeesAInput(e.target.value)}
                  className={styles.numberInputPlain}
                />
              </div>
            </div>
          </section>

          {/* CARD 3: OFFER B DETAILS */}
          <section className={styles.inputCardOfferB}>
            <div className={styles.cardHeader}>
              <span className={styles.cardStepIndexCyan}>B</span>
              <div className={styles.cardHeaderText}>
                <h2 className={styles.cardTitle}>
                  {isAr ? 'تفاصيل العرض الثاني (العرض ب)' : 'Loan Offer B Details'}
                </h2>
                <p className={styles.cardHint}>
                  {isAr
                    ? 'قارن مع بنك آخر أو مدة أطول أو نسبة ثابتة مقابل متناقصة.'
                    : 'Compare against another lender, longer term, or flat vs. reducing rate.'}
                </p>
              </div>
            </div>

            <div className={styles.methodSwitchRow}>
              <button
                type="button"
                onClick={() => setMethodB('reducing')}
                className={`${styles.methodBtn} ${
                  methodB === 'reducing' ? styles.methodBtnActive : ''
                }`}
              >
                {isAr
                  ? 'رصيد متناقص (Reducing)'
                  : 'Reducing Balance'}
              </button>
              <button
                type="button"
                onClick={() => setMethodB('flat')}
                className={`${styles.methodBtn} ${
                  methodB === 'flat' ? styles.methodBtnActive : ''
                }`}
              >
                {isAr ? 'نسبة ثابتة (Flat Rate)' : 'Flat Rate'}
              </button>
            </div>

            <div className={styles.threeColsGrid}>
              <div className={styles.fieldBlock}>
                <label htmlFor="lc-rate-b" className={styles.fieldLabel}>
                  {isAr ? 'الفائدة السنوية (%)' : 'Annual Rate (%)'}
                </label>
                <input
                  id="lc-rate-b"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={rateBInput}
                  onChange={(e) => setRateBInput(e.target.value)}
                  className={styles.numberInputPlain}
                />
              </div>

              <div className={styles.fieldBlock}>
                <label htmlFor="lc-months-b" className={styles.fieldLabel}>
                  {isAr ? 'المدة (بالأشهر)' : 'Term (Months)'}
                </label>
                <input
                  id="lc-months-b"
                  type="number"
                  min="1"
                  max="480"
                  step="1"
                  value={monthsBInput}
                  onChange={(e) => setMonthsBInput(e.target.value)}
                  className={styles.numberInputPlain}
                />
              </div>

              <div className={styles.fieldBlock}>
                <label htmlFor="lc-fees-b" className={styles.fieldLabel}>
                  {isAr ? 'الرسوم الإدارية' : 'Admin Fees'}
                </label>
                <input
                  id="lc-fees-b"
                  type="number"
                  min="0"
                  step="1"
                  value={feesBInput}
                  onChange={(e) => setFeesBInput(e.target.value)}
                  className={styles.numberInputPlain}
                />
              </div>
            </div>
          </section>

          {/* CARD 4: EXTRA MONTHLY PAYMENT SIMULATOR */}
          <section className={styles.inputCard}>
            <div className={styles.fieldBlock}>
              <div className={styles.fieldLabelRow}>
                <label htmlFor="lc-extra-pmt" className={styles.fieldLabel}>
                  {isAr
                    ? 'محاكي السداد المبكر: دفعة شهرية إضافية اختيارية'
                    : 'Early Payoff Simulator: Optional Extra Monthly Payment'}
                </label>
                <span className={styles.fieldLiveValueAmber}>
                  +{formatMoney(comparison.extraMonthly)}/{isAr ? 'شهر' : 'mo'}
                </span>
              </div>
              <input
                id="lc-extra-pmt"
                type="number"
                min="0"
                step="1"
                value={extraMonthlyInput}
                onChange={(e) => setExtraMonthlyInput(e.target.value)}
                className={styles.numberInputPlain}
              />
              <input
                type="range"
                min="0"
                max={Math.max(1000, Math.round(comparison.principal * 0.05))}
                step="1"
                value={Math.min(
                  Math.max(1000, Math.round(comparison.principal * 0.05)),
                  comparison.extraMonthly
                )}
                onChange={(e) => setExtraMonthlyInput(e.target.value)}
                className={styles.rangeSliderAmber}
                aria-label={isAr ? 'دفعة شهرية إضافية' : 'Extra Monthly Payment'}
              />
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN: WINNER VERDICT, SIDE-BY-SIDE BARS & AMORTIZATION SCHEDULE */}
        <div className={styles.reportColumn}>
          {/* 1. WINNER VERDICT CARD */}
          <section className={styles.heroReportCard}>
            <div className={styles.heroTopRow}>
              <span className={styles.reportKicker}>
                {isAr
                  ? 'الحكم المالي الكاشف · التكلفة الإجمالية مقابل القسط الشهري'
                  : 'EXECUTIVE VERDICT · TRUE TOTAL COST VS. MONTHLY PAYMENT'}
              </span>
              <Award size={18} className={styles.iconEmerald} />
            </div>

            <div className={styles.winnerAnnouncementBox}>
              <strong className={styles.winnerHeadline}>
                {comparison.principal <= 0
                  ? isAr
                    ? 'أدخل مبلغ التمويل لبدء المقارنة'
                    : 'Enter a loan principal to begin comparison'
                  : comparison.winnerTotalCost === 'A'
                  ? isAr
                    ? `العرض الأول (أ) هو الخيار الأوفر لك مالياً · يوفر عليك ${formatMoney(
                        comparison.totalCostSavings
                      )}!`
                    : `Offer A is the True Financial Winner · Saves you ${formatMoney(
                        comparison.totalCostSavings
                      )}!`
                  : comparison.winnerTotalCost === 'B'
                  ? isAr
                    ? `العرض الثاني (ب) هو الخيار الأوفر لك مالياً · يوفر عليك ${formatMoney(
                        comparison.totalCostSavings
                      )}!`
                    : `Offer B is the True Financial Winner · Saves you ${formatMoney(
                        comparison.totalCostSavings
                      )}!`
                  : isAr
                  ? 'العرضان متكافئان تماماً في التكلفة الكلية والرسوم'
                  : 'Both offers have the exact same total cost and fees'}
              </strong>

              {comparison.hasIllusionTrap && (
                <div className={styles.illusionTrapAlert}>
                  <AlertTriangle size={16} className={styles.trapIcon} />
                  <span>
                    {isAr
                      ? `تنبيه الخداع البصري: العرض (${
                          comparison.lowerMonthlyOffer === 'A' ? 'أ' : 'ب'
                        }) يبدو مغرياً لأن قسطه الشهري أقل بـ ${formatMoney(
                          comparison.monthlyPaymentDiff
                        )}، لكنك ستدفع فيه ${formatMoney(
                          comparison.totalCostSavings
                        )} زيادة في إجمالي الفوائد والرسوم!`
                      : `Low-Payment Illusion Alert: Offer ${
                          comparison.lowerMonthlyOffer
                        } looks tempting with a monthly payment lower by ${formatMoney(
                          comparison.monthlyPaymentDiff
                        )}, but it actually costs ${formatMoney(
                          comparison.totalCostSavings
                        )} MORE in total interest and fees!`}
                  </span>
                </div>
              )}
            </div>

            {/* Side-by-Side Offer Comparison Cards */}
            <div className={styles.sideBySideGrid}>
              {/* Offer A Card */}
              <div
                className={`${styles.offerResultCard} ${
                  comparison.winnerTotalCost === 'A'
                    ? styles.offerResultCardWinner
                    : ''
                }`}
              >
                <div className={styles.offerResultHeader}>
                  <span className={styles.offerNameTagEmerald}>
                    {isAr ? 'العرض الأول (أ)' : 'Offer A'}
                  </span>
                  {comparison.winnerTotalCost === 'A' && (
                    <span className={styles.winnerLabelText}>
                      {isAr ? 'الأوفر إجمالاً ✓' : 'Best Total Value ✓'}
                    </span>
                  )}
                </div>

                <div className={styles.offerMainStat}>
                  <small>{isAr ? 'القسط الشهري' : 'Monthly Payment'}</small>
                  <strong>
                    {formatMoney(comparison.offerA.monthlyPayment)}
                  </strong>
                </div>

                <div className={styles.offerSubStatsList}>
                  <div className={styles.offerSubRow}>
                    <span>{isAr ? 'إجمالي الفوائد:' : 'Total Interest:'}</span>
                    <strong className={styles.textAmber}>
                      {formatMoney(comparison.offerA.totalInterest)}
                    </strong>
                  </div>
                  <div className={styles.offerSubRow}>
                    <span>{isAr ? 'الرسوم الإدارية:' : 'Upfront Fees:'}</span>
                    <strong>{formatMoney(comparison.offerA.upfrontFees)}</strong>
                  </div>
                  <div className={styles.offerSubRowTotal}>
                    <span>
                      {isAr ? 'التكلفة الكلية النهائية:' : 'True Total Cost:'}
                    </span>
                    <strong>
                      {formatMoney(comparison.offerA.totalCostWithFees)}
                    </strong>
                  </div>
                </div>

                {/* Stacked Bar A */}
                <div className={styles.stackedCostTrack}>
                  <div
                    className={styles.barSegPrincipal}
                    style={{ width: `${comparison.offerA.principalSharePct}%` }}
                  />
                  <div
                    className={styles.barSegInterest}
                    style={{ width: `${comparison.offerA.interestSharePct}%` }}
                  />
                  <div
                    className={styles.barSegFees}
                    style={{ width: `${comparison.offerA.feesSharePct}%` }}
                  />
                </div>
              </div>

              {/* Offer B Card */}
              <div
                className={`${styles.offerResultCard} ${
                  comparison.winnerTotalCost === 'B'
                    ? styles.offerResultCardWinner
                    : ''
                }`}
              >
                <div className={styles.offerResultHeader}>
                  <span className={styles.offerNameTagCyan}>
                    {isAr ? 'العرض الثاني (ب)' : 'Offer B'}
                  </span>
                  {comparison.winnerTotalCost === 'B' && (
                    <span className={styles.winnerLabelText}>
                      {isAr ? 'الأوفر إجمالاً ✓' : 'Best Total Value ✓'}
                    </span>
                  )}
                </div>

                <div className={styles.offerMainStat}>
                  <small>{isAr ? 'القسط الشهري' : 'Monthly Payment'}</small>
                  <strong>
                    {formatMoney(comparison.offerB.monthlyPayment)}
                  </strong>
                </div>

                <div className={styles.offerSubStatsList}>
                  <div className={styles.offerSubRow}>
                    <span>{isAr ? 'إجمالي الفوائد:' : 'Total Interest:'}</span>
                    <strong className={styles.textAmber}>
                      {formatMoney(comparison.offerB.totalInterest)}
                    </strong>
                  </div>
                  <div className={styles.offerSubRow}>
                    <span>{isAr ? 'الرسوم الإدارية:' : 'Upfront Fees:'}</span>
                    <strong>{formatMoney(comparison.offerB.upfrontFees)}</strong>
                  </div>
                  <div className={styles.offerSubRowTotal}>
                    <span>
                      {isAr ? 'التكلفة الكلية النهائية:' : 'True Total Cost:'}
                    </span>
                    <strong>
                      {formatMoney(comparison.offerB.totalCostWithFees)}
                    </strong>
                  </div>
                </div>

                {/* Stacked Bar B */}
                <div className={styles.stackedCostTrack}>
                  <div
                    className={styles.barSegPrincipal}
                    style={{ width: `${comparison.offerB.principalSharePct}%` }}
                  />
                  <div
                    className={styles.barSegInterest}
                    style={{ width: `${comparison.offerB.interestSharePct}%` }}
                  />
                  <div
                    className={styles.barSegFees}
                    style={{ width: `${comparison.offerB.feesSharePct}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Early Payoff Impact Banner */}
            {comparison.extraMonthly > 0 && (
              <div className={styles.earlyPayoffCallout}>
                <TrendingDown size={17} className={styles.iconEmerald} />
                <div className={styles.earlyPayoffText}>
                  <strong>
                    {isAr
                      ? `أثر السداد المبكر (+${formatMoney(
                          comparison.extraMonthly
                        )} شهرياً):`
                      : `Early Payoff Impact (+${formatMoney(
                          comparison.extraMonthly
                        )}/mo):`}
                  </strong>
                  <span>
                    {isAr
                      ? `في العرض (أ) يختصر ${
                          comparison.offerA.earlyPayoffMonthsSaved
                        } شهراً ويوفر ${formatMoney(
                          comparison.offerA.earlyPayoffInterestSaved
                        )} من الفوائد · وفي العرض (ب) يختصر ${
                          comparison.offerB.earlyPayoffMonthsSaved
                        } شهراً ويوفر ${formatMoney(
                          comparison.offerB.earlyPayoffInterestSaved
                        )}.`
                      : `In Offer A, cuts ${
                          comparison.offerA.earlyPayoffMonthsSaved
                        } mos & saves ${formatMoney(
                          comparison.offerA.earlyPayoffInterestSaved
                        )} interest · In Offer B, cuts ${
                          comparison.offerB.earlyPayoffMonthsSaved
                        } mos & saves ${formatMoney(
                          comparison.offerB.earlyPayoffInterestSaved
                        )}.`}
                  </span>
                </div>
              </div>
            )}
          </section>

          {/* 2. INTERACTIVE ANNUAL AMORTIZATION SCHEDULE TABLE */}
          <section className={styles.reportSectionCard}>
            <div className={styles.sectionHeaderRow}>
              <div>
                <h3 className={styles.sectionTitle}>
                  {isAr
                    ? 'جدول الإطفاء السنوي (Amortization Schedule)'
                    : 'Annual Amortization & Balance Paydown Schedule'}
                </h3>
                <p className={styles.sectionSub}>
                  {isAr
                    ? 'تابع كيف يتوزع سدادك السنوي بين أصل الدين والفوائد وكم يتبقى عليك نهاية كل سنة.'
                    : 'Track how much goes toward principal vs. interest each year and your remaining balance.'}
                </p>
              </div>

              <div className={styles.scheduleTabSwitcher}>
                <button
                  type="button"
                  onClick={() => setScheduleOfferTab('A')}
                  className={`${styles.scheduleTabBtn} ${
                    scheduleOfferTab === 'A' ? styles.scheduleTabBtnActive : ''
                  }`}
                >
                  {isAr ? 'جدول العرض (أ)' : 'Offer A Table'}
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleOfferTab('B')}
                  className={`${styles.scheduleTabBtn} ${
                    scheduleOfferTab === 'B' ? styles.scheduleTabBtnActive : ''
                  }`}
                >
                  {isAr ? 'جدول العرض (ب)' : 'Offer B Table'}
                </button>
              </div>
            </div>

            {activeSchedule.length > 0 ? (
              <div className={styles.tableScrollWrap}>
                <table className={styles.amortizationTable}>
                  <thead>
                    <tr>
                      <th>{isAr ? 'السنة' : 'Year'}</th>
                      <th>{isAr ? 'إجمالي المدفوع' : 'Total Paid'}</th>
                      <th>{isAr ? 'المسدد من الأصل' : 'Principal Paid'}</th>
                      <th>{isAr ? 'المسدد للفوائد' : 'Interest Paid'}</th>
                      <th>{isAr ? 'الرصيد المتبقي' : 'Ending Balance'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeSchedule.map((row) => (
                      <tr key={row.year}>
                        <td className={styles.tdYear}>
                          {isAr ? `السنة ${row.year}` : `Yr ${row.year}`}
                        </td>
                        <td>{formatMoney(row.paymentTotal)}</td>
                        <td className={styles.tdEmerald}>
                          {formatMoney(row.principalPaid)}
                        </td>
                        <td className={styles.tdAmber}>
                          {formatMoney(row.interestPaid)}
                        </td>
                        <td className={styles.tdBalance}>
                          {formatMoney(row.endingBalance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className={styles.viewedEmptyHint}>
                {isAr
                  ? 'أدخل مبلغ القرض أعلاه لعرض جدول الإطفاء السنوي.'
                  : 'Enter a loan amount above to generate the annual amortization table.'}
              </div>
            )}
          </section>

          {/* 3. ACTION FOOTER BAR */}
          <div className={styles.actionFooterBar}>
            <button
              type="button"
              onClick={handleCopyComparison}
              className={styles.copyReportBtn}
            >
              {copiedComparison ? (
                <>
                  <Check size={16} aria-hidden="true" />
                  <span>
                    {isAr
                      ? 'تم نسخ تقرير المقارنة بنجاح'
                      : 'Loan Comparison Copied'}
                  </span>
                </>
              ) : (
                <>
                  <Copy size={16} aria-hidden="true" />
                  <span>
                    {isAr
                      ? 'نسخ تقرير مقارنة القروض المفصل'
                      : 'Copy Full Loan Comparison Report'}
                  </span>
                </>
              )}
            </button>

            <Link
              href={`/${locale}/tools/hidden-interest-calculator`}
              className={styles.crossToolLinkBtn}
            >
              <span>
                {isAr
                  ? 'اكشف الفائدة الخفية لمشتريات التقسيط ↖'
                  : 'Check Hidden Markup on Installments ↗'}
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoanComparison;
