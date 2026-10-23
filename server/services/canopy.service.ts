import 'server-only';
import crypto from 'crypto';
import { getAdminDb } from '@/server/config/firebase-admin';
import { getCanonicalImageFingerprint } from '@/lib/magicContentParser';

const ADMIN_SECRETS_COLLECTION = 'admin_secrets';
const CANOPY_DOC_ID = 'canopy_config';
const CANOPY_GRAPHQL_ENDPOINT = 'https://graphql.canopyapi.co';

export type CanopyRotationStrategy = 'failover' | 'round_robin';
export type CanopyKeyStatus = 'active' | 'exhausted' | 'invalid' | 'untested';

export interface CanopyApiKeyItem {
  id: string;
  key: string;
  maskedKey: string;
  label: string;
  enabled: boolean;
  status: CanopyKeyStatus;
  usageCount: number;
  failCount: number;
  lastLatencyMs: number | null;
  lastUsedAt: string | null;
  lastCheckedAt: string | null;
  lastError: string | null;
  createdAt: string;
}

export interface CanopyConfig {
  rotationStrategy: CanopyRotationStrategy;
  activeKeyIndex: number;
  keys: CanopyApiKeyItem[];
  updatedAt: string;
  explicitlyCleared?: boolean;
}

export interface CanopyExtractedProduct {
  asin: string;
  domain: string;
  title: string;
  subtitle: string;
  brand: string;
  url: string;
  affiliateUrl: string;
  isPrime: boolean;
  isInStock: boolean;
  priceAmount: number | null;
  oldPrice: number | null;
  discountPercent: number | null;
  currency: string;
  rating: number | null;
  ratingsTotal: number | null;
  reviewsTotal: number | null;
  monthlySalesEstimate: number | null;
  mainImageUrl: string;
  imageUrls: string[];
  videoUrls: string[];
  videos: Array<{
    url: string;
    title: string;
    thumbnailUrl?: string;
  }>;
  featureBullets: string[];
  technicalSpecifications: Array<{
    name: string;
    value: string;
  }>;
  categories: Array<{
    id: string;
    name: string;
    breadcrumbPath: string;
  }>;
  suggestedCategorySlug: string;
  suggestedKeySpecsEn: string[];
  suggestedTags: string[];
  itemWeight: string;
  packageWeight: string;
  countryOfOrigin: string;
}

export interface CanopyFetchProductResult {
  product: CanopyExtractedProduct;
  rotationMeta: {
    usedKeyId: string;
    usedKeyLabel: string;
    usedKeyMasked: string;
    strategy: CanopyRotationStrategy;
    failoverOccurred: boolean;
    skippedKeys: Array<{
      id: string;
      label: string;
      reason: string;
      newStatus: CanopyKeyStatus;
    }>;
    activeHealthyKeysCount: number;
    totalKeysCount: number;
  };
}

const DEFAULT_SEED_KEYS: Array<{ key: string; label: string }> = [];

const RETIRED_SEED_KEYS = new Set([
  '0f3d3a6e-d787-4118-ae41-b1d308867d96',
  '6868bf02-88ae-49af-822a-4270592cafbf',
  'd6118f97-2e93-4303-911d-dd4edafb7c7e',
  'c1b276cc-4db5-4ab4-8a70-51aa47f231b2',
]);

export function maskCanopyKey(rawKey: string): string {
  const clean = rawKey.trim();
  if (clean.length <= 12) {
    return `${clean.slice(0, 4)}••••${clean.slice(-2)}`;
  }
  return `${clean.slice(0, 8)}-••••-••••-${clean.slice(-6)}`;
}

function deterministicKeyId(rawKey: string): string {
  return 'ck_' + crypto.createHash('sha256').update(rawKey.trim()).digest('hex').slice(0, 12);
}

function buildDefaultCanopyConfig(): CanopyConfig {
  const now = new Date().toISOString();
  const seedList = [...DEFAULT_SEED_KEYS];

  const envKeysRaw = (process.env.CANOPY_API_KEYS || process.env.CANOPY_API_KEY || '').trim();
  if (envKeysRaw) {
    const extraKeys = extractKeysFromRawInput(envKeysRaw);
    for (const k of extraKeys) {
      if (
        !RETIRED_SEED_KEYS.has(k.toLowerCase()) &&
        !seedList.some((existing) => existing.key.toLowerCase() === k.toLowerCase())
      ) {
        seedList.push({
          key: k,
          label: `مفتاح البيئة (Env Key ${seedList.length + 1})`,
        });
      }
    }
  }

  const keys: CanopyApiKeyItem[] = seedList.map((item) => ({
    id: deterministicKeyId(item.key),
    key: item.key.trim(),
    maskedKey: maskCanopyKey(item.key),
    label: item.label,
    enabled: true,
    status: 'active',
    usageCount: 0,
    failCount: 0,
    lastLatencyMs: null,
    lastUsedAt: null,
    lastCheckedAt: null,
    lastError: null,
    createdAt: now,
  }));

  return {
    rotationStrategy: 'failover',
    activeKeyIndex: 0,
    keys,
    updatedAt: now,
    explicitlyCleared: keys.length === 0,
  };
}

/**
 * Extracts API keys (UUIDs or alphanumeric tokens >= 16 chars) from any text block,
 * supporting newline, comma, or mixed Arabic/English labels like:
 * "واحد 0f3d3a6e-d787-4118-ae41-b1d308867d96 اتنين ..."
 */
export function extractKeysFromRawInput(rawText: string): string[] {
  if (!rawText || typeof rawText !== 'string') return [];

  const found: string[] = [];
  const uuidRegex = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g;
  const uuidMatches = rawText.match(uuidRegex);

  if (uuidMatches && uuidMatches.length > 0) {
    for (const match of uuidMatches) {
      const clean = match.trim();
      if (clean && !found.some((k) => k.toLowerCase() === clean.toLowerCase())) {
        found.push(clean);
      }
    }
    return found;
  }

  // Fallback for non-UUID API keys separated by lines, commas, or spaces
  const tokens = rawText
    .split(/[\n\r,،;\s]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 16 && /^[A-Za-z0-9_-]+$/.test(s));

  for (const token of tokens) {
    if (!found.some((k) => k.toLowerCase() === token.toLowerCase())) {
      found.push(token);
    }
  }

  return found;
}

export async function getCanopyConfig(): Promise<CanopyConfig> {
  const db = getAdminDb();
  const defaultCfg = buildDefaultCanopyConfig();
  if (!db) return defaultCfg;

  try {
    const doc = await db.collection(ADMIN_SECRETS_COLLECTION).doc(CANOPY_DOC_ID).get();
    if (!doc.exists) {
      return defaultCfg;
    }

    const data = doc.data() as Partial<CanopyConfig> | undefined;
    if (!data) {
      return defaultCfg;
    }

    const rawKeys = Array.isArray(data.keys) ? data.keys : [];
    let hadRetiredKeys = false;
    const filteredRawKeys = rawKeys.filter((k) => {
      const cleanKey = String(k?.key || '').trim().toLowerCase();
      if (!cleanKey || RETIRED_SEED_KEYS.has(cleanKey)) {
        hadRetiredKeys = true;
        return false;
      }
      return true;
    });

    const normalizedKeys: CanopyApiKeyItem[] = filteredRawKeys.map((k, idx) => {
      const cleanKey = String(k.key || '').trim();
      return {
        id: k.id || deterministicKeyId(cleanKey || String(idx)),
        key: cleanKey,
        maskedKey: maskCanopyKey(cleanKey),
        label: k.label || `المفتاح ${idx + 1} (Key ${idx + 1})`,
        enabled: k.enabled !== false,
        status: k.status || 'active',
        usageCount: typeof k.usageCount === 'number' ? k.usageCount : 0,
        failCount: typeof k.failCount === 'number' ? k.failCount : 0,
        lastLatencyMs: typeof k.lastLatencyMs === 'number' ? k.lastLatencyMs : null,
        lastUsedAt: k.lastUsedAt || null,
        lastCheckedAt: k.lastCheckedAt || null,
        lastError: k.lastError || null,
        createdAt: k.createdAt || defaultCfg.updatedAt,
      };
    });

    const strategy: CanopyRotationStrategy =
      data?.rotationStrategy === 'round_robin' ? 'round_robin' : 'failover';
    const rawIdx = typeof data?.activeKeyIndex === 'number' ? data.activeKeyIndex : 0;
    const safeIdx =
      normalizedKeys.length > 0 ? Math.max(0, Math.min(rawIdx, normalizedKeys.length - 1)) : 0;

    const resultConfig: CanopyConfig = {
      rotationStrategy: strategy,
      activeKeyIndex: safeIdx,
      keys: normalizedKeys,
      updatedAt: hadRetiredKeys
        ? new Date().toISOString()
        : data?.updatedAt || defaultCfg.updatedAt,
      explicitlyCleared: normalizedKeys.length === 0 ? true : Boolean(data?.explicitlyCleared),
    };

    if (hadRetiredKeys) {
      await db.collection(ADMIN_SECRETS_COLLECTION).doc(CANOPY_DOC_ID).set(resultConfig);
    }

    return resultConfig;
  } catch {
    return defaultCfg;
  }
}

export async function saveCanopyConfig(
  config: CanopyConfig,
  explicitlyCleared = false
): Promise<CanopyConfig> {
  const db = getAdminDb();
  const cleanKeys = (config.keys || []).filter(
    (k) => k?.key && !RETIRED_SEED_KEYS.has(k.key.trim().toLowerCase())
  );
  const updated: CanopyConfig = {
    ...config,
    keys: cleanKeys,
    activeKeyIndex:
      cleanKeys.length > 0
        ? Math.max(0, Math.min(config.activeKeyIndex, cleanKeys.length - 1))
        : 0,
    updatedAt: new Date().toISOString(),
    explicitlyCleared: cleanKeys.length === 0 ? true : Boolean(explicitlyCleared),
  };

  if (db) {
    await db.collection(ADMIN_SECRETS_COLLECTION).doc(CANOPY_DOC_ID).set(updated);
  }
  return updated;
}

export async function addCanopyKeysAdmin(params: {
  rawKeysInput: string;
  customLabel?: string;
}): Promise<{ config: CanopyConfig; addedCount: number; skippedDuplicates: number }> {
  const current = await getCanopyConfig();
  const extracted = extractKeysFromRawInput(params.rawKeysInput);

  if (extracted.length === 0) {
    throw new Error('لم يتم العثور على مفتاح صالح في النص المدخل. تأكد من نسخ مفتاح Canopy API بشكل صحيح.');
  }

  const now = new Date().toISOString();
  let addedCount = 0;
  let skippedDuplicates = 0;
  const nextKeys = [...current.keys];

  for (let i = 0; i < extracted.length; i++) {
    const rawKey = extracted[i].trim();
    const exists = nextKeys.some((k) => k.key.toLowerCase() === rawKey.toLowerCase());
    if (exists) {
      skippedDuplicates += 1;
      continue;
    }

    const keyNumber = nextKeys.length + 1;
    const label =
      params.customLabel && params.customLabel.trim()
        ? extracted.length > 1
          ? `${params.customLabel.trim()} (${i + 1})`
          : params.customLabel.trim()
        : `المفتاح ${keyNumber} (Key ${keyNumber})`;

    nextKeys.push({
      id: deterministicKeyId(rawKey),
      key: rawKey,
      maskedKey: maskCanopyKey(rawKey),
      label,
      enabled: true,
      status: 'untested',
      usageCount: 0,
      failCount: 0,
      lastLatencyMs: null,
      lastUsedAt: null,
      lastCheckedAt: null,
      lastError: null,
      createdAt: now,
    });
    addedCount += 1;
  }

  const saved = await saveCanopyConfig(
    {
      ...current,
      keys: nextKeys,
    },
    nextKeys.length === 0
  );

  return { config: saved, addedCount, skippedDuplicates };
}

export async function deleteCanopyKeyAdmin(keyId: string): Promise<CanopyConfig> {
  const current = await getCanopyConfig();
  const nextKeys = current.keys.filter((k) => k.id !== keyId);
  return saveCanopyConfig(
    {
      ...current,
      keys: nextKeys,
      activeKeyIndex: 0,
    },
    nextKeys.length === 0
  );
}

export async function toggleCanopyKeyAdmin(
  keyId: string,
  enabled: boolean
): Promise<CanopyConfig> {
  const current = await getCanopyConfig();
  const nextKeys = current.keys.map((k) => {
    if (k.id !== keyId) return k;
    return {
      ...k,
      enabled,
      status: enabled && k.status === 'exhausted' ? ('active' as const) : k.status,
      lastError: enabled ? null : k.lastError,
    };
  });
  return saveCanopyConfig({
    ...current,
    keys: nextKeys,
  });
}

export async function updateCanopyStrategyAdmin(params: {
  rotationStrategy?: CanopyRotationStrategy;
  activeKeyId?: string;
}): Promise<CanopyConfig> {
  const current = await getCanopyConfig();
  let nextIdx = current.activeKeyIndex;

  if (params.activeKeyId) {
    const foundIdx = current.keys.findIndex((k) => k.id === params.activeKeyId);
    if (foundIdx !== -1) {
      nextIdx = foundIdx;
    }
  }

  return saveCanopyConfig({
    ...current,
    rotationStrategy: params.rotationStrategy || current.rotationStrategy,
    activeKeyIndex: nextIdx,
  });
}

function classifyCanopyFailure(
  httpStatus: number,
  errorMessage: string,
  errorCode?: string
): { status: CanopyKeyStatus; reasonAr: string } {
  const msgLower = (errorMessage || '').toLowerCase();
  const codeUpper = (errorCode || '').toUpperCase();

  if (
    httpStatus === 401 ||
    codeUpper === 'UNAUTHENTICATED' ||
    msgLower.includes('not a valid api key') ||
    msgLower.includes('invalid api key') ||
    msgLower.includes('unauthorized')
  ) {
    return {
      status: 'invalid',
      reasonAr: 'المفتاح غير صالح أو غير مصرح به في Canopy API (401 Unauthorized).',
    };
  }

  if (
    codeUpper === 'SUBSCRIPTION_INACTIVE' ||
    msgLower.includes('subscription is inactive') ||
    msgLower.includes('account has been canceled')
  ) {
    return {
      status: 'exhausted',
      reasonAr:
        'اشتراك الحساب في Canopy API متوقف حالياً (402 SUBSCRIPTION_INACTIVE) — يتم التحويل التلقائي للمفتاح التالي أو المحرك الاحتياطي.',
    };
  }

  if (
    httpStatus === 402 ||
    httpStatus === 403 ||
    httpStatus === 429 ||
    codeUpper === 'PAYMENT_REQUIRED' ||
    codeUpper === 'FORBIDDEN' ||
    codeUpper === 'RATE_LIMITED' ||
    codeUpper === 'QUOTA_EXCEEDED' ||
    msgLower.includes('quota') ||
    msgLower.includes('credit') ||
    msgLower.includes('limit') ||
    msgLower.includes('exhausted') ||
    msgLower.includes('exceeded') ||
    msgLower.includes('billing') ||
    msgLower.includes('subscription') ||
    msgLower.includes('plan') ||
    msgLower.includes('upgrade') ||
    msgLower.includes('too many requests')
  ) {
    return {
      status: 'exhausted',
      reasonAr: `انتهى رصيد المفتاح أو تجاوز حد الطلبات المسموح (${httpStatus || codeUpper || 'Quota Exhausted'}).`,
    };
  }

  return {
    status: 'exhausted',
    reasonAr: errorMessage || `خطأ من خادم Canopy API (${httpStatus})`,
  };
}

/**
 * Live-checks a single Canopy API key using a lightweight authenticated query (`amazonProductCategoryTaxonomy`).
 */
export async function checkSingleCanopyKeyAdmin(keyId: string): Promise<{
  config: CanopyConfig;
  checkedKey: CanopyApiKeyItem;
  ok: boolean;
  messageAr: string;
}> {
  const current = await getCanopyConfig();
  const target = current.keys.find((k) => k.id === keyId);
  if (!target) {
    throw new Error('لم يتم العثور على المفتاح المطلوب فحصه.');
  }

  const probe = await probeSingleKeyLive(target.key);
  const now = new Date().toISOString();

  const updatedKey: CanopyApiKeyItem = {
    ...target,
    status: probe.status,
    lastLatencyMs: probe.latencyMs,
    lastCheckedAt: now,
    lastError: probe.ok ? null : probe.reasonAr,
    failCount: probe.ok ? target.failCount : target.failCount + 1,
  };

  const nextKeys = current.keys.map((k) => (k.id === keyId ? updatedKey : k));
  const saved = await saveCanopyConfig({
    ...current,
    keys: nextKeys,
  });

  return {
    config: saved,
    checkedKey: updatedKey,
    ok: probe.ok,
    messageAr: probe.ok
      ? `✅ ${target.label} يعمل بنجاح والرصيد متاح (زمن الاستجابة: ${probe.latencyMs}ms).`
      : `⚠️ ${target.label}: ${probe.reasonAr}`,
  };
}

export async function checkAllCanopyKeysAdmin(): Promise<{
  config: CanopyConfig;
  activeCount: number;
  exhaustedCount: number;
  invalidCount: number;
}> {
  const current = await getCanopyConfig();
  const now = new Date().toISOString();

  const checkedKeys = await Promise.all(
    current.keys.map(async (item) => {
      const probe = await probeSingleKeyLive(item.key);
      return {
        ...item,
        status: probe.status,
        lastLatencyMs: probe.latencyMs,
        lastCheckedAt: now,
        lastError: probe.ok ? null : probe.reasonAr,
      };
    })
  );

  // Ensure activeKeyIndex points to the first active & enabled key if current is not active
  let nextActiveIdx = current.activeKeyIndex;
  if (
    !checkedKeys[nextActiveIdx] ||
    !checkedKeys[nextActiveIdx].enabled ||
    checkedKeys[nextActiveIdx].status !== 'active'
  ) {
    const firstHealthy = checkedKeys.findIndex((k) => k.enabled && k.status === 'active');
    if (firstHealthy !== -1) {
      nextActiveIdx = firstHealthy;
    }
  }

  const saved = await saveCanopyConfig({
    ...current,
    activeKeyIndex: nextActiveIdx,
    keys: checkedKeys,
  });

  return {
    config: saved,
    activeCount: checkedKeys.filter((k) => k.status === 'active' && k.enabled).length,
    exhaustedCount: checkedKeys.filter((k) => k.status === 'exhausted').length,
    invalidCount: checkedKeys.filter((k) => k.status === 'invalid').length,
  };
}

async function probeSingleKeyLive(rawKey: string): Promise<{
  ok: boolean;
  status: CanopyKeyStatus;
  latencyMs: number;
  reasonAr: string;
}> {
  const startedAt = Date.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(CANOPY_GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'API-KEY': rawKey.trim(),
      },
      body: JSON.stringify({
        query: '{ amazonProductCategoryTaxonomy { id name } }',
      }),
      cache: 'no-store',
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));

    const latencyMs = Date.now() - startedAt;
    const payload = (await response.json().catch(() => ({}))) as {
      data?: { amazonProductCategoryTaxonomy?: Array<{ id: string }> };
      errors?: Array<{
        message?: string;
        extensions?: { code?: string; http?: { status?: number } };
      }>;
    };

    if (!response.ok || (Array.isArray(payload.errors) && payload.errors.length > 0)) {
      const firstErr = payload.errors?.[0];
      const errStatus = firstErr?.extensions?.http?.status || response.status;
      const errCode = firstErr?.extensions?.code;
      const errMsg = firstErr?.message || `HTTP ${response.status}`;
      const classified = classifyCanopyFailure(errStatus, errMsg, errCode);
      return {
        ok: false,
        status: classified.status,
        latencyMs,
        reasonAr: classified.reasonAr,
      };
    }

    return {
      ok: true,
      status: 'active',
      latencyMs,
      reasonAr: 'نشط وجاهز',
    };
  } catch (err) {
    const latencyMs = Date.now() - startedAt;
    const msg = err instanceof Error ? err.message : 'تعذر الاتصال بخادم Canopy API';
    return {
      ok: false,
      status: 'exhausted',
      latencyMs,
      reasonAr: `تعذر الفحص المؤقت: ${msg}`,
    };
  }
}

/**
 * Parses an Amazon URL or ASIN string into { asin, domain, cleanUrl }.
 * Also handles mobile app share text containing an embedded URL (e.g. "Check this out: https://a.co/d/xxxx").
 */
export function parseAmazonInputUrlOrAsin(rawInput: string): {
  asin: string | null;
  domain: string;
  cleanUrl: string | null;
} {
  const rawTrimmed = rawInput.trim();
  if (!rawTrimmed) {
    return { asin: null, domain: 'US', cleanUrl: null };
  }

  // Standalone 10-character ASIN
  if (/^[A-Z0-9]{10}$/i.test(rawTrimmed)) {
    return {
      asin: rawTrimmed.toUpperCase(),
      domain: 'US',
      cleanUrl: `https://www.amazon.com/dp/${rawTrimmed.toUpperCase()}`,
    };
  }

  // If the user pasted mobile share text with an embedded URL, extract the URL token
  const embeddedUrlMatch = rawTrimmed.match(/https?:\/\/[^\s"'<>]+/i);
  const trimmed = embeddedUrlMatch ? embeddedUrlMatch[0].trim() : rawTrimmed;

  // Detect Amazon domain from URL host
  let domain = 'US';
  const domainMap: Array<{ pattern: RegExp; code: string }> = [
    { pattern: /amazon\.co\.uk/i, code: 'UK' },
    { pattern: /amazon\.de/i, code: 'DE' },
    { pattern: /amazon\.fr/i, code: 'FR' },
    { pattern: /amazon\.ca/i, code: 'CA' },
    { pattern: /amazon\.co\.jp/i, code: 'JP' },
    { pattern: /amazon\.it/i, code: 'IT' },
    { pattern: /amazon\.es/i, code: 'ES' },
    { pattern: /amazon\.in/i, code: 'IN' },
    { pattern: /amazon\.com\.mx/i, code: 'MX' },
    { pattern: /amazon\.com\.br/i, code: 'BR' },
    { pattern: /amazon\.com\.au/i, code: 'AU' },
    { pattern: /amazon\.ae/i, code: 'AE' },
    { pattern: /amazon\.sa/i, code: 'SA' },
    { pattern: /amazon\.eg/i, code: 'EG' },
  ];

  for (const entry of domainMap) {
    if (entry.pattern.test(trimmed)) {
      domain = entry.code;
      break;
    }
  }

  // Extract ASIN from common Amazon URL patterns (/dp/ASIN, /gp/product/ASIN, /gp/aw/d/ASIN, /clp/ASIN, /product/ASIN)
  // Note: Exclude short link domains like a.co/d/xxxx where /d/ is followed by a 7-char short code, not a 10-char ASIN
  const isShortHost = /^https?:\/\/(?:a\.co|amzn\.to|amzn\.eu|amzn\.asia|amzn\.in)\//i.test(trimmed);
  const asinMatch = !isShortHost
    ? trimmed.match(
        /(?:\/dp\/|\/gp\/product\/|\/gp\/aw\/d\/|\/clp\/|\/product\/|\/d\/)([A-Z0-9]{10})(?:[/?&#]|$)/i
      )
    : null;

  if (asinMatch?.[1]) {
    return {
      asin: asinMatch[1].toUpperCase(),
      domain,
      cleanUrl: trimmed.startsWith('http') ? trimmed : `https://${trimmed}`,
    };
  }

  return {
    asin: null,
    domain,
    cleanUrl: trimmed.startsWith('http') ? trimmed : `https://${trimmed}`,
  };
}

const DESKTOP_BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

/**
 * Resolves shortened Amazon links (a.co/d/..., amzn.to/..., etc.) by following HTTP redirects
 * so we always have the canonical ASIN and marketplace domain before calling Canopy or the Direct Fallback.
 */
async function resolveAmazonInputIfNeeded(parsed: {
  asin: string | null;
  domain: string;
  cleanUrl: string | null;
}): Promise<{
  asin: string | null;
  domain: string;
  cleanUrl: string | null;
}> {
  if (parsed.asin || !parsed.cleanUrl) {
    return parsed;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(parsed.cleanUrl, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': DESKTOP_BROWSER_UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));

    if (res.url && res.url !== parsed.cleanUrl) {
      const reParsed = parseAmazonInputUrlOrAsin(res.url);
      if (reParsed.asin) {
        return reParsed;
      }
    }

    const html = await res.text().catch(() => '');
    const canonicalMatch =
      html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i) ||
      html.match(/data-asin=["']([A-Z0-9]{10})["']/i);
    if (canonicalMatch?.[1]) {
      const candidate = canonicalMatch[1];
      if (/^[A-Z0-9]{10}$/i.test(candidate)) {
        return {
          asin: candidate.toUpperCase(),
          domain: parsed.domain || 'US',
          cleanUrl: `https://www.amazon.com/dp/${candidate.toUpperCase()}`,
        };
      }
      const fromCanonical = parseAmazonInputUrlOrAsin(candidate);
      if (fromCanonical.asin) {
        return fromCanonical;
      }
    }
  } catch {
    // Ignore redirect resolution errors and keep original parsed input
  }

  return parsed;
}

let cachedAmazonUsCookie = '';
let cachedAmazonUsCookieExpiresAt = 0;

/**
 * Obtains and caches an Amazon US delivery session cookie (New York 10001) so that
 * servers running outside the US (e.g. europe-west3) still receive accurate USD pricing from Amazon.com.
 */
async function getAmazonUsDeliveryCookie(seedHtml?: string, seedCookies?: string[]): Promise<string> {
  if (cachedAmazonUsCookie && Date.now() < cachedAmazonUsCookieExpiresAt) {
    return cachedAmazonUsCookie;
  }

  try {
    let c0 = seedCookies || [];
    let html0 = seedHtml || '';

    if (!html0 || c0.length === 0) {
      const r0 = await fetch('https://www.amazon.com/gp/glow/get-address-selections.html?deviceType=desktop&pageType=Detail&storeContext=generic&actionSource=desktop-modal', {
        headers: {
          'User-Agent': DESKTOP_BROWSER_UA,
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });
      c0 = (r0.headers.getSetCookie ? r0.headers.getSetCookie() : []).map((c) => c.split(';')[0]);
      html0 = await r0.text().catch(() => '');
    }

    const csrfMatch =
      html0.match(/anti-csrftoken-a2z&quot;:&quot;([^&"]+)&quot;/i) ||
      html0.match(/"anti-csrftoken-a2z"\s*:\s*"([^"]+)"/i) ||
      html0.match(/CSRF_TOKEN\s*:\s*"([^"]+)"/i);
    const csrf = csrfMatch?.[1] || '';

    const r1 = await fetch('https://www.amazon.com/gp/delivery/ajax/address-change.html', {
      method: 'POST',
      headers: {
        'User-Agent': DESKTOP_BROWSER_UA,
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest',
        ...(csrf ? { 'anti-csrftoken-a2z': csrf } : {}),
        ...(c0.length > 0 ? { Cookie: c0.join('; ') } : {}),
      },
      body: 'locationType=LOCATION_INPUT&zipCode=10001&storeContext=generic&deviceType=web&pageType=Detail&actionSource=glow',
    });

    const c1 = (r1.headers.getSetCookie ? r1.headers.getSetCookie() : []).map((c) =>
      c.split(';')[0]
    );
    const cookieMap = new Map<string, string>();
    for (const c of [...c0, ...c1]) {
      const eqIdx = c.indexOf('=');
      if (eqIdx > 0) {
        cookieMap.set(c.slice(0, eqIdx).trim(), c.slice(eqIdx + 1).trim());
      }
    }
    cookieMap.set('i18n-prefs', 'USD');
    cookieMap.set('lc-main', 'en_US');

    const built = Array.from(cookieMap.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');

    if (built.includes('session-id=')) {
      cachedAmazonUsCookie = built;
      cachedAmazonUsCookieExpiresAt = Date.now() + 25 * 60 * 1000;
    }
    return built;
  } catch {
    return 'i18n-prefs=USD; lc-main=en_US';
  }
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&nbsp;|&lrm;|&rlm;|&zwnj;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Direct Amazon Product Page Extractor (Automatic Fallback when Canopy API keys return 402/Exhausted).
 * Extracts real title, brand, USD price, old price, discount, rating, review count,
 * high-resolution gallery images (`colorImages.initial`), videos, feature bullets, and technical specs.
 */
async function fetchAmazonProductDirectFallback(parsedInput: {
  asin: string | null;
  domain: string;
  cleanUrl: string | null;
}): Promise<CanopyExtractedProduct> {
  const domainHostMap: Record<string, string> = {
    US: 'www.amazon.com',
    UK: 'www.amazon.co.uk',
    DE: 'www.amazon.de',
    FR: 'www.amazon.fr',
    CA: 'www.amazon.ca',
    JP: 'www.amazon.co.jp',
    IT: 'www.amazon.it',
    ES: 'www.amazon.es',
    AE: 'www.amazon.ae',
    SA: 'www.amazon.sa',
  };
  const host = domainHostMap[parsedInput.domain] || 'www.amazon.com';
  const targetUrl = parsedInput.asin
    ? `https://${host}/dp/${encodeURIComponent(parsedInput.asin)}?th=1&psc=1&language=en_US`
    : parsedInput.cleanUrl || '';

  if (!targetUrl) {
    throw new Error('تعذر تحديد رابط المنتج في Amazon.');
  }

  const fetchPage = async (cookieHeader: string) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    return fetch(targetUrl, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': DESKTOP_BROWSER_UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        Cookie: cookieHeader,
      },
      cache: 'no-store',
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));
  };

  const initialCookie = cachedAmazonUsCookie || 'i18n-prefs=USD; lc-main=en_US';
  let res = await fetchPage(initialCookie);
  let html = await res.text();

  // Check if price is missing because the server is in Europe and needs a US 10001 delivery session cookie
  const hasOffscreenPrice = /<span class="a-offscreen">\s*\$[0-9,.]+\s*<\/span>/i.test(html);
  if (!hasOffscreenPrice && host === 'www.amazon.com') {
    const seedCookies = (res.headers.getSetCookie ? res.headers.getSetCookie() : []).map(
      (c) => c.split(';')[0]
    );
    const usCookie = await getAmazonUsDeliveryCookie(html, seedCookies);
    if (usCookie && usCookie !== initialCookie) {
      const retryRes = await fetchPage(usCookie);
      const retryHtml = await retryRes.text();
      if (retryHtml.includes('productTitle')) {
        res = retryRes;
        html = retryHtml;
      }
    }
  }

  // Extract ASIN
  const extractedAsinMatch =
    html.match(/data-asin=["']([A-Z0-9]{10})["']/i) ||
    res.url.match(/(?:\/dp\/|\/gp\/product\/)([A-Z0-9]{10})/i);
  const asin = (parsedInput.asin || extractedAsinMatch?.[1] || '').toUpperCase();

  // Extract Title
  const titleMatch =
    html.match(/id="productTitle"[^>]*>([\s\S]*?)<\/span>/i) ||
    html.match(/<meta\s+name="title"\s+content="([^"]+)"/i);
  const rawTitle = titleMatch ? decodeHtmlEntities(titleMatch[1].replace(/<[^>]+>/g, '')) : '';
  const title = rawTitle.replace(/^Amazon\.com\s*:\s*/i, '').trim();

  if (!title) {
    throw new Error(
      'تعذر سحب بيانات صفحة المنتج مباشرة من Amazon. يرجى التحقق من صحة الرابط أو تفعيل اشتراك مفاتيح Canopy API.'
    );
  }

  // Extract Brand
  const bylineMatch = html.match(/id="bylineInfo"[^>]*>([\s\S]*?)<\/a>/i);
  let brand = bylineMatch ? decodeHtmlEntities(bylineMatch[1].replace(/<[^>]+>/g, '')) : '';
  brand = brand
    .replace(/^Visit the\s+/i, '')
    .replace(/\s+Store$/i, '')
    .replace(/^Brand:\s*/i, '')
    .trim();

  // Extract Gallery Images (strictly for the selected product from colorImages.initial + dynamic fallbacks)
  const rawImageUrls: string[] = [];
  const parseJsonMatch = html.match(
    /colorImages'\s*:\s*\{\s*'initial'\s*:\s*A\.\$\.parseJSON\('([\s\S]*?)'\)/i
  );
  const initialBlockMatch = html.match(
    /colorImages'\s*:\s*\{\s*'initial'\s*:\s*(\[\s*\{[\s\S]{1,45000}?\}\s*\])\s*(?:,\s*'|\})/i
  );

  try {
    let galleryArray: Array<{ hiRes?: string | null; large?: string | null }> = [];
    if (parseJsonMatch?.[1]) {
      const unescaped = parseJsonMatch[1]
        .replace(/\\u002F/gi, '/')
        .replace(/\\\//g, '/')
        .replace(/\\"/g, '"')
        .replace(/\\'/g, "'")
        .replace(/\\\\/g, '\\');
      galleryArray = JSON.parse(unescaped);
    } else if (initialBlockMatch?.[1]) {
      galleryArray = JSON.parse(
        initialBlockMatch[1].replace(/\\u002F/gi, '/').replace(/\\\//g, '/')
      );
    }
    for (const item of galleryArray) {
      const candidate = sanitizeAmazonMediaUrl(item.hiRes || item.large || '');
      if (candidate && !rawImageUrls.includes(candidate)) {
        rawImageUrls.push(candidate);
      }
    }
  } catch {
    // Fallback to regex extraction from colorImages initial section
  }

  if (rawImageUrls.length === 0) {
    const colorImagesWindow = html.match(/colorImages'\s*:\s*\{\s*'initial'\s*:\s*\[([\s\S]{1,35000}?)\]\s*(?:,\s*'|\})/i);
    if (colorImagesWindow?.[1]) {
      const hiResMatches = colorImagesWindow[1].matchAll(
        /"(?:hiRes|large)"\s*:\s*"(https?:[^"\\]+(?:\\.[^"\\]*)*)"/gi
      );
      for (const m of hiResMatches) {
        const cleaned = sanitizeAmazonMediaUrl(m[1]);
        if (cleaned && !rawImageUrls.includes(cleaned)) {
          rawImageUrls.push(cleaned);
        }
      }
    }
  }

  if (rawImageUrls.length === 0) {
    const dynamicImgMatch =
      html.match(/id="landingImage"[^>]*data-old-hires="([^"]+)"/i) ||
      html.match(/id="landingImage"[^>]*src="([^"]+)"/i);
    if (dynamicImgMatch?.[1]) {
      const cleaned = sanitizeAmazonMediaUrl(dynamicImgMatch[1]);
      if (cleaned) rawImageUrls.push(cleaned);
    }

    const dynamicJsonAttr = html.match(/data-a-dynamic-image="([^"]+)"/i);
    if (dynamicJsonAttr?.[1]) {
      try {
        const decodedJson = decodeHtmlEntities(dynamicJsonAttr[1]);
        const parsedDynamic = JSON.parse(decodedJson) as Record<string, unknown>;
        for (const key of Object.keys(parsedDynamic)) {
          const cleaned = sanitizeAmazonMediaUrl(key);
          if (cleaned && !rawImageUrls.includes(cleaned)) {
            rawImageUrls.push(cleaned);
          }
        }
      } catch {
        // Ignore dynamic image JSON parse error
      }
    }
  }

  // Extract Product Videos & Cover Thumbnails (slateUrl / thumbUrl / imageUrl) — supports both MP4 and HLS m3u8 and escaped slashes
  const videos: Array<{ title: string; url: string; thumbnailImageUrl?: string }> = [];
  const seenVideoSet = new Set<string>();
  const unescapedHtmlForVideos = html.replace(/\\u002F/gi, '/').replace(/\\\//g, '/');
  const videoRegex =
    /\\?"url\\?"\s*:\s*\\?"(https:\/\/m\.media-amazon\.com\/images\/S\/vse-vms-transcoding-artifact[^"\\]+\.(?:mp4|m3u8))\\?"/gi;
  for (const m of unescapedHtmlForVideos.matchAll(videoRegex)) {
    const vUrl = sanitizeAmazonMediaUrl(m[1]);
    if (vUrl && !seenVideoSet.has(vUrl)) {
      seenVideoSet.add(vUrl);
      const matchIdx = typeof m.index === 'number' ? m.index : 0;
      const windowStart = Math.max(0, matchIdx - 800);
      const windowEnd = Math.min(unescapedHtmlForVideos.length, matchIdx + vUrl.length + 800);
      const contextSlice = unescapedHtmlForVideos.slice(windowStart, windowEnd);
      const thumbMatch = contextSlice.match(
        /\\?"(?:slateUrl|thumbUrl|thumbnailUrl|thumbnailImageUrl|imageUrl)\\?"\s*:\s*\\?"(https:\/\/m\.media-amazon\.com\/images\/[^"\\]+\.(?:jpg|jpeg|png|webp))\\?"/i
      );
      const cleanThumb = thumbMatch?.[1] ? sanitizeAmazonMediaUrl(thumbMatch[1]) : '';
      videos.push({
        title,
        url: vUrl,
        ...(cleanThumb ? { thumbnailImageUrl: cleanThumb } : {}),
      });
    }
  }

  // Extract Price & Old Price (List Price)
  let priceAmount: number | null = null;
  let oldPrice: number | null = null;

  const corePriceBlockMatch =
    html.match(/id="corePriceDisplay_desktop_feature_div"([\s\S]{0,4000})/i) ||
    html.match(/id="corePrice_feature_div"([\s\S]{0,3000})/i) ||
    html.match(/id="apex_desktop"([\s\S]{0,4000})/i);

  const priceSearchScope = corePriceBlockMatch ? corePriceBlockMatch[1] : html;
  const currentPriceMatch =
    priceSearchScope.match(/priceToPay[\s\S]{0,350}?<span class="a-offscreen">\s*\$([0-9,.]+)\s*<\/span>/i) ||
    priceSearchScope.match(/apexPriceToPay[\s\S]{0,350}?<span class="a-offscreen">\s*\$([0-9,.]+)\s*<\/span>/i) ||
    priceSearchScope.match(/<span class="a-price[^"]*"[^>]*>\s*<span class="a-offscreen">\s*\$([0-9,.]+)\s*<\/span>/i);

  if (currentPriceMatch?.[1]) {
    const parsedPrice = Number(currentPriceMatch[1].replace(/,/g, ''));
    if (Number.isFinite(parsedPrice) && parsedPrice > 0) {
      priceAmount = parsedPrice;
    }
  }

  const basisPriceMatch = priceSearchScope.match(
    /basisPrice[\s\S]{0,450}?<span class="a-offscreen">\s*\$([0-9,.]+)\s*<\/span>/i
  );
  if (basisPriceMatch?.[1]) {
    const parsedOld = Number(basisPriceMatch[1].replace(/,/g, ''));
    if (Number.isFinite(parsedOld) && priceAmount !== null && parsedOld > priceAmount) {
      oldPrice = parsedOld;
    }
  }

  // Extract Rating & Review Count
  const ratingMatch =
    html.match(/id="acrPopover"[^>]*title="([0-9.]+)\s+out of 5 stars"/i) ||
    html.match(/([0-9.]+)\s+out of 5 stars/i);
  const rating = ratingMatch?.[1] ? Number(ratingMatch[1]) : null;

  const ratingsTotalMatch =
    html.match(/id="acrCustomerReviewText"[^>]*>(?:\s*\()?([0-9,]+)/i) ||
    html.match(/([0-9,]+)\s+global ratings/i);
  const ratingsTotal = ratingsTotalMatch?.[1]
    ? Number(ratingsTotalMatch[1].replace(/,/g, ''))
    : null;

  // Extract Feature Bullets
  const featureBullets: string[] = [];
  const featureBlock = html.match(/id="feature-bullets"[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i);
  if (featureBlock?.[1]) {
    for (const m of featureBlock[1].matchAll(/<span class="a-list-item">([\s\S]*?)<\/span>/gi)) {
      const cleaned = decodeHtmlEntities(m[1].replace(/<[^>]+>/g, ''));
      if (cleaned && cleaned.length > 3 && !/^Make sure this fits/i.test(cleaned)) {
        featureBullets.push(cleaned);
      }
    }
  }

  // Extract Technical Specifications (Product Overview po-* rows + single-column prodDetTable rows)
  const technicalSpecifications: Array<{ name: string; value: string }> = [];
  for (const m of html.matchAll(
    /<tr[^>]*class="[^"]*po-[^"]*"[^>]*>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/gi
  )) {
    const name = decodeHtmlEntities(m[1].replace(/<[^>]+>/g, ''));
    const value = decodeHtmlEntities(m[2].replace(/<[^>]+>/g, ''));
    if (name && value) {
      technicalSpecifications.push({ name, value });
    }
  }

  for (const m of html.matchAll(
    /<tr[^>]*>\s*<th[^>]*>((?:(?!<\/th>)[\s\S])*)<\/th>\s*<td[^>]*>((?:(?!<\/td>)[\s\S])*)<\/td>\s*<\/tr>/gi
  )) {
    const name = decodeHtmlEntities(m[1].replace(/<[^>]+>/g, ''));
    const value = decodeHtmlEntities(m[2].replace(/<[^>]+>/g, ''));
    if (
      name &&
      value &&
      name.length < 60 &&
      value.length < 180 &&
      !name.includes('{') &&
      !value.includes('{') &&
      !/customer reviews|best sellers rank/i.test(name)
    ) {
      if (!technicalSpecifications.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
        technicalSpecifications.push({ name, value });
      }
    }
  }

  if (!brand) {
    const brandSpec = technicalSpecifications.find((s) => /^brand|manufacturer$/i.test(s.name));
    if (brandSpec) brand = brandSpec.value;
  }

  // Extract Breadcrumb Categories
  const categories: Array<{ id: string; name: string; breadcrumbPath: string }> = [];
  const bcBlock = html.match(/id="wayfinding-breadcrumbs_feature_div"([\s\S]*?)<\/div>/i);
  if (bcBlock?.[1]) {
    const names: string[] = [];
    for (const m of bcBlock[1].matchAll(/<a[^>]*>([\s\S]*?)<\/a>/gi)) {
      const cName = decodeHtmlEntities(m[1].replace(/<[^>]+>/g, ''));
      if (cName) {
        names.push(cName);
        categories.push({
          id: cName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          name: cName,
          breadcrumbPath: names.join(' > '),
        });
      }
    }
  }

  const weightSpec = technicalSpecifications.find((s) => /item weight/i.test(s.name));
  const originSpec = technicalSpecifications.find((s) => /country of origin/i.test(s.name));

  return normalizeCanopyProductResponse(
    {
      asin,
      title,
      subtitle: '',
      brand,
      url: targetUrl,
      isPrime: /a-icon-prime/i.test(html),
      isInStock: !/Currently unavailable/i.test(html),
      price: priceAmount !== null ? { value: priceAmount, currency: 'USD', symbol: '$' } : null,
      recommendedRetailPrice:
        oldPrice !== null ? { value: oldPrice, currency: 'USD', symbol: '$' } : null,
      mainImageUrl: rawImageUrls[0] || '',
      imageUrls: rawImageUrls,
      videosForThisProduct: videos,
      rating,
      ratingsTotal,
      reviewsTotal: ratingsTotal,
      featureBullets,
      technicalSpecifications,
      categories,
      itemWeight: weightSpec?.value || '',
      packageWeight: '',
      countryOfOrigin: originSpec?.value || '',
    },
    asin,
    parsedInput.domain,
    parsedInput.cleanUrl || targetUrl
  );
}

function inferAqurivoCategorySlug(
  categories: Array<{ name: string; breadcrumbPath: string }>,
  title: string
): string {
  const combined = `${categories.map((c) => `${c.name} ${c.breadcrumbPath}`).join(' ')} ${title}`.toLowerCase();

  if (
    /electronic|computer|laptop|tablet|phone|charger|power bank|cable|audio|headphone|earbud|speaker|camera|monitor|keyboard|mouse|usb|smartwatch|tv|gaming/.test(
      combined
    )
  ) {
    return 'electronics';
  }
  if (/kitchen|home|furniture|appliance|coffee|vacuum|lamp|lighting|bedding|decor|cookware|blender/.test(combined)) {
    return 'home';
  }
  if (/health|beauty|personal care|vitamin|supplement|skincare|hair|massage|medical|oral|shaver/.test(combined)) {
    return 'health';
  }
  if (/sport|fitness|outdoor|camping|gym|yoga|cycling|running|exercise/.test(combined)) {
    return 'sports';
  }
  if (/clothing|shoes|jewelry|watch|fashion|bag|wallet|sunglasses|apparel/.test(combined)) {
    return 'fashion';
  }
  return 'electronics';
}

const CANOPY_PRODUCT_GRAPHQL_QUERY = `
  query FetchAmazonProduct($input: AmazonProductInput!) {
    amazonProduct(input: $input) {
      title
      subtitle
      brand
      url
      asin
      isPrime
      isInStock
      price {
        symbol
        value
        currency
        display
      }
      recommendedRetailPrice {
        symbol
        value
        currency
        display
      }
      mainImageUrl
      imageUrls
      videos {
        title
        url
        thumbnailImageUrl
      }
      videosForThisProduct {
        title
        url
        thumbnailImageUrl
      }
      rating
      ratingsTotal
      reviewsTotal
      salesEstimate {
        monthlyUnitSales
      }
      featureBullets
      technicalSpecifications {
        name
        value
      }
      categories {
        id
        name
        breadcrumbPath
      }
      itemWeight
      packageWeight
      countryOfOrigin
    }
  }
`;

/**
 * Fetches complete product details, images, and videos from Canopy API
 * using the configured key rotation & automatic failover pool, with an automatic
 * Direct Amazon Fallback if all Canopy keys return 402/Exhausted.
 */
export async function fetchCanopyProductWithRotation(
  rawUrlOrAsin: string
): Promise<CanopyFetchProductResult> {
  const initialParsed = parseAmazonInputUrlOrAsin(rawUrlOrAsin);
  if (!initialParsed.asin && !initialParsed.cleanUrl) {
    throw new Error('يرجى إدخال رابط منتج Amazon صحيح أو رقم ASIN.');
  }

  // Resolve short links (a.co/d/..., amzn.to/...) first so we have the exact ASIN
  const parsedInput = await resolveAmazonInputIfNeeded(initialParsed);

  const config = await getCanopyConfig();
  const enabledKeys = config.keys.filter((k) => k.enabled);

  // Build ordered attempt sequence starting from activeKeyIndex
  const totalCount = config.keys.length;
  const startIdx = totalCount > 0 ? Math.max(0, Math.min(config.activeKeyIndex, totalCount - 1)) : 0;
  const orderedIndices: number[] = [];

  for (let offset = 0; offset < totalCount; offset++) {
    const idx = (startIdx + offset) % totalCount;
    if (config.keys[idx].enabled) {
      orderedIndices.push(idx);
    }
  }

  // Prioritize keys not marked invalid/exhausted first, but still keep exhausted keys as a final fallback in case quota reset
  const healthyIndices = orderedIndices.filter(
    (idx) => config.keys[idx].status !== 'exhausted' && config.keys[idx].status !== 'invalid'
  );
  const fallbackIndices = orderedIndices.filter(
    (idx) => config.keys[idx].status === 'exhausted' || config.keys[idx].status === 'invalid'
  );
  const attemptOrder = [...healthyIndices, ...fallbackIndices];

  const skippedKeys: Array<{
    id: string;
    label: string;
    reason: string;
    newStatus: CanopyKeyStatus;
  }> = [];

  const updatedKeys = [...config.keys];
  let lastErrorMessage = 'تعذر جلب بيانات المنتج من Canopy API.';

  for (let attemptPos = 0; attemptPos < attemptOrder.length; attemptPos++) {
    const keyIdx = attemptOrder[attemptPos];
    const currentKey = updatedKeys[keyIdx];
    const startedAt = Date.now();

    try {
      const graphqlVariables = parsedInput.asin
        ? {
            input: {
              asinLookup: {
                asin: parsedInput.asin,
                domain: parsedInput.domain || 'US',
              },
            },
          }
        : {
            input: {
              urlLookup: {
                url: parsedInput.cleanUrl,
              },
            },
          };

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 14000);

      const response = await fetch(CANOPY_GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'API-KEY': currentKey.key.trim(),
        },
        body: JSON.stringify({
          query: CANOPY_PRODUCT_GRAPHQL_QUERY,
          variables: graphqlVariables,
        }),
        cache: 'no-store',
        signal: controller.signal,
      }).finally(() => clearTimeout(timer));

      const latencyMs = Date.now() - startedAt;
      const payload = (await response.json().catch(() => ({}))) as {
        data?: { amazonProduct?: Record<string, any> | null };
        errors?: Array<{
          message?: string;
          extensions?: { code?: string; http?: { status?: number } };
        }>;
      };

      const firstError = payload.errors?.[0];
      const errHttpStatus = firstError?.extensions?.http?.status || response.status;
      const errCode = firstError?.extensions?.code || '';
      const errMessage = firstError?.message || '';

      // Check if error is key/quota/rate-limit/subscription related -> trigger automatic failover to next key!
      const isKeyOrQuotaFailure =
        response.status === 401 ||
        response.status === 402 ||
        response.status === 403 ||
        response.status === 429 ||
        errHttpStatus === 401 ||
        errHttpStatus === 402 ||
        errHttpStatus === 403 ||
        errHttpStatus === 429 ||
        /unauthenticated|payment_required|subscription_inactive|forbidden|rate_limit|quota|credit|limit|exhausted|exceeded|not a valid api key|upgrade|plan|subscription|canceled/i.test(
          `${errCode} ${errMessage}`
        );

      if (isKeyOrQuotaFailure) {
        const classified = classifyCanopyFailure(
          errHttpStatus || response.status,
          errMessage || `HTTP ${response.status}`,
          errCode
        );

        updatedKeys[keyIdx] = {
          ...currentKey,
          status: classified.status,
          lastLatencyMs: latencyMs,
          lastCheckedAt: new Date().toISOString(),
          lastError: classified.reasonAr,
          failCount: currentKey.failCount + 1,
        };

        skippedKeys.push({
          id: currentKey.id,
          label: currentKey.label,
          reason: classified.reasonAr,
          newStatus: classified.status,
        });

        lastErrorMessage = classified.reasonAr;
        // Continue loop to try the next key automatically!
        continue;
      }

      if (!response.ok || !payload.data?.amazonProduct) {
        const notFoundMsg =
          errMessage ||
          'لم يتم العثور على بيانات لهذا المنتج في Amazon عبر Canopy API. تأكد من صحة الرابط أو رقم ASIN.';
        throw new Error(notFoundMsg);
      }

      const rawProd = payload.data.amazonProduct;
      const nowIso = new Date().toISOString();

      // Mark key as active & increment usage
      updatedKeys[keyIdx] = {
        ...currentKey,
        status: 'active',
        usageCount: currentKey.usageCount + 1,
        lastLatencyMs: latencyMs,
        lastUsedAt: nowIso,
        lastCheckedAt: nowIso,
        lastError: null,
      };

      // Compute next activeKeyIndex depending on rotationStrategy
      let nextActiveKeyIndex = keyIdx;
      if (config.rotationStrategy === 'round_robin') {
        for (let step = 1; step <= totalCount; step++) {
          const candidateIdx = (keyIdx + step) % totalCount;
          const candidate = updatedKeys[candidateIdx];
          if (candidate.enabled && candidate.status === 'active') {
            nextActiveKeyIndex = candidateIdx;
            break;
          }
        }
      }

      await saveCanopyConfig({
        ...config,
        activeKeyIndex: nextActiveKeyIndex,
        keys: updatedKeys,
      });

      const product = normalizeCanopyProductResponse(
        rawProd,
        parsedInput.asin || '',
        parsedInput.domain,
        parsedInput.cleanUrl || ''
      );

      return {
        product,
        rotationMeta: {
          usedKeyId: currentKey.id,
          usedKeyLabel: currentKey.label,
          usedKeyMasked: currentKey.maskedKey,
          strategy: config.rotationStrategy,
          failoverOccurred: skippedKeys.length > 0,
          skippedKeys,
          activeHealthyKeysCount: updatedKeys.filter(
            (k) => k.enabled && k.status === 'active'
          ).length,
          totalKeysCount: updatedKeys.length,
        },
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'حدث خطأ أثناء الاتصال بـ Canopy API.';
      // If network timeout or 5xx, try next key as well
      if (/abort|timeout|fetch|network|502|503|504/i.test(msg) && attemptPos < attemptOrder.length - 1) {
        skippedKeys.push({
          id: currentKey.id,
          label: currentKey.label,
          reason: `تجاوز مهلة الاتصال المؤقتة (${msg})`,
          newStatus: currentKey.status,
        });
        continue;
      }

      // Save key state and fall through to Direct Amazon Fallback below
      lastErrorMessage = msg;
      break;
    }
  }

  // Persist updated key statuses if any keys were checked
  if (enabledKeys.length > 0) {
    await saveCanopyConfig({
      ...config,
      keys: updatedKeys,
    });
  }

  // Automatic Direct Amazon Fallback when all Canopy API keys are inactive/exhausted (402) or unavailable
  try {
    const fallbackProduct = await fetchAmazonProductDirectFallback(parsedInput);
    return {
      product: fallbackProduct,
      rotationMeta: {
        usedKeyId: 'direct-amazon-fallback',
        usedKeyLabel: 'المحرك الاحتياطي المباشر من Amazon (تلقائي بعد توقف المفاتيح)',
        usedKeyMasked: 'Direct-Amazon',
        strategy: config.rotationStrategy,
        failoverOccurred: true,
        skippedKeys,
        activeHealthyKeysCount: updatedKeys.filter((k) => k.enabled && k.status === 'active')
          .length,
        totalKeysCount: updatedKeys.length,
      },
    };
  } catch (fallbackErr) {
    const fallbackMsg =
      fallbackErr instanceof Error ? fallbackErr.message : 'تعذر الجلب الاحتياطي المباشر.';
    throw new Error(
      `تم تجربة جميع المفاتيح المفعلة (${attemptOrder.length}) (${lastErrorMessage})، كما تعذر الجلب المباشر: ${fallbackMsg}`
    );
  }
}

export function sanitizeAmazonMediaUrl(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  let cleaned = rawUrl
    .trim()
    .replace(/\\u002F/gi, '/')
    .replace(/\\u0026/gi, '&')
    .replace(/\\\//g, '/')
    .replace(/&amp;/gi, '&')
    .replace(/^['"`(\[<]+/, '')
    .replace(/[)'"`\]>.,;،]+$/, '')
    .trim();

  if (!cleaned) return '';
  if (cleaned.startsWith('//')) {
    cleaned = `https:${cleaned}`;
  }
  if (!/^https?:\/\//i.test(cleaned)) {
    return '';
  }

  // Upgrade tiny Amazon thumbnail URLs to high-resolution ._AC_SL1500_
  if (
    /(?:media-amazon\.com|ssl-images-amazon\.com)\/images\/I\/[A-Za-z0-9+-]+\._(?:SR\d+,\d+|SS\d+|SX\d+_SY\d+[^.]*|AC_US\d+|AC_UL\d+|AC_SR\d+,\d+)_\.(jpg|jpeg|png|webp)/i.test(
      cleaned
    )
  ) {
    cleaned = cleaned.replace(
      /(\/images\/I\/[A-Za-z0-9+-]+)\._[^.]+_\.(jpg|jpeg|png|webp)/i,
      '$1._AC_SL1500_.$2'
    );
  }

  return cleaned;
}

function normalizeCanopyProductResponse(
  raw: Record<string, any>,
  fallbackAsin: string,
  domain: string,
  fallbackUrl: string
): CanopyExtractedProduct {
  const asin = String(raw.asin || fallbackAsin || '').trim().toUpperCase();
  const title = String(raw.title || '').trim();
  const subtitle = String(raw.subtitle || '').trim();
  const brand = String(raw.brand || '').trim();

  // Deduplicate images by canonical fingerprint while preserving order
  const rawImageCandidates: string[] = [];
  if (typeof raw.mainImageUrl === 'string' && raw.mainImageUrl.trim()) {
    const cleanMain = sanitizeAmazonMediaUrl(raw.mainImageUrl);
    if (cleanMain) rawImageCandidates.push(cleanMain);
  }
  if (Array.isArray(raw.imageUrls)) {
    for (const img of raw.imageUrls) {
      if (typeof img === 'string' && img.trim()) {
        const cleanImg = sanitizeAmazonMediaUrl(img);
        if (cleanImg) rawImageCandidates.push(cleanImg);
      }
    }
  }

  const seenFingerprints = new Set<string>();
  const deduplicatedImages: string[] = [];
  for (const imgUrl of rawImageCandidates) {
    const fp = getCanonicalImageFingerprint(imgUrl) || imgUrl;
    if (!seenFingerprints.has(fp)) {
      seenFingerprints.add(fp);
      deduplicatedImages.push(imgUrl);
    }
  }

  // Collect and deduplicate videos from both `videosForThisProduct` and `videos`
  const rawVideoObjects: Array<{ url: string; title: string; thumbnailUrl?: string }> = [];
  const seenVideoUrls = new Set<string>();

  for (const list of [raw.videosForThisProduct, raw.videos]) {
    if (Array.isArray(list)) {
      for (const v of list) {
        const vUrl = typeof v?.url === 'string' ? sanitizeAmazonMediaUrl(v.url) : '';
        if (vUrl && !seenVideoUrls.has(vUrl)) {
          seenVideoUrls.add(vUrl);
          const rawThumb =
            typeof v?.thumbnailImageUrl === 'string' && v.thumbnailImageUrl.trim()
              ? v.thumbnailImageUrl
              : typeof v?.thumbnailUrl === 'string' && v.thumbnailUrl.trim()
                ? v.thumbnailUrl
                : '';
          const cleanThumb = rawThumb ? sanitizeAmazonMediaUrl(rawThumb) : '';
          rawVideoObjects.push({
            url: vUrl,
            title: typeof v?.title === 'string' && v.title.trim() ? v.title.trim() : title,
            thumbnailUrl: cleanThumb || deduplicatedImages[0] || undefined,
          });
        }
      }
    }
  }

  const priceAmount =
    typeof raw.price?.value === 'number' && Number.isFinite(raw.price.value)
      ? raw.price.value
      : null;
  const rawOldPrice =
    typeof raw.recommendedRetailPrice?.value === 'number' &&
    Number.isFinite(raw.recommendedRetailPrice.value)
      ? raw.recommendedRetailPrice.value
      : null;

  const oldPrice =
    rawOldPrice !== null && priceAmount !== null && rawOldPrice > priceAmount
      ? rawOldPrice
      : null;

  const discountPercent =
    oldPrice !== null && priceAmount !== null && oldPrice > priceAmount
      ? Math.round(((oldPrice - priceAmount) / oldPrice) * 100)
      : null;

  const currency = String(raw.price?.currency || 'USD').trim().toUpperCase();
  const rating =
    typeof raw.rating === 'number' && Number.isFinite(raw.rating) ? raw.rating : null;
  const ratingsTotal =
    raw.ratingsTotal !== undefined && raw.ratingsTotal !== null && !Number.isNaN(Number(raw.ratingsTotal))
      ? Number(raw.ratingsTotal)
      : null;
  const reviewsTotal =
    raw.reviewsTotal !== undefined && raw.reviewsTotal !== null && !Number.isNaN(Number(raw.reviewsTotal))
      ? Number(raw.reviewsTotal)
      : null;
  const monthlySalesEstimate =
    raw.salesEstimate?.monthlyUnitSales !== undefined &&
    raw.salesEstimate?.monthlyUnitSales !== null &&
    !Number.isNaN(Number(raw.salesEstimate.monthlyUnitSales))
      ? Number(raw.salesEstimate.monthlyUnitSales)
      : null;

  const featureBullets: string[] = Array.isArray(raw.featureBullets)
    ? raw.featureBullets
        .map((b: unknown) => String(b || '').trim())
        .filter((b: string) => b.length > 0)
    : [];

  const technicalSpecifications: Array<{ name: string; value: string }> = Array.isArray(
    raw.technicalSpecifications
  )
    ? raw.technicalSpecifications
        .map((spec: any) => ({
          name: String(spec?.name || '').trim(),
          value: String(spec?.value || '').trim(),
        }))
        .filter((spec: { name: string; value: string }) => Boolean(spec.name && spec.value))
    : [];

  const categories: Array<{ id: string; name: string; breadcrumbPath: string }> = Array.isArray(
    raw.categories
  )
    ? raw.categories
        .map((c: any) => ({
          id: String(c?.id || '').trim(),
          name: String(c?.name || '').trim(),
          breadcrumbPath: String(c?.breadcrumbPath || '').trim(),
        }))
        .filter((c: { name: string }) => Boolean(c.name))
    : [];

  const associateTag = (process.env.AMAZON_ASSOCIATE_TAG || '').trim();
  const cleanCanonicalAmazonUrl = asin
    ? `https://www.amazon.com/dp/${encodeURIComponent(asin)}${associateTag ? `?tag=${encodeURIComponent(associateTag)}` : ''}`
    : fallbackUrl || String(raw.url || '').trim();

  const suggestedCategorySlug = inferAqurivoCategorySlug(categories, title);

  // Build 3 concise key comparison specs from technicalSpecifications
  const suggestedKeySpecsEn = technicalSpecifications
    .slice(0, 3)
    .map((s) => `${s.name}: ${s.value}`);

  // Build clean tags from brand, ASIN, and category names
  const tagSet = new Set<string>();
  if (brand) tagSet.add(brand);
  if (asin) tagSet.add(asin);
  for (const cat of categories.slice(0, 4)) {
    if (cat.name && cat.name.length <= 32) {
      tagSet.add(cat.name);
    }
  }
  tagSet.add('Amazon');

  return {
    asin,
    domain,
    title,
    subtitle,
    brand,
    url: cleanCanonicalAmazonUrl,
    affiliateUrl: fallbackUrl && fallbackUrl.includes('tag=') ? fallbackUrl : cleanCanonicalAmazonUrl,
    isPrime: Boolean(raw.isPrime),
    isInStock: raw.isInStock !== false,
    priceAmount,
    oldPrice,
    discountPercent,
    currency,
    rating,
    ratingsTotal,
    reviewsTotal,
    monthlySalesEstimate,
    mainImageUrl: deduplicatedImages[0] || '',
    imageUrls: deduplicatedImages,
    videoUrls: rawVideoObjects.map((v) => v.url),
    videos: rawVideoObjects,
    featureBullets,
    technicalSpecifications,
    categories,
    suggestedCategorySlug,
    suggestedKeySpecsEn,
    suggestedTags: Array.from(tagSet),
    itemWeight: String(raw.itemWeight || '').trim(),
    packageWeight: String(raw.packageWeight || '').trim(),
    countryOfOrigin: String(raw.countryOfOrigin || '').trim(),
  };
}
