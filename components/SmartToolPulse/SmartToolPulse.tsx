'use client';

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import type { Locale } from '@/types';
import { useI18n } from '@/i18n/I18nProvider';
import { convertCurrencyAmount, formatProductPrice } from '@/lib/format';
import {
  getSmartToolsForProduct,
  getVisitedTools,
} from '@/lib/smart-tools-engine';
import { WorthBuyingLogo } from '@/components/tools/WorthBuyingLogo';
import { HiddenInterestLogo } from '@/components/tools/HiddenInterestLogo';
import { WorkTimeValueLogo } from '@/components/tools/WorkTimeValueLogo';
import { CostOfLivingLogo } from '@/components/tools/CostOfLivingLogo';
import { RealSalaryLogo } from '@/components/tools/RealSalaryLogo';
import { SavingsGoalLogo } from '@/components/tools/SavingsGoalLogo';
import { FreelancePriceLogo } from '@/components/tools/FreelancePriceLogo';
import { LoanComparisonLogo } from '@/components/tools/LoanComparisonLogo';
import { CarbonFootprintLogo } from '@/components/tools/CarbonFootprintLogo';
import { InvestmentGrowthLogo } from '@/components/tools/InvestmentGrowthLogo';
import { CodeToImageLogo } from '@/components/tools/CodeToImageLogo';
import { SmartToolsEmblem } from './SmartToolsEmblem';
import styles from './SmartToolPulse.module.css';

export interface SmartToolPulseProps {
  productSlug: string;
  productName: string;
  priceAmount: number | null;
  priceCurrency?: string;
  formattedPrice?: string;
  categorySlug?: string;
  categoryName?: string;
  discount?: number | null;
  shortSummary?: string;
  locale: Locale;
}

export function renderAuthenticToolLogo(slug: string, locale: Locale) {
  switch (slug) {
    case 'is-it-worth-buying':
      return <WorthBuyingLogo size="sm" showWordmark={false} locale={locale} />;
    case 'hidden-interest-calculator':
      return <HiddenInterestLogo size="sm" showWordmark={false} locale={locale} />;
    case 'work-time-value-calculator':
      return <WorkTimeValueLogo size="sm" showWordmark={false} locale={locale} />;
    case 'cost-of-living-compare':
      return <CostOfLivingLogo size="sm" showWordmark={false} locale={locale} />;
    case 'real-salary-calculator':
      return <RealSalaryLogo size="sm" showWordmark={false} locale={locale} />;
    case 'savings-goal-calculator':
      return <SavingsGoalLogo size="sm" showWordmark={false} locale={locale} />;
    case 'freelance-price-checker':
      return <FreelancePriceLogo size="sm" showWordmark={false} locale={locale} />;
    case 'loan-comparison':
      return <LoanComparisonLogo size="sm" showWordmark={false} locale={locale} />;
    case 'carbon-footprint-calculator':
      return <CarbonFootprintLogo size="sm" showWordmark={false} locale={locale} />;
    case 'investment-growth-calculator':
      return <InvestmentGrowthLogo size="sm" showWordmark={false} locale={locale} />;
    case 'code-to-image':
      return <CodeToImageLogo size="sm" showWordmark={false} locale={locale} />;
    default:
      return <SmartToolsEmblem size="sm" />;
  }
}

function getShortActionSubtitle(slug: string, isAr: boolean): string {
  switch (slug) {
    case 'is-it-worth-buying':
      return isAr
        ? 'احسب تكلفة الاستخدام الواحد'
        : 'Calculate true cost per use';
    case 'work-time-value-calculator':
      return isAr
        ? 'كم ساعة عمل يعادل سعره؟'
        : 'How many work hours it equals';
    case 'hidden-interest-calculator':
      return isAr
        ? 'قارن الشراء كاش بالتقسيط'
        : 'Compare cash vs. installments';
    case 'savings-goal-calculator':
      return isAr
        ? 'صمّم خطة ادخار ذكية لشرائه'
        : 'Build a smart saving plan';
    case 'real-salary-calculator':
      return isAr
        ? 'اعرف أجر ساعتك الصافي الحقيقي'
        : 'Find your true net hourly wage';
    case 'carbon-footprint-calculator':
      return isAr
        ? 'احسب استهلاك ووفر الطاقة السنوي'
        : 'Calculate annual energy savings';
    case 'freelance-price-checker':
      return isAr
        ? 'احسب عائد المعدات على عملك الحر'
        : 'Calculate gear ROI for freelance';
    case 'loan-comparison':
      return isAr
        ? 'قارن بين عروض التمويل بدقة'
        : 'Compare financing offers';
    default:
      return isAr
        ? 'أداة تحليل مالي ذكية ومباشرة'
        : 'Instant smart financial analysis';
  }
}

export function SmartToolPulse({
  productSlug,
  productName,
  priceAmount,
  priceCurrency = 'USD',
  categorySlug,
  categoryName,
  discount,
  shortSummary,
  locale,
}: SmartToolPulseProps) {
  const { currency } = useI18n();
  const isAr = locale === 'ar';
  const dialogId = useId();

  const [isOpen, setIsOpen] = useState(false);
  const [visitedTools, setVisitedTools] = useState<string[]>([]);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    setVisitedTools(getVisitedTools());
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  // Format product price using the visitor's active currency (e.g., 290 د.م.)
  const liveFormattedPrice = useMemo(() => {
    if (priceAmount === null || priceAmount <= 0) return undefined;
    return formatProductPrice(priceAmount, priceCurrency, locale, currency);
  }, [priceAmount, priceCurrency, locale, currency]);

  const priceUsd = useMemo(() => {
    if (priceAmount === null || priceAmount <= 0) return null;
    const { convertedAmount } = convertCurrencyAmount(
      priceAmount,
      priceCurrency || 'USD',
      'USD'
    );
    return convertedAmount && convertedAmount > 0
      ? Math.round(convertedAmount * 100) / 100
      : priceAmount;
  }, [priceAmount, priceCurrency]);

  const recommendations = useMemo(() => {
    return getSmartToolsForProduct(
      {
        productSlug,
        productName,
        priceUsd,
        formattedPrice: liveFormattedPrice,
        categorySlug,
        categoryName,
        discount,
        shortSummary,
        locale,
      },
      visitedTools
    ).slice(0, 3);
  }, [
    productSlug,
    productName,
    priceUsd,
    liveFormattedPrice,
    categorySlug,
    categoryName,
    discount,
    shortSummary,
    locale,
    visitedTools,
  ]);

  const ArrowIcon = isAr ? ArrowLeft : ArrowRight;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={isOpen}
        aria-controls={dialogId}
        onClick={() => setIsOpen((open) => !open)}
        className={`${styles.triggerButton} ${isOpen ? styles.triggerButtonActive : ''}`}
      >
        <SmartToolsEmblem size="sm" />
        <span>
          {isAr ? 'أدوات ذكية للمنتج' : 'Smart Product Tools'}
        </span>
      </button>

      {isOpen && (
        <div
          id={dialogId}
          role="region"
          aria-label={isAr ? 'أدوات ذكية للمنتج' : 'Smart Product Tools'}
          dir={isAr ? 'rtl' : 'ltr'}
          className={styles.sheetModal}
        >
          <div className={styles.sheetHeader}>
            <div className={styles.sheetHeaderStart}>
              <SmartToolsEmblem size="sm" />
              <div className={styles.sheetHeaderTitles}>
                <h2 className={styles.sheetTitle}>
                  {isAr
                    ? 'أدوات ذكية لهذا المنتج'
                    : 'Smart Tools for This Product'}
                </h2>
                {liveFormattedPrice && (
                  <span className={styles.sheetPriceBadge}>
                    <span>
                      {isAr
                        ? `جاهزة تلقائياً بسعر ${liveFormattedPrice}`
                        : `Auto-loaded with ${liveFormattedPrice}`}
                    </span>
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className={styles.sheetCloseBtn}
              aria-label={isAr ? 'إغلاق' : 'Close'}
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>

          <div className={styles.sheetToolsList}>
            {recommendations.map((rec) => {
              const isGold = rec.accent === 'gold';
              return (
                <Link
                  key={rec.tool.slug}
                  href={rec.href}
                  onClick={() => setIsOpen(false)}
                  className={`${styles.sheetToolRow} ${
                    isGold ? styles.sheetToolRowGold : ''
                  }`}
                >
                  <span
                    className={styles.sheetToolLogoWrap}
                    aria-hidden="true"
                  >
                    {renderAuthenticToolLogo(rec.tool.slug, locale)}
                  </span>

                  <div className={styles.sheetToolInfo}>
                    <span className={styles.sheetToolName}>
                      {isAr ? rec.tool.nameAr : rec.tool.nameEn}
                    </span>
                    <span className={styles.sheetToolSub}>
                      {getShortActionSubtitle(rec.tool.slug, isAr)}
                    </span>
                  </div>

                  <span
                    className={styles.sheetToolArrow}
                    aria-hidden="true"
                  >
                    <ArrowIcon size={15} />
                  </span>
                </Link>
              );
            })}
          </div>

          <div className={styles.sheetFooter}>
            <Link
              href={`/${locale}/tools`}
              onClick={() => setIsOpen(false)}
              className={styles.sheetAllToolsLink}
            >
              <span>
                {isAr
                  ? 'تصفح جميع الأدوات الذكية (11 أداة)'
                  : 'Browse All 11 Smart Tools'}
              </span>
              <ArrowIcon size={13} aria-hidden="true" />
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
