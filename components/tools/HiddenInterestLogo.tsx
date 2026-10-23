import React from 'react';
import styles from './HiddenInterestLogo.module.css';

interface HiddenInterestLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showWordmark?: boolean;
  locale?: 'ar' | 'en';
  asHeading?: boolean;
}

/**
 * Custom Signature Emblem for AQURIVO's "حاسبة الفائدة المخفية للتقسيط" (Hidden Interest Calculator):
 * - Part of the AQURIVO Architectural Tool Emblem family (#0d1117 obsidian shield, #2DD4BF teal, #F59E0B amber gold, #F9FAFB white)
 * - Visual Metaphor: "The X-Ray Split Prism (المنشور الكاشف / عدسة كشف القسط)"
 *   1. Forefront Teal Price Layer (True Cash Value)
 *   2. Revealed Offset Amber-Gold Shadow Layer (Hidden Interest & Admin Fees)
 *   3. Diagonal X-Ray Laser Vector & Precision Percentage Nodes exposing the hidden cost
 */
export function HiddenInterestLogo({
  size = 'md',
  showWordmark = false,
  locale = 'ar',
  asHeading = false,
}: HiddenInterestLogoProps) {
  const isAr = locale === 'ar';
  const TitleTag = asHeading ? 'h1' : 'span';

  return (
    <div className={`${styles.lockup} ${styles[size]}`}>
      <span className={styles.markWrap} aria-hidden="true">
        <svg
          className={styles.markSvg}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Base Obsidian Squircle Shield (#0d1117) */}
          <rect width="64" height="64" rx="15" fill="#0d1117" />

          {/* Precision Inner Bezel */}
          <rect
            x="2.5"
            y="2.5"
            width="59"
            height="59"
            rx="12.5"
            stroke="#2DD4BF"
            strokeOpacity="0.28"
            strokeWidth="1.5"
          />

          {/* Corner X-Ray Calibration Brackets */}
          <path
            d="M9 14V9H14"
            stroke="#2DD4BF"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M55 14V9H50"
            stroke="#F59E0B"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M9 50V55H14"
            stroke="#2DD4BF"
            strokeOpacity="0.55"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M55 50V55H50"
            stroke="#F59E0B"
            strokeOpacity="0.55"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Hidden Back Layer: Amber-Gold Markup Prism (The Disguised Interest) */}
          <rect
            x="24"
            y="13"
            width="26"
            height="26"
            rx="5.5"
            fill="#F59E0B"
            fillOpacity="0.18"
            stroke="#F59E0B"
            strokeWidth="2.2"
          />
          {/* Segmented Installment Bars inside Hidden Gold Layer */}
          <path
            d="M30 20H44M34 25H44M38 30H44"
            stroke="#F59E0B"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Forefront Layer: Sovereign Teal True Cash Slab */}
          <rect
            x="14"
            y="25"
            width="26"
            height="26"
            rx="5.5"
            fill="#111922"
            stroke="#2DD4BF"
            strokeWidth="2.4"
          />
          {/* Cash Principal Equal Lines */}
          <path
            d="M20 34H30M20 40H34M20 45H27"
            stroke="#2DD4BF"
            strokeWidth="2.2"
            strokeLinecap="round"
          />

          {/* Diagonal X-Ray Scanner Beam slicing between Cash & Hidden Interest */}
          <path
            d="M12 52L52 12"
            stroke="#F9FAFB"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <path
            d="M12 52L52 12"
            stroke="#2DD4BF"
            strokeOpacity="0.5"
            strokeWidth="5"
            strokeLinecap="round"
          />

          {/* Percentage / APR Nodes flanking the X-Ray Beam */}
          <circle
            cx="21"
            cy="21"
            r="3.2"
            fill="#0d1117"
            stroke="#2DD4BF"
            strokeWidth="2"
          />
          <circle
            cx="45"
            cy="45"
            r="3.2"
            fill="#0d1117"
            stroke="#F59E0B"
            strokeWidth="2"
          />

          {/* Crown Discovery Diamond at Top-Right of X-Ray Beam */}
          <path
            d="M52 8.5L55.5 12L52 15.5L48.5 12L52 8.5Z"
            fill="#F59E0B"
          />
        </svg>
      </span>

      {showWordmark && (
        <div className={styles.textColumn}>
          <div className={styles.kickerRow}>
            <span className={styles.kickerCode}>AQURIVO INSTALLMENT X-RAY</span>
            <span className={styles.kickerDiamond} aria-hidden="true" />
            <span className={styles.kickerSub}>
              {isAr ? 'مِجهر كشف عقود التقسيط' : 'TRUE APR & MARKUP LAB'}
            </span>
          </div>

          <div className={styles.titleRow}>
            <TitleTag className={styles.titleText}>
              {isAr ? 'حاسبة الفائدة المخفية للتقسيط' : 'Hidden Interest Calculator'}
            </TitleTag>
          </div>

          <svg
            className={styles.signatureBar}
            viewBox="0 0 84 4"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <rect width="50" height="4" rx="2" fill="#2DD4BF" />
            <rect x="54" width="30" height="4" rx="2" fill="#F59E0B" />
          </svg>
        </div>
      )}
    </div>
  );
}

export default HiddenInterestLogo;
