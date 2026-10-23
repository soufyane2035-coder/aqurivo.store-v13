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
import { HiddenInterestLogo } from './HiddenInterestLogo';
import styles from './HiddenInterestCalculator.module.css';

export interface HiddenInterestCalculatorProps {
  locale: 'ar' | 'en';
  initialPrice?: number;
}

type InspectorMode = 'standard' | 'zero_trap' | 'compare';

type VerdictTier = 'golden_zero' | 'fair_markup' | 'high_hidden' | 'predatory_trap';

const MONTH_PILLS = [3, 4, 6, 9, 12, 18, 24, 36];
const FEE_PILLS = [0, 15, 25, 50, 100];

/**
 * Computes the annualized Effective APR (%) using binary search on the monthly annuity equation:
 * NetFinanced = sum_{t=1..N} PMT / (1 + r)^t
 * where NetFinanced = CashPrice - DownPayment - UpfrontAdminFee.
 */
function calculateEffectiveAnnualApr(
  netFinancedPrincipal: number,
  monthlyPayment: number,
  months: number
): number {
  if (netFinancedPrincipal <= 0 || monthlyPayment <= 0 || months <= 0) {
    return 0;
  }
  const totalInstallments = monthlyPayment * months;
  if (totalInstallments <= netFinancedPrincipal + 0.005) {
    return 0;
  }

  let low = 0;
  let high = 1.5; // up to 150% per month (1800% APR)
  for (let i = 0; i < 48; i++) {
    const mid = (low + high) / 2;
    if (mid === 0) {
      low = 1e-7;
      continue;
    }
    const pv =
      (monthlyPayment * (1 - Math.pow(1 + mid, -months))) / mid;
    if (pv > netFinancedPrincipal) {
      low = mid;
    } else {
      high = mid;
    }
  }
  const monthlyRate = (low + high) / 2;
  return Math.min(999, monthlyRate * 12 * 100);
}

export function HiddenInterestCalculator({
  locale,
  initialPrice,
}: HiddenInterestCalculatorProps) {
  const isAr = locale === 'ar';

  // Browser-viewed store products + on-demand store catalog search
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

  // Inspector Mode
  const [mode, setMode] = useState<InspectorMode>('standard');

  // Shared / Standard Mode State
  const [cashPriceInput, setCashPriceInput] = useState<string>(
    initialPrice && initialPrice > 0 ? String(initialPrice) : '1000'
  );
  const [downPaymentInput, setDownPaymentInput] = useState<string>('0');
  const [monthsCount, setMonthsCount] = useState<number>(12);
  const [monthlyPaymentInput, setMonthlyPaymentInput] = useState<string>(
    initialPrice && initialPrice > 0
      ? String(Math.round((initialPrice * 1.15) / 12))
      : '95'
  );
  const [adminFeeInput, setAdminFeeInput] = useState<string>('0');

  // Mode 2: 0% BNPL Markup Trap State
  const [advertisedZeroPriceInput, setAdvertisedZeroPriceInput] = useState<string>(
    initialPrice && initialPrice > 0
      ? String(Math.round(initialPrice * 1.14))
      : '1140'
  );

  // Mode 3: Plan B Duel Comparison State
  const [planBMonths, setPlanBMonths] = useState<number>(18);
  const [planBMonthlyInput, setPlanBMonthlyInput] = useState<string>(
    initialPrice && initialPrice > 0
      ? String(Math.round((initialPrice * 1.22) / 18))
      : '68'
  );
  const [planBDownInput, setPlanBDownInput] = useState<string>('0');
  const [planBFeeInput, setPlanBFeeInput] = useState<string>('25');

  // Active hovered month in the interactive X-Ray timeline
  const [inspectedMonth, setInspectedMonth] = useState<number | null>(null);

  // Western numerals formatters (strictly 'en-US' in both Arabic and English)
  const currencyFmt = useMemo(
    () =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 2,
      }),
    []
  );

  const wholeCurrencyFmt = useMemo(
    () =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }),
    []
  );

  const numberFmt = useMemo(
    () =>
      new Intl.NumberFormat('en-US', {
        maximumFractionDigits: 1,
      }),
    []
  );

  const applyViewedProduct = (item: BrowserProductSnapshot, fromSearch = false) => {
    const roundedCash = Math.max(10, Math.round(item.priceUsd));
    setSelectedViewedProduct(item);
    if (fromSearch) {
      recordBrowserProductView(item);
      setViewedProducts(getBrowserViewedProducts());
    }
    setCashPriceInput(String(roundedCash));
    setDownPaymentInput('0');
    setMonthsCount(12);
    // Calibrate a typical store installment offer (~14% markup over 12 months) to inspect
    const realisticMonthly = Math.max(1, Math.round(((roundedCash * 1.14) / 12) * 10) / 10);
    setMonthlyPaymentInput(String(realisticMonthly));
    setAdvertisedZeroPriceInput(String(Math.round(roundedCash * 1.12)));
    setPlanBMonths(18);
    setPlanBMonthlyInput(
      String(Math.max(1, Math.round(((roundedCash * 1.21) / 18) * 10) / 10))
    );
  };

  useEffect(() => {
    const stored = getBrowserViewedProducts();
    setViewedProducts(stored);

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const queryPrice = Number(params.get('price'));
      if (Number.isFinite(queryPrice) && queryPrice > 0) {
        const rounded = Math.round(queryPrice);
        setCashPriceInput(String(rounded));
        setMonthlyPaymentInput(
          String(Math.max(1, Math.round(((rounded * 1.14) / 12) * 10) / 10))
        );
        setAdvertisedZeroPriceInput(String(Math.round(rounded * 1.12)));
        return;
      }
    }

    if (!initialPrice && stored.length > 0) {
      const topExplicit = stored.find((item) => item.isExplicitlyViewed) || stored[0];
      if (topExplicit) {
        applyViewedProduct(topExplicit);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        // Enrich older localStorage snapshots with full catalog search keywords
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

  // Core Analytical Calculation
  const analysis = useMemo(() => {
    const rawCash = Math.max(0, Number(cashPriceInput) || 0);
    const safeMonths = Math.max(1, Math.min(60, Math.round(monthsCount || 12)));
    const rawAdminFee = Math.max(0, Number(adminFeeInput) || 0);

    let effectiveDown = Math.max(0, Number(downPaymentInput) || 0);
    let effectiveMonthly = Math.max(0, Number(monthlyPaymentInput) || 0);
    let totalInstallmentOutflow = 0;

    if (mode === 'zero_trap') {
      // In 0% Trap mode, store advertises a total price split equally over safeMonths
      const advTotal = Math.max(0, Number(advertisedZeroPriceInput) || 0);
      effectiveDown = 0;
      effectiveMonthly = safeMonths > 0 ? advTotal / safeMonths : 0;
      totalInstallmentOutflow = advTotal + rawAdminFee;
    } else {
      totalInstallmentOutflow =
        effectiveDown + effectiveMonthly * safeMonths + rawAdminFee;
    }

    const isInvalid =
      rawCash <= 0 ||
      safeMonths <= 0 ||
      effectiveMonthly <= 0 ||
      effectiveDown >= rawCash ||
      totalInstallmentOutflow < rawCash;

    if (isInvalid) {
      return {
        isInvalid: true,
        cashPrice: rawCash || 1000,
        downPayment: effectiveDown,
        months: safeMonths,
        monthlyPayment: effectiveMonthly,
        adminFee: rawAdminFee,
        totalPaid: totalInstallmentOutflow,
        extraCost: 0,
        interestOnlyExtra: 0,
        flatMarkupPct: 0,
        effectiveApr: 0,
        principalMonthsExact: safeMonths,
        interestMonthsExact: 0,
        cashRatioPct: 100,
        fairnessScore: 100,
        verdictTier: 'golden_zero' as VerdictTier,
        timelineCells: [] as Array<{
          month: number;
          type: 'principal' | 'split' | 'interest';
          principalSharePct: number;
          cumulativePaid: number;
        }>,
        planB: null,
      };
    }

    const extraCost = Math.max(0, totalInstallmentOutflow - rawCash);
    const interestOnlyExtra = Math.max(0, extraCost - rawAdminFee);
    const financedPrincipal = Math.max(1, rawCash - effectiveDown);
    const netFinancedAfterFee = Math.max(1, financedPrincipal - rawAdminFee);

    // Nominal flat markup over the financed amount
    const flatMarkupPct = (extraCost / rawCash) * 100;

    // True Effective Annualized APR (accounting for monthly principal paydown + upfront admin fee)
    const effectiveApr = calculateEffectiveAnnualApr(
      netFinancedAfterFee,
      effectiveMonthly,
      safeMonths
    );

    // How many months of installments go toward paying the remaining cash balance vs pure extra cost
    const remainingCashAfterDown = Math.max(0, rawCash - effectiveDown);
    const principalMonthsExact =
      effectiveMonthly > 0
        ? Math.min(safeMonths, remainingCashAfterDown / effectiveMonthly)
        : safeMonths;
    const interestMonthsExact = Math.max(0, safeMonths - principalMonthsExact);

    // Build Interactive Timeline Cells (capped at 36 cells for clean visual display)
    const visualCellCount = Math.min(36, safeMonths);
    const timelineCells: Array<{
      month: number;
      type: 'principal' | 'split' | 'interest';
      principalSharePct: number;
      cumulativePaid: number;
    }> = [];

    for (let m = 1; m <= visualCellCount; m++) {
      // Scale month index if safeMonths > 36
      const scaledStart = ((m - 1) / visualCellCount) * safeMonths;
      const scaledEnd = (m / visualCellCount) * safeMonths;

      let type: 'principal' | 'split' | 'interest' = 'principal';
      let principalSharePct = 100;

      if (scaledEnd <= principalMonthsExact + 0.001) {
        type = 'principal';
        principalSharePct = 100;
      } else if (scaledStart >= principalMonthsExact - 0.001) {
        type = 'interest';
        principalSharePct = 0;
      } else {
        type = 'split';
        const overlap = principalMonthsExact - scaledStart;
        const span = scaledEnd - scaledStart;
        principalSharePct = Math.round(
          Math.max(10, Math.min(90, (overlap / span) * 100))
        );
      }

      const cumulativePaid =
        effectiveDown + rawAdminFee + effectiveMonthly * Math.round(scaledEnd);

      timelineCells.push({
        month: Math.round(scaledEnd),
        type,
        principalSharePct,
        cumulativePaid,
      });
    }

    // Verdict & Fairness Score (0 - 100)
    let verdictTier: VerdictTier = 'golden_zero';
    let fairnessScore = 100;

    if (extraCost <= 0.5) {
      verdictTier = 'golden_zero';
      fairnessScore = 98;
    } else if (effectiveApr <= 14 && flatMarkupPct <= 8) {
      verdictTier = 'fair_markup';
      fairnessScore = Math.max(72, Math.round(94 - effectiveApr * 1.4));
    } else if (effectiveApr <= 28 && flatMarkupPct <= 18) {
      verdictTier = 'high_hidden';
      fairnessScore = Math.max(40, Math.round(75 - (effectiveApr - 12) * 1.8));
    } else {
      verdictTier = 'predatory_trap';
      fairnessScore = Math.max(8, Math.round(38 - (effectiveApr - 28) * 0.8));
    }

    const cashRatioPct = Math.min(
      100,
      Math.max(12, (rawCash / totalInstallmentOutflow) * 100)
    );

    // Plan B calculation for Compare Mode
    const bMonths = Math.max(1, Math.min(60, Math.round(planBMonths || 18)));
    const bMonthly = Math.max(0, Number(planBMonthlyInput) || 0);
    const bDown = Math.max(0, Number(planBDownInput) || 0);
    const bFee = Math.max(0, Number(planBFeeInput) || 0);
    const bTotalPaid = bDown + bMonthly * bMonths + bFee;
    const bExtraCost = Math.max(0, bTotalPaid - rawCash);
    const bNetFinanced = Math.max(1, rawCash - bDown - bFee);
    const bApr =
      bTotalPaid >= rawCash && bMonthly > 0
        ? calculateEffectiveAnnualApr(bNetFinanced, bMonthly, bMonths)
        : 0;

    return {
      isInvalid: false,
      cashPrice: rawCash,
      downPayment: effectiveDown,
      months: safeMonths,
      monthlyPayment: effectiveMonthly,
      adminFee: rawAdminFee,
      totalPaid: totalInstallmentOutflow,
      extraCost,
      interestOnlyExtra,
      flatMarkupPct,
      effectiveApr,
      principalMonthsExact,
      interestMonthsExact,
      cashRatioPct,
      fairnessScore,
      verdictTier,
      timelineCells,
      planB: {
        months: bMonths,
        monthlyPayment: bMonthly,
        downPayment: bDown,
        adminFee: bFee,
        totalPaid: bTotalPaid,
        extraCost: bExtraCost,
        effectiveApr: bApr,
        isValid: bTotalPaid >= rawCash && bMonthly > 0 && bDown < rawCash,
      },
    };
  }, [
    cashPriceInput,
    downPaymentInput,
    monthsCount,
    monthlyPaymentInput,
    adminFeeInput,
    mode,
    advertisedZeroPriceInput,
    planBMonths,
    planBMonthlyInput,
    planBDownInput,
    planBFeeInput,
  ]);

  const verdictMeta = useMemo(() => {
    switch (analysis.verdictTier) {
      case 'golden_zero':
        return {
          badgeAr: 'صفقة تقسيط ذهبية • 0% فائدة خفية',
          badgeEn: 'GOLDEN 0% DEAL • ZERO MARKUP',
          headlineAr: 'تقسيط بسعر الكاش الحقيقي بدون أي رسوم مستترة',
          headlineEn: 'True Cash-Parity Installment with Zero Hidden Markup',
          summaryAr:
            'أنت لا تدفع أي دولار إضافي فوق سعر الكاش الأصلي. الاحتفاظ بسيولتك النقدية وتقسيط المبلغ هنا قرار مالي ذكي بالكامل.',
          summaryEn:
            'You are paying zero extra dollars over the cash price. Keeping your cash liquidity and using this installment plan is a smart financial move.',
          toneClass: styles.verdictTeal,
        };
      case 'fair_markup':
        return {
          badgeAr: 'هامش تمويل معتدل ومنطقي',
          badgeEn: 'MODERATE & FAIR FINANCING MARGIN',
          headlineAr: 'تكلفة التقسيط ضمن النطاق المنطقي مقابل الاحتفاظ بالسيولة',
          headlineEn: 'Installment Cost is Within Reasonable Bounds for Liquidity',
          summaryAr: isAr
            ? `أنت تدفع زيادة قدرها ${currencyFmt.format(
                analysis.extraCost
              )} بمعدل سنوي فعلي ${numberFmt.format(
                analysis.effectiveApr
              )}%. إذا كنت تستثمر سيولتك أو تحتاجها لضرورة، فالعرض مقبول.`
            : `You pay an extra ${currencyFmt.format(
                analysis.extraCost
              )} (${numberFmt.format(
                analysis.effectiveApr
              )}% True APR). Acceptable if preserving monthly cash flow is your priority.`,
          toneClass: styles.verdictBalanced,
        };
      case 'high_hidden':
        return {
          badgeAr: 'تنبيه: فائدة مقنّعة مرتفعة',
          badgeEn: 'WARNING: HIGH DISGUISED INTEREST',
          headlineAr: 'الفائدة الفعلية أعلى بكثير مما تبدو عليه الأقساط الشهرية',
          headlineEn: 'True Effective APR is Significantly Higher Than It Looks',
          summaryAr: isAr
            ? `رغم أن الزيادة الظاهرية تبدو ${numberFmt.format(
                analysis.flatMarkupPct
              )}%، إلا أن الفائدة السنوية المركبة الفعلية تبلغ ${numberFmt.format(
                analysis.effectiveApr
              )}%! الدفع نقداً أو التفاوض يوفر عليك ${currencyFmt.format(
                analysis.extraCost
              )}.`
            : `While the flat markup looks like ${numberFmt.format(
                analysis.flatMarkupPct
              )}%, the True Annualized APR reaches ${numberFmt.format(
                analysis.effectiveApr
              )}%! Paying cash saves you ${currencyFmt.format(analysis.extraCost)}.`,
          toneClass: styles.verdictAmber,
        };
      case 'predatory_trap':
      default:
        return {
          badgeAr: 'تحذير: فخ استنزاف مالي مكلف جداً',
          badgeEn: 'ALERT: PREDATORY INSTALLMENT TRAP',
          headlineAr: 'أنت تدفع ضريبة تقسيط باهظة تلتهم قيمة المنتج',
          headlineEn: 'Severe Financing Markup Eroding Product Value',
          summaryAr: isAr
            ? `التكلفة السنوية الفعلية للأموال هنا تقفز إلى ${numberFmt.format(
                analysis.effectiveApr
              )}% مع زيادة إجمالية ${currencyFmt.format(
                analysis.extraCost
              )}. نوصي بشدة بتجنب هذا العرض والشراء نقداً أو البحث عن بديل بـ 0% حقيقي.`
            : `The True Effective APR jumps to ${numberFmt.format(
                analysis.effectiveApr
              )}% with ${currencyFmt.format(
                analysis.extraCost
              )} in extra charges. Strongly consider paying cash or finding a genuine 0% alternative.`,
          toneClass: styles.verdictCrimson,
        };
    }
  }, [
    analysis.verdictTier,
    analysis.extraCost,
    analysis.effectiveApr,
    analysis.flatMarkupPct,
    isAr,
    currencyFmt,
    numberFmt,
  ]);

  const activeTimelineCell = useMemo(() => {
    if (!analysis.timelineCells.length) return null;
    if (inspectedMonth !== null) {
      return (
        analysis.timelineCells.find((c) => c.month === inspectedMonth) ||
        analysis.timelineCells[analysis.timelineCells.length - 1]
      );
    }
    return analysis.timelineCells[analysis.timelineCells.length - 1];
  }, [analysis.timelineCells, inspectedMonth]);

  return (
    <div className={styles.xrayLabWrapper} dir={isAr ? 'rtl' : 'ltr'}>
      {/* 1. ARCHITECTURAL STORE DOCK (Sleek Horizontal Telemetry Ribbon — Zero Vertical Stacking) */}
      <div className={styles.storeViewedBar}>
        <div className={styles.storeViewedHeader}>
          <div className={styles.storeViewedLabelWrap}>
            <span className={styles.telemetryDiamond} aria-hidden="true">
              ◆
            </span>
            <span className={styles.storeViewedLabel}>
              {viewedProducts.length > 0
                ? isAr
                  ? 'افحص تقسيط منتج شاهدته بنقرة:'
                  : '1-Click Store Installment X-Ray:'
                : isAr
                  ? 'افحص تقسيط أي منتج في المتجر بنقرة:'
                  : 'Inspect any store product in 1 click:'}
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
                        {currencyFmt.format(item.priceUsd)}
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

      {/* 2. 3-MODE TRAP DETECTOR SWITCHER */}
      <div className={styles.modeSwitcherBar} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'standard'}
          onClick={() => setMode('standard')}
          className={`${styles.modeTabBtn} ${
            mode === 'standard' ? styles.modeTabBtnActive : ''
          }`}
        >
          <span className={styles.modeCode}>01</span>
          <div className={styles.modeTabText}>
            <span className={styles.modeTabTitle}>
              {isAr ? 'مِجهر عقد التقسيط الشامل' : 'Full Installment X-Ray'}
            </span>
            <span className={styles.modeTabSub}>
              {isAr
                ? 'أقساط + دفعة أولى + رسوم إدارية'
                : 'Monthly + Down Payment + Admin Fees'}
            </span>
          </div>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={mode === 'zero_trap'}
          onClick={() => setMode('zero_trap')}
          className={`${styles.modeTabBtn} ${
            mode === 'zero_trap' ? styles.modeTabBtnActive : ''
          }`}
        >
          <span className={styles.modeCode}>02</span>
          <div className={styles.modeTabText}>
            <span className={styles.modeTabTitle}>
              {isAr ? 'كاشف خدعة «0% فائدة»' : '0% BNPL Markup Trap'}
            </span>
            <span className={styles.modeTabSub}>
              {isAr
                ? 'كشف الزيادة المخبأة داخل سعر المنتج'
                : 'Uncover markup hidden in inflated price'}
            </span>
          </div>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={mode === 'compare'}
          onClick={() => setMode('compare')}
          className={`${styles.modeTabBtn} ${
            mode === 'compare' ? styles.modeTabBtnActive : ''
          }`}
        >
          <span className={styles.modeCode}>03</span>
          <div className={styles.modeTabText}>
            <span className={styles.modeTabTitle}>
              {isAr ? 'مواجهة عرضي تقسيط (أ vs ب)' : 'Offer A vs Offer B Duel'}
            </span>
            <span className={styles.modeTabSub}>
              {isAr
                ? 'حسم العرض الأوفر مالياً والأقل فائدة'
                : 'Crown the lowest APR & total cost'}
            </span>
          </div>
        </button>
      </div>

      {/* 3. MAIN ARCHITECTURAL WORKBENCH GRID */}
      <div className={styles.studioGrid}>
        {/* LEFT / START COLUMN: INTERACTIVE CALIBRATION CONTROLS */}
        <div className={styles.controlsColumn}>
          <section className={styles.panelCard}>
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.panelStep}>
                  {mode === 'zero_trap'
                    ? isAr
                      ? 'الوضع 02 • فحص عروض 0%'
                      : 'MODE 02 • 0% TRAP DETECTOR'
                    : mode === 'compare'
                      ? isAr
                        ? 'الوضع 03 • مقارنة عرضين'
                        : 'MODE 03 • PLAN DUEL'
                      : isAr
                        ? 'الوضع 01 • بيانات عقد التقسيط'
                        : 'MODE 01 • CONTRACT PARAMETERS'}
                </span>
                <h2 className={styles.panelTitle}>
                  {mode === 'zero_trap'
                    ? isAr
                      ? 'قارن سعر «تقسيط 0%» بأقل سعر كاش في السوق'
                      : 'Compare Advertised 0% Price vs. True Cash Price'
                    : isAr
                      ? 'معايرة السعر النقدي، الدفعة، والأقساط'
                      : 'Calibrate Cash Price, Down Payment & Installments'}
                </h2>
              </div>
              <span className={styles.panelHint}>
                {isAr ? 'تحديث لحظي فوري' : 'Real-time calibration'}
              </span>
            </div>

            {/* CONTROL 1: TRUE CASH PRICE */}
            <div className={styles.controlBlock}>
              <div className={styles.controlTopRow}>
                <label htmlFor="hi-cash-input" className={styles.controlLabel}>
                  <span>
                    {mode === 'zero_trap'
                      ? isAr
                        ? 'أقل سعر فوري (كاش) متاح للمنتج'
                        : 'Lowest True Cash Price Available'
                      : isAr
                        ? 'سعر المنتج الأصلي (نقداً / كاش)'
                        : 'Original Product Cash Price'}
                  </span>
                  <span className={styles.controlSublabel}>
                    {isAr
                      ? 'السعر الذي تدفعه لو اشتريت المنتج فوراً بدون تقسيط'
                      : 'The upfront price if bought immediately in cash'}
                  </span>
                </label>

                <div className={styles.numberInputWrap} dir="ltr">
                  <span className={styles.currencySymbol}>$</span>
                  <input
                    id="hi-cash-input"
                    type="number"
                    min="1"
                    step="any"
                    value={cashPriceInput}
                    onChange={(e) => {
                      setCashPriceInput(e.target.value);
                      setSelectedViewedProduct(null);
                    }}
                    className={styles.inlineNumberInput}
                  />
                </div>
              </div>

              <input
                type="range"
                min="25"
                max="5000"
                step="25"
                value={Math.min(5000, Math.max(25, Number(cashPriceInput) || 25))}
                onChange={(e) => {
                  const newCash = Number(e.target.value);
                  setCashPriceInput(String(newCash));
                  setSelectedViewedProduct(null);
                  if (mode === 'zero_trap') {
                    setAdvertisedZeroPriceInput(String(Math.round(newCash * 1.12)));
                  } else {
                    setMonthlyPaymentInput(
                      String(
                        Math.max(
                          1,
                          Math.round(((newCash * 1.14) / monthsCount) * 10) / 10
                        )
                      )
                    );
                  }
                }}
                className={styles.rangeSlider}
                aria-label={isAr ? 'مؤشر سعر الكاش' : 'Cash price slider'}
              />
              <div className={styles.rangeScale} dir="ltr">
                <span>$25</span>
                <span>$1,000</span>
                <span>$2,500</span>
                <span>$5,000+</span>
              </div>
            </div>

            <div className={styles.divider} />

            {/* MODE 2 SPECIFIC: ADVERTISED 0% INSTALLMENT TOTAL PRICE */}
            {mode === 'zero_trap' ? (
              <div className={styles.controlBlock}>
                <div className={styles.controlTopRow}>
                  <label htmlFor="hi-zero-adv" className={styles.controlLabel}>
                    <span>
                      {isAr
                        ? 'سعر المنتج في عرض «تقسيط 0% فائدة»'
                        : 'Advertised "0% Installment" Total Price'}
                    </span>
                    <span className={styles.controlSublabel}>
                      {isAr
                        ? 'غالباً ما ترفع المتاجر السعر أو تلغي خصم الكاش لتعويض الفائدة'
                        : 'Stores often inflate the item price or remove cash discounts'}
                    </span>
                  </label>

                  <div className={styles.numberInputWrap} dir="ltr">
                    <span className={styles.currencySymbol}>$</span>
                    <input
                      id="hi-zero-adv"
                      type="number"
                      min="1"
                      step="any"
                      value={advertisedZeroPriceInput}
                      onChange={(e) => setAdvertisedZeroPriceInput(e.target.value)}
                      className={styles.inlineNumberInput}
                    />
                  </div>
                </div>

                <input
                  type="range"
                  min={Math.max(25, Math.round(analysis.cashPrice))}
                  max={Math.max(5500, Math.round(analysis.cashPrice * 1.6))}
                  step="10"
                  value={Math.max(
                    analysis.cashPrice,
                    Number(advertisedZeroPriceInput) || analysis.cashPrice
                  )}
                  onChange={(e) => setAdvertisedZeroPriceInput(e.target.value)}
                  className={styles.rangeSlider}
                  aria-label={
                    isAr ? 'سعر عرض التقسيط المعلن' : 'Advertised 0% total price'
                  }
                />
              </div>
            ) : (
              /* STANDARD & COMPARE MODE: MONTHLY INSTALLMENT AMOUNT */
              <div className={styles.controlBlock}>
                <div className={styles.controlTopRow}>
                  <label htmlFor="hi-monthly-input" className={styles.controlLabel}>
                    <span>
                      {mode === 'compare'
                        ? isAr
                          ? 'العرض (أ): قيمة القسط الشهري'
                          : 'Offer (A): Monthly Installment'
                        : isAr
                          ? 'قيمة القسط الشهري الواحد'
                          : 'Monthly Installment Amount'}
                    </span>
                    <span className={styles.controlSublabel}>
                      {isAr
                        ? `القسط المتساوي لو كان بـ 0% فائدة هو ${currencyFmt.format(
                            Math.max(
                              0,
                              (analysis.cashPrice - analysis.downPayment) /
                                analysis.months
                            )
                          )}/شهر`
                        : `True 0% equal installment would be ${currencyFmt.format(
                            Math.max(
                              0,
                              (analysis.cashPrice - analysis.downPayment) /
                                analysis.months
                            )
                          )}/mo`}
                    </span>
                  </label>

                  <div className={styles.numberInputWrap} dir="ltr">
                    <span className={styles.currencySymbol}>$</span>
                    <input
                      id="hi-monthly-input"
                      type="number"
                      min="1"
                      step="any"
                      value={monthlyPaymentInput}
                      onChange={(e) => setMonthlyPaymentInput(e.target.value)}
                      className={styles.inlineNumberInput}
                    />
                  </div>
                </div>

                <input
                  type="range"
                  min={Math.max(
                    1,
                    Math.floor(
                      (analysis.cashPrice - analysis.downPayment) /
                        Math.max(1, analysis.months)
                    )
                  )}
                  max={Math.max(
                    50,
                    Math.ceil(
                      ((analysis.cashPrice - analysis.downPayment) * 1.65) /
                        Math.max(1, analysis.months)
                    )
                  )}
                  step="1"
                  value={Math.max(1, Number(monthlyPaymentInput) || 1)}
                  onChange={(e) => setMonthlyPaymentInput(e.target.value)}
                  className={styles.rangeSlider}
                  aria-label={isAr ? 'مؤشر القسط الشهري' : 'Monthly payment slider'}
                />
              </div>
            )}

            <div className={styles.divider} />

            {/* INSTALLMENT DURATION PILLS (MONTHS) */}
            <div className={styles.controlBlock}>
              <div className={styles.controlTopRow}>
                <label htmlFor="hi-months-input" className={styles.controlLabel}>
                  <span>
                    {mode === 'compare'
                      ? isAr
                        ? 'العرض (أ): عدد أشهر التقسيط'
                        : 'Offer (A): Number of Months'
                      : isAr
                        ? 'مدة التقسيط (عدد الأشهر)'
                        : 'Installment Duration (Months)'}
                  </span>
                  <span className={styles.controlSublabel}>
                    {isAr
                      ? 'اختر المدة أو اكتب عدد الأشهر مباشرة'
                      : 'Pick a standard term or enter custom months'}
                  </span>
                </label>

                <div className={styles.numberInputWrap} dir="ltr">
                  <input
                    id="hi-months-input"
                    type="number"
                    min="1"
                    max="60"
                    value={monthsCount}
                    onChange={(e) =>
                      setMonthsCount(
                        Math.max(1, Math.min(60, Number(e.target.value) || 1))
                      )
                    }
                    className={styles.inlineNumberInput}
                  />
                  <span className={styles.unitSuffix}>
                    {isAr ? 'شهر' : 'mo'}
                  </span>
                </div>
              </div>

              <div className={styles.pillsRow} dir="ltr">
                {MONTH_PILLS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMonthsCount(m)}
                    className={`${styles.pillBtn} ${
                      monthsCount === m ? styles.pillBtnActive : ''
                    }`}
                  >
                    {m} {isAr ? 'ش' : 'mo'}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.divider} />

            {/* DOWN PAYMENT & HIDDEN ADMIN FEES */}
            <div className={styles.dualSubGrid}>
              {mode !== 'zero_trap' && (
                <div className={styles.subFieldBlock}>
                  <label htmlFor="hi-down-input" className={styles.subFieldLabel}>
                    <span>
                      {isAr ? 'الدفعة الأولى المقدمة' : 'Upfront Down Payment'}
                    </span>
                    <span className={styles.subFieldHint}>
                      {isAr ? 'تُخصم من أصل التمويل' : 'Deducted from principal'}
                    </span>
                  </label>
                  <div className={styles.numberInputWrapFull} dir="ltr">
                    <span className={styles.currencySymbol}>$</span>
                    <input
                      id="hi-down-input"
                      type="number"
                      min="0"
                      step="10"
                      value={downPaymentInput}
                      onChange={(e) => setDownPaymentInput(e.target.value)}
                      className={styles.inlineNumberInputFull}
                    />
                  </div>
                </div>
              )}

              <div className={styles.subFieldBlock}>
                <label htmlFor="hi-fee-input" className={styles.subFieldLabel}>
                  <span>
                    {isAr
                      ? 'الرسوم الإدارية / فتح الملف'
                      : 'Admin / Origination Fee'}
                  </span>
                  <span className={styles.subFieldHint}>
                    {isAr
                      ? 'رسوم تقتطعها شركات التقسيط'
                      : 'Upfront processing fee'}
                  </span>
                </label>
                <div className={styles.numberInputWrapFull} dir="ltr">
                  <span className={styles.currencySymbol}>$</span>
                  <input
                    id="hi-fee-input"
                    type="number"
                    min="0"
                    step="5"
                    value={adminFeeInput}
                    onChange={(e) => setAdminFeeInput(e.target.value)}
                    className={styles.inlineNumberInputFull}
                  />
                </div>
                <div className={styles.miniPillsRow} dir="ltr">
                  {FEE_PILLS.map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setAdminFeeInput(String(f))}
                      className={`${styles.miniPillBtn} ${
                        Number(adminFeeInput) === f ? styles.miniPillBtnActive : ''
                      }`}
                    >
                      ${f}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* MODE 3 EXTRA CARD: OFFER B DUEL INPUTS */}
          {mode === 'compare' && (
            <section className={styles.panelCardGold}>
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.panelStepGold}>
                    {isAr ? 'الطرف المنافس • العرض (ب)' : 'CHALLENGER • OFFER (B)'}
                  </span>
                  <h3 className={styles.panelTitle}>
                    {isAr
                      ? 'بيانات عرض التقسيط الثاني (ب) للمقارنة'
                      : 'Second Installment Offer (B) Details'}
                  </h3>
                </div>
              </div>

              <div className={styles.dualSubGrid}>
                <div className={styles.subFieldBlock}>
                  <label htmlFor="hi-b-monthly" className={styles.subFieldLabel}>
                    <span>
                      {isAr ? 'القسط الشهري للعرض (ب)' : 'Offer (B) Monthly Payment'}
                    </span>
                  </label>
                  <div className={styles.numberInputWrapFull} dir="ltr">
                    <span className={styles.currencySymbol}>$</span>
                    <input
                      id="hi-b-monthly"
                      type="number"
                      min="1"
                      step="any"
                      value={planBMonthlyInput}
                      onChange={(e) => setPlanBMonthlyInput(e.target.value)}
                      className={styles.inlineNumberInputFull}
                    />
                  </div>
                </div>

                <div className={styles.subFieldBlock}>
                  <label htmlFor="hi-b-months" className={styles.subFieldLabel}>
                    <span>
                      {isAr ? 'عدد أشهر العرض (ب)' : 'Offer (B) Months'}
                    </span>
                  </label>
                  <div className={styles.numberInputWrapFull} dir="ltr">
                    <input
                      id="hi-b-months"
                      type="number"
                      min="1"
                      max="60"
                      value={planBMonths}
                      onChange={(e) =>
                        setPlanBMonths(
                          Math.max(1, Math.min(60, Number(e.target.value) || 1))
                        )
                      }
                      className={styles.inlineNumberInputFull}
                    />
                    <span className={styles.unitSuffix}>
                      {isAr ? 'شهر' : 'mo'}
                    </span>
                  </div>
                </div>

                <div className={styles.subFieldBlock}>
                  <label htmlFor="hi-b-down" className={styles.subFieldLabel}>
                    <span>
                      {isAr ? 'دفعة أولى للعرض (ب)' : 'Offer (B) Down Payment'}
                    </span>
                  </label>
                  <div className={styles.numberInputWrapFull} dir="ltr">
                    <span className={styles.currencySymbol}>$</span>
                    <input
                      id="hi-b-down"
                      type="number"
                      min="0"
                      step="10"
                      value={planBDownInput}
                      onChange={(e) => setPlanBDownInput(e.target.value)}
                      className={styles.inlineNumberInputFull}
                    />
                  </div>
                </div>

                <div className={styles.subFieldBlock}>
                  <label htmlFor="hi-b-fee" className={styles.subFieldLabel}>
                    <span>
                      {isAr ? 'رسوم إدارية للعرض (ب)' : 'Offer (B) Admin Fee'}
                    </span>
                  </label>
                  <div className={styles.numberInputWrapFull} dir="ltr">
                    <span className={styles.currencySymbol}>$</span>
                    <input
                      id="hi-b-fee"
                      type="number"
                      min="0"
                      step="5"
                      value={planBFeeInput}
                      onChange={(e) => setPlanBFeeInput(e.target.value)}
                      className={styles.inlineNumberInputFull}
                    />
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* RIGHT / END COLUMN: ARCHITECTURAL X-RAY VERDICT & TIMELINE */}
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
                  ? 'تأكد أن إجمالي الأقساط والدفعة الأولى لا يقل عن سعر الكاش الأصلي، وأن الدفعة الأولى أقل من سعر المنتج.'
                  : 'Ensure total installments + down payment are at least the cash price, and down payment is less than the cash price.'}
              </p>
            </div>
          ) : (
            <div className={`${styles.verdictStage} ${verdictMeta.toneClass}`}>
              {/* Top Verdict Seal Header */}
              <div className={styles.verdictTopBar}>
                <span className={styles.verdictBadge}>{verdictMeta.badgeAr && (isAr ? verdictMeta.badgeAr : verdictMeta.badgeEn)}</span>
                <span dir="ltr" className={styles.fairnessScorePill}>
                  {isAr ? 'مؤشر عدالة العرض:' : 'Fairness Index:'}{' '}
                  <strong>{analysis.fairnessScore}/100</strong>
                </span>
              </div>

              <h3 className={styles.verdictHeadline}>
                {isAr ? verdictMeta.headlineAr : verdictMeta.headlineEn}
              </h3>
              <p className={styles.verdictSummary}>
                {isAr ? verdictMeta.summaryAr : verdictMeta.summaryEn}
              </p>

              {/* 4-CELL CORE METRICS LEDGER (Strictly Western Numerals) */}
              <div className={styles.coreMetricsGrid}>
                <div className={styles.metricCell}>
                  <span className={styles.metricCellLabel}>
                    {isAr ? 'إجمالي ما ستدفعه بالتقسيط' : 'Total Installment Cost'}
                  </span>
                  <strong dir="ltr" className={styles.metricCellValPrimary}>
                    {currencyFmt.format(analysis.totalPaid)}
                  </strong>
                  <span dir="ltr" className={styles.metricCellSub}>
                    {isAr
                      ? `مقابل ${currencyFmt.format(analysis.cashPrice)} كاش`
                      : `vs ${currencyFmt.format(analysis.cashPrice)} cash`}
                  </span>
                </div>

                <div className={styles.metricCell}>
                  <span className={styles.metricCellLabel}>
                    {isAr
                      ? 'صافي الزيادة الخفية (فوائد + رسوم)'
                      : 'Total Extra Overpayment'}
                  </span>
                  <strong
                    dir="ltr"
                    className={
                      analysis.extraCost > 0
                        ? styles.metricCellValAmber
                        : styles.metricCellValTeal
                    }
                  >
                    +{currencyFmt.format(analysis.extraCost)}
                  </strong>
                  <span dir="ltr" className={styles.metricCellSub}>
                    {analysis.adminFee > 0
                      ? isAr
                        ? `منها ${currencyFmt.format(analysis.adminFee)} رسوم إدارية`
                        : `Includes ${currencyFmt.format(analysis.adminFee)} admin fee`
                      : isAr
                        ? `زيادة ظاهرية +${numberFmt.format(analysis.flatMarkupPct)}%`
                        : `Nominal markup +${numberFmt.format(analysis.flatMarkupPct)}%`}
                  </span>
                </div>

                <div className={styles.metricCellHighlight}>
                  <span className={styles.metricCellLabel}>
                    {isAr
                      ? 'الفائدة السنوية الفعلية المركبة (True APR)'
                      : 'True Effective Annual APR'}
                  </span>
                  <strong
                    dir="ltr"
                    className={
                      analysis.effectiveApr >= 18
                        ? styles.metricCellValAmber
                        : styles.metricCellValTeal
                    }
                  >
                    {numberFmt.format(analysis.effectiveApr)}%
                  </strong>
                  <span className={styles.metricCellSub}>
                    {isAr
                      ? 'التكلفة الحقيقية للأموال بعد احتساب تناقص أصل الدين شهرياً'
                      : 'Real annualized cost accounting for monthly principal paydown'}
                  </span>
                </div>
              </div>

              {/* INTERACTIVE INSTALLMENT TIMELINE X-RAY */}
              <div className={styles.timelineSection}>
                <div className={styles.timelineHeader}>
                  <div>
                    <h4 className={styles.timelineTitle}>
                      {isAr
                        ? 'التشريح الزمني للأقساط: لمن تدفع أموالك كل شهر؟'
                        : 'Installment Timeline X-Ray: Where Does Each Month Go?'}
                    </h4>
                    <p className={styles.timelineSubtitle}>
                      {analysis.interestMonthsExact <= 0.05
                        ? isAr
                          ? `جميع أقساطك الـ ${analysis.months} تذهب بنسبة 100% لسداد القيمة الحقيقية للمنتج (0 شهر فوائد).`
                          : `All ${analysis.months} monthly payments go 100% toward the product's cash value.`
                        : isAr
                          ? `أنت تسدد ثمن المنتج الأصلي خلال أول ${numberFmt.format(
                              analysis.principalMonthsExact
                            )} شهر، بينما تدفع في آخر ${numberFmt.format(
                              analysis.interestMonthsExact
                            )} شهر فوائد ورسوم إضافية خالصة (${currencyFmt.format(
                              analysis.extraCost
                            )})!`
                          : `You pay off the item's cash price in the first ${numberFmt.format(
                              analysis.principalMonthsExact
                            )} months, then spend the last ${numberFmt.format(
                              analysis.interestMonthsExact
                            )} months paying pure interest & fees (${currencyFmt.format(
                              analysis.extraCost
                            )})!`}
                    </p>
                  </div>
                </div>

                {/* Legend */}
                <div className={styles.timelineLegend}>
                  <span className={styles.legendItem}>
                    <span className={styles.legendSwatchTeal} />
                    {isAr
                      ? `قيمة المنتج الحقيقية (${numberFmt.format(
                          analysis.principalMonthsExact
                        )} شهر)`
                      : `True Product Value (${numberFmt.format(
                          analysis.principalMonthsExact
                        )} mo)`}
                  </span>
                  <span className={styles.legendItem}>
                    <span className={styles.legendSwatchAmber} />
                    {isAr
                      ? `فوائد ورسوم إضافية (${numberFmt.format(
                          analysis.interestMonthsExact
                        )} شهر)`
                      : `Pure Interest & Fees (${numberFmt.format(
                          analysis.interestMonthsExact
                        )} mo)`}
                  </span>
                </div>

                {/* Interactive Monthly Cells Grid */}
                <div
                  className={styles.timelineGrid}
                  dir="ltr"
                  onMouseLeave={() => setInspectedMonth(null)}
                >
                  {analysis.timelineCells.map((cell) => {
                    const isActive = activeTimelineCell?.month === cell.month;
                    return (
                      <button
                        key={cell.month}
                        type="button"
                        onMouseEnter={() => setInspectedMonth(cell.month)}
                        onClick={() => setInspectedMonth(cell.month)}
                        className={`${styles.monthCell} ${
                          cell.type === 'principal'
                            ? styles.monthCellPrincipal
                            : cell.type === 'interest'
                              ? styles.monthCellInterest
                              : styles.monthCellSplit
                        } ${isActive ? styles.monthCellActive : ''}`}
                        title={`Month ${cell.month}`}
                      >
                        <span className={styles.monthCellNum}>M{cell.month}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Live Inspected Month Readout */}
                {activeTimelineCell && (
                  <div className={styles.timelineReadout}>
                    <span dir="ltr" className={styles.readoutMonthBadge}>
                      MONTH {activeTimelineCell.month} / {analysis.months}
                    </span>
                    <span className={styles.readoutText}>
                      {activeTimelineCell.type === 'principal'
                        ? isAr
                          ? `في الشهر ${activeTimelineCell.month}: قسطك يسدد ثمن المنتج الأصلي (إجمالي المدفوع حتى هذا الشهر: ${currencyFmt.format(
                              activeTimelineCell.cumulativePaid
                            )}).`
                          : `Month ${activeTimelineCell.month}: Payment covers true product value (Cumulative paid: ${currencyFmt.format(
                              activeTimelineCell.cumulativePaid
                            )}).`
                        : activeTimelineCell.type === 'split'
                          ? isAr
                            ? `في الشهر ${activeTimelineCell.month}: يكتمل سداد سعر الكاش الأصلي، ويبدأ احتساب الفائدة المخفية فوق السعر!`
                            : `Month ${activeTimelineCell.month}: Cash price reaches 100% payoff; extra hidden markup begins here!`
                          : isAr
                            ? `في الشهر ${activeTimelineCell.month}: هذا القسط يذهب بالكامل كفائدة إضافية فوق سعر الكاش (إجمالي المدفوع: ${currencyFmt.format(
                                activeTimelineCell.cumulativePaid
                              )}).`
                            : `Month ${activeTimelineCell.month}: 100% of this payment is pure extra interest above cash price (Total paid: ${currencyFmt.format(
                                activeTimelineCell.cumulativePaid
                              )}).`}
                    </span>
                  </div>
                )}
              </div>

              {/* MODE 3 DUEL TABLE: OFFER A VS OFFER B */}
              {mode === 'compare' && analysis.planB && analysis.planB.isValid && (
                <div className={styles.duelComparisonBox}>
                  <div className={styles.duelHeader}>
                    <h4 className={styles.duelTitle}>
                      {isAr
                        ? 'نتيجة المواجهة: العرض (أ) مقابل العرض (ب)'
                        : 'Head-to-Head Result: Offer (A) vs. Offer (B)'}
                    </h4>
                    <span className={styles.duelWinnerBadge}>
                      {analysis.totalPaid <= analysis.planB.totalPaid
                        ? isAr
                          ? `العرض (أ) أوفر بـ ${currencyFmt.format(
                              analysis.planB.totalPaid - analysis.totalPaid
                            )}`
                          : `Offer (A) saves ${currencyFmt.format(
                              analysis.planB.totalPaid - analysis.totalPaid
                            )}`
                        : isAr
                          ? `العرض (ب) أوفر بـ ${currencyFmt.format(
                              analysis.totalPaid - analysis.planB.totalPaid
                            )}`
                          : `Offer (B) saves ${currencyFmt.format(
                              analysis.totalPaid - analysis.planB.totalPaid
                            )}`}
                    </span>
                  </div>

                  <div className={styles.duelCardsRow}>
                    <div
                      className={`${styles.duelPlanCard} ${
                        analysis.totalPaid <= analysis.planB.totalPaid
                          ? styles.duelPlanWinner
                          : ''
                      }`}
                    >
                      <span className={styles.duelPlanTag}>
                        {isAr ? 'العرض (أ)' : 'Offer (A)'}
                      </span>
                      <strong dir="ltr" className={styles.duelPlanTotal}>
                        {currencyFmt.format(analysis.totalPaid)}
                      </strong>
                      <span dir="ltr" className={styles.duelPlanMeta}>
                        {analysis.months} mo × {currencyFmt.format(analysis.monthlyPayment)}
                      </span>
                      <span dir="ltr" className={styles.duelPlanApr}>
                        APR: {numberFmt.format(analysis.effectiveApr)}% (+
                        {currencyFmt.format(analysis.extraCost)})
                      </span>
                    </div>

                    <div
                      className={`${styles.duelPlanCard} ${
                        analysis.planB.totalPaid < analysis.totalPaid
                          ? styles.duelPlanWinner
                          : ''
                      }`}
                    >
                      <span className={styles.duelPlanTag}>
                        {isAr ? 'العرض (ب)' : 'Offer (B)'}
                      </span>
                      <strong dir="ltr" className={styles.duelPlanTotal}>
                        {currencyFmt.format(analysis.planB.totalPaid)}
                      </strong>
                      <span dir="ltr" className={styles.duelPlanMeta}>
                        {analysis.planB.months} mo ×{' '}
                        {currencyFmt.format(analysis.planB.monthlyPayment)}
                      </span>
                      <span dir="ltr" className={styles.duelPlanApr}>
                        APR: {numberFmt.format(analysis.planB.effectiveApr)}% (+
                        {currencyFmt.format(analysis.planB.extraCost)})
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* CASH NEGOTIATION TARGET & DECISION BRIDGE TO "IS IT WORTH BUYING?" */}
              <div className={styles.actionFooterBox}>
                <div className={styles.negotiationTip}>
                  <span className={styles.negotiationIcon} aria-hidden="true">
                    ◆
                  </span>
                  <p className={styles.negotiationText}>
                    {analysis.extraCost > 0
                      ? isAr
                        ? `نصيحة التفاوض الذكي: الدفع الفوري (كاش) يوفر عليك فوراً ${currencyFmt.format(
                            analysis.extraCost
                          )} — وهو ما يعادل عائدً مضموناً بنسبة ${numberFmt.format(
                            analysis.flatMarkupPct
                          )}% على أموالك.`
                        : `Smart Cash Leverage: Paying upfront immediately saves you ${currencyFmt.format(
                            analysis.extraCost
                          )} — an instant guaranteed return of ${numberFmt.format(
                            analysis.flatMarkupPct
                          )}% on your money.`
                      : isAr
                        ? `بما أن العرض بدون أي فوائد أو رسوم إضافية (${wholeCurrencyFmt.format(
                            analysis.cashPrice
                          )})، يمكنك الاستفادة من التقسيط مع إبقاء الكاش في محفظتك.`
                        : `Since this plan has $0 extra cost (${wholeCurrencyFmt.format(
                            analysis.cashPrice
                          )}), you can safely use installments while keeping your cash liquid.`}
                  </p>
                </div>

                <Link
                  href={`/${locale}/tools/is-it-worth-buying?price=${Math.round(
                    analysis.totalPaid
                  )}`}
                  className={styles.worthBridgeBtn}
                >
                  <div className={styles.worthBridgeTextCol}>
                    <span className={styles.worthBridgeKicker}>
                      {isAr
                        ? 'الخطوة التالية في مختبر القرار'
                        : 'NEXT STEP IN DECISION LAB'}
                    </span>
                    <span className={styles.worthBridgeLabel}>
                      {isAr
                        ? `هل يستحق هذا المنتج الشراء أصلاً بتكلفته الإجمالية (${wholeCurrencyFmt.format(
                            analysis.totalPaid
                          )})؟ افحصه الآن`
                        : `Is this product even worth buying at ${wholeCurrencyFmt.format(
                            analysis.totalPaid
                          )} total? Inspect Now`}
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

export default HiddenInterestCalculator;
