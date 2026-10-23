import 'server-only';
import type {
  LocalizedText,
  PriceDisplayPolicy,
  ProductComparisonDna,
  ProductImage,
  ProductStatus,
  ProductVideo,
  PromoBadgeType,
} from '@/types';
import { generateSlug } from '@/lib/seoSlug';

export class ValidationError extends Error {
  public readonly field?: string;
  constructor(message: string, field?: string) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CURRENCY_REGEX = /^[A-Z]{2,4}$/;

export function sanitizePlainText(input: unknown, maxLength: number): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/<[^>]*>/g, '')
    .trim()
    .slice(0, maxLength);
}

export function sanitizeEmail(input: unknown): string {
  const cleaned = sanitizePlainText(input, 160).toLowerCase();
  if (!cleaned || !EMAIL_REGEX.test(cleaned)) {
    return '';
  }
  return cleaned;
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&#x([0-9a-fA-F]+);?/gi, (_, hex) => {
      try {
        return String.fromCodePoint(parseInt(hex, 16));
      } catch {
        return '';
      }
    })
    .replace(/&#([0-9]+);?/g, (_, dec) => {
      try {
        return String.fromCodePoint(parseInt(dec, 10));
      } catch {
        return '';
      }
    })
    .replace(/&colon;/gi, ':')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&');
}

function isSafeUrl(rawUrl: string): boolean {
  if (!rawUrl) return false;
  const decoded = decodeHtmlEntities(rawUrl)
    .replace(/[\x00-\x20\s]/g, '')
    .toLowerCase();
  if (decoded.startsWith('/') || decoded.startsWith('#')) return true;
  if (
    decoded.startsWith('https://') ||
    decoded.startsWith('http://') ||
    decoded.startsWith('mailto:') ||
    decoded.startsWith('tel:')
  ) {
    const colonIdx = decoded.indexOf(':');
    const proto = decoded.slice(0, colonIdx + 1);
    return ['https:', 'http:', 'mailto:', 'tel:'].includes(proto);
  }
  return false;
}

/**
 * Robustly sanitizes editorial HTML for buying guides, stripping scripts, SVG/MathML, styles, forms,
 * event handlers, iframes, objects, and dangerous protocols while preserving clean semantic tags.
 * Normalizes and validates HTML entities to prevent obfuscated protocol attacks (e.g. j&#x61;vascript:).
 */
export function sanitizeEditorialHtml(rawHtml: unknown, maxLength = 50000): string {
  if (typeof rawHtml !== 'string') return '';
  let cleaned = rawHtml.slice(0, maxLength);

  // Multi-pass removal of dangerous tags to defeat nested bypass attempts (e.g. <scr<script>ipt>)
  const dangerousTagRegex =
    /<\/?(?:script|style|svg|math|form|object|embed|applet|base|meta|link|frame|frameset|template)\b[^>]*>/gi;
  let previous = '';
  while (cleaned !== previous) {
    previous = cleaned;
    cleaned = cleaned.replace(dangerousTagRegex, '');
  }

  // Sanitize iframes: strictly allow only YouTube and Vimeo embeds
  cleaned = cleaned.replace(/<iframe\b([^>]*)>(?:[\s\S]*?<\/iframe>)?/gi, (_fullMatch, attrs: string) => {
    const srcMatch = String(attrs || '').match(/\bsrc\s*=\s*["']([^"']+)["']/i);
    if (!srcMatch) return '';
    const src = srcMatch[1].trim();
    if (
      /^https:\/\/(?:www\.)?(?:youtube\.com\/embed\/|youtube-nocookie\.com\/embed\/|player\.vimeo\.com\/video\/)[A-Za-z0-9_-]+$/i.test(
        src
      )
    ) {
      return `<iframe src="${src}" title="Video" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="width:100%;aspect-ratio:16/9;border:0;border-radius:12px;"></iframe>`;
    }
    return '';
  });

  // Strip all event handlers: on* attributes
  cleaned = cleaned.replace(/\s+on[a-zA-Z0-9_-]+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '');

  // Strip dangerous attributes
  cleaned = cleaned.replace(/\s+(?:srcdoc|formaction|action|xlink:href|data-bind|autofocus)\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '');

  // Validate and sanitize href attributes on any element
  cleaned = cleaned.replace(/\bhref\s*=\s*(["'])([\s\S]*?)\1/gi, (match, quote, val) => {
    if (isSafeUrl(val)) {
      return `href=${quote}${val}${quote}`;
    }
    return 'href="#"';
  });

  // Validate and sanitize src attributes on img tags
  cleaned = cleaned.replace(/\bsrc\s*=\s*(["'])([\s\S]*?)\1/gi, (match, quote, val) => {
    if (isSafeUrl(val)) {
      return `src=${quote}${val}${quote}`;
    }
    return '';
  });

  // Strip remaining dangerous protocol markers
  cleaned = cleaned.replace(/(?:j\s*a\s*v\s*a\s*s\s*c\s*r\s*i\s*p\s*t|v\s*b\s*s\s*c\s*r\s*i\s*p\s*t)\s*:/gi, '');
  cleaned = cleaned.replace(/data\s*:\s*text\/(?:html|javascript|xml)/gi, '');

  return cleaned.trim();
}

export function validateSlug(input: unknown, fieldName = 'slug'): string {
  const raw = typeof input === 'string' ? input.trim().toLowerCase() : '';
  const normalized = raw
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9\u0600-\u06FF-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120);

  if (normalized.length >= 1) {
    return normalized;
  }

  return `${fieldName}-${Date.now().toString(36)}`;
}

export function validateImageSource(input: unknown, fieldName = 'imageUrl'): string {
  if (typeof input !== 'string') {
    throw new ValidationError('يرجى توفير رابط صورة صحيح.', fieldName);
  }
  const trimmed = input.trim();
  if (trimmed.startsWith('data:image/')) {
    if (trimmed.length > 1500000) {
      throw new ValidationError('حجم الصورة المدمجة كبير جداً.', fieldName);
    }
    return trimmed;
  }
  return validateHttpsUrl(trimmed, fieldName);
}

export function validateHttpsUrl(input: unknown, fieldName = 'url'): string {
  if (typeof input !== 'string' || input.trim().length < 4 || input.trim().length > 1024) {
    throw new ValidationError(
      'يرجى إدخال رابط صحيح يبدأ بـ https:// (Please provide a valid HTTPS link).',
      fieldName
    );
  }
  const raw = input.trim();
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const parsed = new URL(withProtocol);
    if (parsed.protocol !== 'https:') {
      throw new ValidationError('يرجى إدخال رابط آمن يبدأ بـ https:// فقط.', fieldName);
    }
    const host = parsed.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host.endsWith('.local') ||
      host.endsWith('.internal') ||
      /^(127\.|10\.|192\.168\.|169\.254\.|0\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(host) ||
      host.startsWith('[')
    ) {
      throw new ValidationError('لا يُسمح بروابط الشبكة المحلية أو الداخلية.', fieldName);
    }
    return parsed.toString();
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    throw new ValidationError('يرجى إدخال رابط ويب صحيح يبدأ بـ https://', fieldName);
  }
}

export function validateLocalizedText(
  input: unknown,
  fieldName: string,
  minLength = 0,
  maxLength = 500
): LocalizedText {
  if (!input || typeof input !== 'object') {
    if (minLength <= 0) {
      return { en: '', ar: '' };
    }
    throw new ValidationError(
      `يرجى إدخال حقل (${fieldName}) بالعربية أو الإنجليزية.`,
      fieldName
    );
  }
  const obj = input as Record<string, unknown>;
  const rawEn = sanitizePlainText(obj.en, maxLength);
  const rawAr = sanitizePlainText(obj.ar, maxLength);

  // Auto-copy from whichever language was provided so the admin only needs to type once
  const en = rawEn || rawAr;
  const ar = rawAr || rawEn;

  if (minLength > 0 && en.length === 0 && ar.length === 0) {
    throw new ValidationError(
      `يرجى تعبئة حقل (${fieldName}) بالعربية أو الإنجليزية.`,
      fieldName
    );
  }

  return { en, ar };
}

export interface ValidatedContactPayload {
  senderName: string;
  senderEmail: string;
  subject: string;
  message: string;
}

export function validateContactInput(body: unknown): ValidatedContactPayload {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('Invalid form submission.');
  }
  const data = body as Record<string, unknown>;
  const senderName = sanitizePlainText(data.senderName || data.name, 100);
  const senderEmail = sanitizePlainText(data.senderEmail || data.email, 160).toLowerCase();
  const subject = sanitizePlainText(data.subject, 160);
  const message = sanitizePlainText(data.message, 3000);

  if (senderName.length < 2) {
    throw new ValidationError('Please enter your name.', 'senderName');
  }
  if (!EMAIL_REGEX.test(senderEmail)) {
    throw new ValidationError('Please enter a valid email address.', 'senderEmail');
  }
  if (subject.length < 2) {
    throw new ValidationError('Please enter a brief subject.', 'subject');
  }
  if (message.length < 10) {
    throw new ValidationError('Please write a message of at least 10 characters.', 'message');
  }

  return { senderName, senderEmail, subject, message };
}

export interface ValidatedProductPayload {
  slug: string;
  title: LocalizedText;
  shortSummary: LocalizedText;
  whyWePickedIt: LocalizedText;
  whatToConsider: LocalizedText;
  description: LocalizedText;
  priceAmount: number | null;
  oldPrice: number | null;
  discount: number | null;
  discountPercent?: number | null;
  stars: number | null;
  soldCount: number | null;
  badge: PromoBadgeType;
  priceCurrency: string;
  priceNote?: LocalizedText;
  priceDisplayPolicy: PriceDisplayPolicy;
  affiliateUrl: string;
  sourceId: string;
  categoryId: string;
  newCategoryName?: LocalizedText;
  newCategoryIcon?: string;
  images: ProductImage[];
  videoUrl?: string;
  videoUrls?: string[];
  videos?: ProductVideo[];
  comparisonDna?: ProductComparisonDna;
  tags: string[];
  isFeatured: boolean;
  status: ProductStatus;
}

export function validateProductInput(body: unknown): ValidatedProductPayload {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('Invalid product data.');
  }
  const data = body as Record<string, unknown>;

  const title = validateLocalizedText(data.title, 'اسم المنتج / Title', 1, 180);
  const rawSourceForSlug = sanitizePlainText(data.sourceId, 64) || 'amazon';
  const rawCustomSlug = typeof data.slug === 'string' ? data.slug.trim() : '';
  const slug = rawCustomSlug
    ? generateSlug(rawCustomSlug, rawSourceForSlug)
    : generateSlug(title.en || title.ar, rawSourceForSlug);
  const rawSummary = validateLocalizedText(data.shortSummary, 'الملخص القصير', 0, 320);
  const shortSummary = {
    en: rawSummary.en || title.en,
    ar: rawSummary.ar || title.ar,
  };
  const whyWePickedIt = validateLocalizedText(data.whyWePickedIt, 'لماذا اخترناه', 0, 1200);
  const whatToConsider = validateLocalizedText(data.whatToConsider, 'ما يجب الانتباه له', 0, 1200);
  const rawDescription = validateLocalizedText(data.description, 'الوصف التفصيلي', 0, 5000);
  const description = {
    en: rawDescription.en || shortSummary.en,
    ar: rawDescription.ar || shortSummary.ar,
  };

  const priceDisplayPolicy: PriceDisplayPolicy =
    data.priceDisplayPolicy === 'hide_price_check_store'
      ? 'hide_price_check_store'
      : 'show_with_timestamp';

  if (
    data.priceAmount === null ||
    data.priceAmount === undefined ||
    String(data.priceAmount).trim() === ''
  ) {
    throw new ValidationError(
      'يرجى إدخال سعر المنتج أولاً، لا يمكن حفظ منتج بدون سعر.',
      'priceAmount'
    );
  }

  const num = Number(data.priceAmount);
  if (Number.isNaN(num) || num <= 0 || num > 1000000) {
    throw new ValidationError('يرجى إدخال سعر صالح أكبر من الصفر.', 'priceAmount');
  }
  const priceAmount = Math.round(num * 100) / 100;

  let oldPrice: number | null = null;
  if (data.oldPrice !== null && data.oldPrice !== undefined && data.oldPrice !== '') {
    const num = Number(data.oldPrice);
    if (!Number.isNaN(num) && num > 0 && num <= 1000000) {
      oldPrice = Math.round(num * 100) / 100;
    }
  }

  let discount: number | null = null;
  const rawDiscountInput =
    data.discountPercent !== null &&
    data.discountPercent !== undefined &&
    data.discountPercent !== ''
      ? data.discountPercent
      : data.discount;
  if (rawDiscountInput !== null && rawDiscountInput !== undefined && rawDiscountInput !== '') {
    const num = Number(rawDiscountInput);
    if (!Number.isNaN(num) && num > 0 && num <= 99) {
      discount = Math.round(num);
    }
  } else if (oldPrice && priceAmount && oldPrice > priceAmount) {
    discount = Math.round(((oldPrice - priceAmount) / oldPrice) * 100);
  }

  let stars: number | null = null;
  if (data.stars !== null && data.stars !== undefined && data.stars !== '') {
    const num = Number(data.stars);
    if (!Number.isNaN(num) && num >= 1 && num <= 5) {
      stars = Math.round(num * 10) / 10;
    }
  }

  let soldCount: number | null = null;
  if (data.soldCount !== null && data.soldCount !== undefined && data.soldCount !== '') {
    const num = Number(data.soldCount);
    if (!Number.isNaN(num) && num >= 0 && num <= 10000000) {
      soldCount = Math.round(num);
    }
  }

  const badge: PromoBadgeType =
    data.badge === 'توفير' || data.badge === 'اليوم الأخير' ? data.badge : null;

  const rawCurrency = typeof data.priceCurrency === 'string' ? data.priceCurrency.trim().toUpperCase() : 'USD';
  const priceCurrency = CURRENCY_REGEX.test(rawCurrency) ? rawCurrency : 'USD';

  const affiliateUrl = validateHttpsUrl(data.affiliateUrl, 'affiliateUrl');
  const sourceId = sanitizePlainText(data.sourceId, 128);
  const categoryId = sanitizePlainText(data.categoryId, 128);

  if (!sourceId) {
    throw new ValidationError('Please select a partner store source.', 'sourceId');
  }
  if (!categoryId) {
    throw new ValidationError('Please select a category.', 'categoryId');
  }

  let newCategoryName: LocalizedText | undefined;
  if (data.newCategoryName && typeof data.newCategoryName === 'object') {
    const nc = data.newCategoryName as Record<string, unknown>;
    const ar = sanitizePlainText(nc.ar, 100);
    const en = sanitizePlainText(nc.en, 100);
    if (ar || en) {
      newCategoryName = { ar: ar || en, en: en || ar };
    }
  }
  const newCategoryIcon = sanitizePlainText(data.newCategoryIcon, 16) || undefined;

  const rawImages = Array.isArray(data.images) ? data.images.slice(0, 16) : [];
  const images: ProductImage[] = rawImages
    .map((img): ProductImage | null => {
      if (!img || typeof img !== 'object') return null;
      const item = img as Record<string, unknown>;
      const url = validateImageSource(item.url, 'imageUrl');
      const altObj = (item.alt as Record<string, unknown>) || {};
      return {
        url,
        publicId: sanitizePlainText(item.publicId, 180) || undefined,
        alt: {
          en: sanitizePlainText(altObj.en, 180) || title.en,
          ar: sanitizePlainText(altObj.ar, 180) || title.ar,
        },
        width: Number(item.width) > 0 ? Number(item.width) : 800,
        height: Number(item.height) > 0 ? Number(item.height) : 600,
      };
    })
    .filter((item): item is ProductImage => item !== null);

  const rawTags = Array.isArray(data.tags) ? data.tags.slice(0, 10) : [];
  const tags = rawTags
    .map((tag) => sanitizePlainText(tag, 40))
    .filter(Boolean);

  const status: ProductStatus =
    data.status === 'published' || data.status === 'archived' ? data.status : 'draft';

  let priceNote: LocalizedText | undefined;
  if (data.priceNote && typeof data.priceNote === 'object') {
    const noteObj = data.priceNote as Record<string, unknown>;
    const noteEn = sanitizePlainText(noteObj.en, 200);
    const noteAr = sanitizePlainText(noteObj.ar, 200);
    if (noteEn || noteAr) {
      priceNote = { en: noteEn, ar: noteAr };
    }
  }

  const rawVideosInput = Array.isArray(data.videos) ? data.videos.slice(0, 12) : [];
  const videos: ProductVideo[] = [];
  const seenVideoUrls = new Set<string>();

  for (const v of rawVideosInput) {
    if (!v) continue;
    if (typeof v === 'string' && v.trim()) {
      try {
        const cleanUrl = validateHttpsUrl(v.trim(), 'videoUrl');
        if (!seenVideoUrls.has(cleanUrl)) {
          seenVideoUrls.add(cleanUrl);
          videos.push({ url: cleanUrl, title: { ar: title.ar, en: title.en } });
        }
      } catch {
        // Ignore invalid video URL
      }
    } else if (typeof v === 'object') {
      const vObj = v as Record<string, unknown>;
      if (typeof vObj.url === 'string' && vObj.url.trim()) {
        try {
          const cleanUrl = validateHttpsUrl(vObj.url.trim(), 'videoUrl');
          if (!seenVideoUrls.has(cleanUrl)) {
            seenVideoUrls.add(cleanUrl);
            const tObj =
              typeof vObj.title === 'object' && vObj.title !== null
                ? (vObj.title as Record<string, unknown>)
                : {};
            const rawThumb =
              (typeof vObj.thumbnailUrl === 'string' && vObj.thumbnailUrl.trim()) ||
              (typeof vObj.thumbnailImageUrl === 'string' && vObj.thumbnailImageUrl.trim()) ||
              '';
            let validThumb: string | undefined;
            if (rawThumb) {
              try {
                validThumb = validateHttpsUrl(rawThumb, 'thumbnailUrl');
              } catch {
                validThumb = undefined;
              }
            }
            videos.push({
              url: cleanUrl,
              title: {
                ar:
                  (typeof vObj.title === 'string'
                    ? sanitizePlainText(vObj.title, 160)
                    : sanitizePlainText(tObj.ar, 160)) || title.ar,
                en:
                  (typeof vObj.title === 'string'
                    ? sanitizePlainText(vObj.title, 160)
                    : sanitizePlainText(tObj.en, 160)) || title.en,
              },
              ...(validThumb ? { thumbnailUrl: validThumb } : {}),
            });
          }
        } catch {
          // Ignore invalid video URL
        }
      }
    }
  }

  if (Array.isArray(data.videoUrls)) {
    for (const rawVu of data.videoUrls.slice(0, 12)) {
      if (typeof rawVu === 'string' && rawVu.trim()) {
        try {
          const cleanUrl = validateHttpsUrl(rawVu.trim(), 'videoUrl');
          if (!seenVideoUrls.has(cleanUrl)) {
            seenVideoUrls.add(cleanUrl);
            videos.push({ url: cleanUrl, title: { ar: title.ar, en: title.en } });
          }
        } catch {
          // Ignore invalid URL
        }
      }
    }
  }

  let videoUrl: string | undefined;
  if (typeof data.videoUrl === 'string' && data.videoUrl.trim().length > 0) {
    try {
      videoUrl = validateHttpsUrl(data.videoUrl.trim(), 'videoUrl');
      if (!seenVideoUrls.has(videoUrl)) {
        seenVideoUrls.add(videoUrl);
        videos.unshift({ url: videoUrl, title: { ar: title.ar, en: title.en } });
      }
    } catch {
      // Ignore invalid URL
    }
  }
  if (!videoUrl && videos.length > 0) {
    videoUrl = videos[0].url;
  }
  const videoUrls = videos.map((v) => v.url);

  let comparisonDna: ProductComparisonDna | undefined;
  if (data.comparisonDna && typeof data.comparisonDna === 'object') {
    const rawDna = data.comparisonDna as Record<string, unknown>;
    const bestFor = validateLocalizedText(rawDna.bestFor, 'bestFor', 0, 180);
    const rawSpecs = (rawDna.keySpecs && typeof rawDna.keySpecs === 'object'
      ? rawDna.keySpecs
      : {}) as Record<string, unknown>;
    const specsAr = Array.isArray(rawSpecs.ar)
      ? rawSpecs.ar.slice(0, 5).map((s) => sanitizePlainText(s, 90)).filter(Boolean)
      : [];
    const specsEn = Array.isArray(rawSpecs.en)
      ? rawSpecs.en.slice(0, 5).map((s) => sanitizePlainText(s, 90)).filter(Boolean)
      : [];
    const clampScore = (val: unknown): number | undefined => {
      if (val === null || val === undefined || val === '') return undefined;
      const n = Number(val);
      if (Number.isNaN(n)) return undefined;
      return Math.max(50, Math.min(99, Math.round(n)));
    };
    const performanceScore = clampScore(rawDna.performanceScore);
    const valueScore = clampScore(rawDna.valueScore);
    const reliabilityScore = clampScore(rawDna.reliabilityScore);

    if (
      bestFor.ar ||
      bestFor.en ||
      specsAr.length > 0 ||
      specsEn.length > 0 ||
      performanceScore !== undefined ||
      valueScore !== undefined ||
      reliabilityScore !== undefined
    ) {
      comparisonDna = {
        ...(bestFor.ar || bestFor.en ? { bestFor } : {}),
        ...(specsAr.length > 0 || specsEn.length > 0
          ? {
              keySpecs: {
                ar: specsAr.length > 0 ? specsAr : specsEn,
                en: specsEn.length > 0 ? specsEn : specsAr,
              },
            }
          : {}),
        ...(performanceScore !== undefined ? { performanceScore } : {}),
        ...(valueScore !== undefined ? { valueScore } : {}),
        ...(reliabilityScore !== undefined ? { reliabilityScore } : {}),
      };
    }
  }

  return {
    slug,
    title,
    shortSummary,
    whyWePickedIt,
    whatToConsider,
    description,
    priceAmount,
    oldPrice,
    discount,
    discountPercent: discount,
    stars,
    soldCount,
    badge,
    priceCurrency,
    priceNote,
    priceDisplayPolicy,
    affiliateUrl,
    sourceId,
    categoryId,
    newCategoryName,
    newCategoryIcon,
    images,
    ...(videoUrl ? { videoUrl } : {}),
    ...(videoUrls.length > 0 ? { videoUrls } : {}),
    ...(videos.length > 0 ? { videos } : {}),
    ...(comparisonDna ? { comparisonDna } : {}),
    tags,
    isFeatured: Boolean(data.isFeatured),
    status,
  };
}

const ALLOWED_IMAGE_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
]);
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB max

export function validateUploadMetadata(body: unknown): {
  mimeType: string;
  fileSizeBytes: number;
  folder: string;
} {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('Invalid upload request.');
  }
  const data = body as Record<string, unknown>;
  const mimeType = typeof data.mimeType === 'string' ? data.mimeType.trim().toLowerCase() : '';
  const fileSizeBytes = Number(data.fileSizeBytes);

  if (!ALLOWED_IMAGE_MIMES.has(mimeType)) {
    throw new ValidationError(
      'Only JPEG, PNG, WebP, and AVIF images are permitted.',
      'mimeType'
    );
  }

  if (Number.isNaN(fileSizeBytes) || fileSizeBytes <= 0 || fileSizeBytes > MAX_UPLOAD_BYTES) {
    throw new ValidationError('Image file size must not exceed 5 MB.', 'fileSizeBytes');
  }

  return {
    mimeType,
    fileSizeBytes,
    folder: 'soufshop/products',
  };
}
