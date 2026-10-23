import React from 'react';
import styles from './CodeToImageLogo.module.css';

interface CodeToImageLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showWordmark?: boolean;
  locale?: 'ar' | 'en';
  asHeading?: boolean;
}

/**
 * Custom Signature Architectural SVG Emblem for "AQURIVO Code-to-Image Studio"
 * Concept: "Studio Camera Viewfinder Framing Precision Syntax Brackets < / >"
 * - Outer optical studio frame with 4 corner viewfinder brackets
 * - Inner macOS-inspired dark glass code window header dots
 * - Luminous Emerald & Sky-Blue syntax chevrons `< / >`
 */
export function CodeToImageLogo({
  size = 'md',
  showWordmark = false,
  locale = 'ar',
  asHeading = false,
}: CodeToImageLogoProps) {
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
              id="ctiVaultBg"
              x1="6"
              y1="6"
              x2="58"
              y2="58"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#091322" />
              <stop offset="55%" stopColor="#0F1F35" />
              <stop offset="100%" stopColor="#060D17" />
            </linearGradient>

            <linearGradient
              id="ctiSyntaxEmerald"
              x1="16"
              y1="22"
              x2="48"
              y2="46"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="55%" stopColor="#34D399" />
              <stop offset="100%" stopColor="#38BDF8" />
            </linearGradient>

            <linearGradient
              id="ctiSlashGold"
              x1="28"
              y1="44"
              x2="36"
              y2="24"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#FBBF24" />
            </linearGradient>
          </defs>

          {/* Outer Precision Squircle Frame */}
          <rect
            x="3"
            y="3"
            width="58"
            height="58"
            rx="16"
            fill="url(#ctiVaultBg)"
            stroke="rgba(56, 189, 248, 0.35)"
            strokeWidth="1.5"
          />

          {/* 4 Optical Camera Viewfinder Corner Brackets */}
          <path
            d="M11 18 V12 H17 M47 12 H53 V18 M53 46 V52 H47 M17 52 H11 V46"
            stroke="rgba(148, 163, 184, 0.45)"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Inner Code Window Card */}
          <rect
            x="14"
            y="16"
            width="36"
            height="32"
            rx="6"
            fill="rgba(15, 23, 42, 0.85)"
            stroke="rgba(16, 185, 129, 0.32)"
            strokeWidth="1.3"
          />

          {/* Window Traffic Dots */}
          <circle cx="19" cy="21" r="1.4" fill="#F43F5E" />
          <circle cx="23.5" cy="21" r="1.4" fill="#F59E0B" />
          <circle cx="28" cy="21" r="1.4" fill="#10B981" />

          {/* Syntax Code Brackets < / > */}
          <path
            d="M25 29 L19.5 34.5 L25 40"
            stroke="url(#ctiSyntaxEmerald)"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M39 29 L44.5 34.5 L39 40"
            stroke="url(#ctiSyntaxEmerald)"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M34.2 27.5 L29.8 41.5"
            stroke="url(#ctiSlashGold)"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {showWordmark && (
        <div className={styles.wordmark}>
          <div className={styles.eyebrowRow}>
            <span className={styles.brandTag}>AQURIVO DEV STUDIO</span>
            <span className={styles.formulaBadge}>AST TOKENIZER ➔ 2X PNG</span>
          </div>
          <TitleTag className={styles.toolTitle}>
            {isAr
              ? 'استوديو تحويل الكود إلى صورة احترافية'
              : 'AQURIVO Code-to-Image Studio'}
          </TitleTag>
        </div>
      )}
    </div>
  );
}

export default CodeToImageLogo;
