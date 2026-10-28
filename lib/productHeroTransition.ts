export function getProductHeroTransitionName(productKey?: string | null): string | null {
  const rawKey = (productKey ?? '').trim();
  if (!rawKey) return null;

  const normalizedKey = rawKey
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (!normalizedKey) return null;

  return `aqurivo-product-hero-${normalizedKey}`;
}

export function canUseProductHeroTransition(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }

  if (typeof document.startViewTransition !== 'function') {
    return false;
  }

  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
