import React from 'react';
import styles from './FreelancePriceLogo.module.css';

interface FreelancePriceLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showWordmark?: boolean;
  locale?: 'ar' | 'en';
  asHeading?: boolean;
}

/**
 * Custom Signature Architectural Emblem for "فاحص ومستشار تسعير العمل الحر"
 * (Freelance Price & Rate Architect).
 *
 * Visual Metaphor: "The Sovereign Contract Prism & 3-Tier Value Scale"
 * - Outer Obsidian Vault Shield (#0d1117)
 * - Hexagonal Precision Contract Prism
 * - 3 Ascending Value Bars inside the prism:
 *   1. Electric Cyan (#0EA5E9): Walk-Away Floor Tier
 *   2. Sovereign Emerald (#10B981): Recommended Fair Value Tier
 *   3. Crown Amber-Gold (#F59E0B): Premium / Enterprise Rush Tier
 * - Top Sovereign Verification Seal Diamond
 */
export function FreelancePriceLogo({
  size = 'md',
  showWordmark = false,
  locale = 'ar',
  asHeading = false,
}: FreelancePriceLogoProps) {
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
              id="aqFpVaultBg"
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
              id="aqFpHexBorder"
              x1="14"
              y1="10"
              x2="50"
              y2="54"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="50%" stopColor="#0ea5e9" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
          </defs>

          {/* Outer Sovereign Obsidian Shield */}
          <rect
            x="4"
            y="4"
            width="56"
            height="56"
            rx="16"
            fill="url(#aqFpVaultBg)"
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

          {/* Hexagonal Precision Contract Shield */}
          <path
            d="M32 12 L49 21.5 V42.5 L32 52 L15 42.5 V21.5 L32 12 Z"
            fill="rgba(16, 185, 129, 0.06)"
            stroke="url(#aqFpHexBorder)"
            strokeWidth="2"
            strokeLinejoin="round"
          />

          {/* 3-Tier Proposal Columns Inside the Hexagon */}
          {/* Tier 1: Walk-Away Floor (Cyan) */}
          <rect
            x="21"
            y="33"
            width="5"
            height="10"
            rx="1.5"
            fill="#0ea5e9"
          />

          {/* Tier 2: Recommended Fair Sweet-Spot (Emerald) */}
          <rect
            x="29.5"
            y="26"
            width="5"
            height="17"
            rx="1.5"
            fill="#10b981"
          />

          {/* Tier 3: Premium Rush / Enterprise Value (Amber Gold) */}
          <rect
            x="38"
            y="20"
            width="5"
            height="23"
            rx="1.5"
            fill="#f59e0b"
          />

          {/* Base Contract Equilibrium Line */}
          <line
            x1="19"
            y1="43.5"
            x2="45"
            y2="43.5"
            stroke="rgba(255, 255, 255, 0.4)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />

          {/* Crown Verification Diamond */}
          <path
            d="M32 15.5 L35.2 18.7 L32 21.9 L28.8 18.7 Z"
            fill="#10b981"
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
                ? 'مختبر AQURIVO لهندسة عقود وتسعير العمل الحر'
                : 'AQURIVO FREELANCE RATE & PROPOSAL ARCHITECT'}
            </span>
            <span className={styles.eyebrowDot} aria-hidden="true">
              ·
            </span>
            <span className={styles.eyebrowFormula}>
              {isAr
                ? '3 باقات تسعير · احتساب التعديلات · جدول دفعات'
                : '3-Tier Proposal · Scope Buffer · Payment Milestones'}
            </span>
          </div>

          <TitleTag className={styles.toolTitle}>
            {isAr
              ? 'فاحص ومستشار تسعير العمل الحر (الفريلانسر)'
              : 'Freelance Price & Rate Architect'}
          </TitleTag>
        </div>
      )}
    </div>
  );
}

export default FreelancePriceLogo;
