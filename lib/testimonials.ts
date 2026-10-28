'use client';

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  query,
  updateDoc,
} from 'firebase/firestore';
import { getFirebaseClientFirestore } from '@/lib/firebase-client';
import type { Testimonial } from '@/lib/testimonial-display';
export type { Testimonial } from '@/lib/testimonial-display';

export class TestimonialSubmissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TestimonialSubmissionError';
  }
}

export const FALLBACK_TESTIMONIALS: Testimonial[] = [];

/**
 * Retrieves testimonials from Firestore `testimonials` collection.
 * When `onlyApproved` is true (default), returns only `approved == true` items.
 * When `onlyApproved` is false (admin view), returns all or unapproved items.
 */
export async function getTestimonials(
  onlyApproved = true
): Promise<Testimonial[]> {
  // 1. For public visitors, fetch from the cached server API first (0 direct client Firestore reads)
  if (onlyApproved) {
    try {
      const res = await fetch('/api/testimonials');
      if (res.ok) {
        const data = (await res.json()) as { testimonials?: Testimonial[] };
        if (Array.isArray(data.testimonials) && data.testimonials.length > 0) {
          return data.testimonials;
        }
      }
    } catch {
      // Fall through to fallback
    }
    return FALLBACK_TESTIMONIALS;
  }

  // 2. Admin mode (all/unapproved testimonials)
  try {
    const res = await fetch('/api/admin/testimonials', { cache: 'no-store' });
    if (res.ok) {
      const data = (await res.json()) as { testimonials?: Testimonial[] };
      if (Array.isArray(data.testimonials)) {
        return data.testimonials;
      }
    }
  } catch {
    // Fall back to direct Firestore below
  }

  if (process.env.NEXT_PUBLIC_DATA_STORE === 'turso') {
    return [];
  }

  try {
    const db = getFirebaseClientFirestore();
    if (db) {
      const colRef = collection(db, 'testimonials');
      const q = query(colRef, limit(100));

      const snap = await getDocs(q);
      const items: Testimonial[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: String(data.name || ''),
          rating: Math.min(5, Math.max(1, Number(data.rating) || 5)),
          text: String(data.text || ''),
          createdAt: String(data.createdAt || new Date().toISOString()),
          approved: Boolean(data.approved),
          locale: data.locale === 'en' ? 'en' : 'ar',
          source: data.source === 'visitor_submission' ? 'visitor_submission' : 'unknown',
        };
      });

      items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return items;
    }
  } catch {
    // Ignore error
  }

  return [];
}

/**
 * Submits a visitor testimonial through the server so it stays pending review.
 */
export async function addTestimonial(input: {
  name: string;
  rating: number;
  text: string;
  locale: 'ar' | 'en';
}): Promise<Testimonial> {
  const cleanName = input.name.trim().slice(0, 50);
  const cleanText = input.text.trim().slice(0, 300);
  const cleanRating = Math.min(5, Math.max(1, Math.round(Number(input.rating) || 5)));
  const cleanLocale: 'ar' | 'en' = input.locale === 'en' ? 'en' : 'ar';

  if (!cleanName || !cleanText) {
    throw new Error('Name and review text are required.');
  }

  const record = {
    name: cleanName,
    rating: cleanRating,
    text: cleanText,
    createdAt: new Date().toISOString(),
    approved: false,
    locale: cleanLocale,
    source: 'visitor_submission',
  };

  const res = await fetch('/api/testimonials', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(record),
  });

  const data = (await res.json()) as {
    testimonial?: Testimonial;
    error?: string;
  };

  if (!res.ok) {
    throw new TestimonialSubmissionError(
      data.error || 'Failed to submit testimonial'
    );
  }

  if (!data.testimonial) {
    throw new Error('The testimonial server returned an invalid response.');
  }

  return data.testimonial;
}

function readClientCsrfCookie(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)souf_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

/**
 * Approves a pending testimonial (`approved: true`) — Admin only.
 */
export async function approveTestimonial(id: string, csrfToken?: string): Promise<void> {
  const token = csrfToken || readClientCsrfCookie();
  try {
    const res = await fetch('/api/admin/testimonials', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'x-csrf-token': token } : {}),
      },
      body: JSON.stringify({ id }),
    });

    if (res.ok) {
      return;
    }
  } catch {
    // Fallback to client Firestore below
  }

  if (process.env.NEXT_PUBLIC_DATA_STORE === 'turso') {
    throw new Error('Failed to approve testimonial');
  }

  const db = getFirebaseClientFirestore();
  if (db) {
    await updateDoc(doc(db, 'testimonials', id), { approved: true });
    return;
  }

  throw new Error('Failed to approve testimonial');
}

/**
 * Deletes a testimonial document — Admin only.
 */
export async function deleteTestimonial(id: string, csrfToken?: string): Promise<void> {
  const token = csrfToken || readClientCsrfCookie();
  try {
    const res = await fetch(
      `/api/admin/testimonials?id=${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
        headers: token ? { 'x-csrf-token': token } : undefined,
      }
    );

    if (res.ok) {
      return;
    }
  } catch {
    // Fallback to client Firestore below
  }

  if (process.env.NEXT_PUBLIC_DATA_STORE === 'turso') {
    throw new Error('Failed to delete testimonial');
  }

  const db = getFirebaseClientFirestore();
  if (db) {
    await deleteDoc(doc(db, 'testimonials', id));
    return;
  }

  throw new Error('Failed to delete testimonial');
}
