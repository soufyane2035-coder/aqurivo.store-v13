import React from 'react';
import styles from './InvestmentGrowthLogo.module.css';

interface InvestmentGrowthLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showWordmark?: boolean;
  locale?: 'ar' | 'en';
  asHeading?: boolean;
}

/**
 * Custom Signature Architectural Emblem for "حاسبة نمو الاستثمار والعائد المركب"
 * (Investment Growth & Compound Wealth Studio).
 *
 * Visual Metaphor: "The Exponential Compounding Curve & Crossover Horizon"
 * - Outer Obsidian Vault Shield (#0d1117)
 * - Linear Principal Baseline (#38BDF8 Sky Cyan) vs. Exponential Compounding Curve (#10B981 Emerald)
 * - Golden Crossover Intersection Node (#F59E0B) marking the exact year compound profits overtake principal
 */
export function InvestmentGrowthLogo({
  size = 'md',
  showWordmark = false,
  locale = 'ar',
  asHeading = false,
}: InvestmentGrowthLogoProps) {
  const isAr = locale === 'ar';

  const dimensions = {
    sm: 36,
    md: 46,
    lg: 56,
  }[size];

  const TitleTag = asHeading ? 'h1' : 'span';

  return (
    <div
      className={`${styles.lockup} ${styles[`size_${size}`]}`}
      dir={isAr ? 'rtl' : 'ltr'}
    >
      <div className={styles.markWrap} aria-hidden="true">
        <svg
          width={dimensions}
          height={dimensions}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={styles.svgMark}
        >
          <defs>
            <linearGradient
              id="aqIgVaultBg"
              x1="6"
              y1="4"
              x2="58"
              y2="60"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#131922" />
              <stop offset="100%" stopColor="#0b0f14" />
            </linearGradient>

            <linearGradient
              id="aqIgExpCurve"
              x1="14"
              y1="48"
              x2="50"
              y2="14"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#2dd4bf" />
              <stop offset="60%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#34d399" />
            </linearGradient>

            <linearGradient
              id="aqIgAreaFill"
              x1="32"
              y1="14"
              x2="32"
              y2="49"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Outer Sovereign Obsidian Shield */}
          <rect
            x="4"
            y="4"
            width="56"
            height="56"
            rx="16"
            fill="url(#aqIgVaultBg)"
            stroke="rgba(45, 212, 191, 0.36)"
            strokeWidth="1.5"
          />

          {/* Inner Architectural Bezel */}
          <rect
            x="8.5"
            y="8.5"
            width="47"
            height="47"
            rx="12"
            stroke="rgba(255, 255, 255, 0.07)"
            strokeWidth="1"
          />

          {/* Exponential Area Fill */}
          <path
            d="M14 47 Q32 44 49 15 L49 47 Z"
            fill="url(#aqIgAreaFill)"
          />

          {/* Linear Principal Contribution Trajectory (Sky Cyan) */}
          <path
            d="M14 47 L49 33"
            stroke="#38bdf8"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeDasharray="3 2.5"
          />

          {/* Exponential Compound Wealth Trajectory (Sovereign Emerald) */}
          <path
            d="M14 47 Q32 44 49 15"
            stroke="url(#aqIgExpCurve)"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Golden Crossover Node (Where Compound Profit Overtakes Principal) */}
          <circle
            cx="33"
            cy="39.5"
            r="3.8"
            fill="#0b0f14"
            stroke="#f59e0b"
            strokeWidth="2.2"
          />

          {/* Peak Wealth Diamond Star */}
          <path
            d="M49 11 L52.6 14.6 L49 18.2 L45.4 14.6 Z"
            fill="#f59e0b"
            stroke="#ffffff"
            strokeWidth="1"
          />
        </svg>
        <span className={styles.ambientGlow} />
      </div>

      {showWordmark && (
        <div className={styles.wordmarkGroup}>
          <div className={styles.eyebrowRow}>
            <span className={styles.eyebrowBadge}>
              {isAr
                ? 'استوديو AQURIVO لنمو الثروة والعائد المركب'
                : 'AQURIVO COMPOUND WEALTH & CROSSOVER STUDIO'}
            </span>
            <span className={styles.eyebrowDot} aria-hidden="true">
              ·
            </span>
            <span className={styles.eyebrowFormula}>
              {isAr
                ? 'نقطة التحول الذهبية · القوة الشرائية · راتب التقاعد 4%'
                : 'Crossover Year · Real Purchasing Power · 4% Safe Income'}
            </span>
          </div>

          <TitleTag className={styles.toolTitle}>
            {isAr
              ? 'حاسبة نمو الاستثمار والعائد المركب'
              : 'Investment Growth & Compound Wealth Studio'}
          </TitleTag>
        </div>
      )}
    </div>
  );
}

export default InvestmentGrowthLogo;
