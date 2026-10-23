import React from 'react';
import styles from './CostOfLivingLogo.module.css';

interface CostOfLivingLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showWordmark?: boolean;
  locale?: 'ar' | 'en';
  asHeading?: boolean;
}

/**
 * Custom Signature Architectural Emblem for "مقارنة تكلفة المعيشة بين المدن" (Cost of Living Comparison).
 * Visual Metaphor: "The Global Meridian & Purchasing Power Parity Scale" —
 * A sovereign obsidian shield (#0d1117) housing a precision global latitude/longitude
 * meridian sphere intersected by a balanced twin-city parity beam:
 *   - Sovereign Teal (#0d9488 -> #2dd4bf) representing Origin Purchasing Power & Surplus
 *   - Warm Amber-Gold (#f59e0b -> #fbbf24) representing Target City Cost Index & Equilibrium
 */
export function CostOfLivingLogo({
  size = 'md',
  showWordmark = false,
  locale = 'ar',
  asHeading = false,
}: CostOfLivingLogoProps) {
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
              id="aqColVaultBg"
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
              id="aqColTealGrad"
              x1="8"
              y1="12"
              x2="36"
              y2="54"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#2dd4bf" />
              <stop offset="100%" stopColor="#0d9488" />
            </linearGradient>

            <linearGradient
              id="aqColAmberGrad"
              x1="30"
              y1="10"
              x2="56"
              y2="52"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#fde68a" />
              <stop offset="45%" stopColor="#f59e0b" />
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
            fill="url(#aqColVaultBg)"
            stroke="rgba(45, 212, 191, 0.34)"
            strokeWidth="1.5"
          />

          {/* Inner Architectural Bezel */}
          <rect
            x="8.5"
            y="8.5"
            width="47"
            height="47"
            rx="12"
            stroke="rgba(255, 255, 255, 0.06)"
            strokeWidth="1"
          />

          {/* Global Meridian Sphere — Left Arc (Sovereign Teal) */}
          <path
            d="M32 13 A19 19 0 0 0 32 51"
            stroke="url(#aqColTealGrad)"
            strokeWidth="2.2"
            strokeLinecap="round"
          />

          {/* Global Meridian Sphere — Right Arc (Amber Gold) */}
          <path
            d="M32 13 A19 19 0 0 1 32 51"
            stroke="url(#aqColAmberGrad)"
            strokeWidth="2.2"
            strokeLinecap="round"
          />

          {/* Inner Longitude Ellipses */}
          <ellipse
            cx="32"
            cy="32"
            rx="9.5"
            ry="19"
            stroke="rgba(255, 255, 255, 0.16)"
            strokeWidth="1.2"
            strokeDasharray="2.5 2.5"
          />

          {/* Latitude Equator & Tropics */}
          <line
            x1="15"
            y1="24"
            x2="49"
            y2="24"
            stroke="rgba(255, 255, 255, 0.12)"
            strokeWidth="1"
          />
          <line
            x1="15"
            y1="40"
            x2="49"
            y2="40"
            stroke="rgba(255, 255, 255, 0.12)"
            strokeWidth="1"
          />

          {/* Central Vertical Meridian Axis */}
          <line
            x1="32"
            y1="11"
            x2="32"
            y2="53"
            stroke="rgba(255, 255, 255, 0.22)"
            strokeWidth="1.2"
          />

          {/* Twin-City Purchasing Power Parity Beam */}
          <path
            d="M17 34 L47 30"
            stroke="#ffffff"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Origin City Node (Left - Sovereign Teal) */}
          <circle
            cx="18"
            cy="34"
            r="4.5"
            fill="#0b0f14"
            stroke="url(#aqColTealGrad)"
            strokeWidth="2.4"
          />
          <circle cx="18" cy="34" r="1.6" fill="#2dd4bf" />

          {/* Destination City Node (Right - Amber Gold) */}
          <circle
            cx="46"
            cy="30"
            r="4.5"
            fill="#0b0f14"
            stroke="url(#aqColAmberGrad)"
            strokeWidth="2.4"
          />
          <circle cx="46" cy="30" r="1.6" fill="#fbbf24" />

          {/* Center Equilibrium Fulcrum Diamond */}
          <path
            d="M32 28.2L35.8 32L32 35.8L28.2 32L32 28.2Z"
            fill="#0d9488"
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
                ? 'مرصد AQURIVO للقوة الشرائية العالمية'
                : 'AQURIVO GLOBAL PARITY ATLAS'}
            </span>
            <span className={styles.eyebrowDot}>•</span>
            <span className={styles.eyebrowFormula}>
              {isAr
                ? 'جميع قارات ودول العالم • 5 قطاعات معيشية'
                : 'Worldwide Cities • 5-Pillar Living Index'}
            </span>
          </div>

          <TitleTag className={styles.toolTitle}>
            {isAr
              ? 'مقارنة تكلفة المعيشة بين المدن'
              : 'Global Cost of Living & Purchasing Power Comparison'}
          </TitleTag>
        </div>
      )}
    </div>
  );
}

export default CostOfLivingLogo;
