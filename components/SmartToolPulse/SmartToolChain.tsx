'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  ShoppingBag,
} from 'lucide-react';
import type { Locale } from '@/types';
import { getBrowserViewedProducts } from '@/lib/viewedProductsStorage';
import {
  getSmartNextToolsForTool,
  getVisitedTools,
  recordToolVisit,
} from '@/lib/smart-tools-engine';
import { AutoPriceSyncIcon } from '@/components/ui/AqurivoContextIcons';
import { SmartToolsEmblem } from './SmartToolsEmblem';
import { renderAuthenticToolLogo } from './SmartToolPulse';
import styles from './SmartToolPulse.module.css';

export interface SmartToolChainProps {
  currentToolSlug: string;
  locale: Locale;
  initialPrice?: number;
  initialProductSlug?: string;
  initialProductName?: string;
  variant: 'quickBar' | 'affinityGrid';
}

export function SmartToolChain({
  currentToolSlug,
  locale,
  initialPrice,
  initialProductSlug,
  initialProductName,
  variant,
}: SmartToolChainProps) {
  const isAr = locale === 'ar';
  const [visitedTools, setVisitedTools] = useState<string[]>([]);
  const [activePrice, setActivePrice] = useState<number | null>(
    initialPrice && initialPrice > 0 ? initialPrice : null
  );
  const [activeProductSlug, setActiveProductSlug] = useState<string>(
    initialProductSlug || ''
  );
  const [activeProductName, setActiveProductName] = useState<string>(
    initialProductName || ''
  );

  useEffect(() => {
    if (variant === 'quickBar') {
      recordToolVisit(currentToolSlug);
    }
    setVisitedTools(getVisitedTools());

    // If URL didn't pass price/product, check if visitor has an explicitly viewed product in session
    if (!initialPrice && !initialProductSlug) {
      const viewed = getBrowserViewedProducts();
      const topExplicit = viewed.find((item) => item.isExplicitlyViewed);
      if (topExplicit && topExplicit.priceUsd > 0) {
        setActivePrice(topExplicit.priceUsd);
        setActiveProductSlug(topExplicit.slug);
        setActiveProductName(
          isAr ? topExplicit.titleAr : topExplicit.titleEn
        );
      }
    }
  }, [
    currentToolSlug,
    initialPrice,
    initialProductSlug,
    isAr,
    variant,
  ]);

  const chainList = useMemo(() => {
    return getSmartNextToolsForTool(currentToolSlug, {
      locale,
      priceUsd: activePrice,
      productSlug: activeProductSlug,
      productName: activeProductName,
      visitedTools,
    });
  }, [
    currentToolSlug,
    locale,
    activePrice,
    activeProductSlug,
    activeProductName,
    visitedTools,
  ]);

  if (chainList.length === 0) return null;

  const ArrowIcon = isAr ? ArrowLeft : ArrowRight;

  // 1. Compact Contextual Next-Step Bar right below the calculator
  if (variant === 'quickBar') {
    const primaryNext = chainList[0];
    const secondaryNext = chainList.slice(1, 3);

    return (
      <div className={styles.chainQuickBar}>
        <div className={styles.chainBarHeader}>
          <SmartToolsEmblem size="sm" />
          <span className={styles.chainBarTitle}>
            {isAr
              ? 'الخطوة الذكية التالية:'
              : 'Smart Next Step:'}
          </span>
          {activePrice && activePrice > 0 && primaryNext.carriesPrice && (
            <span className={styles.chainPriceCarryBadge}>
              <AutoPriceSyncIcon size={14} />
              <span>
                {isAr
                  ? `ينتقل معك السعر تلقائياً`
                  : `Auto-carries price`}
              </span>
            </span>
          )}
        </div>

        <div className={styles.chainPillsRow}>
          <Link href={primaryNext.href} className={styles.chainPrimaryPill}>
            <span>
              {isAr ? primaryNext.ctaAr : primaryNext.ctaEn}
            </span>
            <ArrowIcon size={14} aria-hidden="true" />
          </Link>

          {secondaryNext.map((sec) => (
            <Link
              key={sec.tool.slug}
              href={sec.href}
              className={styles.chainSecondaryPill}
            >
              <span>{isAr ? sec.tool.nameAr : sec.tool.nameEn}</span>
              <ArrowIcon size={13} aria-hidden="true" />
            </Link>
          ))}

          {activeProductSlug && (
            <Link
              href={`/${locale}/products/${encodeURIComponent(
                activeProductSlug
              )}`}
              className={styles.chainProductBackPill}
            >
              <ShoppingBag size={13} aria-hidden="true" />
              <span>
                {isAr ? 'العودة لصفحة المنتج' : 'Back to Product'}
              </span>
            </Link>
          )}
        </div>
      </div>
    );
  }

  // 2. Smart Affinity Matrix at the bottom of the Tool Page
  const topThree = chainList.slice(0, 3);

  return (
    <section className={styles.chainSection}>
      <div className={styles.chainSectionHeader}>
        <div className={styles.chainSectionTitleWrap}>
          <h2 className={styles.chainSectionTitle}>
            {isAr
              ? 'أدوات مكملة نقترحها لك بناءً على هذه الأداة'
              : 'Complementary Smart Tools Recommended Next'}
          </h2>
          <p className={styles.chainSectionSub}>
            {activeProductName
              ? isAr
                ? `مرتبة ذكياً لإكمال تحليلك لـ «${activeProductName}» دون إعادة إدخال السعر.`
                : `Smartly ordered to complete your analysis for "${activeProductName}".`
              : isAr
                ? 'أدوات مالية مقترحة خطوة بخطوة لمساعدتك في اتخاذ أفضل قرار شراء.'
                : 'Step-by-step financial decision tools to help you make the best purchase choice.'}
          </p>
        </div>

        <Link href={`/${locale}/tools`} className={styles.chainAllToolsBtn}>
          <span>{isAr ? 'جميع الأدوات (11)' : 'All Tools (11)'}</span>
          <ArrowIcon size={14} aria-hidden="true" />
        </Link>
      </div>

      <div className={styles.chainGrid}>
        {topThree.map((item) => {
          const isGold = item.accent === 'gold';
          return (
            <Link
              key={item.tool.slug}
              href={item.href}
              className={`${styles.chainCard} ${
                isGold ? styles.chainCardGold : ''
              }`}
            >
              <div className={styles.chainCardTop}>
                <div className={styles.chainCardBadgesRow}>
                  <span
                    className={
                      isGold
                        ? styles.chainStepBadgeGold
                        : styles.chainStepBadgeTeal
                    }
                  >
                    {isAr ? item.badgeAr : item.badgeEn}
                  </span>

                  {item.isUnvisited && (
                    <span className={styles.chainUnvisitedTag}>
                      {isAr ? 'لم تجربها بعد' : 'New for you'}
                    </span>
                  )}
                </div>

                <div className={styles.chainCardTitleRow}>
                  {renderAuthenticToolLogo(item.tool.slug, locale)}
                  <span className={styles.chainCardTitle}>
                    {isAr ? item.tool.nameAr : item.tool.nameEn}
                  </span>
                </div>

                <p className={styles.chainCardReason}>
                  {isAr ? item.reasonAr : item.reasonEn}
                </p>
              </div>

              <div className={styles.chainCardFooter}>
                <span
                  className={`${styles.chainCardCta} ${
                    isGold ? styles.chainCardCtaGold : ''
                  }`}
                >
                  <span>{isAr ? item.ctaAr : item.ctaEn}</span>
                  <ArrowIcon size={14} aria-hidden="true" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
