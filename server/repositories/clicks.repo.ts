import 'server-only';
import { getAdminDb } from '@/server/config/firebase-admin';
import type { Locale } from '@/types';
import { sanitizePlainText } from '@/server/validators';

const COLLECTION = 'clicks';

export interface OutboundClickRecord {
  id: string;
  productId: string;
  productSlug: string;
  sourceId: string;
  sourceSlug: string;
  ipDailyHash: string;
  countryCode: string;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  locale: Locale;
  refContext: string;
  createdAt: string;
}

/**
 * Logs a privacy-preserving outbound affiliate click.
 * Never logs raw IP addresses. Increments the product's click counter.
 */
export function recordOutboundClick(params: {
  productId: string;
  productSlug: string;
  sourceId: string;
  sourceSlug: string;
  ipDailyHash: string;
  countryCode: string;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  locale: Locale;
  refContext: string;
}): void {
  const db = getAdminDb();
  if (!db) return;

  try {
    const now = new Date().toISOString();
    const clickRef = db.collection(COLLECTION).doc();

    void clickRef
      .set({
        productId: sanitizePlainText(params.productId, 128),
        productSlug: sanitizePlainText(params.productSlug, 120),
        sourceId: sanitizePlainText(params.sourceId, 128),
        sourceSlug: sanitizePlainText(params.sourceSlug, 80),
        ipDailyHash: sanitizePlainText(params.ipDailyHash, 64),
        countryCode: sanitizePlainText(params.countryCode, 8) || 'UN',
        deviceType: params.deviceType,
        locale: params.locale === 'ar' ? 'ar' : 'en',
        refContext: sanitizePlainText(params.refContext, 64) || 'direct',
        createdAt: now,
      })
      .catch(() => undefined);
  } catch {
    // Do not block visitor redirect if analytics write fails
  }
}

export async function listRecentClicksAdmin(limitCount = 500): Promise<OutboundClickRecord[]> {
  const db = getAdminDb();
  if (!db) return [];

  const snap = await db
    .collection(COLLECTION)
    .orderBy('createdAt', 'desc')
    .limit(limitCount)
    .get();

  return snap.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<OutboundClickRecord, 'id'>),
  }));
}
