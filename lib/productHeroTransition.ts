export function resolveProductHeroTransitionKey(
  productKey?: string | number | null,
  fallbackKey?: string | number | null
): string | null {
  const candidate = String(productKey ?? fallbackKey ?? '').trim();
  return candidate.length > 0 ? candidate : null;
}

export function getProductHeroTransitionName(
  productKey?: string | null
): string | null {
  const key = productKey?.trim();
  if (!key) return null;

  // Encode every code point so different product keys cannot collapse to the
  // same CSS custom identifier after punctuation is normalized.
  const encodedKey = Array.from(key, (character) =>
    (character.codePointAt(0) ?? 0).toString(16)
  ).join('-');

  return `aqurivo-product-hero-${encodedKey}`;
}

export function canUseProductHeroTransition(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return false;
  }

  return (
    typeof (
      document as Document & {
        startViewTransition?: (update: () => void) => unknown;
      }
    ).startViewTransition === 'function'
  );
}
