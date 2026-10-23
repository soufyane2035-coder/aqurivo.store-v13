import 'server-only';
import { cache } from 'react';
import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache';
import { getAdminDb, invalidateCollectionCache } from '@/server/config/firebase-admin';
import type { Category } from '@/types';
import { sanitizePlainText, validateLocalizedText, validateSlug } from '@/server/validators';

const COLLECTION = 'categories';
const CATEGORIES_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

let activeCategoriesCache: { data: Category[]; expiresAt: number } | null = null;
let activeCategoriesInFlight: Promise<Category[]> | null = null;

export function invalidateCategoriesCache(): void {
  activeCategoriesCache = null;
  activeCategoriesInFlight = null;
  invalidateCollectionCache(COLLECTION);
  try {
    revalidateTag('categories');
    revalidatePath('/', 'layout');
  } catch {
    // Ignore outside request context
  }
}

const DEFAULT_STARTER_CATEGORIES: Array<{
  slug: string;
  name: { ar: string; en: string };
  icon: string;
  order: number;
}> = [
  { slug: 'electronics', name: { ar: 'إلكترونيات', en: 'Electronics' }, icon: '📱', order: 1 },
  { slug: 'home', name: { ar: 'المنزل والمطبخ', en: 'Home & Kitchen' }, icon: '🏠', order: 2 },
  { slug: 'health', name: { ar: 'الصحة والعناية', en: 'Health & Personal Care' }, icon: '🩺', order: 3 },
  { slug: 'sports', name: { ar: 'الرياضة واللياقة', en: 'Sports & Outdoors' }, icon: '⚽', order: 4 },
  { slug: 'fashion', name: { ar: 'الموضة والأزياء', en: 'Fashion & Apparel' }, icon: '👕', order: 5 },
];

async function seedDefaultCategoriesIfEmpty(db: any): Promise<void> {
  try {
    const snap = await db.collection(COLLECTION).get();
    if (snap.empty || snap.docs.length === 0) {
      const now = new Date().toISOString();
      for (const item of DEFAULT_STARTER_CATEGORIES) {
        await db.collection(COLLECTION).doc(item.slug).set({
          slug: item.slug,
          name: item.name,
          icon: item.icon,
          order: item.order,
          sortOrder: item.order,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
      }
    }
  } catch {
    // Ignore seeding error
  }
}

async function fetchActiveCategoriesFromStore(): Promise<Category[]> {
  const db = getAdminDb();
  if (!db) return [];

  try {
    let snap = await db.collection(COLLECTION).get();
    if (snap.empty || snap.docs.length === 0) {
      await seedDefaultCategoriesIfEmpty(db);
      snap = await db.collection(COLLECTION).get();
    }

    const items: Category[] = snap.docs
      .map((doc: any) => {
        const data = doc.data() as Record<string, unknown>;
        const order = typeof data.order === 'number' ? data.order : typeof data.sortOrder === 'number' ? data.sortOrder : 0;
        return {
          id: doc.id,
          slug: (data.slug as string) || doc.id,
          name: {
            ar: ((data.name as Record<string, string>)?.ar) || '',
            en: ((data.name as Record<string, string>)?.en) || '',
          },
          icon: (data.icon as string) || '',
          order,
          sortOrder: order,
          isActive: data.isActive !== false,
          createdAt: (data.createdAt as string) || new Date().toISOString(),
          updatedAt: (data.updatedAt as string) || new Date().toISOString(),
        };
      })
      .filter((c: Category) => c.isActive !== false);

    return items.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  } catch {
    return [];
  }
}

const getCachedActiveCategoriesFromDataCache = unstable_cache(
  fetchActiveCategoriesFromStore,
  ['aqurivo_active_categories_catalog'],
  { revalidate: 86400, tags: ['categories'] }
);

export async function listActiveCategories(): Promise<Category[]> {
  const now = Date.now();
  if (activeCategoriesCache && activeCategoriesCache.expiresAt > now) {
    return activeCategoriesCache.data;
  }
  if (activeCategoriesInFlight) {
    return activeCategoriesInFlight;
  }

  activeCategoriesInFlight = (async () => {
    try {
      const data = await getCachedActiveCategoriesFromDataCache();
      activeCategoriesCache = {
        data,
        expiresAt: Date.now() + CATEGORIES_CACHE_TTL_MS,
      };
      return data;
    } catch {
      const fallback = await fetchActiveCategoriesFromStore();
      activeCategoriesCache = {
        data: fallback,
        expiresAt: Date.now() + CATEGORIES_CACHE_TTL_MS,
      };
      return fallback;
    }
  })();

  try {
    return await activeCategoriesInFlight;
  } finally {
    activeCategoriesInFlight = null;
  }
}

export async function listAllCategoriesAdmin(): Promise<Category[]> {
  const db = getAdminDb();
  if (!db) return [];

  try {
    let snap = await db.collection(COLLECTION).get();
    if (snap.empty || snap.docs.length === 0) {
      await seedDefaultCategoriesIfEmpty(db);
      snap = await db.collection(COLLECTION).get();
    }

    const items: Category[] = snap.docs.map((doc: any) => {
      const data = doc.data() as Record<string, unknown>;
      const order = typeof data.order === 'number' ? data.order : typeof data.sortOrder === 'number' ? data.sortOrder : 0;
      return {
        id: doc.id,
        slug: (data.slug as string) || doc.id,
        name: {
          ar: ((data.name as Record<string, string>)?.ar) || '',
          en: ((data.name as Record<string, string>)?.en) || '',
        },
        icon: (data.icon as string) || '',
        order,
        sortOrder: order,
        isActive: data.isActive !== false,
        createdAt: (data.createdAt as string) || new Date().toISOString(),
        updatedAt: (data.updatedAt as string) || new Date().toISOString(),
      };
    });

    return items.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  } catch {
    return [];
  }
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  if (!slug) return null;
  const cleanSlug = slug.trim().toLowerCase();

  // Check active categories cache first (0 Firestore reads!)
  const now = Date.now();
  if (activeCategoriesCache && activeCategoriesCache.expiresAt > now) {
    const matched = activeCategoriesCache.data.find(
      (c) => c.slug.toLowerCase() === cleanSlug || c.id.toLowerCase() === cleanSlug
    );
    if (matched) return matched;
  }

  const db = getAdminDb();
  if (!db) return null;

  try {
    const doc = await db.collection(COLLECTION).doc(cleanSlug).get();
    if (doc.exists) {
      const data = doc.data() as Record<string, unknown>;
      const order = typeof data.order === 'number' ? data.order : typeof data.sortOrder === 'number' ? data.sortOrder : 0;
      return {
        id: doc.id,
        slug: (data.slug as string) || doc.id,
        name: {
          ar: ((data.name as Record<string, string>)?.ar) || '',
          en: ((data.name as Record<string, string>)?.en) || '',
        },
        icon: (data.icon as string) || '',
        order,
        sortOrder: order,
        isActive: data.isActive !== false,
        createdAt: (data.createdAt as string) || new Date().toISOString(),
        updatedAt: (data.updatedAt as string) || new Date().toISOString(),
      };
    }

    const snap = await db
      .collection(COLLECTION)
      .where('slug', '==', cleanSlug)
      .limit(1)
      .get();
    if (snap.empty) return null;
    const matched = snap.docs[0];
    const data = matched.data() as Record<string, unknown>;
    const order = typeof data.order === 'number' ? data.order : typeof data.sortOrder === 'number' ? data.sortOrder : 0;
    return {
      id: matched.id,
      slug: (data.slug as string) || matched.id,
      name: {
        ar: ((data.name as Record<string, string>)?.ar) || '',
        en: ((data.name as Record<string, string>)?.en) || '',
      },
      icon: (data.icon as string) || '',
      order,
      sortOrder: order,
      isActive: data.isActive !== false,
      createdAt: (data.createdAt as string) || new Date().toISOString(),
      updatedAt: (data.updatedAt as string) || new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export async function upsertCategoryAdmin(input: unknown): Promise<Category> {
  const db = getAdminDb();
  if (!db) {
    throw new Error('Database connection is not configured yet.');
  }

  const data = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const name = validateLocalizedText(data.name, 'اسم الفئة / Category Name', 1, 80);
  const slug = validateSlug(data.slug || name.en || name.ar, 'category');
  const icon = sanitizePlainText(data.icon, 30);
  const orderVal = Number(data.order ?? data.sortOrder);
  const order = Number.isFinite(orderVal) ? orderVal : 0;
  const isActive = data.isActive !== undefined ? Boolean(data.isActive) : true;

  const now = new Date().toISOString();
  const docRef = db.collection(COLLECTION).doc(slug);
  const existing = await docRef.get();

  const record = {
    slug,
    name,
    icon,
    order,
    sortOrder: order,
    isActive,
    createdAt: existing.exists ? ((existing.data()?.createdAt as string) || now) : now,
    updatedAt: now,
  };

  await docRef.set(record, { merge: true });
  invalidateCategoriesCache();
  return { id: slug, ...record };
}

export async function deleteCategoryAdmin(categoryId: string): Promise<void> {
  const db = getAdminDb();
  if (!db) {
    throw new Error('Database connection is not configured yet.');
  }
  const cleanId = categoryId.trim();
  if (!cleanId) return;
  await db.collection(COLLECTION).doc(cleanId).delete();
  invalidateCategoriesCache();
}
