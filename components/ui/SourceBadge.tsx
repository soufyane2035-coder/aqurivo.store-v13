import React from 'react';
import { Store } from 'lucide-react';
import styles from './SourceBadge.module.css';

export interface SourceBadgeProps {
  sourceName: string;
  categoryName?: string;
}

/**
 * Clean unboxed editorial metadata line with typographic separator (·)
 * adhering strictly to Zero-Pill metadata discipline.
 */
export function SourceBadge({ sourceName, categoryName }: SourceBadgeProps) {
  return (
    <div className={styles.metadataRow}>
      {categoryName && (
        <>
          <span className={styles.categoryLabel}>{categoryName}</span>
          <span className={styles.separator} aria-hidden="true">
            ·
          </span>
        </>
      )}
      <span className={styles.sourceLabel}>
        <Store size={13} aria-hidden="true" className={styles.storeIcon} />
        <span>{sourceName}</span>
      </span>
    </div>
  );
}
