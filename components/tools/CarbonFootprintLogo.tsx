import React from 'react';
import styles from './CarbonFootprintLogo.module.css';

interface CarbonFootprintLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showWordmark?: boolean;
  locale?: 'ar' | 'en';
  asHeading?: boolean;
}

/**
 * Custom Signature Architectural SVG Emblem for "Carbon Footprint & Eco-Savings Analyzer"
 * Concept: "Planetary Orbit Ring & Geometric Botanical Leaf with Energy Balance Pulse"
 * - Outer precision planetary atmosphere ring with 4 sector ticks (Mobility, Flights, Home Energy, Diet)
 * - Stylized geometric leaf emerging from the core with emerald bio-veins
 * - Sky-blue clean energy wave & gold financial-savings node
 */
export function CarbonFootprintLogo({
  size = 'md',
  showWordmark = false,
  locale = 'ar',
  asHeading = false,
}: CarbonFootprintLogoProps) {
  const isAr = locale === 'ar';

  const dimensions = {
    sm: 36,
    md: 48,
    lg: 60,
  }[size];

  const TitleTag = asHeading ? 'h1' : 'span';

  return (
    <div
      className={`${styles.lockup} ${styles[size]}`}
      dir={isAr ? 'rtl' : 'ltr'}
    >
      <div
        className={styles.markWrap}
        style={{ width: dimensions, height: dimensions }}
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={styles.svgMark}
        >
          <defs>
            <linearGradient
              id="cfVaultBg"
              x1="6"
              y1="6"
              x2="58"
              y2="58"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#091522" />
              <stop offset="55%" stopColor="#0F2032" />
              <stop offset="100%" stopColor="#07101B" />
            </linearGradient>

            <linearGradient
              id="cfLeafEmerald"
              x1="16"
              y1="48"
              x2="46"
              y2="14"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="60%" stopColor="#34D399" />
              <stop offset="100%" stopColor="#0EA5E9" />
            </linearGradient>

            <linearGradient
              id="cfLeafFill"
              x1="20"
              y1="16"
              x2="44"
              y2="46"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.26" />
              <stop offset="100%" stopColor="#0EA5E9" stopOpacity="0.06" />
            </linearGradient>

            <linearGradient
              id="cfSavingsGold"
              x1="12"
              y1="14"
              x2="52"
              y2="50"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#FBBF24" />
              <stop offset="100%" stopColor="#F59E0B" />
            </linearGradient>
          </defs>

          {/* Outer Precision Squircle Frame */}
          <rect
            x="3"
            y="3"
            width="58"
            height="58"
            rx="16"
            fill="url(#cfVaultBg)"
            stroke="rgba(16, 185, 129, 0.35)"
            strokeWidth="1.5"
          />

          {/* Planetary Orbit Ring */}
          <circle
            cx="32"
            cy="32"
            r="22"
            stroke="rgba(148, 163, 184, 0.16)"
            strokeWidth="1.2"
            strokeDasharray="3 3"
          />

          {/* 4 Sector Cardinal Ticks (Mobility, Aviation, Home Energy, Diet) */}
          <line x1="32" y1="7" x2="32" y2="10" stroke="#10B981" strokeWidth="1.6" strokeLinecap="round" />
          <line x1="57" y1="32" x2="54" y2="32" stroke="#0EA5E9" strokeWidth="1.6" strokeLinecap="round" />
          <line x1="32" y1="57" x2="32" y2="54" stroke="#F59E0B" strokeWidth="1.6" strokeLinecap="round" />
          <line x1="7" y1="32" x2="10" y2="32" stroke="#34D399" strokeWidth="1.6" strokeLinecap="round" />

          {/* Geometric Botanical Leaf Silhouette */}
          <path
            d="M20 44 C20 26 30 16 46 16 C46 32 36 44 20 44 Z"
            fill="url(#cfLeafFill)"
            stroke="url(#cfLeafEmerald)"
            strokeWidth="2.4"
            strokeLinejoin="round"
          />

          {/* Central Leaf Stem & Bio-Veins */}
          <path
            d="M17 47 L42 20"
            stroke="#34D399"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M28 35 L25 27 M34 29 L41 29"
            stroke="#10B981"
            strokeWidth="1.5"
            strokeLinecap="round"
          />

          {/* Clean Energy / Financial Savings Orbital Arc */}
          <path
            d="M15 26 A19 19 0 0 1 45 14"
            stroke="url(#cfSavingsGold)"
            strokeWidth="1.8"
            strokeLinecap="round"
          />

          {/* Top Eco-Apex Node */}
          <circle
            cx="46"
            cy="16"
            r="3.2"
            fill="#07101B"
            stroke="#34D399"
            strokeWidth="2"
          />
          {/* Financial Balance Node */}
          <circle cx="15" cy="26" r="2.2" fill="#FBBF24" />
        </svg>
      </div>

      {showWordmark && (
        <div className={styles.wordmark}>
          <div className={styles.eyebrowRow}>
            <span className={styles.brandTag}>AQURIVO ECO-ECONOMICS</span>
            <span className={styles.formulaBadge}>CO₂e ⇄ KWH & SAVINGS</span>
          </div>
          <TitleTag className={styles.toolTitle}>
            {isAr
              ? 'حاسبة البصمة الكربونية وتكلفة الطاقة'
              : 'Carbon Footprint & Eco-Savings Analyzer'}
          </TitleTag>
        </div>
      )}
    </div>
  );
}

export default CarbonFootprintLogo;
