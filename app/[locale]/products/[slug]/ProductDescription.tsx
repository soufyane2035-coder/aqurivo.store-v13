'use client';

import React, { useState } from 'react';
import type { Locale } from '@/types';
import styles from './ProductPage.module.css';

interface ProductDescriptionProps {
  description: string;
  features?: string[];
  locale: Locale;
}

export function ProductDescription({
  description,
  features = [],
  locale,
}: ProductDescriptionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isAr = locale === 'ar';

  const readMoreLabel = isAr ? 'اقرأ المزيد ▼' : 'Read More ▼';
  const showLessLabel = isAr ? 'عرض أقل ▲' : 'Show Less ▲';

  // Parse lines to detect bullet points if features array is not explicitly supplied
  const parsedFeatures: string[] =
    features && features.length > 0
      ? features
      : description
          .split('\n')
          .map((line) => line.trim())
          .filter(
            (line) =>
              line.startsWith('•') ||
              line.startsWith('- ') ||
              line.startsWith('* ') ||
              line.startsWith('✓')
          )
          .map((line) => line.replace(/^[•\-*✓]\s*/, '').trim());

  // Clean description paragraphs without redundant raw bullet markers
  const paragraphs = description
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className={styles.descriptionSection}>
      <h2 className={styles.sectionHeading}>
        {isAr ? 'وصف المنتج' : 'Product Description'}
      </h2>

      {/* Collapsible description body */}
      <div
        className={`${styles.descriptionBody} ${
          isExpanded ? styles.descriptionExpanded : styles.descriptionCollapsed
        }`}
      >
        {paragraphs.map((p, idx) => (
          <p key={idx} className={styles.descriptionParagraph}>
            {p}
          </p>
        ))}
      </div>

      {/* Read More / Show Less Toggle Button */}
      {description.length > 180 && (
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className={styles.readMoreButton}
          aria-expanded={isExpanded}
        >
          {isExpanded ? showLessLabel : readMoreLabel}
        </button>
      )}

      {/* Feature Bullet Points with Teal Checkmark */}
      {parsedFeatures.length > 0 && (
        <div className={styles.featuresListWrapper}>
          <h3 className={styles.featuresHeading}>
            {isAr ? 'أهم المميزات' : 'Key Features'}
          </h3>
          <ul className={styles.featuresList}>
            {parsedFeatures.map((feat, idx) => (
              <li key={idx} className={styles.featureItem}>
                <span className={styles.featureCheckIcon} aria-hidden="true">
                  ✓
                </span>
                <span className={styles.featureText}>{feat}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
