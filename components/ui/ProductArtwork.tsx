import React from 'react';
import { ShoppingBag } from 'lucide-react';
import styles from './ProductArtwork.module.css';

interface ProductArtworkProps {
  title: string;
  categoryLabel?: string;
  noteText?: string;
}

export function ProductArtwork({ title, categoryLabel }: ProductArtworkProps) {
  return (
    <div className={styles.artworkCanvas} role="img" aria-label={title}>
      <div className={styles.iconCircle} aria-hidden="true">
        <ShoppingBag size={26} strokeWidth={1.6} />
      </div>
      {categoryLabel && <span className={styles.categoryText}>{categoryLabel}</span>}
    </div>
  );
}
