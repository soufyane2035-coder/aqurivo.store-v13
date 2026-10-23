import React from 'react';
import styles from './RealSalaryLogo.module.css';

interface RealSalaryLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showWordmark?: boolean;
  locale?: 'ar' | 'en';
  asHeading?: boolean;
}

/**
 * Custom Signature Architectural Emblem for "حاسبة الراتب الحقيقي وقيمة الساعة"
 * (Real Salary & Hourly Value Calculator).
 *
 * Visual Metaphor: "The Sovereign Net-Worth Chronometer & Equilibrium Scale"
 * - Outer Obsidian Vault Shield (#0d1117) with precision corner calibration ticks
 * - Precision 12-Sector Workday Dial divided into:
 *   1. Amber-Gold Arc (#F59E0B): Fixed Living & Housing Obligations
 *   2. Rose-Coral Arc (#F43F5E): Hidden Commute & Work-Related Drain
 *   3. Sovereign Emerald-Teal Arc (#10B981 / #2DD4BF): True Net Hourly Value & Freedom Surplus
 * - Central Sovereign Net-Value Diamond & Chrono Pointer Needle
 */
export function RealSalaryLogo({
  size = 'md',
  showWordmark = false,
  locale = 'ar',
  asHeading = false,
}: RealSalaryLogoProps) {
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
              id="aqRsVaultBg"
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
              id="aqRsTealGrad"
              x1="12"
              y1="14"
              x2="48"
              y2="52"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="50%" stopColor="#2dd4bf" />
              <stop offset="100%" stopColor="#0d9488" />
            </linearGradient>

            <linearGradient
              id="aqRsAmberGrad"
              x1="14"
              y1="10"
              x2="52"
              y2="38"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#fde68a" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>

            <linearGradient
              id="aqRsCoralGrad"
              x1="36"
              y1="12"
              x2="54"
              y2="36"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#fda4af" />
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
            fill="url(#aqRsVaultBg)"
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

          {/* Corner Precision Calibration Brackets */}
          <path
            d="M11 16V11H16"
            stroke="#2dd4bf"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M53 16V11H48"
            stroke="#f59e0b"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M11 48V53H16"
            stroke="#2dd4bf"
            strokeOpacity="0.55"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M53 48V53H48"
            stroke="#f43f5e"
            strokeOpacity="0.65"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Outer Chronometer Track */}
          <circle
            cx="32"
            cy="32"
            r="19.5"
            stroke="rgba(255, 255, 255, 0.12)"
            strokeWidth="3.2"
          />

          {/* Sector 1: Amber-Gold Arc (Living & Housing Pillars - Top Left) */}
          <path
            d="M14.5 23.5 A19.5 19.5 0 0 1 36.5 13"
            stroke="url(#aqRsAmberGrad)"
            strokeWidth="3.4"
            strokeLinecap="round"
          />

          {/* Sector 2: Coral-Rose Arc (Work & Commute Friction - Top Right) */}
          <path
            d="M41.5 15 A19.5 19.5 0 0 1 51 35"
            stroke="url(#aqRsCoralGrad)"
            strokeWidth="3.4"
            strokeLinecap="round"
          />

          {/* Sector 3: Sovereign Emerald-Teal Arc (True Net Take-Home & Hourly Value - Bottom Full Arc) */}
          <path
            d="M49.5 40.5 A19.5 19.5 0 0 1 13 36.5"
            stroke="url(#aqRsTealGrad)"
            strokeWidth="3.8"
            strokeLinecap="round"
          />

          {/* Inner Precision Balance Scale Beam */}
          <line
            x1="18"
            y1="32"
            x2="46"
            y2="32"
            stroke="rgba(255, 255, 255, 0.28)"
            strokeWidth="1.4"
            strokeLinecap="round"
          />

          {/* Chrono Hand pointing to True Net Value */}
          <path
            d="M32 32 L22 43"
            stroke="#34d399"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M32 32 L41 21"
            stroke="#f59e0b"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeDasharray="2 2"
          />

          {/* Center Sovereign Net-Worth Diamond Core */}
          <path
            d="M32 23.5 L39.5 32 L32 40.5 L24.5 32 Z"
            fill="rgba(16, 185, 129, 0.18)"
            stroke="url(#aqRsTealGrad)"
            strokeWidth="2"
            strokeLinejoin="round"
          />

          {/* Inner Fulcrum Node */}
          <circle
            cx="32"
            cy="32"
            r="2.8"
            fill="#0b0f14"
            stroke="#ffffff"
            strokeWidth="1.8"
          />
        </svg>
        <span className={styles.ambientGlow} />
      </div>

      {showWordmark && (
        <div className={styles.wordmarkGroup}>
          <div className={styles.eyebrowRow}>
            <span className={styles.eyebrowBadge}>
              {isAr
                ? 'مختبر AQURIVO لتشريح الدخل وقيمة الساعة'
                : 'AQURIVO NET-WAGE & WORKDAY LAB'}
            </span>
            <span className={styles.eyebrowDot} aria-hidden="true">
              ·
            </span>
            <span className={styles.eyebrowFormula}>
              {isAr
                ? 'صافي الساعة الحقيقية · استنزاف الطريق · توازن 50/30/20'
                : 'True Net Hourly Rate · Commute Drain · 50/30/20 Audit'}
            </span>
          </div>

          <TitleTag className={styles.toolTitle}>
            {isAr
              ? 'حاسبة الراتب الحقيقي وقيمة الساعة'
              : 'Real Salary & True Hourly Value Calculator'}
          </TitleTag>
        </div>
      )}
    </div>
  );
}

export default RealSalaryLogo;
