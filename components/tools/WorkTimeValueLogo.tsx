import React from 'react';
import styles from './WorkTimeValueLogo.module.css';

interface WorkTimeValueLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showWordmark?: boolean;
  locale?: 'ar' | 'en';
  asHeading?: boolean;
}

/**
 * Custom Signature Emblem for AQURIVO's "حاسبة قيمة المنتج بوقت عملك" (Work Time Value Calculator):
 * - Part of the AQURIVO Architectural Tool Emblem family (#0d1117 obsidian shield, #2DD4BF teal, #F59E0B amber gold, #F9FAFB white)
 * - Visual Metaphor: "The Chrono-Value Hourglass & Precision Dial (مِقياس العُمر المهني والكرونوغراف المعماري)"
 *   1. Outer Precision Chronograph Ring with 12/3/6/9 Calibration Ticks
 *   2. Upper Amber-Gold Chamber (#F59E0B) representing Work Hours & Effort Spent
 *   3. Lower Sovereign Teal Chamber (#2DD4BF) representing True Value & Time Returned
 *   4. Horizontal Equilibrium Horizon Beam & Center Chrono Nexus Node
 */
export function WorkTimeValueLogo({
  size = 'md',
  showWordmark = false,
  locale = 'ar',
  asHeading = false,
}: WorkTimeValueLogoProps) {
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

          {/* Corner Chrono Calibration Brackets */}
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

          {/* Outer Chronograph Ring */}
          <circle
            cx="32"
            cy="32"
            r="21.5"
            stroke="#2DD4BF"
            strokeOpacity="0.24"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />

          {/* Cardinal Chrono Ticks (12, 3, 6, 9) */}
          <path
            d="M32 8.5V12M32 52V55.5M8.5 32H12M52 32H55.5"
            stroke="#F9FAFB"
            strokeOpacity="0.65"
            strokeWidth="1.8"
            strokeLinecap="round"
          />

          {/* Top & Bottom Architectural Hourglass Frame Caps */}
          <path
            d="M20 15.5H44"
            stroke="#F59E0B"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <path
            d="M20 48.5H44"
            stroke="#2DD4BF"
            strokeWidth="2.4"
            strokeLinecap="round"
          />

          {/* Upper Amber-Gold Chamber: Work Hours & Effort Invested */}
          <path
            d="M22 16L32 30.5L42 16H22Z"
            fill="#F59E0B"
            fillOpacity="0.22"
            stroke="#F59E0B"
            strokeWidth="2.1"
            strokeLinejoin="round"
          />

          {/* Lower Sovereign Teal Chamber: Net Product Value & Time Reclaimed */}
          <path
            d="M22 48L32 33.5L42 48H22Z"
            fill="#2DD4BF"
            fillOpacity="0.22"
            stroke="#2DD4BF"
            strokeWidth="2.1"
            strokeLinejoin="round"
          />

          {/* Flowing Sand / Time Stream inside Lower Teal Chamber */}
          <path
            d="M26.5 44.5H37.5M29 41H35"
            stroke="#2DD4BF"
            strokeWidth="1.9"
            strokeLinecap="round"
          />

          {/* Horizontal Equilibrium Horizon Vector */}
          <path
            d="M14 32H50"
            stroke="#F9FAFB"
            strokeOpacity="0.45"
            strokeWidth="1.4"
            strokeLinecap="round"
          />

          {/* Center Chrono Nexus Node */}
          <circle
            cx="32"
            cy="32"
            r="3.4"
            fill="#0d1117"
            stroke="#F9FAFB"
            strokeWidth="2"
          />

          {/* Top Crown Diamond Accent */}
          <path
            d="M32 10.5L34.6 13.1L32 15.7L29.4 13.1L32 10.5Z"
            fill="#F59E0B"
          />
        </svg>
      </span>

      {showWordmark && (
        <div className={styles.textColumn}>
          <div className={styles.kickerRow}>
            <span className={styles.kickerCode}>AQURIVO CHRONO-VALUE LAB</span>
            <span className={styles.kickerDiamond} aria-hidden="true" />
            <span className={styles.kickerSub}>
              {isAr ? 'مِقياس العُمر المهني للمشتريات' : 'TRUE WORK-HOURS & ROI CHRONOMETER'}
            </span>
          </div>

          <div className={styles.titleRow}>
            <TitleTag className={styles.titleText}>
              {isAr ? 'حاسبة قيمة المنتج بوقت عملك' : 'Work Time Value Calculator'}
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

export default WorkTimeValueLogo;
