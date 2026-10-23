'use client';

import { useEffect } from 'react';
import { startProductDwellTracking } from '@/lib/browserSignals';

interface ProductDwellTrackerProps {
  slug: string;
  categorySlug: string;
  priceUsd: number;
}

/**
 * Invisible client-side engagement tracker.
 * Listens to active tab visibility and scroll depth to build the user's
 * localized session intent vector without any visual UI footprint.
 */
export function ProductDwellTracker({
  slug,
  categorySlug,
  priceUsd,
}: ProductDwellTrackerProps) {
  useEffect(() => {
    const cleanup = startProductDwellTracking(slug, categorySlug, priceUsd);
    return cleanup;
  }, [slug, categorySlug, priceUsd]);

  return null;
}
