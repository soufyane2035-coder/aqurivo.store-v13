import React from 'react';
import styles from './SavingsGoalLogo.module.css';

interface SavingsGoalLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showWordmark?: boolean;
  locale?: 'ar' | 'en';
  asHeading?: boolean;
}

/**
 * Custom Signature Architectural Emblem for "حاسبة هدف الادخار وبناء الثروة"
 * (Savings Goal & Milestone Roadmap Calculator).
 *
 * Visual Metaphor: "The Sovereign Horizon Compass & 4-Stage Milestone Trajectory"
 * - Outer Obsidian Vault Shield (#0d1117) with precision corner calibration ticks
 * - Concentric Target Horizon Rings (25%, 50%, 75%, 100%)
 * - Ascending Emerald-Cyan Trajectory Vector with 4 Illuminated Milestone Nodes
 * - Crown Gold Summit Star at the 100% Target Peak
 */
export function SavingsGoalLogo({
  size = 'md',
  showWordmark = false,
  locale = 'ar',
  asHeading = false,
}: SavingsGoalLogoProps) {
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
              id="aqSgVaultBg"
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
              id="aqSgEmeraldCyan"
              x1="12"
              y1="48"
              x2="50"
              y2="14"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="55%" stopColor="#2dd4bf" />
              <stop offset="100%" stopColor="#0ea5e9" />
            </linearGradient>

            <linearGradient
              id="aqSgGoldPeak"
              x1="34"
              y1="10"
              x2="54"
              y2="28"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#fde68a" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
          </defs>

          {/* Outer Sovereign Obsidian Shield */}
          <rect
            x="4"
            y="4"
            width="56"
            height="56"
            rx="16"
            fill="url(#aqSgVaultBg)"
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

          {/* Concentric Target Horizon Rings */}
          <circle
            cx="32"
            cy="32"
            r="19"
            stroke="rgba(14, 165, 233, 0.2)"
            strokeWidth="1.4"
            strokeDasharray="3 3"
          />
          <circle
            cx="32"
            cy="32"
            r="12.5"
            stroke="rgba(16, 185, 129, 0.25)"
            strokeWidth="1.4"
          />

          {/* Active Goal Completion Arc */}
          <path
            d="M13 32 A19 19 0 1 1 45.5 18.5"
            stroke="url(#aqSgEmeraldCyan)"
            strokeWidth="2.8"
            strokeLinecap="round"
          />

          {/* Ascending 4-Stage Milestone Trajectory Path */}
          <path
            d="M15 46 L25 37 L35 29 L47 17"
            stroke="url(#aqSgEmeraldCyan)"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Arrowhead at Summit */}
          <path
            d="M40 17 H47 V24"
            stroke="#f59e0b"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* 4 Illuminated Milestone Nodes (25%, 50%, 75%, 100%) */}
          <circle
            cx="15"
            cy="46"
            r="3"
            fill="#0b0f14"
            stroke="#10b981"
            strokeWidth="2.2"
          />
          <circle
            cx="25"
            cy="37"
            r="3"
            fill="#0b0f14"
            stroke="#2dd4bf"
            strokeWidth="2.2"
          />
          <circle
            cx="35"
            cy="29"
            r="3"
            fill="#0b0f14"
            stroke="#0ea5e9"
            strokeWidth="2.2"
          />

          {/* 100% Goal Summit Diamond */}
          <path
            d="M47 12.2 L51.8 17 L47 21.8 L42.2 17 Z"
            fill="url(#aqSgGoldPeak)"
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
                ? 'مختبر AQURIVO لهندسة الأهداف والادخار'
                : 'AQURIVO GOAL & MILESTONE ARCHITECT'}
            </span>
            <span className={styles.eyebrowDot} aria-hidden="true">
              ·
            </span>
            <span className={styles.eyebrowFormula}>
              {isAr
                ? 'حساب مزدوج · 4 محطات زمنية · حماية من التضخم'
                : 'Dual-Mode Solver · 4 Milestones · Yield & Inflation'}
            </span>
          </div>

          <TitleTag className={styles.toolTitle}>
            {isAr
              ? 'حاسبة هدف الادخار وبناء الثروة'
              : 'Savings Goal & Milestone Roadmap Calculator'}
          </TitleTag>
        </div>
      )}
    </div>
  );
}

export default SavingsGoalLogo;
