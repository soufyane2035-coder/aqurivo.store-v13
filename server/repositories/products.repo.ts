import 'server-only';
import { cache } from 'react';
import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache';
import {
  getAdminDb,
  invalidateCollectionCache,
  purgeCollectionFromMirror,
} from '@/server/config/firebase-admin';
import type { Product, ProductCardDto } from '@/types';
import { validateProductInput } from '@/server/validators';
import { getSourceById } from './sources.repo';
import { getCategoryBySlug, listAllCategoriesAdmin, upsertCategoryAdmin } from './categories.repo';

import { sanitizeMediaUrl, getCanonicalImageFingerprint } from '@/lib/magicContentParser';
import { getSmartRelatedProducts } from '@/lib/productSearch';
import { getSmartRecommendations } from '@/server/services/recommendation.service';

const COLLECTION = 'products';
const PRODUCTS_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

let publishedProductsCache: { data: Product[]; expiresAt: number } | null = null;
let publishedProductsInFlight: Promise<Product[]> | null = null;
const productBySlugCache = new Map<string, { data: Product | null; expiresAt: number }>();

export function invalidateProductsCache(): void {
  publishedProductsCache = null;
  publishedProductsInFlight = null;
  productBySlugCache.clear();
  invalidateCollectionCache(COLLECTION);
  try {
    revalidateTag('products');
    revalidatePath('/', 'layout');
  } catch {
    // Ignore when called outside Next.js request context
  }
}

function normalizeProductDoc(id: string, raw: Record<string, any>): Product {
  const discountVal = raw.discountPercent ?? raw.discount ?? null;
  const nameObj = raw.name || raw.title || { ar: '', en: '' };
  const titleObj = raw.title || raw.name || { ar: '', en: '' };
  const shortSummaryObj = raw.shortSummary || raw.description || { ar: '', en: '' };
  const descriptionObj = raw.detailedDescription || raw.description || raw.shortSummary || { ar: '', en: '' };

  const parsedName =
    typeof nameObj === 'object' && nameObj !== null
      ? { ar: String(nameObj.ar || nameObj.en || ''), en: String(nameObj.en || nameObj.ar || '') }
      : { ar: String(nameObj || ''), en: String(nameObj || '') };

  const parsedTitle =
    typeof titleObj === 'object' && titleObj !== null
      ? { ar: String(titleObj.ar || titleObj.en || ''), en: String(titleObj.en || titleObj.ar || '') }
      : { ar: String(titleObj || ''), en: String(titleObj || '') };

  const parsedSummary =
    typeof shortSummaryObj === 'object' && shortSummaryObj !== null
      ? { ar: String(shortSummaryObj.ar || shortSummaryObj.en || ''), en: String(shortSummaryObj.en || shortSummaryObj.ar || '') }
      : { ar: String(shortSummaryObj || ''), en: String(shortSummaryObj || '') };

  const parsedDesc =
    typeof descriptionObj === 'object' && descriptionObj !== null
      ? { ar: String(descriptionObj.ar || descriptionObj.en || ''), en: String(descriptionObj.en || descriptionObj.ar || '') }
      : { ar: String(descriptionObj || ''), en: String(descriptionObj || '') };

  const rawImages = Array.isArray(raw.images) ? raw.images : [];
  const seenImgFingerprints = new Set<string>();
  const normalizedImages = rawImages
    .map((img: any) => {
      if (typeof img === 'string') {
        const cleanUrl = sanitizeMediaUrl(img);
        return { url: cleanUrl, alt: parsedTitle, width: 800, height: 800 };
      }
      const rawImgUrl = String(img?.url || img?.src || img?.secure_url || '').trim();
      const cleanUrl = sanitizeMediaUrl(rawImgUrl);
      return {
        url: cleanUrl,
        publicId: img?.publicId,
        alt: img?.alt || parsedTitle,
        width: img?.width || 800,
        height: img?.height || 800,
      };
    })
    .filter((img) => {
      if (!img.url) return false;
      const fp = getCanonicalImageFingerprint(img.url) || img.url;
      if (seenImgFingerprints.has(fp)) return false;
      seenImgFingerprints.add(fp);
      return true;
    });

  if (normalizedImages.length === 0) {
    const singleUrl = sanitizeMediaUrl(String(raw.imageUrl || raw.image || raw.thumbnail || ''));
    if (singleUrl) {
      normalizedImages.push({
        url: singleUrl,
        alt: parsedTitle,
        width: 800,
        height: 800,
      });
    }
  }

  const normalizedVideoUrls: string[] = [];
  const videoThumbByUrl: Record<string, string> = {};
  const videoTitleByUrl: Record<string, { ar: string; en: string }> = {};

  if (Array.isArray(raw.videos)) {
    for (const v of raw.videos) {
      const rawVu = typeof v === 'string' ? v : String(v?.url || '');
      const u = sanitizeMediaUrl(rawVu);
      if (u) {
        if (!normalizedVideoUrls.includes(u)) {
          normalizedVideoUrls.push(u);
        }
        const rawThumb = String(v?.thumbnailUrl || v?.thumbnailImageUrl || '').trim();
        const cleanThumb = sanitizeMediaUrl(rawThumb);
        if (cleanThumb) {
          videoThumbByUrl[u] = cleanThumb;
        }
        if (v?.title && typeof v.title === 'object') {
          videoTitleByUrl[u] = {
            ar: String(v.title.ar || v.title.en || parsedTitle.ar || ''),
            en: String(v.title.en || v.title.ar || parsedTitle.en || ''),
          };
        }
      }
    }
  }
  if (Array.isArray(raw.videoUrls)) {
    for (const vu of raw.videoUrls) {
      const cleanVu = typeof vu === 'string' ? sanitizeMediaUrl(vu) : '';
      if (cleanVu && !normalizedVideoUrls.includes(cleanVu)) {
        normalizedVideoUrls.push(cleanVu);
      }
    }
  }
  if (typeof raw.videoUrl === 'string' && raw.videoUrl.trim()) {
    const cleanSingleVu = sanitizeMediaUrl(raw.videoUrl);
    if (cleanSingleVu && !normalizedVideoUrls.includes(cleanSingleVu)) {
      normalizedVideoUrls.unshift(cleanSingleVu);
    }
  }

  const normalizedVideos = normalizedVideoUrls.map((vUrl) => ({
    url: vUrl,
    title: videoTitleByUrl[vUrl] || parsedTitle,
    ...(videoThumbByUrl[vUrl] || normalizedImages[0]?.url
      ? { thumbnailUrl: videoThumbByUrl[vUrl] || normalizedImages[0]?.url }
      : {}),
  }));

  return {
    id,
    ...raw,
    name: parsedName,
    title: parsedTitle,
    shortSummary: parsedSummary,
    description: parsedDesc,
    images: normalizedImages,
    videoUrl: normalizedVideoUrls[0] || undefined,
    videoUrls: normalizedVideoUrls.length > 0 ? normalizedVideoUrls : undefined,
    videos: normalizedVideos.length > 0 ? normalizedVideos : undefined,
    priceAmount: typeof raw.priceAmount === 'number' ? raw.priceAmount : (raw.priceAmount ? Number(raw.priceAmount) : null),
    priceCurrency: raw.priceCurrency || 'USD',
    slug: raw.slug || id,
    discount: discountVal,
    discountPercent: discountVal ?? undefined,
  } as Product;
}

function matchProductFromList(allPublished: Product[], cleanSlug: string): Product | null {
  const targetLower = cleanSlug.toLowerCase();
  const targetWithoutAmazon = targetLower.endsWith('-amazon')
    ? targetLower.replace(/-amazon$/, '')
    : targetLower;
  const targetWithAmazon = `${targetWithoutAmazon}-amazon`;

  const matched = allPublished.find((item) => {
    const itemSlug = (item.slug || '').trim().toLowerCase();
    const itemId = (item.id || '').trim().toLowerCase();
    let decodedItemSlug = itemSlug;
    try {
      decodedItemSlug = decodeURIComponent(itemSlug).trim().toLowerCase();
    } catch {
      // ignore
    }
    return (
      itemId === targetLower ||
      itemId === targetWithoutAmazon ||
      itemId === targetWithAmazon ||
      itemSlug === targetLower ||
      itemSlug === targetWithoutAmazon ||
      itemSlug === targetWithAmazon ||
      decodedItemSlug === targetLower ||
      decodedItemSlug === targetWithoutAmazon ||
      decodedItemSlug === targetWithAmazon
    );
  });
  return matched || null;
}

const fetchPublishedProductsFromStore = async (): Promise<Product[]> => {
  const db = getAdminDb();
  if (!db) return [];

  try {
    const snap = await db.collection(COLLECTION).where('status', '==', 'published').get();
    const items = snap.docs.map((doc) =>
      normalizeProductDoc(doc.id, doc.data() as Omit<Product, 'id'>)
    );
    return items.sort((a, b) =>
      String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
    );
  } catch {
    return [];
  }
};

const getCachedPublishedProductsFromDataCache = unstable_cache(
  fetchPublishedProductsFromStore,
  ['aqurivo_published_products_catalog'],
  { revalidate: 86400, tags: ['products'] }
);

async function fetchPublishedProductsWithMemoryCache(): Promise<Product[]> {
  const now = Date.now();
  if (publishedProductsCache && publishedProductsCache.expiresAt > now) {
    return publishedProductsCache.data;
  }
  if (publishedProductsInFlight) {
    return publishedProductsInFlight;
  }

  publishedProductsInFlight = (async () => {
    try {
      const data = await getCachedPublishedProductsFromDataCache();
      publishedProductsCache = {
        data,
        expiresAt: Date.now() + PRODUCTS_CACHE_TTL_MS,
      };
      return data;
    } catch {
      const fallback = await fetchPublishedProductsFromStore();
      publishedProductsCache = {
        data: fallback,
        expiresAt: Date.now() + PRODUCTS_CACHE_TTL_MS,
      };
      return fallback;
    }
  })();

  try {
    return await publishedProductsInFlight;
  } finally {
    publishedProductsInFlight = null;
  }
}

export const listPublishedProducts = cache(fetchPublishedProductsWithMemoryCache);

export async function getPublishedProductBySlug(slug: string): Promise<Product | null> {
  if (!slug) return null;

  let cleanSlug = slug.trim();
  try {
    cleanSlug = decodeURIComponent(cleanSlug).trim();
  } catch {
    // keep trimmed slug
  }

  const cacheKey = cleanSlug.toLowerCase();
  const now = Date.now();

  // 0. Check warm published catalog cache first (0 Firestore reads!)
  if (publishedProductsCache && publishedProductsCache.expiresAt > now) {
    const fromCatalog = matchProductFromList(publishedProductsCache.data, cleanSlug);
    if (fromCatalog) return fromCatalog;
  }

  // 1. Check dedicated slug cache
  const cachedSlug = productBySlugCache.get(cacheKey);
  if (cachedSlug && cachedSlug.expiresAt > now) {
    return cachedSlug.data;
  }

  // 2. Check published catalog (cached via Next.js Data Cache)
  const allPublished = await listPublishedProducts();
  const matched = matchProductFromList(allPublished, cleanSlug);
  if (matched) {
    productBySlugCache.set(cacheKey, {
      data: matched,
      expiresAt: Date.now() + PRODUCTS_CACHE_TTL_MS,
    });
    return matched;
  }

  // 3. Fallback: Direct ID lookup in case candidate is a document ID
  const db = getAdminDb();
  if (!db) return null;

  try {
    for (const candidate of Array.from(new Set([cleanSlug, slug.trim()]))) {
      if (!candidate) continue;
      const directDoc = await db.collection(COLLECTION).doc(candidate).get();
      if (directDoc.exists) {
        const data = directDoc.data() as Omit<Product, 'id'>;
        if (data.status === 'published') {
          const normalized = normalizeProductDoc(directDoc.id, data);
          productBySlugCache.set(cacheKey, {
            data: normalized,
            expiresAt: Date.now() + PRODUCTS_CACHE_TTL_MS,
          });
          return normalized;
        }
      }
    }
  } catch {
    // Ignore error
  }

  return null;
}

export const getProductBySlug = cache(getPublishedProductBySlug);

export async function listSimilarProductsByCategory(
  categorySlug: string,
  currentSlug: string,
  currentId?: string,
  maxResults = 4
): Promise<Product[]> {
  const allPublished = await listPublishedProducts();
  const current = allPublished.find(
    (p) => p.slug === currentSlug || (currentId && p.id === currentId)
  );

  if (current) {
    const recommended = getSmartRecommendations(current, allPublished, {
      limit: maxResults,
      type: 'hybrid',
    });
    return recommended.map((r) => r.product);
  }

  if (!categorySlug) {
    const general = getSmartRecommendations(null, allPublished, {
      limit: maxResults,
      type: 'hybrid',
    });
    return general.map((r) => r.product);
  }

  const categoryRecs = getSmartRecommendations(null, allPublished, {
    limit: maxResults,
    preferredCategorySlug: categorySlug,
    type: 'hybrid',
  });
  return categoryRecs.map((r) => r.product);
}

/**
 * Public server helper for fetching full scored recommendations for any product.
 */
export async function getProductRecommendations(
  currentSlugOrId: string,
  options?: { limit?: number; type?: 'hybrid' | 'substitutes' | 'complementary' }
): Promise<Product[]> {
  const allPublished = await listPublishedProducts();
  const current = allPublished.find(
    (p) => p.slug === currentSlugOrId || p.id === currentSlugOrId
  );
  const recs = getSmartRecommendations(current, allPublished, {
    limit: options?.limit || 4,
    type: options?.type || 'hybrid',
  });
  return recs.map((r) => r.product);
}

/**
 * Looks up a product by slug regardless of status so `/go/[slug]` can distinguish
 * between a non-existent product (404) and a temporarily archived/draft product.
 */
export async function getProductBySlugAnyStatus(slug: string): Promise<Product | null> {
  if (!slug) return null;

  // 1. Check warm published catalog first (0 database reads)
  const allPublished = await listPublishedProducts();
  const matched = matchProductFromList(allPublished, slug);
  if (matched) return matched;

  // 2. Fallback to direct DB query only for draft/archived products
  const db = getAdminDb();
  if (!db) return null;

  try {
    const snap = await db.collection(COLLECTION).where('slug', '==', slug).limit(1).get();
    if (!snap.empty) {
      const doc = snap.docs[0];
      return normalizeProductDoc(doc.id, doc.data() as Omit<Product, 'id'>);
    }
  } catch {
    // Ignore error
  }
  return null;
}

export async function listAllProductsAdmin(): Promise<Product[]> {
  const db = getAdminDb();
  if (!db) return [];

  try {
    const snap = await db.collection(COLLECTION).get();
    const items = snap.docs.map((doc) =>
      normalizeProductDoc(doc.id, doc.data() as Omit<Product, 'id'>)
    );
    return items.sort((a, b) =>
      String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''))
    );
  } catch {
    return [];
  }
}

export async function getProductByIdAdmin(productId: string): Promise<Product | null> {
  const db = getAdminDb();
  if (!db) return null;

  const doc = await db.collection(COLLECTION).doc(productId).get();
  if (!doc.exists) return null;
  return normalizeProductDoc(doc.id, doc.data() as Omit<Product, 'id'>);
}

export async function createOrUpdateProductAdmin(
  input: unknown,
  existingId?: string
): Promise<Product> {
  const db = getAdminDb();
  if (!db) {
    throw new Error('Database connection is not configured yet.');
  }

  const validated = validateProductInput(input);
  const source = await getSourceById(validated.sourceId);
  if (!source) {
    throw new Error('Selected partner source does not exist.');
  }

  const allCategories = await listAllCategoriesAdmin();
  let category =
    allCategories.find((c) => c.id === validated.categoryId || c.slug === validated.categoryId) ||
    (await getCategoryBySlug(validated.categoryId));

  if (!category && validated.categoryId) {
    const fallbackEn = validated.newCategoryName?.en || validated.categoryId.replace(/-/g, ' ');
    const fallbackAr = validated.newCategoryName?.ar || fallbackEn;
    try {
      category = await upsertCategoryAdmin({
        slug: validated.categoryId,
        name: { ar: fallbackAr, en: fallbackEn },
        description: {
          ar: `منتجات مختارة بعناية في قسم ${fallbackAr}`,
          en: `Carefully curated picks in ${fallbackEn}`,
        },
        icon: validated.newCategoryIcon || '📦',
        order: allCategories.length + 1,
        isActive: true,
      });
    } catch {
      // Fallback if category creation fails
    }
  }

  const categoryName = category
    ? category.name
    : validated.newCategoryName || { en: 'General', ar: 'عام' };
  const categorySlug = category ? category.slug : validated.categoryId;

  const { newCategoryName: _ncName, newCategoryIcon: _ncIcon, ...cleanValidated } = validated;

  const now = new Date().toISOString();
  const docId = existingId || validated.slug;
  const docRef = db.collection(COLLECTION).doc(docId);
  const existingDoc = await docRef.get();
  const existingData = existingDoc.exists ? (existingDoc.data() as Partial<Product>) : null;

  const record: Omit<Product, 'id'> = {
    ...cleanValidated,
    sourceId: source.id,
    sourceSlug: source.slug,
    sourceName: source.name,
    sourceDisclosure: source.disclosureText,
    categoryId: category ? category.id : validated.categoryId,
    categorySlug,
    categoryName,
    priceUpdatedAt: now,
    clicksCount: existingData?.clicksCount ?? 0,
    createdAt: existingData?.createdAt || now,
    updatedAt: now,
  };

  await docRef.set(record, { merge: true });
  invalidateProductsCache();
  return { id: docId, ...record };
}

export async function refreshProductPriceTimestampAdmin(productId: string): Promise<void> {
  const db = getAdminDb();
  if (!db) {
    throw new Error('Database connection is not configured yet.');
  }
  const now = new Date().toISOString();
  await db.collection(COLLECTION).doc(productId).update({
    priceUpdatedAt: now,
    updatedAt: now,
  });
  invalidateProductsCache();
}

export async function deleteProductAdmin(productId: string): Promise<void> {
  const db = getAdminDb();
  if (!db) {
    throw new Error('Database connection is not configured yet.');
  }
  await db.collection(COLLECTION).doc(productId).delete();
  invalidateProductsCache();
}

export async function deleteAllProductsAdmin(): Promise<number> {
  const db = getAdminDb();
  if (!db) {
    throw new Error('Database connection is not configured yet.');
  }
  const products = await listAllProductsAdmin();
  const count = products.length;
  await purgeCollectionFromMirror(COLLECTION);
  invalidateProductsCache();
  return count;
}

export async function listPublishedProductsSlim(): Promise<ProductCardDto[]> {
  const products = await listPublishedProducts();
  return products.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    name: p.name,
    shortSummary: p.shortSummary,
    priceAmount: p.priceAmount,
    oldPrice: p.oldPrice,
    discountPercent: p.discountPercent,
    rating: p.rating,
    reviewCount: p.reviewCount,
    badge: p.badge,
    primaryImage: p.primaryImage || p.images?.[0]?.url,
    images: p.images?.slice(0, 1),
    affiliateUrl: p.affiliateUrl,
    sourceName: p.sourceName,
    sourceSlug: p.sourceSlug,
    categoryName: p.categoryName,
    categorySlug: p.categorySlug,
    inStock: p.inStock,
    status: p.status,
    isFeatured: p.isFeatured,
    clicksCount: p.clicksCount,
    createdAt: p.createdAt,
  }));
}

