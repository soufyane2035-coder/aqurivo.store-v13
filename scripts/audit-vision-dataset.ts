import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { loadEnvConfig } from '@next/env';

type ImageRecord = {
  url: string;
  width?: number;
  height?: number;
  alt?: string;
};

type ManifestProduct = {
  productId: string;
  title: { en: string; ar: string };
  categorySlug: string;
  tags: string[];
  images: ImageRecord[];
};

function getText(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return String(record.en || record.ar || '').trim();
  }
  return '';
}

function getLocalizedText(value: unknown): { en: string; ar: string } {
  if (typeof value === 'string') {
    const text = value.trim();
    return { en: text, ar: text };
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const en = String(record.en || record.ar || '').trim();
    const ar = String(record.ar || record.en || '').trim();
    return { en, ar };
  }
  return { en: '', ar: '' };
}

function getImageUrl(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value === 'object') {
    const image = value as Record<string, unknown>;
    return String(image.url || image.src || image.secure_url || '').trim();
  }
  return '';
}

function isSafeImageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && Boolean(url.hostname);
  } catch {
    return false;
  }
}

function getImageRecords(raw: Record<string, unknown>, title: { en: string; ar: string }) {
  const rawImages = Array.isArray(raw.images) ? raw.images : [];
  const sourceImages = rawImages.length > 0
    ? rawImages
    : [raw.imageUrl || raw.image || raw.thumbnail || ''];

  const records: ImageRecord[] = [];
  let invalidCount = 0;

  for (const entry of sourceImages) {
    const url = getImageUrl(entry);
    if (!url) continue;
    if (!isSafeImageUrl(url)) {
      invalidCount += 1;
      continue;
    }

    const image = entry && typeof entry === 'object'
      ? entry as Record<string, unknown>
      : {};
    records.push({
      url,
      ...(Number.isFinite(Number(image.width)) && Number(image.width) > 0
        ? { width: Number(image.width) }
        : {}),
      ...(Number.isFinite(Number(image.height)) && Number(image.height) > 0
        ? { height: Number(image.height) }
        : {}),
      alt: getText(image.alt) || title.en || title.ar,
    });
  }

  // Keep the first occurrence of each URL within a product.
  const seen = new Set<string>();
  const unique = records.filter((image) => {
    if (seen.has(image.url)) return false;
    seen.add(image.url);
    return true;
  });

  return {
    images: unique,
    invalidCount,
    duplicateCount: records.length - unique.length,
  };
}

async function main() {
  loadEnvConfig(process.cwd());

  // Load the same backend adapter used by Aqurivo only after env files are loaded.
  // This supports both the current Firestore adapter and an explicitly enabled Turso adapter.
  const { getAdminDb } = await import('../server/config/firebase-admin');
  const db = getAdminDb();
  const snapshot = await db.collection('products')
    .where('status', '==', 'published')
    .get();

  const products: ManifestProduct[] = [];
  const allUrls = new Set<string>();
  const categoryCounts = new Map<string, number>();
  let productsWithoutImages = 0;
  let totalImageReferences = 0;
  let invalidImageUrls = 0;
  let duplicateReferencesWithinProducts = 0;

  for (const document of snapshot.docs) {
    const raw = document.data() as Record<string, unknown>;
    const title = getLocalizedText(raw.title || raw.name);
    const result = getImageRecords(raw, title);
    const categorySlug = String(raw.categorySlug || '').trim() || 'uncategorized';
    const tags = Array.isArray(raw.tags)
      ? raw.tags.filter((tag): tag is string => typeof tag === 'string').map((tag) => tag.trim()).filter(Boolean)
      : [];

    invalidImageUrls += result.invalidCount;
    duplicateReferencesWithinProducts += result.duplicateCount;
    totalImageReferences += result.images.length;

    if (result.images.length === 0) productsWithoutImages += 1;
    for (const image of result.images) allUrls.add(image.url);

    categoryCounts.set(categorySlug, (categoryCounts.get(categorySlug) || 0) + 1);
    products.push({
      productId: document.id,
      title,
      categorySlug,
      tags,
      images: result.images,
    });
  }

  const report = {
    generatedAt: new Date().toISOString(),
    collection: 'products',
    filter: { status: 'published' },
    publishedProducts: snapshot.docs.length,
    productsWithImages: snapshot.docs.length - productsWithoutImages,
    productsWithoutImages,
    uniqueImageReferencesAcrossProducts: totalImageReferences,
    uniqueImageUrlsAcrossCatalog: allUrls.size,
    malformedOrNonHttpsImageUrls: invalidImageUrls,
    duplicateImageReferencesWithinProducts: duplicateReferencesWithinProducts,
    productsByCategory: Object.fromEntries(
      [...categoryCounts.entries()].sort((a, b) => b[1] - a[1])
    ),
  };

  console.log(JSON.stringify(report, null, 2));

  const exportArg = process.argv.find((arg) => arg.startsWith('--export='));
  if (exportArg) {
    const exportPath = path.resolve(process.cwd(), exportArg.slice('--export='.length));
    mkdirSync(path.dirname(exportPath), { recursive: true });
    const manifest = {
      schemaVersion: 1,
      generatedAt: report.generatedAt,
      source: 'Aqurivo published product catalog',
      products,
    };
    writeFileSync(exportPath, JSON.stringify(manifest, null, 2), {
      encoding: 'utf8',
      flag: 'wx',
      mode: 0o600,
    });
    console.log(`Manifest exported to: ${exportPath}`);
  }
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : 'Vision dataset audit failed.'
  );
  process.exitCode = 1;
});
