import 'server-only';
import { revalidatePath } from 'next/cache';
import { getAdminDb, invalidateCollectionCache } from '@/server/config/firebase-admin';
import { sanitizePlainText } from '@/server/validators';

export interface ReviewItem {
  id: string;
  productSlug: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
  approved: boolean;
}

export interface ReviewsSummary {
  reviews: ReviewItem[];
  averageRating: number;
  totalCount: number;
  distribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

const COLLECTION = 'reviews';
const REVIEWS_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const reviewsBySlugCache = new Map<string, { data: ReviewsSummary; expiresAt: number }>();

export async function getReviewsByProductSlug(slug: string): Promise<ReviewsSummary> {
  const emptyResult: ReviewsSummary = {
    reviews: [],
    averageRating: 0,
    totalCount: 0,
    distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
  };

  const cleanSlug = sanitizePlainText(slug, 140);
  if (!cleanSlug) return emptyResult;

  const cacheKey = cleanSlug.toLowerCase();
  const now = Date.now();
  const cached = reviewsBySlugCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  const db = getAdminDb();
  if (!db) return emptyResult;

  try {
    const snap = await db
      .collection(COLLECTION)
      .where('productSlug', '==', cleanSlug)
      .get();

      const items: ReviewItem[] = [];
      const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
      let sumRating = 0;

      for (const doc of snap.docs) {
        const data = doc.data() as Partial<ReviewItem>;
        if (data.approved === false) continue;

        const ratingVal = Math.max(1, Math.min(5, Math.round(Number(data.rating) || 5)));
        const item: ReviewItem = {
          id: doc.id,
          productSlug: sanitizePlainText(data.productSlug || cleanSlug, 140),
          userName: sanitizePlainText(data.userName, 80) || 'زائر',
          rating: ratingVal,
          comment: sanitizePlainText(data.comment, 300),
          createdAt: String(data.createdAt || new Date().toISOString()),
          approved: true,
        };

        items.push(item);
        sumRating += item.rating;
        dist[item.rating as 1 | 2 | 3 | 4 | 5] = (dist[item.rating as 1 | 2 | 3 | 4 | 5] || 0) + 1;
      }

      // Sort newest first
      items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

      const totalCount = items.length;
      const averageRating = totalCount > 0 ? Number((sumRating / totalCount).toFixed(1)) : 0;

      const summary: ReviewsSummary = {
        reviews: items,
        averageRating,
        totalCount,
        distribution: dist,
      };
      reviewsBySlugCache.set(cacheKey, {
        data: summary,
        expiresAt: Date.now() + REVIEWS_CACHE_TTL_MS,
      });
      return summary;
    } catch {
      return emptyResult;
    }
  }

export async function createReview(input: {
  productSlug: string;
  userName: string;
  rating: number;
  comment?: string;
}): Promise<string> {
  const db = getAdminDb();
  if (!db) throw new Error('Database unavailable');

  const rating = Math.max(1, Math.min(5, Math.round(Number(input.rating) || 5)));
  const userName = sanitizePlainText(input.userName, 80);
  const comment = sanitizePlainText(input.comment, 300);
  const productSlug = sanitizePlainText(input.productSlug, 140);

  if (!userName) {
    throw new Error('User name is required');
  }
  if (!productSlug) {
    throw new Error('Product slug is required');
  }

  const reviewDoc = {
    productSlug,
    userName,
    rating,
    comment,
    createdAt: new Date().toISOString(),
    approved: true,
  };

  const docRef = await db.collection(COLLECTION).add(reviewDoc);
  reviewsBySlugCache.delete(productSlug.toLowerCase());
  try {
    revalidatePath('/', 'layout');
  } catch {
    // Ignore outside request context
  }
  return docRef.id;
}
