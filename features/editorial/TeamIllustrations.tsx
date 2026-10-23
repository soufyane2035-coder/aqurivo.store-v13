'use client';

import React from 'react';
import styles from './TeamIllustrations.module.css';

interface TeamIllustrationProps {
  type: 'roadmap' | 'market-radar' | 'editorial-canvas' | 'audit-ledger' | 'ux-inspector';
  accentColor: 'emerald' | 'terracotta' | 'teal' | 'olive' | 'clay';
  isAr: boolean;
}

export function TeamIllustration({ type, accentColor, isAr }: TeamIllustrationProps) {
  switch (type) {
    case 'roadmap':
      return <StrategyRoadmapIllustration isAr={isAr} accentColor={accentColor} />;
    case 'market-radar':
      return <MarketRadarIllustration isAr={isAr} accentColor={accentColor} />;
    case 'editorial-canvas':
      return <EditorialCanvasIllustration isAr={isAr} accentColor={accentColor} />;
    case 'audit-ledger':
      return <AuditLedgerIllustration isAr={isAr} accentColor={accentColor} />;
    case 'ux-inspector':
      return <UxInspectorIllustration isAr={isAr} accentColor={accentColor} />;
    default:
      return null;
  }
}

/**
 * 1. Strategy & Governance Roadmap Illustration (Soufiane Laraich)
 * Visualizes strategic milestone nodes, editorial governance compass, and consumer protection pipeline.
 */
function StrategyRoadmapIllustration({
  isAr,
  accentColor,
}: {
  isAr: boolean;
  accentColor: string;
}) {
  return (
    <div className={`${styles.illustrationWrapper} ${styles[`theme_${accentColor}`]}`}>
      <div className={styles.visualCanvas}>
        <svg
          viewBox="0 0 520 220"
          className={styles.svgGraphic}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {/* Subtle Grid Lines */}
          <defs>
            <pattern id="strat-grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.12" />
            </pattern>
            <linearGradient id="strat-pipe-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0e5e4f" />
              <stop offset="50%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#14b8a6" />
            </linearGradient>
            <linearGradient id="node-glow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#0e5e4f" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          <rect width="520" height="220" fill="url(#strat-grid)" rx="12" />

          {/* Pipeline Connector Track */}
          <path
            d="M 70 110 L 260 110 L 450 110"
            stroke="url(#strat-pipe-grad)"
            strokeWidth="3"
            strokeDasharray="6 4"
            strokeOpacity="0.75"
          />

          {/* Step 1: Governance & Charter */}
          <g transform="translate(70, 110)">
            <circle r="40" fill="url(#node-glow)" stroke="#10b981" strokeWidth="1.5" />
            <circle r="26" fill="#0b3830" stroke="#10b981" strokeWidth="1" />
            {/* Compass / Shield Motif */}
            <path d="M 0 -10 L 8 4 L 0 10 L -8 4 Z" fill="#34d399" />
            <circle r="3" fill="#ffffff" />
            <text
              y="58"
              textAnchor="middle"
              className={styles.svgTextTitle}
            >
              {isAr ? 'ميثاق النزاهة' : 'Integrity Charter'}
            </text>
            <text
              y="74"
              textAnchor="middle"
              className={styles.svgTextSub}
            >
              {isAr ? 'معايير 100% مستقلة' : '100% Independent'}
            </text>
          </g>

          {/* Center: Workflow & Operations Node */}
          <g transform="translate(260, 110)">
            <circle r="46" fill="url(#node-glow)" stroke="#10b981" strokeWidth="2" />
            <circle r="30" fill="#0b3830" stroke="#34d399" strokeWidth="1.5" />
            {/* Multi-node orchestration icon */}
            <rect x="-10" y="-10" width="20" height="20" rx="4" stroke="#ffffff" strokeWidth="1.5" fill="none" />
            <circle cx="0" cy="0" r="3" fill="#34d399" />
            <path d="M -5 0 L 5 0 M 0 -5 L 0 5" stroke="#ffffff" strokeWidth="1.2" />
            <text
              y="64"
              textAnchor="middle"
              className={styles.svgTextTitle}
            >
              {isAr ? 'تنسيق دورة البحث' : 'Workflow Ops'}
            </text>
            <text
              y="80"
              textAnchor="middle"
              className={styles.svgTextSub}
            >
              {isAr ? 'تكامل مراحل التدقيق' : 'Integrated Audit Pipeline'}
            </text>
          </g>

          {/* Step 3: Consumer Decision Shield */}
          <g transform="translate(450, 110)">
            <circle r="40" fill="url(#node-glow)" stroke="#14b8a6" strokeWidth="1.5" />
            <circle r="26" fill="#0b3830" stroke="#14b8a6" strokeWidth="1" />
            {/* Target / Protection emblem */}
            <circle r="12" stroke="#2dd4bf" strokeWidth="1.5" strokeDasharray="3 2" fill="none" />
            <circle r="4" fill="#ffffff" />
            <text
              y="58"
              textAnchor="middle"
              className={styles.svgTextTitle}
            >
              {isAr ? 'قرار شراء واعٍ' : 'Informed Shopper'}
            </text>
            <text
              y="74"
              textAnchor="middle"
              className={styles.svgTextSub}
            >
              {isAr ? 'حماية من التضليل' : 'Zero Marketing Hype'}
            </text>
          </g>

          {/* Top Status Header inside SVG */}
          <g transform="translate(260, 28)">
            <rect x="-110" y="-14" width="220" height="28" rx="14" fill="#064e3b" stroke="#059669" strokeWidth="1" />
            <circle cx="-85" cy="0" r="4" fill="#34d399" />
            <text x="0" y="4" textAnchor="middle" className={styles.svgPillText}>
              {isAr ? 'مخطط الحوكمة والقرار الاستراتيجي' : 'Strategic Governance Flow'}
            </text>
          </g>
        </svg>
      </div>
    </div>
  );
}

/**
 * 2. Market Radar & Price Verification Illustration (Said Talha)
 * Visualizes live marketplace scanning, fake-sale detection, and price parity matrix.
 */
function MarketRadarIllustration({
  isAr,
  accentColor,
}: {
  isAr: boolean;
  accentColor: string;
}) {
  return (
    <div className={`${styles.illustrationWrapper} ${styles[`theme_${accentColor}`]}`}>
      <div className={styles.visualCanvas}>
        <svg
          viewBox="0 0 520 220"
          className={styles.svgGraphic}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            <radialGradient id="radar-sweep" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.3" />
              <stop offset="70%" stopColor="#c46d2e" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#c46d2e" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="bar-verified" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#34d399" />
            </linearGradient>
            <linearGradient id="bar-inflated" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#f87171" stopOpacity="0.4" />
            </linearGradient>
          </defs>

          {/* Background Grid */}
          <rect width="520" height="220" fill="#1f1813" rx="12" />

          {/* Left Side: Radar Scope */}
          <g transform="translate(130, 110)">
            <circle r="80" stroke="#78350f" strokeWidth="1" strokeDasharray="4 4" fill="url(#radar-sweep)" />
            <circle r="55" stroke="#92400e" strokeWidth="1" fill="none" />
            <circle r="30" stroke="#b45309" strokeWidth="1.2" fill="none" />
            <circle r="4" fill="#fbbf24" />

            {/* Crosshairs */}
            <line x1="-80" y1="0" x2="80" y2="0" stroke="#78350f" strokeWidth="0.8" />
            <line x1="0" y1="-80" x2="0" y2="80" stroke="#78350f" strokeWidth="0.8" />

            {/* Sweep Needle */}
            <line x1="0" y1="0" x2="56" y2="-56" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
            <circle cx="36" cy="-28" r="4.5" fill="#f59e0b" stroke="#ffffff" strokeWidth="1" />
            <circle cx="-25" cy="40" r="3.5" fill="#10b981" />
            <circle cx="48" cy="20" r="3.5" fill="#38bdf8" />

            <text y="98" textAnchor="middle" className={styles.svgTextSub}>
              {isAr ? 'مسح الكتالوجات والمتاجر' : 'Marketplace Sweep'}
            </text>
          </g>

          {/* Right Side: Price Discrepancy & Verification Breakdown */}
          <g transform="translate(250, 40)">
            {/* Header Box */}
            <rect x="0" y="0" width="245" height="30" rx="6" fill="#382114" stroke="#78350f" strokeWidth="1" />
            <text x="12" y="19" className={styles.svgTextTitle} fill="#fde68a">
              {isAr ? 'مؤشر كشف الخصومات المصطنعة' : 'Fake-Discount Detector'}
            </text>
            <circle cx="230" cy="15" r="4" fill="#10b981" />

            {/* Metric 1: Inflated Stated Price */}
            <g transform="translate(0, 45)">
              <text x="0" y="12" className={styles.svgTextSub} fill="#9ca3af">
                {isAr ? 'السعر الترويجي قبل الفحص' : 'Stated Promo Price'}
              </text>
              <text x="245" y="12" textAnchor="end" className={styles.svgTextSub} fill="#f87171">
                $189 (مضخّم)
              </text>
              <rect x="0" y="18" width="245" height="12" rx="3" fill="#2d1d14" />
              <rect x="0" y="18" width="210" height="12" rx="3" fill="url(#bar-inflated)" />
            </g>

            {/* Metric 2: Audited Benchmark Real Price */}
            <g transform="translate(0, 85)">
              <text x="0" y="12" className={styles.svgTextSub} fill="#9ca3af">
                {isAr ? 'السعر الحقيقي بعد المقارنة' : 'Audited Real Price'}
              </text>
              <text x="245" y="12" textAnchor="end" className={styles.svgTextSub} fill="#34d399">
                $119 (حقيقي)
              </text>
              <rect x="0" y="18" width="245" height="12" rx="3" fill="#2d1d14" />
              <rect x="0" y="18" width="135" height="12" rx="3" fill="url(#bar-verified)" />
            </g>

            {/* Verification Status Pill */}
            <g transform="translate(0, 128)">
              <rect x="0" y="0" width="245" height="24" rx="4" fill="#15803d" fillOpacity="0.25" stroke="#16a34a" strokeWidth="0.8" />
              <text x="122" y="16" textAnchor="middle" className={styles.svgPillText} fill="#86efac">
                {isAr ? '✓ تم التحقق واستبعاد السعر الزائف' : '✓ Verified & False Markups Blocked'}
              </text>
            </g>
          </g>
        </svg>
      </div>
    </div>
  );
}

/**
 * 3. Editorial Guide Canvas Illustration (Youssef Bouchoi)
 * Visualizes structured buying guides, balanced pros/cons matrix, and clear readable layout.
 */
function EditorialCanvasIllustration({
  isAr,
  accentColor,
}: {
  isAr: boolean;
  accentColor: string;
}) {
  return (
    <div className={`${styles.illustrationWrapper} ${styles[`theme_${accentColor}`]}`}>
      <div className={styles.visualCanvas}>
        <svg
          viewBox="0 0 520 220"
          className={styles.svgGraphic}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <rect width="520" height="220" fill="#0f1f26" rx="12" />

          {/* Manuscript Sheet Base */}
          <rect x="35" y="25" width="450" height="170" rx="8" fill="#142c38" stroke="#1f4b5f" strokeWidth="1.2" />

          {/* Header Bar of Article */}
          <rect x="35" y="25" width="450" height="34" rx="8" fill="#193747" />
          <circle cx="58" cy="42" r="5" fill="#38bdf8" />
          <circle cx="74" cy="42" r="5" fill="#0284c7" />
          <circle cx="90" cy="42" r="5" fill="#0369a1" />
          <text x="110" y="46" className={styles.svgTextTitle} fill="#e0f2fe">
            {isAr ? 'دليل شراء تحريري ومقارنة شاملة' : 'Objective Buying Guide Canvas'}
          </text>
          <rect x="400" y="32" width="70" height="20" rx="4" fill="#0369a1" />
          <text x="435" y="46" textAnchor="middle" className={styles.svgPillText} fill="#ffffff">
            {isAr ? 'مسودة معتمدة' : 'Verified'}
          </text>

          {/* Left Block: Pros (Highlights) */}
          <g transform="translate(55, 75)">
            <rect width="190" height="100" rx="6" fill="#102d3b" stroke="#0284c7" strokeWidth="0.8" />
            <text x="14" y="22" className={styles.svgTextTitle} fill="#38bdf8">
              {isAr ? 'المزايا والأداء الفعلي' : 'Key Highlights'}
            </text>
            {/* 3 bullet lines */}
            <circle cx="22" cy="42" r="3" fill="#38bdf8" />
            <rect x="32" y="38" width="140" height="8" rx="2" fill="#1e4e66" />
            <circle cx="22" cy="62" r="3" fill="#38bdf8" />
            <rect x="32" y="58" width="125" height="8" rx="2" fill="#1e4e66" />
            <circle cx="22" cy="82" r="3" fill="#38bdf8" />
            <rect x="32" y="78" width="135" height="8" rx="2" fill="#1e4e66" />
          </g>

          {/* Right Block: Cons (Drawbacks & Things to Consider) */}
          <g transform="translate(275, 75)">
            <rect width="190" height="100" rx="6" fill="#1b2a33" stroke="#f59e0b" strokeWidth="0.8" />
            <text x="14" y="22" className={styles.svgTextTitle} fill="#fbbf24">
              {isAr ? 'القيود والعيوب الموثقة' : 'Drawbacks & Limits'}
            </text>
            {/* 3 caveat lines */}
            <circle cx="22" cy="42" r="3" fill="#f59e0b" />
            <rect x="32" y="38" width="135" height="8" rx="2" fill="#3b3226" />
            <circle cx="22" cy="62" r="3" fill="#f59e0b" />
            <rect x="32" y="58" width="145" height="8" rx="2" fill="#3b3226" />
            <circle cx="22" cy="82" r="3" fill="#f59e0b" />
            <rect x="32" y="78" width="115" height="8" rx="2" fill="#3b3226" />
          </g>
        </svg>
      </div>
    </div>
  );
}

/**
 * 4. Fact-Checking Ledger & Verification Stamp (Ilyas Hitane)
 * Visualizes rigorous specification matching, manufacturer source checks, and filtering hype.
 */
function AuditLedgerIllustration({
  isAr,
  accentColor,
}: {
  isAr: boolean;
  accentColor: string;
}) {
  return (
    <div className={`${styles.illustrationWrapper} ${styles[`theme_${accentColor}`]}`}>
      <div className={styles.visualCanvas}>
        <svg
          viewBox="0 0 520 220"
          className={styles.svgGraphic}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <rect width="520" height="220" fill="#162215" rx="12" />

          {/* Left Side: Audit Checklist Ledger */}
          <g transform="translate(35, 30)">
            <rect width="280" height="160" rx="8" fill="#1c301b" stroke="#365e34" strokeWidth="1" />

            {/* Checklist Item 1 */}
            <g transform="translate(16, 20)">
              <circle cx="10" cy="10" r="10" fill="#15803d" />
              <path d="M 6 10 L 9 13 L 15 7" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
              <text x="28" y="14" className={styles.svgTextTitle} fill="#ecfccb">
                {isAr ? 'مطابقة وثائق الصانع الأصلية' : 'Manufacturer Specs Verified'}
              </text>
            </g>

            {/* Checklist Item 2 */}
            <g transform="translate(16, 65)">
              <circle cx="10" cy="10" r="10" fill="#15803d" />
              <path d="M 6 10 L 9 13 L 15 7" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
              <text x="28" y="14" className={styles.svgTextTitle} fill="#ecfccb">
                {isAr ? 'فحص صحة الروابط الرسمية' : 'Official Store Links Certified'}
              </text>
            </g>

            {/* Checklist Item 3: Filtered Claim */}
            <g transform="translate(16, 110)">
              <circle cx="10" cy="10" r="10" fill="#b91c1c" />
              <path d="M 6 6 L 14 14 M 14 6 L 6 14" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
              <text x="28" y="14" className={styles.svgTextTitle} fill="#fca5a5">
                {isAr ? 'عزل الادعاءات غير المثبتة' : 'Unproven Hype Filtered Out'}
              </text>
            </g>
          </g>

          {/* Right Side: Verification Seal Medallion */}
          <g transform="translate(410, 110)">
            <circle r="70" fill="#20381f" stroke="#4d7c0f" strokeWidth="2" strokeDasharray="5 3" />
            <circle r="52" fill="#162e15" stroke="#65a30d" strokeWidth="1.5" />
            <circle r="40" fill="#1a4219" stroke="#84cc16" strokeWidth="1" />

            {/* Shield in Center */}
            <path
              d="M 0 -20 L 16 -10 L 16 8 C 16 18 0 24 0 24 C 0 24 -16 18 -16 8 L -16 -10 Z"
              fill="#4d7c0f"
              stroke="#bef264"
              strokeWidth="1.5"
            />
            <path d="M -6 2 L -1 7 L 7 -1" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />

            <text y="90" textAnchor="middle" className={styles.svgTextTitle} fill="#d9f99d">
              {isAr ? 'ختم التدقيق المرجعي' : 'Fact-Check Certified'}
            </text>
          </g>
        </svg>
      </div>
    </div>
  );
}

/**
 * 5. UX Viewport & Accessibility Inspector (Farah Laraich)
 * Visualizes dual-screen mobile/desktop readability, accessibility contrast, and navigation flow.
 */
function UxInspectorIllustration({
  isAr,
  accentColor,
}: {
  isAr: boolean;
  accentColor: string;
}) {
  return (
    <div className={`${styles.illustrationWrapper} ${styles[`theme_${accentColor}`]}`}>
      <div className={styles.visualCanvas}>
        <svg
          viewBox="0 0 520 220"
          className={styles.svgGraphic}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <rect width="520" height="220" fill="#241416" rx="12" />

          {/* Mobile Screen Mockup */}
          <g transform="translate(60, 20)">
            {/* Phone outer frame */}
            <rect width="105" height="180" rx="14" fill="#381b20" stroke="#be123c" strokeWidth="1.5" />
            {/* Screen inner */}
            <rect x="6" y="8" width="93" height="164" rx="8" fill="#1e0e11" />
            {/* Dynamic island / speaker */}
            <rect x="36" y="12" width="33" height="5" rx="2.5" fill="#881337" />

            {/* Mobile UI content mockup */}
            <rect x="14" y="26" width="77" height="14" rx="3" fill="#be123c" />
            <rect x="14" y="46" width="77" height="36" rx="4" fill="#4c1d24" stroke="#9f1239" strokeWidth="0.8" />
            <rect x="14" y="88" width="55" height="8" rx="2" fill="#fb7185" />
            <rect x="14" y="100" width="77" height="6" rx="2" fill="#69222e" />
            <rect x="14" y="110" width="68" height="6" rx="2" fill="#69222e" />
            <rect x="14" y="124" width="77" height="18" rx="4" fill="#9f1239" />
          </g>

          {/* Tablet / Desktop Frame Mockup */}
          <g transform="translate(200, 30)">
            <rect width="275" height="160" rx="10" fill="#36171d" stroke="#be123c" strokeWidth="1.2" />
            <rect x="8" y="8" width="259" height="144" rx="6" fill="#1a0c0e" />

            {/* Desktop Top Bar */}
            <rect x="16" y="16" width="243" height="20" rx="3" fill="#4c1d24" />
            <circle cx="28" cy="26" r="3.5" fill="#f43f5e" />
            <rect x="42" y="22" width="70" height="8" rx="2" fill="#fb7185" />

            {/* Content Split columns */}
            <rect x="16" y="44" width="130" height="60" rx="4" fill="#2d1318" stroke="#881337" strokeWidth="0.8" />
            <rect x="24" y="52" width="90" height="8" rx="2" fill="#fb7185" />
            <rect x="24" y="66" width="112" height="6" rx="2" fill="#782332" />
            <rect x="24" y="76" width="100" height="6" rx="2" fill="#782332" />
            <rect x="24" y="88" width="80" height="6" rx="2" fill="#782332" />

            <rect x="156" y="44" width="103" height="60" rx="4" fill="#4c1d24" />
            <circle cx="207" cy="68" r="14" fill="#be123c" />
            <rect x="175" y="90" width="65" height="6" rx="2" fill="#fecdd3" />

            {/* Bottom Accessibility Audit Pill */}
            <g transform="translate(16, 114)">
              <rect width="243" height="28" rx="5" fill="#be123c" fillOpacity="0.25" stroke="#f43f5e" strokeWidth="1" />
              <text x="121" y="18" textAnchor="middle" className={styles.svgPillText} fill="#fecdd3">
                {isAr ? 'فحص وضوح الخطوط وتجاوب الجوال 100%' : '100% Mobile & Contrast Verified'}
              </text>
            </g>
          </g>
        </svg>
      </div>
    </div>
  );
}
