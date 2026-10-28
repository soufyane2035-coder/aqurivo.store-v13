import React from 'react';
import styles from './Skeleton.module.css';

export interface SkeletonProps {
  variant?: 'text' | 'title' | 'media' | 'pill' | 'thumbnail' | 'card' | 'article';
  count?: number;
}

export function Skeleton({ variant = 'text', count = 1 }: SkeletonProps) {
  const items = Array.from({ length: count }, (_, idx) => idx);

  if (variant === 'card' || variant === 'article') {
    return (
      <div
        className={`${styles.cardGrid} ${variant === 'article' ? styles.articleGrid : ''}`}
        aria-busy="true"
      >
        {items.map((item) => (
          <div key={item} className={styles.skeletonCard} aria-hidden="true">
            {variant === 'card' ? (
              <>
                <div className={styles.skeletonMedia} />
                <div className={styles.skeletonBody}>
                  <div className={styles.skeletonLineShort} />
                  <div className={styles.skeletonTitle} />
                  <div className={styles.skeletonLine} />
                  <div className={styles.skeletonButton} />
                </div>
              </>
            ) : (
              <div className={styles.articleBody}>
                <div className={styles.skeletonLineShort} />
                <div className={styles.skeletonTitle} />
                <div className={styles.skeletonLine} />
                <div className={`${styles.skeletonLine} ${styles.articleLineLast}`} />
                <div className={styles.articleFooter} />
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className={`${styles.stack} ${variant === 'pill' ? styles.inlineStack : ''} ${
        variant === 'thumbnail' ? styles.thumbnailStack : ''
      }`}
      aria-busy="true"
    >
      {items.map((item) => (
        <div
          key={item}
          className={`${styles.block} ${styles[variant]}`}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

export function LoadingStatus({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={styles.loadingStatus}
      role="status"
      aria-label="Loading content"
      aria-busy="true"
    >
      {children}
    </div>
  );
}
