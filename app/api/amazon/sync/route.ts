import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/server/config/firebase-admin';
import { requireAdminApi, verifyCsrfRequest } from '@/server/middleware/security';
import { sanitizePlainText } from '@/server/validators';
import {
  type AmazonSearchItemResult,
  buildAmazonAffiliateUrl,
  isAmazonPaapiConfigured,
  searchAmazonPaapiItems,
} from '@/server/services/amazonPaapi.service';
import { generateSlug } from '@/lib/seoSlug';

const PRODUCTS_COLLECTION = 'products';
const SYNC_LOGS_COLLECTION = 'sync_logs';

function mapCategoryLabel(categoryInput: string): { ar: string; en: string; slug: string } {
  const normalized = categoryInput.trim().toLowerCase();
  if (normalized === 'electronics' || normalized === 'إلكترونيات') {
    return { ar: 'إلكترونيات', en: 'Electronics', slug: 'electronics' };
  }
  if (normalized === 'fashion' || normalized === 'موضة') {
    return { ar: 'موضة', en: 'Fashion', slug: 'fashion' };
  }
  if (normalized === 'health' || normalized === 'صحة') {
    return { ar: 'صحة', en: 'Health', slug: 'health' };
  }
  if (normalized === 'home' || normalized === 'منزل') {
    return { ar: 'منزل', en: 'Home', slug: 'home' };
  }
  if (normalized === 'sports' || normalized === 'رياضة') {
    return { ar: 'رياضة', en: 'Sports', slug: 'sports' };
  }
  return { ar: 'عام', en: 'General', slug: 'general' };
}

/**
 * Checks if a product with the given ASIN already exists in Firestore "products"
 * and saves it if not duplicated.
 */
async function upsertAmazonProductIfNew(
  db: NonNullable<ReturnType<typeof getAdminDb>>,
  item: AmazonSearchItemResult,
  categoryInput: string
): Promise<{ saved: boolean; skippedDuplicate: boolean; productId: string }> {
  const asin = sanitizePlainText(item.asin, 32).toUpperCase();
  if (!asin) {
    throw new Error('ASIN غير صالح.');
  }

  // Check by ASIN field or deterministic doc ID to avoid duplicates
  const existingQuery = await db
    .collection(PRODUCTS_COLLECTION)
    .where('asin', '==', asin)
    .limit(1)
    .get();

  const docId = `amazon-${asin.toLowerCase()}`;
  const directDoc = await db.collection(PRODUCTS_COLLECTION).doc(docId).get();

  if (!existingQuery.empty || directDoc.exists) {
    return {
      saved: false,
      skippedDuplicate: true,
      productId: !existingQuery.empty ? existingQuery.docs[0].id : docId,
    };
  }

  const nowIso = new Date().toISOString();
  const cleanTitle = sanitizePlainText(item.title, 220) || `Amazon ${asin}`;
  const seoSlug = generateSlug(cleanTitle, 'amazon');
  const cleanImage = sanitizePlainText(item.image, 1000);
  const affiliateUrl = buildAmazonAffiliateUrl(asin);
  const priceNum =
    typeof item.price === 'number' && Number.isFinite(item.price) && item.price >= 0
      ? item.price
      : null;
  const currency = sanitizePlainText(item.currency || 'USD', 10) || 'USD';
  const catInfo = mapCategoryLabel(categoryInput || item.category || 'general');

  const productRecord = {
    // Fields requested by specification
    asin,
    title_ar: cleanTitle,
    title_en: cleanTitle,
    price: priceNum,
    imageUrl: cleanImage,
    affiliateUrl,
    source: 'amazon',
    lastSyncedAt: nowIso,

    // Standard AQURIVO Product schema fields so it renders across all pages
    slug: seoSlug || docId,
    title: { ar: cleanTitle, en: cleanTitle },
    shortSummary: { ar: cleanTitle, en: cleanTitle },
    editorialVerdict: { ar: cleanTitle, en: cleanTitle },
    pros: [],
    cons: [],
    specs: [{ label: { ar: 'رقم ASIN', en: 'ASIN' }, value: { ar: asin, en: asin } }],
    priceAmount: priceNum,
    oldPrice: null,
    discount: null,
    stars: 4.5,
    soldCount: 120,
    badge: 'توفير' as const,
    priceCurrency: currency,
    priceUpdatedAt: nowIso,
    images: cleanImage
      ? [
          {
            url: cleanImage,
            alt: { ar: cleanTitle, en: cleanTitle },
            width: 800,
            height: 800,
          },
        ]
      : [],
    categoryId: catInfo.slug,
    categorySlug: catInfo.slug,
    categoryName: { ar: catInfo.ar, en: catInfo.en },
    sourceId: 'amazon',
    sourceSlug: 'amazon',
    sourceName: { ar: 'Amazon', en: 'Amazon' },
    sourceDisclosure: {
      ar: 'AQURIVO يستخدم روابط تسويق بالعمولة — affiliate links',
      en: 'AQURIVO يستخدم روابط تسويق بالعمولة — affiliate links',
    },
    tags: ['amazon', asin.toLowerCase(), catInfo.slug],
    status: 'published' as const,
    isFeatured: true,
    clicksCount: 0,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  await db.collection(PRODUCTS_COLLECTION).doc(docId).set(productRecord);

  return {
    saved: true,
    skippedDuplicate: false,
    productId: docId,
  };
}

export async function POST(req: NextRequest) {
  const guard = await requireAdminApi();
  if (!guard.authorized) return guard.response;

  const csrfValid = await verifyCsrfRequest(req);
  if (!csrfValid) {
    return NextResponse.json({ error: 'Invalid security token.' }, { status: 403 });
  }

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json(
      { error: 'قاعدة بيانات Firestore غير متصلة بعد على الخادم.' },
      { status: 503 }
    );
  }

  try {
    const body = (await req.json()) as {
      keyword?: string;
      category?: string;
      item?: AmazonSearchItemResult;
    };

    const category = sanitizePlainText(body.category || 'general', 80);
    const nowIso = new Date().toISOString();

    // Case 1: Single item import triggered by clicking "إضافة للمتجر" on a result card
    if (body.item && body.item.asin) {
      if (!process.env.AMAZON_ASSOCIATE_TAG?.trim()) {
        return NextResponse.json(
          {
            error:
              'يرجى ضبط متغير البيئة AMAZON_ASSOCIATE_TAG على الخادم لحفظ رابط العمولة.',
          },
          { status: 503 }
        );
      }

      const result = await upsertAmazonProductIfNew(db, body.item, category);

      await db.collection(SYNC_LOGS_COLLECTION).add({
        type: 'single_item_import',
        asin: body.item.asin,
        keyword: body.keyword || null,
        category,
        savedCount: result.saved ? 1 : 0,
        skippedDuplicates: result.skippedDuplicate ? 1 : 0,
        adminEmail: guard.session.email,
        status: 'success',
        syncedAt: nowIso,
      });

      return NextResponse.json({
        saved: result.saved,
        skippedDuplicate: result.skippedDuplicate,
        productId: result.productId,
      });
    }

    // Case 2: Keyword search & automatic batch sync
    if (!isAmazonPaapiConfigured()) {
      return NextResponse.json(
        {
          error:
            'مفاتيح Amazon PA-API 5.0 غير مضبوطة بعد في الخادم (AMAZON_ACCESS_KEY, AMAZON_SECRET_KEY, AMAZON_ASSOCIATE_TAG).',
          notConfigured: true,
        },
        { status: 503 }
      );
    }

    const keyword = sanitizePlainText(body.keyword, 140);
    if (!keyword) {
      return NextResponse.json(
        { error: 'يرجى إدخال كلمة مفتاحية للمزامنة من Amazon.' },
        { status: 400 }
      );
    }

    const items = await searchAmazonPaapiItems({ keyword, category });
    let savedCount = 0;
    let skippedDuplicates = 0;

    for (const item of items) {
      const outcome = await upsertAmazonProductIfNew(db, item, category);
      if (outcome.saved) savedCount += 1;
      if (outcome.skippedDuplicate) skippedDuplicates += 1;
    }

    await db.collection(SYNC_LOGS_COLLECTION).add({
      type: 'batch_keyword_sync',
      keyword,
      category,
      totalFetched: items.length,
      savedCount,
      skippedDuplicates,
      adminEmail: guard.session.email,
      status: 'success',
      syncedAt: nowIso,
    });

    return NextResponse.json({
      totalFetched: items.length,
      savedCount,
      skippedDuplicates,
      items,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'حدث خطأ أثناء مزامنة منتجات Amazon.';

    try {
      await db.collection(SYNC_LOGS_COLLECTION).add({
        type: 'sync_error',
        error: message,
        adminEmail: guard.session.email,
        status: 'failed',
        syncedAt: new Date().toISOString(),
      });
    } catch {
      // Ignore secondary logging error
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
