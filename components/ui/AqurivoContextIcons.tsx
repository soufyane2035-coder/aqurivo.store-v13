import React from 'react';

export interface ContextIconProps {
  size?: number;
  className?: string;
}

/**
 * 1. CareShieldBadgeIcon
 * For: "مركز العناية بالزوار وحل المشكلات" (Visitor Care & Issue Resolution)
 * Visual: Geometric shield with a warm Gold heart-pulse & Teal resolution check.
 */
export function CareShieldBadgeIcon({
  size = 15,
  className = '',
}: ContextIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M12 2.5L20 6V11.8C20 16.9 16.6 20.6 12 22C7.4 20.6 4 16.9 4 11.8V6L12 2.5Z"
        fill="rgba(45, 212, 191, 0.14)"
        stroke="#2DD4BF"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M9 12.2L11.1 14.3L15.5 9.8"
        stroke="#F59E0B"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * 2. AutoPriceSyncIcon
 * For: "ينتقل معك السعر تلقائياً" (Auto-carries price)
 * Visual: Synchronized dual-transfer arrows around an AQURIVO Gold value diamond.
 */
export function AutoPriceSyncIcon({
  size = 14,
  className = '',
}: ContextIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M4 10C4.8 6.6 7.9 4 11.8 4C14.7 4 17.2 5.5 18.6 7.8M19 4.5V8H15.5"
        stroke="#2DD4BF"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20 14C19.2 17.4 16.1 20 12.2 20C9.3 20 6.8 18.5 5.4 16.2M5 19.5V16H8.5"
        stroke="#F59E0B"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 8.5L15 12L12 15.5L9 12L12 8.5Z"
        fill="rgba(245, 158, 11, 0.2)"
        stroke="#F59E0B"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * 3. MilestoneRouteIcon
 * For: "خريطة محطات الطريق (25% — 50% — 75% — 100%)" (4-Milestone Roadmap)
 * Visual: Ascending 4-stage checkpoint trajectory with a Gold summit flag.
 */
export function MilestoneRouteIcon({
  size = 20,
  className = '',
}: ContextIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M3.5 18.5L9 14L14.5 10.5L20 5.5"
        stroke="#2DD4BF"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="3.5" cy="18.5" r="2" fill="#2DD4BF" />
      <circle cx="9" cy="14" r="2" fill="#2DD4BF" />
      <circle cx="14.5" cy="10.5" r="2" fill="#F59E0B" />
      <circle cx="20" cy="5.5" r="2.3" fill="#F59E0B" />
      <path
        d="M20 3V8.5M20 3L22.5 4.5L20 6"
        stroke="#F59E0B"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * 4. GoldenCrossoverIcon
 * For: "نقطة التحول الذهبية: ستتجاوز أرباحك المركبة إجمالي كل ما دفعته..." (Golden Crossover Point)
 * Visual: Two intersecting financial curves (linear deposits vs. exponential compound profit)
 * with a glowing Gold diamond at the exact crossover intersection.
 */
export function GoldenCrossoverIcon({
  size = 19,
  className = '',
}: ContextIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Linear Principal Line */}
      <path
        d="M3 17.5L21 9.5"
        stroke="#9CA3AF"
        strokeWidth="1.7"
        strokeDasharray="2.5 2.5"
        strokeLinecap="round"
      />
      {/* Exponential Compound Growth Curve */}
      <path
        d="M3 20C8.5 19.5 12.5 16.5 15.5 12C17.5 9 19.2 5.8 20.5 3.5"
        stroke="#2DD4BF"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
      {/* Golden Crossover Diamond Node */}
      <path
        d="M14.2 9.2L17.4 12.4L14.2 15.6L11 12.4L14.2 9.2Z"
        fill="#F59E0B"
        stroke="#0d1117"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * 5. RetinaExportVerifiedIcon
 * For: "تم تنزيل الصورة بدقة Retina 2x PNG بنجاح" (Studio Export Verified)
 * Visual: Precision Retina studio viewfinder frame with a verified check inside.
 */
export function RetinaExportVerifiedIcon({
  size = 16,
  className = '',
}: ContextIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M4 8V5.5C4 4.67 4.67 4 5.5 4H8M16 4H18.5C19.33 4 20 4.67 20 5.5V8M20 16V18.5C20 19.33 19.33 20 18.5 20H16M8 20H5.5C4.67 20 4 19.33 4 18.5V16"
        stroke="#2DD4BF"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <path
        d="M8.5 12.2L11 14.7L15.8 9.5"
        stroke="#F59E0B"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * 6. EditorialGuideIcon
 * For: "أدلة ومراجعات ذات صلة" (Related Buying Guides & Reviews)
 * Visual: Architectural open editorial guide with a Teal bookmark and Gold star diamond.
 */
export function EditorialGuideIcon({
  size = 20,
  className = '',
}: ContextIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M12 5.5C10.2 4.3 7.6 3.8 4.5 4.2C3.9 4.3 3.5 4.8 3.5 5.4V17.8C3.5 18.5 4.1 19 4.8 18.9C7.7 18.5 10.1 19 12 20.2M12 5.5C13.8 4.3 16.4 3.8 19.5 4.2C20.1 4.3 20.5 4.8 20.5 5.4V17.8C20.5 18.5 19.9 19 19.2 18.9C16.3 18.5 13.9 19 12 20.2M12 5.5V20.2"
        stroke="#2DD4BF"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16.5 4.2V11L18 9.8L19.5 11V4.2"
        fill="rgba(245, 158, 11, 0.25)"
        stroke="#F59E0B"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * 7. FirstReviewStarBubbleIcon
 * For: "كن أول من يقيّم هذا المنتج!" (Be the first to review this product!)
 * Visual: Sleek review dialogue frame housing a Gold rating star & Teal accent.
 */
export function FirstReviewStarBubbleIcon({
  size = 28,
  className = '',
}: ContextIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M6 7.5C6 5.84 7.34 4.5 9 4.5H23C24.66 4.5 26 5.84 26 7.5V19.5C26 21.16 24.66 22.5 23 22.5H13.5L8.2 26.8C7.4 27.4 6 26.9 6 25.8V7.5Z"
        fill="rgba(45, 212, 191, 0.1)"
        stroke="#2DD4BF"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M16 8.8L17.65 12.15L21.35 12.68L18.67 15.29L19.3 18.97L16 17.23L12.7 18.97L13.33 15.29L10.65 12.68L14.35 12.15L16 8.8Z"
        fill="rgba(245, 158, 11, 0.22)"
        stroke="#F59E0B"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * 8. SmartAutoDistributeIcon
 * For Admin: "اللصق السريع والتوزيع التلقائي للمحتوى" / "اللصق السريع الذكي لقوالب المقالات"
 * Visual: Structured data prism distributing content into organized fields.
 */
export function SmartAutoDistributeIcon({
  size = 18,
  className = '',
}: ContextIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect
        x="3"
        y="4"
        width="7"
        height="7"
        rx="2"
        fill="rgba(245, 158, 11, 0.2)"
        stroke="#F59E0B"
        strokeWidth="1.8"
      />
      <rect
        x="14"
        y="4"
        width="7"
        height="4.5"
        rx="1.5"
        stroke="#2DD4BF"
        strokeWidth="1.8"
      />
      <rect
        x="14"
        y="11"
        width="7"
        height="4.5"
        rx="1.5"
        stroke="#2DD4BF"
        strokeWidth="1.8"
      />
      <rect
        x="3"
        y="15"
        width="18"
        height="5"
        rx="1.8"
        fill="rgba(45, 212, 191, 0.12)"
        stroke="#2DD4BF"
        strokeWidth="1.8"
      />
      <path
        d="M10 7.5H14M6.5 11V15"
        stroke="#F59E0B"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * 9. AutoCategoryBadgeIcon
 * For Admin: "فئة جديدة صُنعت تلقائياً" (New Category Auto-Created)
 * Visual: Architectural category node with a Gold creation badge.
 */
export function AutoCategoryBadgeIcon({
  size = 15,
  className = '',
}: ContextIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M3.5 6.5C3.5 5.4 4.4 4.5 5.5 4.5H9.8L11.8 6.8H18.5C19.6 6.8 20.5 7.7 20.5 8.8V17.5C20.5 18.6 19.6 19.5 18.5 19.5H5.5C4.4 19.5 3.5 18.6 3.5 17.5V6.5Z"
        fill="rgba(45, 212, 191, 0.12)"
        stroke="#2DD4BF"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M12 10.2V16.2M9 13.2H15"
        stroke="#F59E0B"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
