import React from 'react';
import Link from 'next/link';
import styles from './EmptyState.module.css';

export interface EmptyStateProps {
  title: string;
  description: string;
  primaryActionLabel?: string;
  primaryActionHref?: string;
  onPrimaryAction?: () => void;
  secondaryActionLabel?: string;
  secondaryActionHref?: string;
}

/**
 * Thoughtfully designed editorial Empty State with custom SVG architectural emblem.
 * Used when the catalog is empty or when user filters return zero matches.
 */
export function EmptyState({
  title,
  description,
  primaryActionLabel,
  primaryActionHref,
  onPrimaryAction,
  secondaryActionLabel,
  secondaryActionHref,
}: EmptyStateProps) {
  return (
    <section className={styles.emptyContainer} aria-live="polite">
      <div className={styles.illustration} aria-hidden="true">
        <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
          <rect
            x="10"
            y="14"
            width="52"
            height="44"
            rx="6"
            stroke="var(--color-border-strong)"
            strokeWidth="1.75"
            fill="var(--color-bg-subtle)"
          />
          <path
            d="M22 28H50M22 38H40"
            stroke="var(--color-accent-primary)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle
            cx="50"
            cy="44"
            r="6"
            fill="var(--color-accent-subtle)"
            stroke="var(--color-accent-primary)"
            strokeWidth="1.75"
          />
        </svg>
      </div>

      <h2 className={styles.title}>{title}</h2>
      <p className={styles.description}>{description}</p>

      {(primaryActionLabel || secondaryActionLabel) && (
        <div className={styles.actions}>
          {primaryActionLabel && primaryActionHref && (
            <Link href={primaryActionHref} className={styles.primaryLink}>
              {primaryActionLabel}
            </Link>
          )}
          {primaryActionLabel && !primaryActionHref && onPrimaryAction && (
            <button type="button" onClick={onPrimaryAction} className={styles.primaryLink}>
              {primaryActionLabel}
            </button>
          )}
          {secondaryActionLabel && secondaryActionHref && (
            <Link href={secondaryActionHref} className={styles.secondaryLink}>
              {secondaryActionLabel}
            </Link>
          )}
        </div>
      )}
    </section>
  );
}
