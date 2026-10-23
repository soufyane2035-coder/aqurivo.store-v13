import 'server-only';
import { getAdminDb } from '@/server/config/firebase-admin';
import type { SiteSettings } from '@/types';
import { sanitizePlainText, validateLocalizedText } from '@/server/validators';

const COLLECTION = 'settings';
const PUBLIC_DOC_ID = 'public';

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  siteName: {
    en: 'AQURIVO',
    ar: 'AQURIVO',
  },
  topBarAnnouncement: {
    en: 'Independent product curation — transparent affiliate links with zero extra cost to you.',
    ar: 'انتقاء مستقل للمنتجات — روابط عمولة شفافة دون أي تكلفة إضافية عليك.',
  },
  topBarEnabled: false,
  contactEmail: 'contact@aqurivo.store',
  contactPhoneDisplay: '+212 684 063 908',
  contactPhoneE164: '+212684063908',
  whatsappUrl: 'https://wa.me/212684063908',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

export async function getSiteSettings(): Promise<SiteSettings> {
  const db = getAdminDb();
  if (!db) return DEFAULT_SITE_SETTINGS;

  try {
    const doc = await db.collection(COLLECTION).doc(PUBLIC_DOC_ID).get();
    if (!doc.exists) return DEFAULT_SITE_SETTINGS;
    return {
      ...DEFAULT_SITE_SETTINGS,
      ...(doc.data() as Partial<SiteSettings>),
    };
  } catch {
    return DEFAULT_SITE_SETTINGS;
  }
}

export async function updateSiteSettingsAdmin(input: unknown): Promise<SiteSettings> {
  const db = getAdminDb();
  if (!db) {
    throw new Error('Database connection is not configured yet.');
  }

  const data = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const siteName = validateLocalizedText(data.siteName, 'siteName', 2, 80);
  const topBarAnnouncement = validateLocalizedText(
    data.topBarAnnouncement,
    'topBarAnnouncement',
    2,
    240
  );

  const updated: SiteSettings = {
    siteName,
    topBarAnnouncement,
    topBarEnabled: Boolean(data.topBarEnabled),
    contactEmail:
      sanitizePlainText(data.contactEmail, 160) || DEFAULT_SITE_SETTINGS.contactEmail,
    contactPhoneDisplay:
      sanitizePlainText(data.contactPhoneDisplay, 40) ||
      DEFAULT_SITE_SETTINGS.contactPhoneDisplay,
    contactPhoneE164:
      sanitizePlainText(data.contactPhoneE164, 30) || DEFAULT_SITE_SETTINGS.contactPhoneE164,
    whatsappUrl:
      sanitizePlainText(data.whatsappUrl, 200) || DEFAULT_SITE_SETTINGS.whatsappUrl,
    updatedAt: new Date().toISOString(),
  };

  await db.collection(COLLECTION).doc(PUBLIC_DOC_ID).set(updated, { merge: true });
  return updated;
}
