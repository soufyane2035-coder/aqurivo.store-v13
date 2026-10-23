import 'server-only';
import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache';
import { getAdminDb, invalidateCollectionCache } from '@/server/config/firebase-admin';
import { sanitizePlainText } from '@/server/validators';

export interface TestimonialItem {
  id: string;
  name: string;
  rating: number;
  text: string;
  createdAt: string;
  approved: boolean;
  locale: 'ar' | 'en';
}

const COLLECTION = 'testimonials';
const TESTIMONIALS_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

let approvedTestimonialsCache: { data: TestimonialItem[]; expiresAt: number } | null = null;
let approvedTestimonialsInFlight: Promise<TestimonialItem[]> | null = null;

export function invalidateTestimonialsCache(): void {
  approvedTestimonialsCache = null;
  approvedTestimonialsInFlight = null;
  invalidateCollectionCache(COLLECTION);
  try {
    revalidateTag('testimonials');
    revalidatePath('/', 'layout');
  } catch {
    // Ignore outside request context
  }
}

export const DEFAULT_APPROVED_TESTIMONIALS: TestimonialItem[] = [
  {
    id: 'default-1',
    name: 'أحمد م.',
    rating: 5,
    text: 'وجدت منتجاً كنت أبحث عنه من أسبوع في أقل من دقيقة عبر AQURIVO',
    createdAt: '2026-09-28T10:00:00.000Z',
    approved: true,
    locale: 'ar',
  },
  {
    id: 'default-2',
    name: 'Sarah K.',
    rating: 5,
    text: 'Great way to compare prices across multiple stores without switching tabs',
    createdAt: '2026-09-30T14:30:00.000Z',
    approved: true,
    locale: 'en',
  },
  {
    id: 'default-3',
    name: 'ليلى ح.',
    rating: 4,
    text: 'سهّل عليّ كثيراً مقارنة الأسعار بين المتاجر المختلفة',
    createdAt: '2026-10-02T09:15:00.000Z',
    approved: true,
    locale: 'ar',
  },
];

async function fetchApprovedTestimonialsFromStore(): Promise<TestimonialItem[]> {
  try {
    const db = getAdminDb();
    if (!db) {
      return DEFAULT_APPROVED_TESTIMONIALS;
    }

    const snap = await db
      .collection(COLLECTION)
      .where('approved', '==', true)
      .limit(30)
      .get();

    const items: TestimonialItem[] = snap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: sanitizePlainText(data.name, 50),
        rating: Math.min(5, Math.max(1, Number(data.rating) || 5)),
        text: sanitizePlainText(data.text, 300),
        createdAt: String(data.createdAt || new Date().toISOString()),
        approved: Boolean(data.approved),
        locale: data.locale === 'en' ? 'en' : 'ar',
      };
    });

    items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return items.length > 0
      ? [...items, ...DEFAULT_APPROVED_TESTIMONIALS]
      : DEFAULT_APPROVED_TESTIMONIALS;
  } catch {
    return DEFAULT_APPROVED_TESTIMONIALS;
  }
}

const getCachedApprovedTestimonialsFromDataCache = unstable_cache(
  fetchApprovedTestimonialsFromStore,
  ['aqurivo_approved_testimonials_catalog'],
  { revalidate: 86400, tags: ['testimonials'] }
);

export async function listApprovedTestimonialsServer(): Promise<TestimonialItem[]> {
  const now = Date.now();
  if (approvedTestimonialsCache && approvedTestimonialsCache.expiresAt > now) {
    return approvedTestimonialsCache.data;
  }
  if (approvedTestimonialsInFlight) {
    return approvedTestimonialsInFlight;
  }

  approvedTestimonialsInFlight = (async () => {
    try {
      const data = await getCachedApprovedTestimonialsFromDataCache();
      approvedTestimonialsCache = {
        data,
        expiresAt: Date.now() + TESTIMONIALS_CACHE_TTL_MS,
      };
      return data;
    } catch {
      const fallback = await fetchApprovedTestimonialsFromStore();
      approvedTestimonialsCache = {
        data: fallback,
        expiresAt: Date.now() + TESTIMONIALS_CACHE_TTL_MS,
      };
      return fallback;
    }
  })();

  try {
    return await approvedTestimonialsInFlight;
  } finally {
    approvedTestimonialsInFlight = null;
  }
}

export async function listAllTestimonialsAdminServer(): Promise<TestimonialItem[]> {
  const db = getAdminDb();
  if (!db) return [];

  const snap = await db.collection(COLLECTION).orderBy('createdAt', 'desc').limit(100).get();
  return snap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      name: sanitizePlainText(data.name, 50),
      rating: Math.min(5, Math.max(1, Number(data.rating) || 5)),
      text: sanitizePlainText(data.text, 300),
      createdAt: String(data.createdAt || new Date().toISOString()),
      approved: Boolean(data.approved),
      locale: data.locale === 'en' ? 'en' : 'ar',
    };
  });
}

export async function createTestimonialServer(input: {
  name: string;
  rating: number;
  text: string;
  locale: 'ar' | 'en';
}): Promise<TestimonialItem> {
  const cleanName = sanitizePlainText(input.name, 50);
  const cleanText = sanitizePlainText(input.text, 300);
  const cleanRating = Math.min(5, Math.max(1, Math.round(Number(input.rating) || 5)));
  const cleanLocale: 'ar' | 'en' = input.locale === 'en' ? 'en' : 'ar';

  if (!cleanName || !cleanText) {
    throw new Error('Name and testimonial text are required.');
  }

  const db = getAdminDb();
  const now = new Date().toISOString();
  const payload = {
    name: cleanName,
    rating: cleanRating,
    text: cleanText,
    createdAt: now,
    approved: false,
    locale: cleanLocale,
  };

  if (!db) {
    throw new Error('Firestore Admin is not configured.');
  }

  const docRef = db.collection(COLLECTION).doc();
  await docRef.set(payload);

  return {
    id: docRef.id,
    ...payload,
  };
}

export async function approveTestimonialServer(id: string): Promise<void> {
  const db = getAdminDb();
  if (!db) {
    throw new Error('Firestore Admin is not configured.');
  }
  await db.collection(COLLECTION).doc(id).update({ approved: true });
  invalidateTestimonialsCache();
}

export async function deleteTestimonialServer(id: string): Promise<void> {
  const db = getAdminDb();
  if (!db) {
    throw new Error('Firestore Admin is not configured.');
  }
  await db.collection(COLLECTION).doc(id).delete();
  invalidateTestimonialsCache();
}
