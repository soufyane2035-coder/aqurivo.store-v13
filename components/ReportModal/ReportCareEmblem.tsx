'use client';

import React, { useId } from 'react';
import styles from './ReportModal.module.css';

export interface ReportCareEmblemProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Custom Signature SVG Emblem for AQURIVO Visitor Care & Issue Resolution.
 * Combines a protective geometric shield, a caring hand silhouette, and a warm
 * heart-pulse beacon in AQURIVO Teal (#2DD4BF) and Gold (#F59E0B).
 */
export function ReportCareEmblem({
  size = 'md',
  className = '',
}: ReportCareEmblemProps) {
  const uid = useId().replace(/:/g, '');
  const shieldGradId = `care-shield-${uid}`;
  const goldGradId = `care-gold-${uid}`;
  const glowGradId = `care-glow-${uid}`;

  const dimensions =
    size === 'sm' ? 20 : size === 'lg' ? 68 : 44;

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
          <radialGradient id={glowGradId} cx="50%" cy="45%" r="52%">
            <stop offset="0%" stopColor="#2DD4BF" stopOpacity="0.28" />
            <stop offset="65%" stopColor="#2DD4BF" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#2DD4BF" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={shieldGradId} x1="12" y1="8" x2="52" y2="56" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#2DD4BF" />
            <stop offset="100%" stopColor="#0D9488" />
          </linearGradient>
          <linearGradient id={goldGradId} x1="20" y1="16" x2="46" y2="46" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FBBF24" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>
        </defs>

        {/* Soft Ambient Halo */}
        <circle cx="32" cy="32" r="30" fill={`url(#${glowGradId})`} />

        {/* Outer Precision Trust Ring */}
        <circle
          cx="32"
          cy="32"
          r="27"
          stroke={`url(#${shieldGradId})`}
          strokeWidth="1.5"
          strokeDasharray="4 3"
          opacity="0.55"
        />

        {/* Protective Care Shield */}
        <path
          d="M32 9L50 16.5V30.5C50 43.2 42.1 52.8 32 56.5C21.9 52.8 14 43.2 14 30.5V16.5L32 9Z"
          fill="rgba(45, 212, 191, 0.1)"
          stroke={`url(#${shieldGradId})`}
          strokeWidth="2.4"
          strokeLinejoin="round"
        />

        {/* Warm Appreciation Heart inside the Shield */}
        <path
          d="M32 39.5C32 39.5 22.5 33.2 22.5 26.3C22.5 23.1 25 20.6 28.1 20.6C29.9 20.6 31.3 21.5 32 22.8C32.7 21.5 34.1 20.6 35.9 20.6C39 20.6 41.5 23.1 41.5 26.3C41.5 33.2 32 39.5 32 39.5Z"
          fill="rgba(245, 158, 11, 0.16)"
          stroke={`url(#${goldGradId})`}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Caring Pulse / Resolution Check Line inside Heart */}
        <path
          d="M26.5 28.5L29.8 31.6L37.5 24.5"
          stroke="#2DD4BF"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Supportive Cradle Arc Beneath Heart */}
        <path
          d="M21.5 42.5C24.8 45.8 28.3 47.4 32 47.4C35.7 47.4 39.2 45.8 42.5 42.5"
          stroke={`url(#${goldGradId})`}
          strokeWidth="2.2"
          strokeLinecap="round"
        />

        {/* Top Crown Star of Appreciation */}
        <circle cx="32" cy="14.5" r="2" fill="#F59E0B" />
      </svg>
    </span>
  );
}
