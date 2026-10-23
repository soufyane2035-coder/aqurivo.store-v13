import React from 'react';
import styles from './LoanComparisonLogo.module.css';

interface LoanComparisonLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showWordmark?: boolean;
  locale?: 'ar' | 'en';
  asHeading?: boolean;
}

/**
 * Custom Signature Architectural Emblem for "مقارنة القروض والتمويل والجدول الإطفائي"
 * (Loan & Financing Comparison Studio).
 *
 * Visual Metaphor: "The Twin-Offer Equilibrium Scale & Amortization Decay Vector"
 * - Outer Obsidian Vault Shield (#0d1117)
 * - Twin Architectural Financing Pillars (Offer A in Sovereign Emerald #10B981 vs Offer B in Cyan/Amber)
 * - Descending Amortization Curve intersecting the Equilibrium Balance Beam
 * - Central Fulcrum Diamond Seal
 */
export function LoanComparisonLogo({
  size = 'md',
  showWordmark = false,
  locale = 'ar',
  asHeading = false,
}: LoanComparisonLogoProps) {
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
              id="aqLcVaultBg"
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
              id="aqLcOfferAGrad"
              x1="14"
              y1="16"
              x2="28"
              y2="50"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#0d9488" />
            </linearGradient>

            <linearGradient
              id="aqLcOfferBGrad"
              x1="36"
              y1="14"
              x2="50"
              y2="50"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#f43f5e" />
            </linearGradient>
          </defs>

          {/* Outer Sovereign Obsidian Shield */}
          <rect
            x="4"
            y="4"
            width="56"
            height="56"
            rx="16"
            fill="url(#aqLcVaultBg)"
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

          {/* Offer A Pillar (Left - Lower Total Cost Winner in Emerald) */}
          <rect
            x="16"
            y="24"
            width="11"
            height="24"
            rx="3"
            fill="rgba(16, 185, 129, 0.18)"
            stroke="url(#aqLcOfferAGrad)"
            strokeWidth="2"
          />

          {/* Offer B Pillar (Right - Higher Interest/Fee Burden in Amber/Coral) */}
          <rect
            x="37"
            y="16"
            width="11"
            height="32"
            rx="3"
            fill="rgba(245, 158, 11, 0.16)"
            stroke="url(#aqLcOfferBGrad)"
            strokeWidth="2"
          />

          {/* Amortization Payoff Curve */}
          <path
            d="M14 17 Q32 21 50 45"
            stroke="#0ea5e9"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeDasharray="3 2.5"
          />

          {/* Base Horizon Platform */}
          <line
            x1="13"
            y1="48.5"
            x2="51"
            y2="48.5"
            stroke="rgba(255, 255, 255, 0.45)"
            strokeWidth="1.8"
            strokeLinecap="round"
          />

          {/* Central Balance Fulcrum Diamond */}
          <path
            d="M32 28 L36.2 32.2 L32 36.4 L27.8 32.2 Z"
            fill="#10b981"
            stroke="#ffffff"
            strokeWidth="1.2"
          />
        </svg>
        <span className={styles.ambientGlow} />
      </div>

      {showWordmark && (
        <div className={styles.wordmarkGroup}>
          <div className={styles.eyebrowRow}>
            <span className={styles.eyebrowBadge}>
              {isAr
                ? 'استوديو AQURIVO لمقارنة القروض والجدول الإطفائي'
                : 'AQURIVO LOAN & AMORTIZATION STUDIO'}
            </span>
            <span className={styles.eyebrowDot} aria-hidden="true">
              ·
            </span>
            <span className={styles.eyebrowFormula}>
              {isAr
                ? 'متناقص مقابل ثابت · السداد المبكر · جدول الإطفاء'
                : 'Reducing vs Flat · Early Payoff · Amortization Table'}
            </span>
          </div>

          <TitleTag className={styles.toolTitle}>
            {isAr
              ? 'مقارنة القروض والتمويل والجدول الإطفائي'
              : 'Loan & Financing Comparison Studio'}
          </TitleTag>
        </div>
      )}
    </div>
  );
}

export default LoanComparisonLogo;
