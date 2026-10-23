import React from 'react';
import styles from './Skeleton.module.css';

export interface SkeletonProps {
  variant?: 'text' | 'title' | 'media' | 'card';
  count?: number;
}

export function Skeleton({ variant = 'text', count = 1 }: SkeletonProps) {
  const items = Array.from({ length: count }, (_, idx) => idx);

  if (variant === 'card') {
    return (
      <div className={styles.cardGrid} aria-busy="true" aria-live="polite">
        {items.map((item) => (
          <div key={item} className={styles.skeletonCard}>
            <div className={styles.skeletonMedia} />
            <div className={styles.skeletonBody}>
              <div className={styles.skeletonLineShort} />
              <div className={styles.skeletonTitle} />
              <div className={styles.skeletonLine} />
              <div className={styles.skeletonButton} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={styles.stack} aria-busy="true">
      {items.map((item) => (
        <div key={item} className={`${styles.block} ${styles[variant]}`} />
      ))}
    </div>
  );
}
