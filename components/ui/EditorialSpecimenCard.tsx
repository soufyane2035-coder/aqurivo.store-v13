'use client';

import React from 'react';
import type { Product } from '@/types';
import { ProductCard } from './ProductCard';

export interface EditorialSpecimenCardProps {
  product: Product;
  rankIndex?: number;
  isSaved?: boolean;
  onToggleSave?: (productId: string) => void;
  refContext?: string;
}

export function EditorialSpecimenCard({
  product,
  isSaved = false,
  onToggleSave,
  refContext = 'guide_detail',
}: EditorialSpecimenCardProps) {
  return (
    <ProductCard
      product={product}
      isSaved={isSaved}
      onToggleSave={onToggleSave}
      refContext={refContext}
    />
  );
}
