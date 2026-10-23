'use client';

import React, { useId } from 'react';
import styles from './SmartToolPulse.module.css';

export interface SmartToolsEmblemProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Custom Signature SVG Emblem for AQURIVO Smart Tools ("أدوات ذكية للمنتج").
 * Harmonizes directly with AQURIVO's BrandLogo and ReportCareEmblem:
 * - Outer precision calibration compass ring in AQURIVO Teal (#2DD4BF)
 * - Architectural octagonal smart gauge frame
 * - Central AQURIVO Gold Discovery Diamond (#F59E0B) with an inner Teal analytical pulse needle
 */
export function SmartToolsEmblem({
  size = 'sm',
  className = '',
}: SmartToolsEmblemProps) {
  const uid = useId().replace(/:/g, '');
  const tealGradId = `smart-teal-${uid}`;
  const goldGradId = `smart-gold-${uid}`;
  const glowGradId = `smart-glow-${uid}`;

  const dimensions = size === 'sm' ? 20 : size === 'lg' ? 56 : 38;

  return (
    <span
      className={`${styles.emblemWrap} ${
        size === 'sm'
          ? styles.emblemSm
          : size === 'lg'
            ? styles.emblemLg
            : styles.emblemMd
      } ${className}`}
      aria-hidden="true"
    >
      <svg
        width={dimensions}
        height={dimensions}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={styles.emblemSvg}
      >
        <defs>
          <radialGradient id={glowGradId} cx="50%" cy="50%" r="52%">
            <stop offset="0%" stopColor="#2DD4BF" stopOpacity="0.28" />
            <stop offset="65%" stopColor="#2DD4BF" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#2DD4BF" stopOpacity="0" />
          </radialGradient>
          <linearGradient
            id={tealGradId}
            x1="10"
            y1="8"
            x2="54"
            y2="56"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#2DD4BF" />
            <stop offset="100%" stopColor="#0D9488" />
          </linearGradient>
          <linearGradient
            id={goldGradId}
            x1="18"
            y1="16"
            x2="46"
            y2="48"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#FBBF24" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>
        </defs>

        {/* Soft Ambient Halo */}
        <circle cx="32" cy="32" r="30" fill={`url(#${glowGradId})`} />

        {/* Outer Precision Calibration Ring */}
        <circle
          cx="32"
          cy="32"
          r="27"
          stroke={`url(#${tealGradId})`}
          strokeWidth="1.5"
          strokeDasharray="4 3"
          opacity="0.58"
        />

        {/* Architectural Smart Gauge Frame */}
        <path
          d="M23 10H41L54 23V41L41 54H23L10 41V23L23 10Z"
          fill="rgba(45, 212, 191, 0.1)"
          stroke={`url(#${tealGradId})`}
          strokeWidth="2.4"
          strokeLinejoin="round"
        />

        {/* Cardinal Calibration Ticks */}
        <path
          d="M32 10V14M32 50V54M10 32H14M50 32H54"
          stroke="#2DD4BF"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Central AQURIVO Gold Discovery Diamond */}
        <path
          d="M32 17.5L45.5 32L32 46.5L18.5 32L32 17.5Z"
          fill="rgba(245, 158, 11, 0.16)"
          stroke={`url(#${goldGradId})`}
          strokeWidth="2.3"
          strokeLinejoin="round"
        />

        {/* Inner Analytical Value Pulse Needle */}
        <path
          d="M23.5 32H27.8L30.2 26.5L33.8 37.5L36.2 32H40.5"
          stroke="#2DD4BF"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Top Crown Apex Star */}
        <circle cx="32" cy="14" r="2" fill="#F59E0B" />
      </svg>
    </span>
  );
}
