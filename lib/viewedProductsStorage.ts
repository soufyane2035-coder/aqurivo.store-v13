'use client';

import type { Product } from '@/types';
import { convertCurrencyAmount } from '@/lib/format';
import { scoreSmartSearchCandidate } from '@/lib/productSearch';

export interface BrowserProductSnapshot {
  id: string;
  slug: string;
  titleAr: string;
  titleEn: string;
  nameAr?: string;
  nameEn?: string;
  priceUsd: number;
  originalPriceAmount: number;
  originalCurrency: string;
  discount: number | null;
  categorySlug: string;
  imageUrl: string;
  image?: string;
  searchKeywords?: string;
  isExplicitlyViewed: boolean;
  updatedAt: number;
}

const VIEWED_PRODUCTS_KEY = 'aqurivo_viewed_products_v1';
const MAX_STORED_PRODUCTS = 18;

let catalogCache: BrowserProductSnapshot[] | null = null;
let catalogFetchPromise: Promise<BrowserProductSnapshot[]> | null = null;

function extractText(val: unknown, lang: 'ar' | 'en'): string {
  if (!val) return '';
  if (typeof val === 'string') return val.trim();
  if (typeof val === 'object') {
    const rec = val as { ar?: string; en?: string };
    const preferred = lang === 'ar' ? rec.ar || rec.en : rec.en || rec.ar;
    return typeof preferred === 'string' ? preferred.trim() : '';
  }
  return '';
}

function extractBothLanguages(val: unknown): string {
  if (!val) return '';
  if (typeof val === 'string') return val.trim();
  if (typeof val === 'object') {
    const rec = val as { ar?: string; en?: string };
    return `${rec.ar || ''} ${rec.en || ''}`.trim();
  }
  return '';
}

function normalizeStoredSnapshot(raw: unknown): BrowserProductSnapshot | null {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Record<string, unknown>;
  const slug = typeof item.slug === 'string' ? item.slug.trim() : '';
  const priceUsd = typeof item.priceUsd === 'number' ? item.priceUsd : Number(item.priceUsd);
  if (!slug || !Number.isFinite(priceUsd) || priceUsd <= 0) return null;

  const titleAr = String(
    item.titleAr || item.nameAr || item.title || item.name || slug
  ).trim();
  const titleEn = String(
    item.titleEn || item.nameEn || item.title || item.name || titleAr
  ).trim();
  const imageUrl = String(item.imageUrl || item.image || '').trim();

  return {
    id: String(item.id || slug),
    slug,
    titleAr,
    titleEn,
    nameAr: titleAr,
    nameEn: titleEn,
    priceUsd: Math.max(1, Math.round(priceUsd * 100) / 100),
    originalPriceAmount:
      typeof item.originalPriceAmount === 'number' && item.originalPriceAmount > 0
        ? item.originalPriceAmount
        : priceUsd,
    originalCurrency: String(item.originalCurrency || 'USD'),
    discount:
      typeof item.discount === 'number' && item.discount > 0 ? item.discount : null,
    categorySlug: String(item.categorySlug || '').toLowerCase(),
    imageUrl,
    image: imageUrl,
    searchKeywords:
      typeof item.searchKeywords === 'string' ? item.searchKeywords : '',
    isExplicitlyViewed: Boolean(item.isExplicitlyViewed),
    updatedAt: typeof item.updatedAt === 'number' ? item.updatedAt : Date.now(),
  };
}

export function buildSnapshotFromProduct(
  product: Product,
  isExplicitlyViewed = false
): BrowserProductSnapshot | null {
  const rawPrice =
    typeof product.priceAmount === 'number' && product.priceAmount > 0
      ? product.priceAmount
      : Number(product.priceAmount) > 0
        ? Number(product.priceAmount)
        : null;

  if (!rawPrice) return null;

  const currency = product.priceCurrency || 'USD';
  const { convertedAmount: priceUsd } = convertCurrencyAmount(
    rawPrice,
    currency,
    'USD'
  );
  if (!priceUsd || priceUsd <= 0) return null;

  const titleAr =
    extractText(product.title, 'ar') ||
    extractText(product.name, 'ar') ||
    product.slug;
  const titleEn =
    extractText(product.title, 'en') ||
    extractText(product.name, 'en') ||
    titleAr;

  const rawImages: unknown[] = Array.isArray(product.images) ? product.images : [];
  let resolvedImageUrl = '';
  for (const img of rawImages) {
    if (typeof img === 'string' && img.trim()) {
      resolvedImageUrl = img.trim();
      break;
    }
    if (img && typeof img === 'object' && 'url' in img && typeof (img as { url: unknown }).url === 'string') {
      const u = (img as { url: string }).url.trim();
      if (u) {
        resolvedImageUrl = u;
        break;
      }
    }
  }

  const discount =
    typeof product.discount === 'number' && product.discount > 0
      ? product.discount
      : typeof product.discountPercent === 'number' && product.discountPercent > 0
        ? product.discountPercent
        : null;

  const specsKeywords = Array.isArray(product.specs)
    ? product.specs
        .map(
          (s: { label?: unknown; value?: unknown }) =>
            `${extractBothLanguages(s?.label)} ${extractBothLanguages(s?.value)}`
        )
        .join(' ')
    : '';

  const searchKeywords = [
    extractBothLanguages(product.categoryName),
    product.categorySlug || '',
    extractBothLanguages(product.sourceName),
    product.sourceSlug || '',
    ...(Array.isArray(product.tags) ? product.tags : []),
    extractBothLanguages(product.shortSummary),
    extractBothLanguages(product.whyWePickedIt),
    extractBothLanguages(product.description),
    specsKeywords,
  ]
    .filter(Boolean)
    .join(' ');

  return {
    id: product.id || product.slug,
    slug: product.slug || product.id,
    titleAr,
    titleEn,
    nameAr: titleAr,
    nameEn: titleEn,
    priceUsd: Math.max(1, Math.round(priceUsd * 100) / 100),
    originalPriceAmount: rawPrice,
    originalCurrency: currency,
    discount,
    categorySlug: (product.categorySlug || product.categoryId || '').toLowerCase(),
    imageUrl: resolvedImageUrl,
    image: resolvedImageUrl,
    searchKeywords,
    isExplicitlyViewed,
    updatedAt: Date.now(),
  };
}

/**
 * Smart search and ranking across BrowserProductSnapshot items.
 * Recognizes:
 * - Any word (first, middle, or last) or substring in Arabic & English
 * - Cross-language & synonym concepts (e.g., "pc" <-> "ميني بي سي" / "حاسوب")
 * - Typo tolerance & phonetic vowel normalization (e.g., "مني بسيى" <-> "ميني بي سي")
 */
export function searchBrowserProductSnapshots(
  snapshots: BrowserProductSnapshot[],
  rawQuery: string
): BrowserProductSnapshot[] {
  const trimmed = rawQuery.trim();
  if (!trimmed) return snapshots;

  const scored: Array<{ item: BrowserProductSnapshot; score: number }> = [];

  for (const item of snapshots) {
    const primaryTitle = `${item.titleAr || item.nameAr || ''} ${item.titleEn || item.nameEn || ''}`;
    const secondaryMeta = `${item.slug} ${item.categorySlug} ${item.priceUsd} ${item.originalPriceAmount || ''} ${item.searchKeywords || ''}`;
    const score = scoreSmartSearchCandidate(primaryTitle, secondaryMeta, trimmed);

    if (score > 0) {
      scored.push({
        item,
        score: score + (item.isExplicitlyViewed ? 3 : 0),
      });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.map((entry) => entry.item);
}

export function getBrowserViewedProducts(): BrowserProductSnapshot[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(VIEWED_PRODUCTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const normalized: BrowserProductSnapshot[] = [];
    for (const entry of parsed) {
      const snap = normalizeStoredSnapshot(entry);
      if (snap) {
        normalized.push(snap);
      }
    }
    return normalized;
  } catch {
    return [];
  }
}

export function recordBrowserProductView(
  snapshot: BrowserProductSnapshot
): BrowserProductSnapshot[] {
  if (typeof window === 'undefined') return [];
  try {
    const cleanSnap = normalizeStoredSnapshot(snapshot) || snapshot;
    const existing = getBrowserViewedProducts();
    const filtered = existing.filter(
      (item) => item.slug !== cleanSnap.slug && item.id !== cleanSnap.id
    );
    const updated: BrowserProductSnapshot[] = [
      {
        ...cleanSnap,
        titleAr: cleanSnap.titleAr || cleanSnap.nameAr || '',
        titleEn: cleanSnap.titleEn || cleanSnap.nameEn || '',
        nameAr: cleanSnap.nameAr || cleanSnap.titleAr || '',
        nameEn: cleanSnap.nameEn || cleanSnap.titleEn || '',
        imageUrl: cleanSnap.imageUrl || cleanSnap.image || '',
        image: cleanSnap.imageUrl || cleanSnap.image || '',
        isExplicitlyViewed: true,
        updatedAt: Date.now(),
      },
      ...filtered,
    ].slice(0, MAX_STORED_PRODUCTS);
    window.localStorage.setItem(VIEWED_PRODUCTS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('aqurivo:viewed-products-updated'));
    return updated;
  } catch {
    return getBrowserViewedProducts();
  }
}

/**
 * Seeds the browser storage with products that appeared on the visitor's screen
 * without overwriting products the visitor explicitly clicked/viewed.
 */
export function seedBrowserSeenProducts(products: Product[]): void {
  if (
    typeof window === 'undefined' ||
    !Array.isArray(products) ||
    products.length === 0
  ) {
    return;
  }
  try {
    const existing = getBrowserViewedProducts();
    const explicitlyViewed = existing.filter((item) => item.isExplicitlyViewed);
    const existingSlugs = new Set(explicitlyViewed.map((item) => item.slug));

    const seeded: BrowserProductSnapshot[] = [];
    for (const prod of products) {
      if (explicitlyViewed.length + seeded.length >= MAX_STORED_PRODUCTS) break;
      const snap = buildSnapshotFromProduct(prod, false);
      if (snap && !existingSlugs.has(snap.slug)) {
        existingSlugs.add(snap.slug);
        seeded.push(snap);
      }
    }

    const merged = [...explicitlyViewed, ...seeded].slice(0, MAX_STORED_PRODUCTS);
    if (merged.length > 0) {
      window.localStorage.setItem(VIEWED_PRODUCTS_KEY, JSON.stringify(merged));
      window.dispatchEvent(new Event('aqurivo:viewed-products-updated'));
    }
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Reliable, cached loader for all published store products on the client.
 * 1. Fetches `/api/catalog`
 * 2. Falls back to client-side Firestore `products` collection if `/api/catalog` is empty
 * 3. Automatically seeds `localStorage` so the product ribbon is never empty
 */
export async function fetchBrowserCatalogSnapshots(): Promise<
  BrowserProductSnapshot[]
> {
  if (catalogCache && catalogCache.length > 0) {
    return catalogCache;
  }

  // Check sessionStorage cache (persists across page navigations in the same tab)
  if (typeof window !== 'undefined') {
    try {
      const rawStored = window.sessionStorage.getItem('aqurivo_catalog_snapshots');
      if (rawStored) {
        const parsed = JSON.parse(rawStored) as { time: number; data: BrowserProductSnapshot[] };
        if (parsed && Array.isArray(parsed.data) && parsed.data.length > 0 && Date.now() - parsed.time < 30 * 60 * 1000) {
          catalogCache = parsed.data;
          return catalogCache;
        }
      }
    } catch {
      // Ignore sessionStorage read errors
    }
  }

  if (catalogFetchPromise) {
    return catalogFetchPromise;
  }

  catalogFetchPromise = (async () => {
    const snapshots: BrowserProductSnapshot[] = [];
    const seen = new Set<string>();

    // 1. Try server API `/api/catalog`
    try {
      const res = await fetch('/api/catalog');
      if (res.ok) {
        const data = (await res.json()) as { products?: Product[] } | null;
        if (data && Array.isArray(data.products)) {
          for (const prod of data.products) {
            const snap = buildSnapshotFromProduct(prod, false);
            if (snap && !seen.has(snap.slug)) {
              seen.add(snap.slug);
              snapshots.push(snap);
            }
          }
          if (data.products.length > 0) {
            seedBrowserSeenProducts(data.products.slice(0, 12));
          }
        }
      }
    } catch {
      // Proceed to fallback
    }

    // 2. If server API returned 0 products, safely use already cached in-memory or stored items
    if (snapshots.length === 0 && catalogCache && catalogCache.length > 0) {
      return catalogCache;
    }

    if (snapshots.length > 0) {
      catalogCache = snapshots;
      if (typeof window !== 'undefined') {
        try {
          window.sessionStorage.setItem(
            'aqurivo_catalog_snapshots',
            JSON.stringify({ time: Date.now(), data: snapshots })
          );
        } catch {
          // Ignore sessionStorage quota errors
        }
      }
    }
    catalogFetchPromise = null;
    return snapshots;
  })();

  return catalogFetchPromise;
}

/**
 * Fetches real-time personalized recommendations from the upgraded zero-compute engine
 * passing the client's localized session intent vector (dwell time, price bounds).
 */
export async function fetchPersonalizedRecommendationsClient(limit = 4) {
  if (typeof window === 'undefined') return [];
  try {
    const { computeSessionIntentVector } = await import('@/lib/browserSignals');
    const intent = computeSessionIntentVector();
    const stored = getBrowserViewedProducts();
    const viewedIds = stored.map((s) => s.slug || s.id);

    const res = await fetch('/api/recommendations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        viewedProductIds: viewedIds,
        limit,
        type: 'hybrid',
        intentVector: intent,
      }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.recommendations || [];
  } catch {
    return [];
  }
}

