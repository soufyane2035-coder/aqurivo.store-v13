'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ToolCategory, ToolItem } from '@/lib/tools-data';
import { SiteHeader } from '@/components/sections/SiteHeader';
import { SiteFooter } from '@/components/sections/SiteFooter';
import { WorthBuyingLogo } from '@/components/tools/WorthBuyingLogo';
import { HiddenInterestLogo } from '@/components/tools/HiddenInterestLogo';
import { WorkTimeValueLogo } from '@/components/tools/WorkTimeValueLogo';
import { CostOfLivingLogo } from '@/components/tools/CostOfLivingLogo';
import { RealSalaryLogo } from '@/components/tools/RealSalaryLogo';
import { SavingsGoalLogo } from '@/components/tools/SavingsGoalLogo';
import { FreelancePriceLogo } from '@/components/tools/FreelancePriceLogo';
import { LoanComparisonLogo } from '@/components/tools/LoanComparisonLogo';
import { InvestmentGrowthLogo } from '@/components/tools/InvestmentGrowthLogo';
import { CarbonFootprintLogo } from '@/components/tools/CarbonFootprintLogo';
import { CodeToImageLogo } from '@/components/tools/CodeToImageLogo';
import styles from './tools.module.css';

interface ToolsIndexClientProps {
  tools: ToolItem[];
  locale: 'ar' | 'en';
}

interface ToolSignatureMeta {
  formulaAr: string;
  formulaEn: string;
  outputAr: string;
  outputEn: string;
}

const TOOL_SIGNATURES: Record<string, ToolSignatureMeta> = {
  'is-it-worth-buying': {
    formulaAr: '(السعر − إعادة البيع) ÷ الاستخدامات',
    formulaEn: '(Price − Resale) ÷ Total Uses',
    outputAr: 'مؤشر جدارة الشراء وتكلفة الاستخدام',
    outputEn: 'Worth-It Score & Cost Per Use',
  },
  'hidden-interest-calculator': {
    formulaAr: 'الدفع الفوري ── مقابل ── الأقساط',
    formulaEn: 'Cash Price ── vs ── Installments',
    outputAr: 'كشف الفائدة الخفية والفرق الفعلي',
    outputEn: 'Hidden Markup & True Cost',
  },
  'cost-of-living-compare': {
    formulaAr: 'سلة المعيشة (5 قطاعات) × تعادل القوة الشرائية',
    formulaEn: '5-Pillar Basket × Global Parity Ratio',
    outputAr: 'الدخل المعادل وتفكيك السكن والغذاء والادخار',
    outputEn: 'Equivalent Income & 5-Pillar Breakdown',
  },
  'real-salary-calculator': {
    formulaAr: '(الراتب − التزامات المعيشة والعمل) ÷ (ساعات الدوام + الطريق)',
    formulaEn: '(Gross − Living & Work Drain) ÷ (Work + Commute Hrs)',
    outputAr: 'قيمة الساعة الحقيقية وخريطة تشريح يوم العمل',
    outputEn: 'True Net Hourly Rate & Workday Anatomy',
  },
  'savings-goal-calculator': {
    formulaAr: '(الهدف المعدّل بالتضخم − المدخرات) ÷ (الادخار + العائد المركب)',
    formulaEn: '(Inflation-Adj Target − Saved) ÷ (Monthly + APY Yield)',
    outputAr: 'خريطة محطات الطريق ومحاكي التسريع الذكي',
    outputEn: '4-Milestone Roadmap & Acceleration Simulator',
  },
  'work-time-value-calculator': {
    formulaAr: 'السعر ÷ الأجر الصافي − الوقت المُسترد',
    formulaEn: 'Price ÷ Net Wage − Time Returned',
    outputAr: 'خريطة أيام شهر العمل ومُعادل الوقت',
    outputEn: 'Work-Month Map & Time-Back ROI',
  },
  'freelance-price-checker': {
    formulaAr: '(الدخل المستهدف + المصاريف + الضرائب) ÷ الساعات القابلة للفوترة',
    formulaEn: '(Target Income + Overhead + Tax) ÷ Billable Hours',
    outputAr: 'الحد الأدنى الآمن و3 باقات تسعير للمشروع',
    outputEn: 'Walk-Away Rate & 3-Tier Project Proposal',
  },
  'loan-comparison': {
    formulaAr: 'العرض أ (متناقصة / ثابتة + الرسوم) ⇄ العرض ب + السداد المبكر',
    formulaEn: 'Offer A (Reducing / Flat + Fees) ⇄ Offer B + Prepayment',
    outputAr: 'الفائز المالي الصافي وجدول استهلاك الدفعات',
    outputEn: 'Net Winner Verdict & Amortization Schedule',
  },
  'investment-growth-calculator': {
    formulaAr: 'رأس المال × (1 + العائد الحقيقي بعد التضخم)^السنوات',
    formulaEn: 'Principal × (1 + Real Return)^Years + Monthly SIP',
    outputAr: 'منحنى الثروة المركب ونقطة الحرية المالية',
    outputEn: 'Stacked Wealth Trajectory & Freedom Point',
  },
  'carbon-footprint-calculator': {
    formulaAr: 'التنقل + الطيران + كهرباء المنزل + الغذاء ⇄ الوفر المالي',
    formulaEn: 'Mobility + Flights + Energy + Diet ⇄ Eco-Savings',
    outputAr: 'مؤشر البصمة بالطن وعدد الأشجار والوفر السنوي',
    outputEn: 'Annual Tons CO₂e, Tree Offset & Cost Saved',
  },
  'code-to-image': {
    formulaAr: 'مُحلل شيفرة برمجية (AST) ➔ لوحة استوديو بدقة 2x Retina PNG',
    formulaEn: 'Syntax AST Tokenizer ➔ 2x Retina PNG Studio Frame',
    outputAr: 'تلوين ذكي للكود و6 ثيمات وتصدير فوري للحافظة',
    outputEn: 'Multi-Lang Highlighting, 6 Themes & Clipboard Copy',
  },
};

interface ChapterMeta {
  id: ToolCategory;
  codeAr: string;
  codeEn: string;
  titleAr: string;
  titleEn: string;
  subAr: string;
  subEn: string;
}

const CHAPTERS: ChapterMeta[] = [
  {
    id: 'shopping',
    codeAr: 'CHAPTER 01 / الشراء والائتمان',
    codeEn: 'CHAPTER 01 / PURCHASE & CREDIT',
    titleAr: 'مختبر الشراء والائتمان',
    titleEn: 'Purchase & Credit Lab',
    subAr: 'أدوات تفكيك الأسعار، الأقساط، وتكلفة الشراء مقارنة بوقت عملك.',
    subEn: 'Instruments to dissect prices, installments, and true cost in work hours.',
  },
  {
    id: 'finance',
    codeAr: 'CHAPTER 02 / الدخل والثروة',
    codeEn: 'CHAPTER 02 / INCOME & WEALTH',
    titleAr: 'هندسة الدخل والادخار والمعيشة',
    titleEn: 'Income, Living & Wealth Architecture',
    subAr: 'معايير قياس الراتب الحقيقي، تكلفة المدن، والفائدة المركبة.',
    subEn: 'Benchmarks for real net income, city parity, savings, and compounding.',
  },
  {
    id: 'work',
    codeAr: 'CHAPTER 03 / الأعمال والتقنية',
    codeEn: 'CHAPTER 03 / WORK & TECHNICAL',
    titleAr: 'أدوات العمل الحر والتقنية الدقيقة',
    titleEn: 'Freelance & Technical Instruments',
    subAr: 'تسعير المشاريع المستقلة، التشفير، وتنسيق الأكواد البرمجية.',
    subEn: 'Project rate calibration, cryptographic keys, and studio code frames.',
  },
];

const COPY = {
  ar: {
    kicker: 'AQURIVO ARCHITECTURAL LEDGER',
    indexCount: '01 — 11',
    title: 'أدوات AQURIVO الذكية',
    subtitle:
      'منظومة أدوات تحليلية لضبط قرارات الشراء، تفكيك الفوائد الخفية، وقياس القيمة الحقيقية للدخل والوقت.',
    allTab: 'الكل',
    shoppingTab: 'الشراء والائتمان',
    financeTab: 'الدخل والثروة',
    workTab: 'الأعمال والتقنية',
    searchPlaceholder: 'ابحث في الأدوات...',
    flagshipInputPlaceholder: 'أدخل سعر منتج للفحص الفوري (مثال: 320)',
    flagshipLaunchBtn: 'افحص القرار ↖',
    openToolLabel: 'فتح الأداة',
    emptyTitle: 'لم نجد أداة تطابق بحثك الحالي.',
    emptyReset: 'إعادة عرض جميع الأدوات',
  },
  en: {
    kicker: 'AQURIVO ARCHITECTURAL LEDGER',
    indexCount: '01 — 11',
    title: 'AQURIVO Smart Tools',
    subtitle:
      'Analytical instruments to calibrate purchase decisions, uncover hidden interest, and measure real income parity.',
    allTab: 'All',
    shoppingTab: 'Purchase & Credit',
    financeTab: 'Income & Wealth',
    workTab: 'Work & Technical',
    searchPlaceholder: 'Search tools...',
    flagshipInputPlaceholder: 'Enter item price for instant check (e.g. 320)',
    flagshipLaunchBtn: 'Inspect Verdict ↗',
    openToolLabel: 'Launch',
    emptyTitle: 'No instruments match your current filter.',
    emptyReset: 'Restore all tools',
  },
} as const;

export function ToolsIndexClient({ tools, locale }: ToolsIndexClientProps) {
  const t = COPY[locale] || COPY.ar;
  const isAr = locale === 'ar';
  const router = useRouter();

  const [activeCategory, setActiveCategory] = useState<'all' | ToolCategory>('all');
  const [query, setQuery] = useState<string>('');
  const [quickPrice, setQuickPrice] = useState<string>('');

  const canonicalIndexMap = useMemo(() => {
    const map: Record<string, string> = {};
    tools.forEach((tool, idx) => {
      map[tool.slug] = String(idx + 1).padStart(2, '0');
    });
    return map;
  }, [tools]);

  const flagshipTool = useMemo(
    () => tools.find((tool) => tool.slug === 'is-it-worth-buying') || tools[0],
    [tools]
  );

  const filteredTools = useMemo(() => {
    return tools.filter((tool) => {
      if (activeCategory !== 'all' && tool.category !== activeCategory) {
        return false;
      }
      const q = query.trim().toLowerCase();
      if (!q) return true;
      const haystack = [
        tool.nameAr,
        tool.nameEn,
        tool.descriptionAr,
        tool.descriptionEn,
        ...tool.keywordsAr,
        ...tool.keywordsEn,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [tools, activeCategory, query]);

  const isSearching = query.trim().length > 0;
  const showFlagshipStage =
    !isSearching &&
    (activeCategory === 'all' || activeCategory === 'shopping') &&
    Boolean(flagshipTool);

  const handleQuickLaunchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numeric = Number(quickPrice.replace(/[^0-9.]/g, ''));
    if (Number.isFinite(numeric) && numeric > 0) {
      router.push(`/${locale}/tools/is-it-worth-buying?price=${numeric}`);
    } else {
      router.push(`/${locale}/tools/is-it-worth-buying`);
    }
  };

  return (
    <div className={styles.pageShell} dir={isAr ? 'rtl' : 'ltr'}>
      <SiteHeader />

      <main id="main-content" className={styles.main}>
        {/* 1. ARCHITECTURAL EDITORIAL MASTHEAD */}
        <header className={styles.masthead}>
          <div className={styles.mastheadTopRow}>
            <span className={styles.kicker}>{t.kicker}</span>
            <span className={styles.indexCount}>{t.indexCount}</span>
          </div>

          <div className={styles.mastheadBody}>
            <h1 className={styles.title}>{t.title}</h1>
            <p className={styles.subtitle}>{t.subtitle}</p>
          </div>
        </header>

        {/* 2. MINIMALIST COMMAND BAR */}
        <div className={styles.commandBar}>
          <div className={styles.chapterTabs} role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeCategory === 'all'}
              onClick={() => setActiveCategory('all')}
              className={`${styles.chapterTabBtn} ${
                activeCategory === 'all' ? styles.chapterTabBtnActive : ''
              }`}
            >
              <span className={styles.tabIndexNum}>01—11</span>
              <span>{t.allTab}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeCategory === 'shopping'}
              onClick={() => setActiveCategory('shopping')}
              className={`${styles.chapterTabBtn} ${
                activeCategory === 'shopping' ? styles.chapterTabBtnActive : ''
              }`}
            >
              <span className={styles.tabIndexNum}>I</span>
              <span>{t.shoppingTab}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeCategory === 'finance'}
              onClick={() => setActiveCategory('finance')}
              className={`${styles.chapterTabBtn} ${
                activeCategory === 'finance' ? styles.chapterTabBtnActive : ''
              }`}
            >
              <span className={styles.tabIndexNum}>II</span>
              <span>{t.financeTab}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeCategory === 'work'}
              onClick={() => setActiveCategory('work')}
              className={`${styles.chapterTabBtn} ${
                activeCategory === 'work' ? styles.chapterTabBtnActive : ''
              }`}
            >
              <span className={styles.tabIndexNum}>III</span>
              <span>{t.workTab}</span>
            </button>
          </div>

          <div className={styles.searchCommandWrap}>
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={styles.searchIcon}
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              aria-label={t.searchPlaceholder}
              className={styles.searchInput}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className={styles.clearSearchBtn}
                aria-label="Clear"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* 3. 01 / COMPACT FLAGSHIP SPOTLIGHT STAGE */}
        {showFlagshipStage && flagshipTool && (
          <section
            className={styles.flagshipStage}
            aria-label={isAr ? flagshipTool.nameAr : flagshipTool.nameEn}
          >
            <div className={styles.flagshipIdentity}>
              <Link
                href={`/${locale}/tools/is-it-worth-buying`}
                className={styles.flagshipHeaderLink}
              >
                <div className={styles.flagshipLogoWrap}>
                  <span className={styles.flagshipIndexBadge}>01</span>
                  <WorthBuyingLogo size="sm" showWordmark locale={locale} />
                </div>
                <span className={styles.actionVector} aria-hidden="true">
                  {isAr ? '↖' : '↗'}
                </span>
              </Link>

              <p className={styles.flagshipLead}>
                {isAr ? flagshipTool.descriptionAr : flagshipTool.descriptionEn}
              </p>
            </div>

            <div className={styles.flagshipConsole}>
              <form
                onSubmit={handleQuickLaunchSubmit}
                className={styles.quickPriceForm}
              >
                <span className={styles.currencyPrefix}>$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={quickPrice}
                  onChange={(e) => setQuickPrice(e.target.value)}
                  placeholder={t.flagshipInputPlaceholder}
                  aria-label={t.flagshipInputPlaceholder}
                  className={styles.quickPriceInput}
                />
                <button type="submit" className={styles.quickLaunchBtn}>
                  {t.flagshipLaunchBtn}
                </button>
              </form>
            </div>
          </section>
        )}

        {/* 4. ARCHITECTURAL CHAPTERS & CARDLESS LEDGER ROWS */}
        {filteredTools.length === 0 ? (
          <div className={styles.emptyLedger}>
            <p className={styles.emptyTitle}>{t.emptyTitle}</p>
            <button
              type="button"
              onClick={() => {
                setActiveCategory('all');
                setQuery('');
              }}
              className={styles.emptyResetBtn}
            >
              {t.emptyReset}
            </button>
          </div>
        ) : (
          <div className={styles.chaptersContainer}>
            {CHAPTERS.map((chapter) => {
              const chapterTools = filteredTools.filter((tool) => {
                if (tool.category !== chapter.id) return false;
                if (showFlagshipStage && tool.slug === 'is-it-worth-buying') {
                  return false;
                }
                return true;
              });

              if (chapterTools.length === 0) return null;

              return (
                <section
                  key={chapter.id}
                  className={styles.chapterSection}
                  aria-label={isAr ? chapter.titleAr : chapter.titleEn}
                >
                  <aside className={styles.chapterSidebar}>
                    <span className={styles.chapterCode}>
                      {isAr ? chapter.codeAr : chapter.codeEn}
                    </span>
                    <h2 className={styles.chapterTitle}>
                      {isAr ? chapter.titleAr : chapter.titleEn}
                    </h2>
                    <p className={styles.chapterSub}>
                      {isAr ? chapter.subAr : chapter.subEn}
                    </p>
                  </aside>

                  <div className={styles.ledgerList}>
                    {chapterTools.map((tool) => {
                      const num = canonicalIndexMap[tool.slug] || '01';
                      const name = isAr ? tool.nameAr : tool.nameEn;
                      const desc = isAr
                        ? tool.descriptionAr
                        : tool.descriptionEn;
                      const sig = TOOL_SIGNATURES[tool.slug];
                      const formula = sig
                        ? isAr
                          ? sig.formulaAr
                          : sig.formulaEn
                        : '';
                      const outputLabel = sig
                        ? isAr
                          ? sig.outputAr
                          : sig.outputEn
                        : '';

                      return (
                        <Link
                          key={tool.slug}
                          href={`/${locale}/tools/${tool.slug}`}
                          className={styles.ledgerRow}
                        >
                          {/* Col 1: Western Index + Bare Geometric Icon */}
                          <div className={styles.rowIndexCol}>
                            <span className={styles.rowIndexNum}>{num}</span>
                            <span
                              className={styles.rowBareIcon}
                              aria-hidden="true"
                            >
                              {tool.slug === 'is-it-worth-buying' ? (
                                <WorthBuyingLogo size="sm" locale={locale} />
                              ) : tool.slug === 'hidden-interest-calculator' ? (
                                <HiddenInterestLogo size="sm" locale={locale} />
                              ) : tool.slug === 'work-time-value-calculator' ? (
                                <WorkTimeValueLogo size="sm" locale={locale} />
                              ) : tool.slug === 'cost-of-living-compare' ? (
                                <CostOfLivingLogo size="sm" locale={locale} />
                              ) : tool.slug === 'real-salary-calculator' ? (
                                <RealSalaryLogo size="sm" locale={locale} />
                              ) : tool.slug === 'savings-goal-calculator' ? (
                                <SavingsGoalLogo size="sm" locale={locale} />
                              ) : tool.slug === 'freelance-price-checker' ? (
                                <FreelancePriceLogo size="sm" locale={locale} />
                              ) : tool.slug === 'loan-comparison' ? (
                                <LoanComparisonLogo size="sm" locale={locale} />
                              ) : tool.slug === 'investment-growth-calculator' ? (
                                <InvestmentGrowthLogo size="sm" locale={locale} />
                              ) : tool.slug === 'carbon-footprint-calculator' ? (
                                <CarbonFootprintLogo size="sm" locale={locale} />
                              ) : tool.slug === 'code-to-image' ? (
                                <CodeToImageLogo size="sm" locale={locale} />
                              ) : (
                                <svg
                                  width="19"
                                  height="19"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.85"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d={tool.icon} />
                                </svg>
                              )}
                            </span>
                          </div>

                          {/* Col 2: Tool Title + Lead Description */}
                          <div className={styles.rowMainCol}>
                            <h3 className={styles.rowTitle}>{name}</h3>
                            <p className={styles.rowDesc}>{desc}</p>
                          </div>

                          {/* Col 3: Architectural Formula & Output Spec (Desktop) */}
                          <div className={styles.rowSpecCol}>
                            {formula && (
                              <span className={styles.specFormula}>
                                {formula}
                              </span>
                            )}
                            {outputLabel && (
                              <span className={styles.specOutputLabel}>
                                {outputLabel}
                              </span>
                            )}
                          </div>

                          {/* Col 4: Directional Vector */}
                          <div className={styles.rowActionCol}>
                            <span className={styles.actionLabelDesktop}>
                              {t.openToolLabel}
                            </span>
                            <span
                              className={styles.actionVector}
                              aria-hidden="true"
                            >
                              {isAr ? '↖' : '↗'}
                            </span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
