import React from 'react';
import styles from './WorthBuyingLogo.module.css';

interface WorthBuyingLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showWordmark?: boolean;
  locale?: 'ar' | 'en';
  asHeading?: boolean;
}

/**
 * Custom Signature Emblem for AQURIVO's "هل يستحق الشراء؟" (Is It Worth Buying?) Tool:
 * - Harmonizes directly with AQURIVO's brand DNA (#0d1117 obsidian shield, #2DD4BF signature teal, #F59E0B gold, #F9FAFB crisp white)
 * - Combines 3 visual metaphors in a single geometric vector mark:
 *   1. Precision Calibration Gauge Arc & Scale Beam (evaluating price vs. lifelong usage)
 *   2. AQURIVO Gold Discovery Diamond (true intrinsic value & apex ray)
 *   3. Dynamic Teal Verdict Checkmark Needle (confident smart buying decision)
 */
export function WorthBuyingLogo({
  size = 'md',
  showWordmark = false,
  locale = 'ar',
  asHeading = false,
}: WorthBuyingLogoProps) {
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

          {/* Subtle Precision Inner Bezel */}
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

          {/* Corner Calibration Ticks (Gold & Teal) */}
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

          {/* Upper Verdict Meter Track Arc */}
          <path
            d="M12 36C12 24.954 20.954 16 32 16C43.046 16 52 24.954 52 36"
            stroke="#1F2937"
            strokeWidth="4.5"
            strokeLinecap="round"
          />

          {/* Active Value Calibration Arc (Gold to Teal split) */}
          <path
            d="M12 36C12 27.1 17.8 19.55 25.8 16.95"
            stroke="#F59E0B"
            strokeWidth="4.5"
            strokeLinecap="round"
          />
          <path
            d="M29.5 16.15C30.32 16.05 31.15 16 32 16C43.046 16 52 24.954 52 36"
            stroke="#2DD4BF"
            strokeWidth="4.5"
            strokeLinecap="round"
          />

          {/* AQURIVO Architectural Balance Pillar & Base */}
          <path
            d="M21 51H43"
            stroke="#F9FAFB"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M26 55H38"
            stroke="#2DD4BF"
            strokeWidth="2.2"
            strokeLinecap="round"
          />

          {/* AQURIVO Signature Gold Value Diamond at the Crown */}
          <path
            d="M32 7.5L35.6 12L32 16.5L28.4 12L32 7.5Z"
            fill="#F59E0B"
          />

          {/* Left Scale Pan Node (Cost) */}
          <circle cx="15.5" cy="39.5" r="3" fill="#F59E0B" />

          {/* Central & Right Verdict Check-Needle (Smart Buy Approval) */}
          <path
            d="M21.5 35.5L29.2 43.2L47.5 23.5"
            stroke="#2DD4BF"
            strokeWidth="5.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Crisp White Highlight Core on the Verdict Check */}
          <path
            d="M21.5 35.5L29.2 43.2L47.5 23.5"
            stroke="#F9FAFB"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity="0.9"
          />

          {/* Fulcrum Pivot Diamond at Verdict Vertex */}
          <path
            d="M29.2 46.2L32.4 50L29.2 53.8L26 50L29.2 46.2Z"
            fill="#2DD4BF"
          />
        </svg>
      </span>

      {showWordmark && (
        <div className={styles.textColumn}>
          <div className={styles.kickerRow}>
            <span className={styles.kickerCode}>AQURIVO VERDICT LAB</span>
            <span className={styles.kickerDiamond} aria-hidden="true" />
            <span className={styles.kickerSub}>
              {isAr ? 'مختبر قرار الشراء' : 'SMART BUY INDEX'}
            </span>
          </div>

          <div className={styles.titleRow}>
            <TitleTag className={styles.titleText}>
              {isAr ? 'هل يستحق الشراء؟' : 'Is It Worth Buying?'}
            </TitleTag>
          </div>

          <svg
            className={styles.signatureBar}
            viewBox="0 0 84 4"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <rect width="56" height="4" rx="2" fill="#2DD4BF" />
            <rect x="60" width="24" height="4" rx="2" fill="#F59E0B" />
          </svg>
        </div>
      )}
    </div>
  );
}
export default WorthBuyingLogo;
