import 'server-only';
import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache';
import { getAdminDb, invalidateCollectionCache } from '@/server/config/firebase-admin';
import type { PartnerSource, PriceDisplayPolicy } from '@/types';
import { sanitizePlainText, validateHttpsUrl, validateLocalizedText, validateSlug } from '@/server/validators';

const COLLECTION = 'sources';
const SOURCES_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

let activeSourcesCache: { data: PartnerSource[]; expiresAt: number } | null = null;
let activeSourcesInFlight: Promise<PartnerSource[]> | null = null;

export function invalidateSourcesCache(): void {
  activeSourcesCache = null;
  activeSourcesInFlight = null;
  invalidateCollectionCache(COLLECTION);
  try {
    revalidateTag('sources');
    revalidatePath('/', 'layout');
  } catch {
    // Ignore outside request context
  }
}

export const DEFAULT_PARTNER_SOURCES: PartnerSource[] = [
  {
    id: 'amazon',
    slug: 'amazon',
    name: { en: 'Amazon', ar: 'Amazon' },
    websiteUrl: 'https://www.amazon.com',
    disclosureText: {
      en: 'As an Amazon Associate I earn from qualifying purchases.',
      ar: 'بصفتنا شريكاً في برنامج Amazon Associates، فإننا نكسب من عمليات الشراء المؤهلة.',
    },
    defaultPricePolicy: 'hide_price_check_store',
    accentColor: '#0F5243',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'noon',
    slug: 'noon',
    name: { en: 'Noon', ar: 'نون (Noon)' },
    websiteUrl: 'https://www.noon.com',
    disclosureText: {
      en: 'We may earn a commission when you purchase on Noon through our partner link, at no extra cost to you.',
      ar: 'قد نحصل على عمولة عند شرائك من متجر نون عبر رابط الإحالة الخاص بنا، دون أي تكلفة إضافية عليك.',
    },
    defaultPricePolicy: 'show_with_timestamp',
    accentColor: '#0F5243',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'temu',
    slug: 'temu',
    name: { en: 'Temu', ar: 'Temu' },
    websiteUrl: 'https://www.temu.com',
    disclosureText: {
      en: 'This link is an affiliate referral to Temu. Prices and promotions on Temu change frequently.',
      ar: 'هذا رابط إحالة بالعمولة إلى متجر Temu. الأسعار والعروض الترويجية في Temu تتغير باستمرار.',
    },
    defaultPricePolicy: 'show_with_timestamp',
    accentColor: '#0F5243',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'clickbank',
    slug: 'clickbank',
    name: { en: 'ClickBank', ar: 'ClickBank' },
    websiteUrl: 'https://www.clickbank.com',
    disclosureText: {
      en: 'We are an independent affiliate and receive compensation if you purchase through this ClickBank vendor link.',
      ar: 'نحن مسوّقون بالعمولة مستقلون ونتلقى عمولة إذا قمت بالشراء عبر رابط البائع على ClickBank.',
    },
    defaultPricePolicy: 'show_with_timestamp',
    accentColor: '#0F5243',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

async function fetchActiveSourcesFromStore(): Promise<PartnerSource[]> {
  const db = getAdminDb();
  if (!db) {
    return DEFAULT_PARTNER_SOURCES;
  }

  try {
    const snap = await db.collection(COLLECTION).where('isActive', '==', true).get();
    if (snap.empty) {
      return DEFAULT_PARTNER_SOURCES;
    }
    return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<PartnerSource, 'id'>) }));
  } catch {
    return DEFAULT_PARTNER_SOURCES;
  }
}

const getCachedActiveSourcesFromDataCache = unstable_cache(
  fetchActiveSourcesFromStore,
  ['aqurivo_active_sources_catalog'],
  { revalidate: 86400, tags: ['sources'] }
);

export async function listActiveSources(): Promise<PartnerSource[]> {
  const now = Date.now();
  if (activeSourcesCache && activeSourcesCache.expiresAt > now) {
    return activeSourcesCache.data;
  }
  if (activeSourcesInFlight) {
    return activeSourcesInFlight;
  }

  activeSourcesInFlight = (async () => {
    try {
      const data = await getCachedActiveSourcesFromDataCache();
      activeSourcesCache = {
        data,
        expiresAt: Date.now() + SOURCES_CACHE_TTL_MS,
      };
      return data;
    } catch {
      const fallback = await fetchActiveSourcesFromStore();
      activeSourcesCache = {
        data: fallback,
        expiresAt: Date.now() + SOURCES_CACHE_TTL_MS,
      };
      return fallback;
    }
  })();

  try {
    return await activeSourcesInFlight;
  } finally {
    activeSourcesInFlight = null;
  }
}

export async function listAllSourcesAdmin(): Promise<PartnerSource[]> {
  const db = getAdminDb();
  if (!db) {
    return DEFAULT_PARTNER_SOURCES;
  }

  const snap = await db.collection(COLLECTION).get();
  if (snap.empty) {
    return DEFAULT_PARTNER_SOURCES;
  }
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<PartnerSource, 'id'>) }));
}

export async function getSourceById(sourceId: string): Promise<PartnerSource | null> {
  const db = getAdminDb();
  if (!db) {
    return DEFAULT_PARTNER_SOURCES.find((s) => s.id === sourceId || s.slug === sourceId) || null;
  }

  const doc = await db.collection(COLLECTION).doc(sourceId).get();
  if (!doc.exists) {
    return DEFAULT_PARTNER_SOURCES.find((s) => s.id === sourceId || s.slug === sourceId) || null;
  }
  return { id: doc.id, ...(doc.data() as Omit<PartnerSource, 'id'>) };
}

export async function upsertSourceAdmin(input: unknown): Promise<PartnerSource> {
  const db = getAdminDb();
  if (!db) {
    throw new Error('Database connection is not configured yet.');
  }

  const data = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const name = validateLocalizedText(data.name, 'اسم المتجر / Store Name', 1, 80);
  const slug = validateSlug(data.slug || name.en || name.ar, 'store');
  const websiteUrl = validateHttpsUrl(data.websiteUrl, 'websiteUrl');
  const disclosureText = validateLocalizedText(data.disclosureText, 'نص الإفصاح', 0, 600);
  const defaultPricePolicy: PriceDisplayPolicy =
    data.defaultPricePolicy === 'hide_price_check_store'
      ? 'hide_price_check_store'
      : 'show_with_timestamp';

  const now = new Date().toISOString();
  const docRef = db.collection(COLLECTION).doc(slug);
  const existing = await docRef.get();

  const record: Omit<PartnerSource, 'id'> = {
    slug,
    name,
    websiteUrl,
    disclosureText,
    defaultPricePolicy,
    accentColor: sanitizePlainText(data.accentColor, 20) || '#0F5243',
    isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
    createdAt: existing.exists ? (existing.data()?.createdAt as string) || now : now,
    updatedAt: now,
  };

  await docRef.set(record, { merge: true });
  invalidateSourcesCache();
  return { id: slug, ...record };
}

export async function deleteSourceAdmin(sourceId: string): Promise<void> {
  const db = getAdminDb();
  if (!db) {
    throw new Error('Database connection is not configured yet.');
  }
  await db.collection(COLLECTION).doc(sourceId).delete();
  invalidateSourcesCache();
}
