import 'server-only';
import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache';
import { getAdminDb, invalidateCollectionCache } from '@/server/config/firebase-admin';
import { sanitizePlainText } from '@/server/validators';
import type { Testimonial } from '@/lib/testimonial-display';

export type TestimonialItem = Testimonial;

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

async function fetchApprovedTestimonialsFromStore(): Promise<TestimonialItem[]> {
  const db = getAdminDb();
  const snap = await db
    .collection(COLLECTION)
    .where('approved', '==', true)
    .limit(30)
    .get();

  const items: TestimonialItem[] = snap.docs.flatMap((doc) => {
    const data = doc.data();
    const name = sanitizePlainText(data.name, 50);
    const text = sanitizePlainText(data.text, 300);
    const rating = Number(data.rating);
    const createdAt = typeof data.createdAt === 'string' ? data.createdAt : '';

    if (
      data.approved !== true ||
      data.source !== 'visitor_submission' ||
      !name ||
      !text ||
      !Number.isInteger(rating) ||
      rating < 1 ||
      rating > 5 ||
      !createdAt ||
      !Number.isFinite(Date.parse(createdAt))
    ) {
      return [];
    }

    return [{
      id: doc.id,
      name,
      rating,
      text,
      createdAt,
      approved: true,
      locale: data.locale === 'en' ? 'en' : 'ar',
      source: 'visitor_submission' as const,
    }];
  });

  items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return items;
}

const getCachedApprovedTestimonialsFromDataCache = unstable_cache(
  fetchApprovedTestimonialsFromStore,
  ['aqurivo_approved_testimonials_catalog_visitor_source_v2'],
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
    const data = await getCachedApprovedTestimonialsFromDataCache();
    approvedTestimonialsCache = {
      data,
      expiresAt: Date.now() + TESTIMONIALS_CACHE_TTL_MS,
    };
    return data;
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
      source: data.source === 'visitor_submission' ? 'visitor_submission' : 'unknown',
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
    source: 'visitor_submission' as const,
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
