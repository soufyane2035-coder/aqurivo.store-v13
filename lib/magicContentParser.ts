/**
 * Smart Multi-Agent Prompt Builder, Media Classifier, Handoff Protocol & Parser for AQURIVO Admin.
 * Supports:
 * 1. Product & Algorithmic DNA Agent (web research from real product URL + visual inspection of image/video URLs + comparison DNA).
 * 2. Dedicated Product Article & Review Agent (connected via AgentHandoffBrief, smart media embedding, category store cross-linking, zero fake "Top Pick", anti-AI-slop rules).
 */

export interface ParsedProductDraft {
  slug?: string;
  titleEn?: string;
  titleAr?: string;
  summaryEn?: string;
  summaryAr?: string;
  whyEn?: string;
  whyAr?: string;
  considerEn?: string;
  considerAr?: string;
  descEn?: string;
  descAr?: string;
  priceAmount?: string;
  oldPrice?: string;
  discount?: string;
  stars?: string;
  soldCount?: string;
  badge?: string;
  priceCurrency?: string;
  categoryId?: string;
  categoryNameAr?: string;
  categoryNameEn?: string;
  categoryIcon?: string;
  sourceId?: string;
  isFeatured?: boolean;
  sourceProductUrl?: string;
  affiliateUrl?: string;
  videoUrl?: string;
  videoUrls?: string[];
  images?: string[];
  tags?: string;
  altTextsAr?: string[];
  altTextsEn?: string[];
  videoTitlesAr?: string[];
  videoTitlesEn?: string[];
  bestForAr?: string;
  bestForEn?: string;
  keySpecsAr?: string[];
  keySpecsEn?: string[];
  performanceScore?: number;
  valueScore?: number;
  reliabilityScore?: number;
  handoffSummary?: string;
}

export interface AgentHandoffBrief {
  productSlug: string;
  titleAr: string;
  titleEn: string;
  categorySlug: string;
  categoryNameAr?: string;
  categoryNameEn?: string;
  sourceId?: string;
  priceUsd?: string;
  oldPriceUsd?: string;
  discount?: string;
  stars?: string;
  sourceProductUrl?: string;
  storePathAr: string;
  storePathEn: string;
  images: Array<{
    url: string;
    altAr: string;
    altEn: string;
  }>;
  videoUrls: string[];
  summaryAr?: string;
  summaryEn?: string;
  descriptionAr?: string;
  descriptionEn?: string;
  bestForAr?: string;
  bestForEn?: string;
  keySpecsAr?: string[];
  keySpecsEn?: string[];
  performanceScore?: number;
  valueScore?: number;
  reliabilityScore?: number;
  whyAr?: string;
  whyEn?: string;
  considerAr?: string;
  considerEn?: string;
  tags?: string;
  handoffNotes?: string;
  updatedAt: string;
}

const HANDOFF_STORAGE_KEY = 'aqurivo_agent_handoff_v1';

/**
 * Cleans and normalizes a media URL (image or video), unescaping JSON/HTML slashes,
 * stripping trailing Markdown/punctuation characters, and repairing truncated Amazon image modifiers.
 */
export function sanitizeMediaUrl(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  let cleaned = rawUrl
    .trim()
    .replace(/\\u002F/gi, '/')
    .replace(/\\u0026/gi, '&')
    .replace(/\\\//g, '/')
    .replace(/&amp;/gi, '&')
    // Strip leading/trailing quotes, brackets, parentheses, or markdown punctuation
    .replace(/^['"`(\[<]+/, '')
    .replace(/[)'"`\]>.,;،]+$/, '')
    .trim();

  if (!cleaned) return '';

  if (cleaned.startsWith('data:image/') || cleaned.startsWith('data:video/')) {
    return cleaned;
  }

  if (cleaned.startsWith('//')) {
    cleaned = `https:${cleaned}`;
  } else if (!/^https?:\/\//i.test(cleaned)) {
    if (cleaned.includes('.') && !cleaned.includes(' ')) {
      cleaned = `https://${cleaned}`;
    } else {
      return '';
    }
  }

  // Reject broken orphan fragments created when an Amazon modifier like ._AC_UF1000,1000_QL80_.jpg was split at a comma
  try {
    const parsed = new URL(cleaned);
    const host = parsed.hostname.toLowerCase();
    // Valid hostnames must contain a dot and not be an image filename ending in .jpg/.png/.webp
    if (
      !host.includes('.') ||
      /\.(jpg|jpeg|png|webp|gif|avif|mp4|m3u8)$/i.test(host) ||
      /^[0-9]+_[a-z0-9_]+\./i.test(host)
    ) {
      return '';
    }
  } catch {
    return '';
  }

  // Repair Amazon image URLs that were truncated at a comma inside a modifier (e.g. .../I/71xyz._AC_UF1000 or .../I/71xyz._SR38)
  if (
    /(?:media-amazon\.com|ssl-images-amazon\.com)\/images\/I\/[A-Za-z0-9+-]+\._[^/?#]+$/i.test(
      cleaned
    ) &&
    !/\.(jpg|jpeg|png|webp|gif)$/i.test(cleaned.split(/[?#]/)[0] || '')
  ) {
    cleaned = cleaned.replace(
      /(\/images\/I\/[A-Za-z0-9+-]+)\._[^/?#]+$/i,
      '$1._AC_SL1500_.jpg'
    );
  }

  // Upgrade tiny Amazon thumbnail URLs (e.g. ._SR38,50_.jpg, ._SS40_.jpg, ._SX38_SY50_...) to high-res ._AC_SL1500_.jpg
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

/**
 * Normalizes an image URL to its base asset fingerprint (e.g. stripping Amazon's ._AC_SL1500_ modifiers)
 * so we can detect when two URLs are identical shots at different resolutions.
 */
export function getCanonicalImageFingerprint(rawUrl: string): string {
  const trimmed = sanitizeMediaUrl(rawUrl) || rawUrl.trim();
  if (!trimmed) return '';
  try {
    const withoutQuery = trimmed.split(/[?#]/)[0] || trimmed;
    // Normalize Amazon media image modifiers like /I/61J2sQtBYDL._AC_SL1500_.jpg -> /I/61J2sQtBYDL.jpg
    return withoutQuery.replace(/(\/images\/I\/[A-Za-z0-9+-]+)\._[^/]+_(\.[a-zA-Z0-9]+)$/i, '$1$2');
  } catch {
    return trimmed;
  }
}

/**
 * Detects whether a given URL points to a video (YouTube, Shorts, youtu.be, TikTok, Vimeo, Dailymotion, Amazon VSE, or direct video/HLS file)
 * vs an image URL.
 */
export function isVideoMediaUrl(rawUrl: string): boolean {
  const trimmed = (sanitizeMediaUrl(rawUrl) || rawUrl).trim().toLowerCase();
  if (!trimmed) return false;
  if (trimmed.startsWith('data:image/')) return false;
  if (trimmed.startsWith('data:video/')) return true;

  if (
    /(?:youtube\.com\/(?:watch|shorts|embed)|youtu\.be\/|tiktok\.com\/.*\/video\/|vimeo\.com\/|dailymotion\.com\/video)/i.test(
      trimmed
    )
  ) {
    return true;
  }

  // Amazon VSE video transcoding artifacts (MP4 or HLS m3u8)
  if (/vse-vms-transcoding-artifact|\/images\/s\/vse-vms-/i.test(trimmed)) {
    return true;
  }

  // Check file extension before query string
  const withoutQuery = trimmed.split(/[?#]/)[0] || '';
  if (/\.(mp4|webm|mov|m4v|ogv|m3u8)$/i.test(withoutQuery)) {
    return true;
  }

  return false;
}

/**
 * Extracts all URLs from a raw text block (newline, pipe, or comma separated)
 * without ever splitting on commas inside URLs (such as Amazon's ._AC_UF1000,1000_QL80_.jpg),
 * and classifies them automatically into image URLs and video URLs.
 */
export function classifyMediaUrlsFromText(rawInput: string): {
  imageUrls: string[];
  videoUrls: string[];
} {
  if (!rawInput || !rawInput.trim()) {
    return { imageUrls: [], videoUrls: [] };
  }

  // Normalize escaped slashes first so regex matching sees clean URLs
  const normalizedText = rawInput
    .replace(/\\u002F/gi, '/')
    .replace(/\\\//g, '/')
    .replace(/&amp;/gi, '&')
    // Only split on a comma if it is immediately followed by another URL or protocol
    .replace(/[,،]\s*(?=(?:https?:\/\/|data:(?:image|video)\/))/gi, '\n');

  const rawCandidates: string[] = [];

  // 1. Extract all explicit http/https and data: URLs directly
  const urlGlobalRegex = /(?:https?:\/\/|data:(?:image|video)\/)[^\s"'<>|\n\r)\]]+/gi;
  const directMatches = normalizedText.match(urlGlobalRegex);
  if (directMatches && directMatches.length > 0) {
    rawCandidates.push(...directMatches);
  } else {
    // Fallback for bare domain inputs separated by newlines or pipes
    const tokens = normalizedText
      .split(/[\n\r|]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    rawCandidates.push(...tokens);
  }

  const imageUrls: string[] = [];
  const videoUrls: string[] = [];
  const seenImageFingerprints = new Set<string>();

  for (const rawCandidate of rawCandidates) {
    const candidate = sanitizeMediaUrl(rawCandidate);
    if (!candidate) continue;

    if (isVideoMediaUrl(candidate)) {
      if (!videoUrls.includes(candidate)) {
        videoUrls.push(candidate);
      }
    } else {
      const fp = getCanonicalImageFingerprint(candidate) || candidate;
      if (!seenImageFingerprints.has(fp) && !imageUrls.includes(candidate)) {
        seenImageFingerprints.add(fp);
        imageUrls.push(candidate);
      }
    }
  }

  return { imageUrls, videoUrls };
}

/**
 * Saves the latest Product Agent handoff brief in browser storage so the Article Agent can use it immediately.
 */
export function saveAgentHandoffBrief(brief: AgentHandoffBrief): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(HANDOFF_STORAGE_KEY, JSON.stringify(brief));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Reads the saved Product Agent handoff brief from browser storage.
 */
export function getSavedAgentHandoffBrief(): AgentHandoffBrief | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(HANDOFF_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AgentHandoffBrief;
    if (!parsed || typeof parsed !== 'object' || !parsed.productSlug) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearSavedAgentHandoffBrief(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(HANDOFF_STORAGE_KEY);
  } catch {
    // Ignore
  }
}

/**
 * Validates that the admin's Affiliate URL is present and is NOT accidentally a plain non-affiliate product URL.
 */
export function validateAdminAffiliateUrlGuard(
  rawAffiliateUrl: string,
  rawSourceProductUrl?: string
): {
  isInvalid: boolean;
  reasonAr: string;
  reasonEn: string;
} {
  const aff = (rawAffiliateUrl || '').trim();
  const src = (rawSourceProductUrl || '').trim();

  if (!aff) {
    return {
      isInvalid: true,
      reasonAr:
        '⚠️ تنبيه هام لحماية أرباحك: نسيت وضع «رابط العمولة الخارجي (Affiliate URL)»! يرجى إدخال رابط العمولة الخاص بك قبل حفظ المنتج.',
      reasonEn:
        '⚠️ Affiliate Guard: You forgot to enter your Partner Affiliate URL! Please paste your affiliate link before saving.',
    };
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(/^https?:\/\//i.test(aff) ? aff : `https://${aff}`);
  } catch {
    return {
      isInvalid: true,
      reasonAr: '⚠️ يرجى إدخال رابط عمولة صحيح يبدأ بـ https://',
      reasonEn: '⚠️ Please enter a valid HTTPS affiliate URL.',
    };
  }

  const host = parsedUrl.hostname.toLowerCase();
  const fullLower = parsedUrl.toString().toLowerCase();

  // Known affiliate shortlinks are always valid affiliate links
  const isKnownShortlink =
    /(?:^|\.)(?:amzn\.to|a\.co|s\.click\.aliexpress\.com|ae01\.alicdn\.com|temu\.to|bit\.ly|tinyurl\.com|geni\.us|hop\.clickbank\.net)$/i.test(
      host
    );

  // Known affiliate query parameters across Amazon, AliExpress, Temu, Noon, etc.
  const hasAffiliateParams =
    /[?&](?:tag|linkcode|ascsubtag|aff_fcid|aff_fsk|aff_platform|sk| terminal_id|_p_rfs|utm_medium=affiliate|clickid|irclickid|hop)=/i.test(
      fullLower
    );

  // Check if it is a full Amazon domain URL without any affiliate tag
  const isFullAmazonDomain = /(?:^|\.)amazon\.(?:com|sa|ae|eg|co\.uk|de|fr|es|it|ca|co\.jp|in|com\.au|com\.br|com\.mx|nl|pl|se|sg|com\.tr)$/i.test(
    host
  );

  if (isFullAmazonDomain && !hasAffiliateParams) {
    return {
      isInvalid: true,
      reasonAr:
        '⛔ تنبيه لحماية عمولاتك: الرابط الموضوع في خانة العمولة هو رابط Amazon عادي ولا يحتوي على كود عمولة (tag= أو رابط مختصر amzn.to)! يرجى استبداله برابط العمولة الخاص بك قبل الحفظ.',
      reasonEn:
        '⛔ Affiliate Guard: The URL in the Affiliate field is a plain Amazon product link without an affiliate tag (tag= or amzn.to)! Please replace it with your affiliate link before saving.',
    };
  }

  // Check if the user or system pasted the exact same plain inspection URL without affiliate params or shortlink
  if (src && !isKnownShortlink && !hasAffiliateParams) {
    const cleanAffNoRef = aff.split('#')[0].replace(/\/+$/, '').toLowerCase();
    const cleanSrcNoRef = src.split('#')[0].replace(/\/+$/, '').toLowerCase();
    if (cleanAffNoRef === cleanSrcNoRef) {
      return {
        isInvalid: true,
        reasonAr:
          '⛔ تنبيه لحماية عمولاتك: الرابط الموضوع في خانة العمولة مطابق تماماً لرابط فحص المنتج العادي! يرجى وضع رابط العمولة الخاص بك بدلاً من رابط المنتج العادي.',
        reasonEn:
          '⛔ Affiliate Guard: The Affiliate URL is identical to the plain product inspection URL! Please enter your actual affiliate link.',
      };
    }
  }

  return { isInvalid: false, reasonAr: '', reasonEn: '' };
}

/**
 * Extracts a clean YouTube video ID from standard watch URLs, Shorts URLs, youtu.be, or embed URLs.
 */
export function extractYouTubeVideoId(rawUrl: string): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  const shortsMatch = trimmed.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{6,20})/i);
  if (shortsMatch?.[1]) return shortsMatch[1];
  const watchMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{6,20})/i);
  if (watchMatch?.[1] && /youtube\.com/i.test(trimmed)) return watchMatch[1];
  const shortDomainMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{6,20})/i);
  if (shortDomainMatch?.[1]) return shortDomainMatch[1];
  const embedMatch = trimmed.match(/youtube(?:-nocookie)?\.com\/embed\/([a-zA-Z0-9_-]{6,20})/i);
  if (embedMatch?.[1]) return embedMatch[1];
  return null;
}

/**
 * Formats an AgentHandoffBrief into a human- and AI-readable block for the Article Agent,
 * automatically passing all verified product data, algorithmic DNA, deduplicated image roles, and embed codes.
 */
export function formatAgentHandoffBriefText(brief: AgentHandoffBrief): string {
  const seenFingerprints = new Map<string, number>();

  const imageLines =
    brief.images.length > 0
      ? brief.images
          .map((img, i) => {
            const fp = getCanonicalImageFingerprint(img.url);
            const firstSeenIdx = fp ? seenFingerprints.get(fp) : undefined;
            if (fp && firstSeenIdx === undefined) {
              seenFingerprints.set(fp, i + 1);
            }

            let roleNote = '';
            if (i === 0) {
              roleNote =
                brief.images.length > 1
                  ? ' [مخصصة لحقل (صورة الغلاف) — لا تكررها داخل فقرات المقال واستخدم الصور الفريدة التالية داخل الفقرات]'
                  : ' [صورة الغلاف الرئيسية للمقال]';
            } else if (firstSeenIdx !== undefined) {
              roleNote = ` [تنبيه: هذه الصورة نسخة بدقة أخرى للصورة #${firstSeenIdx} — تجنب تكرار نفس اللقطة مرتين داخل المقال]`;
            } else {
              roleNote =
                ' [صورة فريدة مخصصة للتضمين الذكي داخل فقرات المقال بوسم <figure>]';
            }

            const figureSnippetAr =
              i > 0 && firstSeenIdx === undefined
                ? `\n    كود التضمين الجاهز (AR): <figure><img src="${img.url}" alt="${img.altAr}" loading="lazy" /><figcaption>${img.altAr}</figcaption></figure>\n    Ready Embed (EN): <figure><img src="${img.url}" alt="${img.altEn}" loading="lazy" /><figcaption>${img.altEn}</figcaption></figure>`
                : '';

            return `  - صورة #${i + 1}${roleNote}: ${img.url}\n    وصف محتواها الفعلي (AR): ${img.altAr}\n    Visual Alt (EN): ${img.altEn}${figureSnippetAr}`;
          })
          .join('\n')
      : '  - لم يتم إرفاق روابط صور بعد';

  const videoLines =
    brief.videoUrls.length > 0
      ? brief.videoUrls
          .map((v, i) => {
            const ytId = extractYouTubeVideoId(v);
            const embedHint = ytId
              ? `\n    كود التضمين المباشر في المقال: <figure><iframe src="https://www.youtube.com/embed/${ytId}" title="${brief.titleAr}" loading="lazy" allowfullscreen></iframe><figcaption>فيديو استعراضي يوضح تصميم وأداء المنتج على أرض الواقع</figcaption></figure>`
              : '';
            return `  - فيديو #${i + 1} (اعرضه كمشغل فيديو مدمج داخل المقال ولا تعامله كرابط عمولة): ${v}${embedHint}`;
          })
          .join('\n')
      : '  - لا يوجد فيديو مرفق';

  const specsAr =
    brief.keySpecsAr && brief.keySpecsAr.length > 0
      ? brief.keySpecsAr.join(' | ')
      : '';
  const specsEn =
    brief.keySpecsEn && brief.keySpecsEn.length > 0
      ? brief.keySpecsEn.join(' | ')
      : '';

  const dnaScoresLine =
    brief.performanceScore !== undefined ||
    brief.valueScore !== undefined ||
    brief.reliabilityScore !== undefined
      ? `- مؤشرات البصمة الخوارزمية (Algorithmic DNA Scores): الأداء: ${brief.performanceScore ?? '-'} / 100 | القيمة مقابل السعر: ${brief.valueScore ?? '-'} / 100 | الاعتمادية: ${brief.reliabilityScore ?? '-'} / 100`
      : '';

  return [
    `📦 [بطاقة التسليم الذكية من وكيل المنتج إلى وكيل المقالات — مرجع حقائق داخلي للوكيل فقط: يُمنع ذكر عبارة "بطاقة التسليم" أو "البيانات المرفقة" أمام القارئ]`,
    `- اسم المنتج المعتمد (AR): ${brief.titleAr}`,
    `- اسم المنتج المعتمد (EN): ${brief.titleEn}`,
    `- معرف المنتج في المتجر (Slug): ${brief.productSlug}`,
    `- صفحة المنتج الداخلية بالعربية: ${brief.storePathAr}`,
    `- صفحة المنتج الداخلية بالإنجليزية: ${brief.storePathEn}`,
    ...(brief.sourceId ? [`- المتجر الشريك: ${brief.sourceId}`] : []),
    ...(brief.sourceProductUrl
      ? [`- رابط الشراء الرسمي (Affiliate URL): ${brief.sourceProductUrl}`]
      : []),
    `- الفئة: ${brief.categorySlug}${brief.categoryNameAr ? ` (${brief.categoryNameAr} | ${brief.categoryNameEn || ''})` : ''}`,
    ...(brief.priceUsd
      ? [
          `- السعر المرجعي الموثق: $${brief.priceUsd} USD${brief.oldPriceUsd ? ` (السعر السابق: $${brief.oldPriceUsd})` : ''}${brief.discount ? ` — خصم ${brief.discount}%` : ''}`,
        ]
      : []),
    ...(brief.stars ? [`- تقييم المشترين: ★ ${brief.stars} / 5`] : []),
    ...(brief.summaryAr ? [`- الملخص المختصر (AR): ${brief.summaryAr}`] : []),
    ...(brief.summaryEn ? [`- Short Summary (EN): ${brief.summaryEn}`] : []),
    ...(brief.descriptionAr ? [`- المراجعة التفصيلية الموثقة (AR): ${brief.descriptionAr}`] : []),
    ...(brief.descriptionEn ? [`- Detailed Review Breakdown (EN): ${brief.descriptionEn}`] : []),
    ...(brief.bestForAr ? [`- الاستخدام الأنسب (AR): ${brief.bestForAr}`] : []),
    ...(brief.bestForEn ? [`- Best For (EN): ${brief.bestForEn}`] : []),
    ...(specsAr ? [`- المواصفات الثلاث للمقارنة (AR): ${specsAr}`] : []),
    ...(specsEn ? [`- 3 Key Comparison Specs (EN): ${specsEn}`] : []),
    ...(dnaScoresLine ? [dnaScoresLine] : []),
    ...(brief.whyAr ? [`- لماذا اخترناه / نقاط التفوق (AR): ${brief.whyAr}`] : []),
    ...(brief.whyEn ? [`- Why We Picked It (EN): ${brief.whyEn}`] : []),
    ...(brief.considerAr ? [`- نقاط الانتباه والقيود التشغيلية قبل الشراء (AR): ${brief.considerAr}`] : []),
    ...(brief.considerEn ? [`- What to Consider Before Buying (EN): ${brief.considerEn}`] : []),
    ...(brief.tags ? [`- الكلمات المفتاحية والوسوم (Tags): ${brief.tags}`] : []),
    ...(brief.handoffNotes
      ? [`- توجيهات وكيل المنتج لوكيل المقالات ( زاوية المقال وتوظيف الوسائط ): ${brief.handoffNotes}`]
      : []),
    `- معرض صور المنتج الموثق (${brief.images.length} صور — الصورة #1 للغلاف، والصور الفريدة التالية للتضمين داخل أقسام المقال):`,
    imageLines,
    `- الفيديوهات التوضيحية للمنتج (${brief.videoUrls.length}):`,
    videoLines,
  ].join('\n');
}

export const MAGIC_AI_PROMPT_TEMPLATE = `أنت «وكيل استقصاء المنتج وبناء البصمة الخوارزمية والتحرير التجاري الموثوق» (Product Intelligence & Algorithmic DNA Agent) لمنصة AQURIVO (https://aqurivo.store | https://aqurivo.com).

مهمتك ليست المدح الإعلاني، بل مساعدة المشتري على معرفة ما إذا كان المنتج يستحق سعره، وما الفائدة العملية التي سيحصل عليها فعلياً، وما القيود التي يجب أن يعرفها قبل الطلب — وذلك لأي منتج في أي فئة (إلكترونيات، منزل ومطبخ، صحة وعناية، رياضة، موضة، أدوات، وغيرها).

التزم بالقواعد المنهجية التالية بدقة:

1. ابحث أولاً وتحقق من الطراز الدقيق (Web Grounding & Zero Fabrication):
   - افتح رابط المنتج المرفق وابحث في الويب (صفحة الشركة المصنّعة، صفحة المتجر الفعلية، والاختبارات المستقلة الموثوقة) لاستخراج مواصفات النسخة المعروضة تحديداً (الطراز، الجيل/الإصدار، السعة أو القدرة أو الخامة أو الأبعاد حسب فئة المنتج).
   - لا تخلط مواصفات جيل أقدم أو أحدث بالنسخة الحالية، ولا تدّعِ تجربة شخصية لم تحدث.
   - يُمنع تخمين أو اختلاق: السعر الحالي، السعر القديم، نسبة الخصم، التقييمات، عدد المبيعات، أو المواصفات الفنية.
   - قاعدة الحقول الرقمية الاختيارية: إذا لم يظهر في صفحة المتجر دليل واضح على وجود [السعر القديم] أو [الخصم] أو [المبيعات]، اترك الحقل فارغاً تماماً بعد النقطتين دون كتابة نص مثل "غير متاح" حفاظاً على سلامة الحقول الرقمية في النظام.

2. حلّل منفعة المواصفات واذكر شروط التشغيل بوضوح (Benefit-Driven Analysis):
   - لا تكتفِ بسرد أسماء المواصفات أو الخامات؛ اشرح أثرها الواقعي في حياة المشتري (كيف تنعكس القدرة أو السعة أو الخامة أو التصميم على الاستخدام اليومي، المتانة، الراحة، أو التوفير).
   - إذا كانت أي ميزة مشروطة بمتطلب إضافي (مثل: جهاز توافق معين، موزع ذكي، اشتراك مدفوع، محول يُباع منفصلاً، جهد كهربائي محدد، أو طريقة عناية خاصة)، اذكر هذا الشرط بوضوح.
   - في خانة [نقاط الانتباه]، اذكر 1 إلى 2 من القيود العملية الصادقة التي يهم المشتري معرفتها قبل الدفع.

3. اكتب بصوت محرر بشري خبير وببنية ثلاثية واضحة (Editorial Voice & 3-Paragraph Structure):
   - يُحظر استخدام مقدمات أو عبارات الذكاء الاصطناعي المستهلكة مثل: («في عالمنا المتسارع»، «لا شك أن»، «ثورة أو نقلة نوعية»، «إذا كنت تبحث عن...»، «في الختام»). ابدأ مباشرة بالمعلومة المفيدة.
   - اكتب [الوصف التفصيلي بالعربية] و[الوصف التفصيلي بالإنجليزية] بطول 120 إلى 170 كلمة لكل لغة بأسلوب طبيعي أصيل (تجنب الترجمة الحرفية)، وموزعاً على 3 فقرات مترابطة:
     • الفقرة الأولى: ما هو المنتج تحديداً، وما ميزته الفعلية الأهم، ومن المستفيد الأكبر منه؟
     • الفقرة الثانية: المواصفات أو الخامات المؤثرة فعلياً في الأداء أو سهولة الاستخدام أو التوافق أو التكلفة، مع توضيح قيودها الواقعية.
     • الفقرة الثالثة: المفاضلة الشرائية الصادقة؛ لمن يناسب هذا المنتج فوراً، ومتى قد يكون بديل آخر أنسب للمشتري؟
   - لا تكرر نفس الصياغة بين العنوان والملخص ونقاط الاختيار؛ يجب أن يضيف كل حقل معلومة جديدة تساعد على حسم القرار.

4. الفحص البصري الحقيقي للصور والفيديوهات (Visual Evidence & Media Pipeline):
   - افتح كل رابط صورة مرفق أدناه في الويب واحداً تلو الآخر، واكتب في [النصوص البديلة للصور بالعربية] و[النصوص البديلة للصور بالإنجليزية] وصفاً بصرياً دقيقاً لما يظهر فعلياً داخل كل صورة (زاوية المنتج، الأبعاد، الخامة، الاستخدام الواقعي، الملحقات...) مفصولاً بعلامة | وبنفس ترتيب وعدد الصور تماماً.
   - إذا وجدت رابطين يعرضان نفس اللقطة بدقتين مختلفتين، اكتب لكل رابط وصفه المطابق بالترتيب حتى لا يختل تطابق الأوصاف مع الروابط، ونبّه على الرابط المكرر داخل [ملخص التسليم لوكيل المقالات] ليتجنب وكيل المقالات تكراره.
   - أعد إدراج جميع روابط الصور المعتمدة في [روابط الصور] وروابط الفيديوهات في [روابط الفيديوهات] ورابط صفحة المنتج في [رابط المنتج الرسمي] ليقوم النظام الذكي بتمريرها تلقائياً إلى معرض المتجر ووكيل كتابة المقالات.

5. احسب البصمة الخوارزمية بإنصاف (Algorithmic Comparison DNA):
   - في [المواصفات الثلاث للمقارنة]، اختر أهم 3 معايير قياسية قصيرة تصلح لمقارنة هذا المنتج بأي منافس في نفس فئته (سواء كانت إلكترونيات، منزل، صحة، رياضة، أو موضة)، وافصل بينها بعلامة |.
   - قيّم المؤشرات الثلاثة ([مؤشر الأداء من 100]، [مؤشر القيمة مقابل السعر من 100]، [مؤشر الاعتمادية من 100]) بإنصاف وموضوعية بناءً على كفاءة المنتج ضمن فئته، عدالة سعره مقارنة بالمنافسين، وجودة تصنيعه وضمانه.

6. بطاقة التسليم الذكية لوكيل المقالات وبوابة التدقيق (Smart Handoff & Self-Audit Gate):
   - في خانة [ملخص التسليم لوكيل المقالات]، اكتب ملخصاً توجيهياً مركزاً ينتقل تلقائياً عبر النظام الذكي إلى وكيل كتابة المقالات، يتضمن: (1) زاوية المراجعة المقترحة والسؤال الأهم في ذهن المشتري، (2) أهم الأرقام والحقائق والقيود التشغيلية، (3) خطة توزيع الصور داخل المقال (تخصيص الصورة #1 للغلاف، وأفضل الصور الفريدة #2 و#3... للتضمين داخل الفقرات، وتنبيه أي صورة مكررة الدقة، وكيفية توظيف الفيديو إن وجد).
   - راجع مخرجاتك قبل التسليم للتأكد من صحة جميع الأرقام وخلو النص من أي حشو أو مبالغة.

أخرج النتيجة كاملة داخل حاوية كود واحدة قابلة للنسخ (\`\`\`text ... \`\`\`) من دون أي مقدمة أو خاتمة خارجها، مع الحفاظ على أسماء الحقول وترتيبها التالي بدقة:

\`\`\`text
[العنوان بالعربية]: اسم المنتج الدقيق وطرازه مع أبرز ميزة عملية بحد أقصى 65 حرفاً
[العنوان بالإنجليزية]: Exact product name, model/gen & core benefit max 65 chars
[الرابط slug]: معرف رابط بالإنجليزية بحروف صغيرة وشرطات يمثل العلامة والطراز
[الفئة]: معرف الفئة بالإنجليزية مثل electronics أو home أو health أو sports أو fashion (أو ابتكر slug جديد لفئة جديدة)
[اسم الفئة بالعربية]: اسم الفئة بالعربية
[اسم الفئة بالإنجليزية]: Category Name in English
[أيقونة الفئة]: رمز واحد يناسب الفئة
[المتجر الشريك]: amazon أو aliexpress أو noon أو temu أو clickbank
[رابط المنتج الرسمي]: ضع هنا رابط صفحة المنتج المرفق ليُحفظ تلقائياً في النظام وبطاقة وكيل المقالات
[السعر]: السعر الحالي بالأرقام فقط مثل 49.99
[السعر القديم]: السعر السابق بالأرقام فقط إن وُجد دليل عليه في الصفحة، أو اتركه فارغاً
[الخصم]: نسبة الخصم بالأرقام فقط إن وُجدت فعلياً، أو اتركه فارغاً
[العملة]: USD
[التقييم]: تقييم المشترين الفعلي من 5 مثل 4.7
[المبيعات]: عدد المبيعات أو المراجعات بالأرقام فقط إن توفر، أو اتركه فارغاً
[شارة العرض]: توفير
[منتج مميز]: نعم
[الملخص بالعربية]: جملة واحدة مباشرة تبرز المنفعة العملية الأساسية للمشتري بحد أقصى 155 حرفاً
[الملخص بالإنجليزية]: Direct 1-sentence real-world value proposition for Meta Description max 155 chars
[لماذا اخترناه بالعربية]: 2 إلى 3 جمل عملية توضح نقاط التفوق الفعلية وكيف تخدم المشتري في الاستخدام الواقعي
[لماذا اخترناه بالإنجليزية]: 2-3 factual sentences explaining real-world advantages and build/design value
[نقاط الانتباه بالعربية]: 1 إلى 2 من القيود الصادقة أو المتطلبات المشروطة التي يجب أن يعرفها المشتري قبل الطلب
[نقاط الانتباه بالإنجليزية]: 1-2 honest limitations, trade-offs, or compatibility requirements before ordering
[الوصف التفصيلي بالعربية]: مراجعة تحريرية احترافية من 120 إلى 170 كلمة في 3 فقرات مترابطة (ما المنتج ولمن يناسب، أثر المواصفات والخامات فعلياً، والمفاضلة الشرائية الصادقة) بدون مقدمات إنشائية
[الوصف التفصيلي بالإنجليزية]: Authoritative 120-170 word editorial review in 3 cohesive paragraphs (core value & audience, real-world impact of specs/materials, and honest buying trade-offs)
[الاستخدام الأنسب بالعربية]: عبارة مركزة من 4 إلى 7 كلمات تحدد السيناريو أو المستخدم الأنسب لهذا المنتج
[الاستخدام الأنسب بالإنجليزية]: Short 4-7 word phrase defining the ideal use case or buyer
[المواصفات الثلاث للمقارنة بالعربية]: المعيار الفاصل 1 | المعيار الفاصل 2 | المعيار الفاصل 3
[المواصفات الثلاث للمقارنة بالإنجليزية]: Key Comparable Spec 1 | Key Comparable Spec 2 | Key Comparable Spec 3
[مؤشر الأداء من 100]: تقييم موضوعي من 100 بناءً على كفاءة المنتج في فئته
[مؤشر القيمة مقابل السعر من 100]: تقييم موضوعي من 100 مقارنة بسعر ومزايا المنافسين
[مؤشر الاعتمادية من 100]: تقييم موضوعي من 100 بناءً على جودة التصنيع والضمان وطول العمر
[الوسوم]: 8 إلى 10 كلمات مفتاحية وبحثية مرتبطة فعلياً بالمنتج وفئته مفصولة بفواصل
[روابط الصور]: أدرج هنا جميع روابط الصور المرفقة مفصولة بفاصلة أو سطر لتنتقل تلقائياً للمتجر ووكيل المقالات
[النصوص البديلة للصور بالعربية]: وصف بصري دقيق للصورة 1 بعد فحصها | وصف بصري دقيق للصورة 2 بعد فحصها | ... (بنفس عدد وترتيب الصور المرفقة)
[النصوص البديلة للصور بالإنجليزية]: Exact visual alt text for Image 1 | Exact visual alt text for Image 2 | ... (matching the exact image count and order)
[روابط الفيديوهات]: أدرج هنا روابط الفيديوهات المرفقة مفصولة بفاصلة (أو اتركها فارغة إن لم يوجد فيديو)
[ملخص التسليم لوكيل المقالات]: توجيه مركز ينتقل تلقائياً لوكيل كتابة المقالات يتضمن: زاوية المقال المقترحة، أهم الحقائق والقيود التشغيلية، وخريطة توظيف الصور داخل الفقرات (مع التنبيه على أي رابط صورة مكرر الدقة) والفيديو.
\`\`\``;

export interface CanopyPromptVerifiedFacts {
  asin?: string;
  title?: string;
  brand?: string;
  priceAmount?: number | null;
  oldPrice?: number | null;
  discountPercent?: number | null;
  currency?: string;
  rating?: number | null;
  ratingsTotal?: number | null;
  featureBullets?: string[];
  technicalSpecifications?: Array<{ name: string; value: string }>;
  categories?: Array<{ name: string; breadcrumbPath: string }>;
  itemWeight?: string;
}

export function buildDynamicProductAiPrompt(
  categories: Array<{
    id: string;
    slug: string;
    name?: { ar?: string; en?: string };
    icon?: string;
  }> = [],
  sources: Array<{
    id: string;
    slug: string;
    name?: { ar?: string; en?: string };
  }> = [],
  options?: {
    sourceProductUrl?: string;
    rawMediaUrlsInput?: string;
    existingImages?: Array<{ url: string }>;
    existingVideoUrls?: string[];
    canopyVerifiedFacts?: CanopyPromptVerifiedFacts | null;
  }
): string {
  const catLines = categories
    .map(
      (c) =>
        `- ${c.slug || c.id}: ${c.icon ? `${c.icon} ` : ''}${c.name?.ar || ''} | ${c.name?.en || ''}`
    )
    .join('\n');

  const sourceLines = sources
    .map((s) => `- ${s.slug || s.id}: ${s.name?.ar || ''} | ${s.name?.en || ''}`)
    .join('\n');

  const classified = classifyMediaUrlsFromText(options?.rawMediaUrlsInput || '');
  const mergedImageUrls = Array.from(
    new Set([
      ...classified.imageUrls,
      ...(options?.existingImages?.map((img) => img.url).filter(Boolean) || []),
    ])
  );
  const mergedVideoUrls = Array.from(
    new Set([
      ...classified.videoUrls,
      ...(options?.existingVideoUrls?.filter(Boolean) || []),
    ])
  );

  const productLinkSection = options?.sourceProductUrl?.trim()
    ? `🔗 الرابط الحقيقي للمنتج (افتحه وابحث عنه في الويب لاستخراج كافة مواصفاته الحقيقية وأعد إدراجه في خانة [رابط المنتج الرسمي]):\n${options.sourceProductUrl.trim()}`
    : `🔗 الرابط الحقيقي للمنتج أو اسمه (ابحث عنه في الويب لاستخراج مواصفاته الحقيقية وأدرجه في خانة [رابط المنتج الرسمي]):\n[ضع هنا رابط المنتج الحقيقي أو اسمه الكامل]`;

  const canopyFactsLines: string[] = [];
  const facts = options?.canopyVerifiedFacts;
  if (facts && (facts.title || facts.asin)) {
    canopyFactsLines.push(
      `📊 الحقائق والمواصفات الرسمية المستخرجة تلقائياً من صفحة المتجر عبر Canopy API (اعتمد هذه الأرقام والمواصفات الموثقة بدقة 100% ولا تختلق غيرها):`
    );
    if (facts.title) canopyFactsLines.push(`- الاسم الرسمي الكامل في المتجر: ${facts.title}`);
    if (facts.brand) canopyFactsLines.push(`- العلامة التجارية (Brand): ${facts.brand}`);
    if (facts.asin) canopyFactsLines.push(`- الرقم المعرف (ASIN): ${facts.asin}`);
    if (facts.priceAmount !== undefined && facts.priceAmount !== null) {
      canopyFactsLines.push(
        `- السعر الفعلي الموثق: ${facts.priceAmount} ${facts.currency || 'USD'}${
          facts.oldPrice ? ` (السعر السابق الرسمي: ${facts.oldPrice} ${facts.currency || 'USD'})` : ''
        }${facts.discountPercent ? ` — نسبة الخصم المحسوبة: ${facts.discountPercent}%` : ''}`
      );
    }
    if (facts.rating !== undefined && facts.rating !== null) {
      canopyFactsLines.push(
        `- تقييم المشترين الفعلي: ${facts.rating} من 5${
          facts.ratingsTotal ? ` (إجمالي التقييمات/المراجعات: ${facts.ratingsTotal})` : ''
        }`
      );
    }
    if (facts.categories && facts.categories.length > 0) {
      canopyFactsLines.push(
        `- تسلسل الفئة في المتجر: ${facts.categories.map((c) => c.breadcrumbPath || c.name).join(' > ')}`
      );
    }
    if (facts.itemWeight) {
      canopyFactsLines.push(`- الوزن الفعلي: ${facts.itemWeight}`);
    }
    if (facts.technicalSpecifications && facts.technicalSpecifications.length > 0) {
      canopyFactsLines.push(
        `- جدول المواصفات الفنية الرسمية (${facts.technicalSpecifications.length} مواصفة):`,
        ...facts.technicalSpecifications.slice(0, 15).map((s) => `  • ${s.name}: ${s.value}`)
      );
    }
    if (facts.featureBullets && facts.featureBullets.length > 0) {
      canopyFactsLines.push(
        `- أبرز الميزات الرسمية من الشركة المصنعة (Feature Bullets):`,
        ...facts.featureBullets.slice(0, 8).map((b) => `  • ${b}`)
      );
    }
  }

  const mediaSectionLines: string[] = [];
  if (mergedImageUrls.length > 0) {
    mediaSectionLines.push(
      `🖼️ روابط الصور الفعلية للمنتج (عددها ${mergedImageUrls.length} صور — افتح كل رابط في الويب بالترتيب، اكتب وصف Alt حقيقي يطابق ما يظهر داخل كل صورة، وأعد إدراج هذه الروابط في خانة [روابط الصور] لتمريرها تلقائياً إلى وكيل المقالات):`,
      ...mergedImageUrls.map((u, idx) => `  ${idx + 1}. ${u}`)
    );
  } else {
    mediaSectionLines.push(
      `🖼️ روابط الصور الفعلية للمنتج (افتح كل رابط صورة ترفقه هنا، اكتب وصف Alt بناءً على محتوى الصورة الفعلي، وأعد إدراج الروابط في خانة [روابط الصور]):`,
      `[ضع هنا روابط الصور إن وجدت]`
    );
  }

  if (mergedVideoUrls.length > 0) {
    mediaSectionLines.push(
      `🎬 روابط الفيديوهات المرفقة للمنتج (${mergedVideoUrls.length} فيديو — أدرجها في خانة [روابط الفيديوهات] لتعمل في معرض المنتج وتنتقل تلقائياً إلى وكيل المقالات):`,
      ...mergedVideoUrls.map((u, idx) => `  ${idx + 1}. ${u}`)
    );
  }

  return `${MAGIC_AI_PROMPT_TEMPLATE}

---
📌 الفئات الحالية في متجر AQURIVO (اختر الأنسب للمنتج أو ابتكر فئة جديدة تماماً):
${catLines || '- electronics, home, health, sports, fashion'}

📌 المتاجر الشريكة المتاحة:
${sourceLines || '- amazon, aliexpress, noon, temu'}

---
${productLinkSection}
${canopyFactsLines.length > 0 ? `\n${canopyFactsLines.join('\n')}\n` : ''}
${mediaSectionLines.join('\n')}`;
}

/**
 * Splits a raw block of alt text descriptions (separated by `|` or newlines) into a clean array of strings.
 */
function parsePipeOrLineList(rawBlock: string | undefined): string[] {
  if (!rawBlock) return [];
  return rawBlock
    .split(/\s*\|\s*|\n+/)
    .map((item) =>
      cleanExtractedText(
        item
          .replace(/^(?:\d+[\.\)\-]\s*|[-•]\s*|(?:صورة|Image|Alt|Spec|مواصفة)\s*#?\d*\s*:\s*)/i, '')
          .trim()
      )
    )
    .filter((item) => item.length > 1);
}

const AR_ANGLE_SUFFIXES = [
  'الواجهة الأمامية والتصميم الكامل',
  'زاوية جانبية توضح جودة التصنيع',
  'تفاصيل المكونات والمواصفات الدقيقة',
  'الاستخدام العملي في الحياة اليومية',
  'الأبعاد والحجم الفعلي للمنتج',
  'الملحقات والمحتويات المرفقة',
  'جودة الخامات والتشطيب الفاخر',
  'نظرة قريبة على الميزات الذكية',
];

const EN_ANGLE_SUFFIXES = [
  'Front View & Full Design',
  'Side Profile & Build Quality',
  'Close-up Specs & Craftsmanship',
  'Real-World Everyday Use',
  'Dimensions & Compact Form Factor',
  'Included Accessories & Package Contents',
  'Premium Finish & Material Details',
  'Smart Features & Ergonomic View',
];

/**
 * Smart Image Alt Engine:
 * Applies the exact visual descriptions generated by the Product Agent to each image slot,
 * and falls back to structured SEO descriptions if more images exist than descriptions.
 */
export function applySmartAltTextsToImages<
  T extends { url: string; alt: { ar: string; en: string }; width: number; height: number; publicId?: string },
>(
  images: T[],
  altTextsAr: string[] = [],
  altTextsEn: string[] = [],
  context: {
    titleAr?: string;
    titleEn?: string;
    categoryNameAr?: string;
    categoryNameEn?: string;
    tags?: string | string[];
  } = {}
): T[] {
  if (!Array.isArray(images) || images.length === 0) return [];

  const baseTitleAr = (context.titleAr || context.titleEn || 'منتج مختار من AQURIVO').trim();
  const baseTitleEn = (context.titleEn || context.titleAr || 'AQURIVO Curated Product').trim();
  const catAr = (context.categoryNameAr || '').trim();
  const catEn = (context.categoryNameEn || '').trim();

  const tagList = Array.isArray(context.tags)
    ? context.tags
    : typeof context.tags === 'string'
      ? context.tags
          .split(/[،,]/)
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

  return images.map((img, idx) => {
    const aiAr = altTextsAr[idx] ? altTextsAr[idx].trim() : '';
    const aiEn = altTextsEn[idx] ? altTextsEn[idx].trim() : '';

    const existingAr = img.alt?.ar?.trim() || '';
    const existingEn = img.alt?.en?.trim() || '';
    const isGenericExistingAr =
      !existingAr ||
      existingAr === 'صورة المنتج' ||
      existingAr === 'Product image' ||
      existingAr === baseTitleAr;
    const isGenericExistingEn =
      !existingEn ||
      existingEn === 'Product image' ||
      existingEn === 'صورة المنتج' ||
      existingEn === baseTitleEn;

    const tagKw = tagList[idx % Math.max(1, tagList.length)] || '';
    const angleAr =
      AR_ANGLE_SUFFIXES[idx % AR_ANGLE_SUFFIXES.length] || `زاوية عرض ${idx + 1}`;
    const angleEn =
      EN_ANGLE_SUFFIXES[idx % EN_ANGLE_SUFFIXES.length] || `Detailed View ${idx + 1}`;

    const generatedAr = [
      baseTitleAr,
      catAr || undefined,
      tagKw || undefined,
      `${angleAr} (${idx + 1})`,
    ]
      .filter(Boolean)
      .join(' — ')
      .slice(0, 180);

    const generatedEn = [
      baseTitleEn,
      catEn || undefined,
      tagKw || undefined,
      `${angleEn} (${idx + 1})`,
    ]
      .filter(Boolean)
      .join(' — ')
      .slice(0, 180);

    return {
      ...img,
      alt: {
        ar: aiAr || (!isGenericExistingAr ? existingAr : generatedAr),
        en: aiEn || (!isGenericExistingEn ? existingEn : generatedEn),
      },
    };
  });
}

function cleanExtractedText(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  return cleaned;
}

function extractFirstMatch(text: string, regexList: RegExp[]): string | undefined {
  for (const rx of regexList) {
    const m = text.match(rx);
    if (m && m[1] && m[1].trim()) {
      return cleanExtractedText(m[1]);
    }
  }
  return undefined;
}

function parseScoreField(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const m = raw.match(/(\d+(?:\.\d+)?)/);
  if (!m) return undefined;
  const num = Number(m[1]);
  if (Number.isNaN(num)) return undefined;
  return Math.max(50, Math.min(99, Math.round(num)));
}

export function parseMagicProductContent(rawInput: string): {
  draft: ParsedProductDraft;
  fieldsFoundCount: number;
} {
  let text = rawInput.trim();
  if (!text) {
    return { draft: {}, fieldsFoundCount: 0 };
  }

  if (text.startsWith('```')) {
    text = text.replace(/^```[a-zA-Z0-9_-]*\n?/, '').replace(/\n?```$/, '').trim();
  }

  const draft: ParsedProductDraft = {};

  // 1. JSON format support
  if (text.startsWith('{') && text.endsWith('}')) {
    try {
      const obj = JSON.parse(text) as Record<string, any>;

      if (typeof obj.title === 'object' && obj.title !== null) {
        if (obj.title.en) draft.titleEn = cleanExtractedText(String(obj.title.en));
        if (obj.title.ar) draft.titleAr = cleanExtractedText(String(obj.title.ar));
      } else if (typeof obj.title === 'string') {
        draft.titleEn = cleanExtractedText(obj.title);
      }
      if (obj.titleEn) draft.titleEn = cleanExtractedText(String(obj.titleEn));
      if (obj.titleAr) draft.titleAr = cleanExtractedText(String(obj.titleAr));
      if (obj.name && typeof obj.name === 'object') {
        if (obj.name.en && !draft.titleEn) draft.titleEn = cleanExtractedText(String(obj.name.en));
        if (obj.name.ar && !draft.titleAr) draft.titleAr = cleanExtractedText(String(obj.name.ar));
      }

      if (obj.slug) draft.slug = cleanExtractedText(String(obj.slug));

      if (typeof obj.shortSummary === 'object' && obj.shortSummary !== null) {
        if (obj.shortSummary.en) draft.summaryEn = cleanExtractedText(String(obj.shortSummary.en));
        if (obj.shortSummary.ar) draft.summaryAr = cleanExtractedText(String(obj.shortSummary.ar));
      } else if (typeof obj.shortSummary === 'string') {
        draft.summaryEn = cleanExtractedText(obj.shortSummary);
      }
      if (obj.summaryEn) draft.summaryEn = cleanExtractedText(String(obj.summaryEn));
      if (obj.summaryAr) draft.summaryAr = cleanExtractedText(String(obj.summaryAr));

      const whyObj = obj.whyWePickedIt || obj.whyWeChoseIt || obj.why;
      if (typeof whyObj === 'object' && whyObj !== null) {
        if (whyObj.en) draft.whyEn = cleanExtractedText(String(whyObj.en));
        if (whyObj.ar) draft.whyAr = cleanExtractedText(String(whyObj.ar));
      } else if (typeof whyObj === 'string') {
        draft.whyAr = cleanExtractedText(whyObj);
      }
      if (obj.whyEn) draft.whyEn = cleanExtractedText(String(obj.whyEn));
      if (obj.whyAr) draft.whyAr = cleanExtractedText(String(obj.whyAr));

      const considerObj = obj.whatToConsider || obj.thingsToNotice || obj.consider;
      if (typeof considerObj === 'object' && considerObj !== null) {
        if (considerObj.en) draft.considerEn = cleanExtractedText(String(considerObj.en));
        if (considerObj.ar) draft.considerAr = cleanExtractedText(String(considerObj.ar));
      } else if (typeof considerObj === 'string') {
        draft.considerAr = cleanExtractedText(considerObj);
      }
      if (obj.considerEn) draft.considerEn = cleanExtractedText(String(obj.considerEn));
      if (obj.considerAr) draft.considerAr = cleanExtractedText(String(obj.considerAr));

      const descObj = obj.description || obj.detailedDescription;
      if (typeof descObj === 'object' && descObj !== null) {
        if (descObj.en) draft.descEn = cleanExtractedText(String(descObj.en));
        if (descObj.ar) draft.descAr = cleanExtractedText(String(descObj.ar));
      } else if (typeof descObj === 'string') {
        draft.descAr = cleanExtractedText(descObj);
      }
      if (obj.descEn) draft.descEn = cleanExtractedText(String(obj.descEn));
      if (obj.descAr) draft.descAr = cleanExtractedText(String(obj.descAr));

      if (obj.priceAmount !== undefined && obj.priceAmount !== null) draft.priceAmount = String(obj.priceAmount);
      else if (obj.price !== undefined && obj.price !== null) draft.priceAmount = String(obj.price);

      if (obj.oldPrice !== undefined && obj.oldPrice !== null) draft.oldPrice = String(obj.oldPrice);
      if (obj.discount !== undefined && obj.discount !== null) draft.discount = String(obj.discount);
      if (obj.stars !== undefined && obj.stars !== null) draft.stars = String(obj.stars);
      else if (obj.rating !== undefined && obj.rating !== null) draft.stars = String(obj.rating);

      if (obj.soldCount !== undefined && obj.soldCount !== null) draft.soldCount = String(obj.soldCount);
      else if (obj.salesCount !== undefined && obj.salesCount !== null) draft.soldCount = String(obj.salesCount);

      if (obj.badge) draft.badge = cleanExtractedText(String(obj.badge));
      if (obj.priceCurrency) draft.priceCurrency = cleanExtractedText(String(obj.priceCurrency));
      if (obj.categoryId) draft.categoryId = cleanExtractedText(String(obj.categoryId));
      else if (obj.categorySlug) draft.categoryId = cleanExtractedText(String(obj.categorySlug));

      if (obj.categoryNameAr) draft.categoryNameAr = cleanExtractedText(String(obj.categoryNameAr));
      else if (obj.categoryName?.ar) draft.categoryNameAr = cleanExtractedText(String(obj.categoryName.ar));
      if (obj.categoryNameEn) draft.categoryNameEn = cleanExtractedText(String(obj.categoryNameEn));
      else if (obj.categoryName?.en) draft.categoryNameEn = cleanExtractedText(String(obj.categoryName.en));
      if (obj.categoryIcon) draft.categoryIcon = cleanExtractedText(String(obj.categoryIcon));

      if (obj.isFeatured !== undefined) draft.isFeatured = Boolean(obj.isFeatured);
      if (obj.sourceId) draft.sourceId = cleanExtractedText(String(obj.sourceId));
      if (obj.sourceProductUrl || obj.productUrl || obj.url) {
        draft.sourceProductUrl = cleanExtractedText(
          String(obj.sourceProductUrl || obj.productUrl || obj.url)
        );
      }
      if (obj.affiliateUrl) draft.affiliateUrl = cleanExtractedText(String(obj.affiliateUrl));

      if (Array.isArray(obj.altTextsAr)) {
        draft.altTextsAr = obj.altTextsAr.map((s: unknown) => cleanExtractedText(String(s))).filter(Boolean);
      } else if (typeof obj.altTextsAr === 'string') {
        draft.altTextsAr = parsePipeOrLineList(obj.altTextsAr);
      }
      if (Array.isArray(obj.altTextsEn)) {
        draft.altTextsEn = obj.altTextsEn.map((s: unknown) => cleanExtractedText(String(s))).filter(Boolean);
      } else if (typeof obj.altTextsEn === 'string') {
        draft.altTextsEn = parsePipeOrLineList(obj.altTextsEn);
      }

      const rawMediaList: string[] = [];
      if (Array.isArray(obj.images)) {
        for (const img of obj.images) {
          const u = typeof img === 'string' ? img : img?.url;
          if (u) rawMediaList.push(String(u));
        }
      } else if (Array.isArray(obj.imageUrls)) {
        for (const u of obj.imageUrls) {
          if (u) rawMediaList.push(String(u));
        }
      }
      if (Array.isArray(obj.videoUrls)) {
        for (const v of obj.videoUrls) {
          if (v) rawMediaList.push(String(v));
        }
      }
      if (obj.videoUrl) {
        rawMediaList.push(String(obj.videoUrl));
      }

      if (rawMediaList.length > 0) {
        const classified = classifyMediaUrlsFromText(rawMediaList.join('\n'));
        if (classified.imageUrls.length > 0) draft.images = classified.imageUrls;
        if (classified.videoUrls.length > 0) {
          draft.videoUrls = classified.videoUrls;
          draft.videoUrl = classified.videoUrls[0];
        }
      }

      if (obj.bestForAr || obj.comparisonDna?.bestFor?.ar) {
        draft.bestForAr = cleanExtractedText(String(obj.bestForAr || obj.comparisonDna?.bestFor?.ar));
      }
      if (obj.bestForEn || obj.comparisonDna?.bestFor?.en) {
        draft.bestForEn = cleanExtractedText(String(obj.bestForEn || obj.comparisonDna?.bestFor?.en));
      }
      if (obj.keySpecsAr || obj.comparisonDna?.keySpecs?.ar) {
        const raw = obj.keySpecsAr || obj.comparisonDna?.keySpecs?.ar;
        draft.keySpecsAr = Array.isArray(raw) ? raw.map(String) : parsePipeOrLineList(String(raw));
      }
      if (obj.keySpecsEn || obj.comparisonDna?.keySpecs?.en) {
        const raw = obj.keySpecsEn || obj.comparisonDna?.keySpecs?.en;
        draft.keySpecsEn = Array.isArray(raw) ? raw.map(String) : parsePipeOrLineList(String(raw));
      }
      if (obj.performanceScore || obj.comparisonDna?.performanceScore) {
        draft.performanceScore = parseScoreField(String(obj.performanceScore || obj.comparisonDna?.performanceScore));
      }
      if (obj.valueScore || obj.comparisonDna?.valueScore) {
        draft.valueScore = parseScoreField(String(obj.valueScore || obj.comparisonDna?.valueScore));
      }
      if (obj.reliabilityScore || obj.comparisonDna?.reliabilityScore) {
        draft.reliabilityScore = parseScoreField(String(obj.reliabilityScore || obj.comparisonDna?.reliabilityScore));
      }

      if (Array.isArray(obj.tags)) {
        draft.tags = obj.tags.join(', ');
      } else if (typeof obj.tags === 'string') {
        draft.tags = obj.tags;
      }

      const count = Object.values(draft).filter(
        (v) => v !== undefined && v !== '' && (!Array.isArray(v) || v.length > 0)
      ).length;
      return { draft, fieldsFoundCount: count };
    } catch {
      // Fall through to regex-based tag parsing
    }
  }

  // 2. Multi-line tag / key-value regex parsing
  draft.titleAr = extractFirstMatch(text, [
    /\[(?:العنوان\s*بالعربية|العنوان\s*العربي|Arabic\s*Title|الاسم\s*بالعربية|اسم\s*المنتج\s*بالعربية)\]\s*:\s*([^\n\[]+)/i,
    /(?:العنوان\s*بالعربية|العنوان\s*العربي|الاسم\s*بالعربية|اسم\s*المنتج\s*بالعربية)\s*:\s*([^\n\[]+)/i,
  ]);

  draft.titleEn = extractFirstMatch(text, [
    /\[(?:العنوان\s*بالإنجليزية|العنوان\s*الإنجليزي|English\s*Title|الاسم\s*بالإنجليزية|اسم\s*المنتج\s*بالإنجليزية)\]\s*:\s*([^\n\[]+)/i,
    /(?:العنوان\s*بالإنجليزية|العنوان\s*الإنجليزي|الاسم\s*بالإنجليزية|اسم\s*المنتج\s*بالإنجليزية)\s*:\s*([^\n\[]+)/i,
  ]);

  draft.slug = extractFirstMatch(text, [
    /\[(?:الرابط\s*slug|slug|الرابط|المعرف)\]\s*:\s*([^\n\[]+)/i,
    /(?:slug|الرابط\s*المختصر)\s*:\s*([^\n\[]+)/i,
  ]);

  draft.summaryAr = extractFirstMatch(text, [
    /\[(?:الملخص\s*بالعربية|الملخص\s*العربي|Short\s*Summary\s*AR|ملخص\s*عربي|الملخص)\]\s*:\s*([\s\S]*?)(?=\n\s*\[|$)/i,
  ]);

  draft.summaryEn = extractFirstMatch(text, [
    /\[(?:الملخص\s*بالإنجليزية|الملخص\s*الإنجليزي|Short\s*Summary\s*EN|ملخص\s*إنجليزي|ملخص\s*انجليزي)\]\s*:\s*([\s\S]*?)(?=\n\s*\[|$)/i,
  ]);

  draft.whyAr = extractFirstMatch(text, [
    /\[(?:لماذا\s*اخترناه\s*بالعربية|لماذا\s*اخترنا\s*هذا\s*المنتج\s*بالعربية|لماذا\s*اخترناه|Why\s*We\s*Picked\s*It\s*AR|Why\s*We\s*Chose\s*It\s*AR)\]\s*:\s*([\s\S]*?)(?=\n\s*\[|$)/i,
  ]);

  draft.whyEn = extractFirstMatch(text, [
    /\[(?:لماذا\s*اخترناه\s*بالإنجليزية|لماذا\s*اخترنا\s*هذا\s*المنتج\s*بالإنجليزية|Why\s*We\s*Picked\s*It\s*EN|Why\s*We\s*Chose\s*It\s*EN)\]\s*:\s*([\s\S]*?)(?=\n\s*\[|$)/i,
  ]);

  draft.considerAr = extractFirstMatch(text, [
    /\[(?:نقاط\s*الانتباه\s*بالعربية|ما\s*يجب\s*الانتباه\s*له\s*بالعربية|نقاط\s*الانتباه|ما\s*يجب\s*الانتباه\s*له|What\s*To\s*Consider\s*AR)\]\s*:\s*([\s\S]*?)(?=\n\s*\[|$)/i,
  ]);

  draft.considerEn = extractFirstMatch(text, [
    /\[(?:نقاط\s*الانتباه\s*بالإنجليزية|ما\s*يجب\s*الانتباه\s*له\s*بالإنجليزية|What\s*To\s*Consider\s*EN|What\s*to\s*consider)\]\s*:\s*([\s\S]*?)(?=\n\s*\[|$)/i,
  ]);

  draft.descAr = extractFirstMatch(text, [
    /\[(?:الوصف\s*التفصيلي\s*بالعربية|الوصف\s*بالعربية|الوصف\s*العربي|Detailed\s*Description\s*AR|Description\s*AR)\]\s*:\s*([\s\S]*?)(?=\n\s*\[|$)/i,
  ]);

  draft.descEn = extractFirstMatch(text, [
    /\[(?:الوصف\s*التفصيلي\s*بالإنجليزية|الوصف\s*بالإنجليزية|الوصف\s*الإنجليزي|Detailed\s*Description\s*EN|Description\s*EN)\]\s*:\s*([\s\S]*?)(?=\n\s*\[|$)/i,
  ]);

  draft.priceAmount = extractFirstMatch(text, [
    /\[(?:السعر|السعر\s*الحالي|Price|Current\s*Price)\]\s*:\s*([\d\.]+)/i,
  ]);

  draft.oldPrice = extractFirstMatch(text, [
    /\[(?:السعر\s*القديم|السعر\s*السابق|Old\s*Price|Original\s*Price)\]\s*:\s*([\d\.]+)/i,
  ]);

  draft.discount = extractFirstMatch(text, [
    /\[(?:الخصم|نسبة\s*الخصم|Discount)\]\s*:\s*([\d]+)/i,
  ]);

  draft.stars = extractFirstMatch(text, [
    /\[(?:التقييم|النجوم|Stars|Rating)\]\s*:\s*([\d\.]+)/i,
  ]);

  draft.soldCount = extractFirstMatch(text, [
    /\[(?:المبيعات|عدد\s*المبيعات|Sold\s*Count|Sold)\]\s*:\s*([\d]+)/i,
  ]);

  draft.categoryId = extractFirstMatch(text, [
    /\[(?:الفئة|فئة\s*المنتج|Category|categorySlug)\]\s*:\s*([^\n\[]+)/i,
  ]);

  draft.categoryNameAr = extractFirstMatch(text, [
    /\[(?:اسم\s*الفئة\s*بالعربية|اسم\s*الفئة\s*العربي|Category\s*Name\s*AR)\]\s*:\s*([^\n\[]+)/i,
  ]);

  draft.categoryNameEn = extractFirstMatch(text, [
    /\[(?:اسم\s*الفئة\s*بالإنجليزية|اسم\s*الفئة\s*الإنجليزي|Category\s*Name\s*EN)\]\s*:\s*([^\n\[]+)/i,
  ]);

  draft.categoryIcon = extractFirstMatch(text, [
    /\[(?:أيقونة\s*الفئة|ايقونة\s*الفئة|رمز\s*الفئة|Category\s*Icon)\]\s*:\s*([^\n\[]+)/i,
  ]);

  draft.sourceId = extractFirstMatch(text, [
    /\[(?:المتجر\s*الشريك|المتجر|المصدر|Partner\s*Store|Source)\]\s*:\s*([^\n\[]+)/i,
  ]);

  draft.priceCurrency = extractFirstMatch(text, [
    /\[(?:العملة|نوع\s*العملة|Currency)\]\s*:\s*([A-Za-z]{2,4})/i,
  ]);

  draft.badge = extractFirstMatch(text, [
    /\[(?:شارة\s*العرض|الشارة|Badge|Promo\s*Badge)\]\s*:\s*([^\n\[]+)/i,
  ]);

  const rawFeatured = extractFirstMatch(text, [
    /\[(?:منتج\s*مميز|مميز|Featured)\]\s*:\s*([^\n\[]+)/i,
  ]);
  if (rawFeatured) {
    const lowerFeat = rawFeatured.toLowerCase().trim();
    draft.isFeatured =
      lowerFeat === 'نعم' ||
      lowerFeat === 'yes' ||
      lowerFeat === 'true' ||
      lowerFeat === '1';
  }

  draft.sourceProductUrl = extractFirstMatch(text, [
    /\[(?:رابط\s*المنتج(?:\s*الرسمي)?|رابط\s*صفحة\s*المنتج|Official\s*Product\s*URL|Product\s*URL|URL)\]\s*:\s*(https?:\/\/[^\s\n\[]+)/i,
  ]);

  draft.affiliateUrl = extractFirstMatch(text, [
    /\[(?:رابط\s*الافلييت|رابط\s*العمولة|Affiliate\s*URL)\]\s*:\s*(https?:\/\/[^\s\n\[]+)/i,
  ]);

  // Algorithmic Comparison DNA extraction
  draft.bestForAr = extractFirstMatch(text, [
    /\[(?:الاستخدام\s*الأنسب\s*بالعربية|لمن\s*يناسب\s*بالعربية|Best\s*For\s*AR)\]\s*:\s*([^\n\[]+)/i,
  ]);
  draft.bestForEn = extractFirstMatch(text, [
    /\[(?:الاستخدام\s*الأنسب\s*بالإنجليزية|لمن\s*يناسب\s*بالإنجليزية|Best\s*For\s*EN)\]\s*:\s*([^\n\[]+)/i,
  ]);

  const rawSpecsAr = extractFirstMatch(text, [
    /\[(?:المواصفات\s*الثلاث\s*للمقارنة\s*بالعربية|نقاط\s*المقارنة\s*بالعربية|Key\s*Specs\s*AR)\]\s*:\s*([\s\S]*?)(?=\n\s*\[|$)/i,
  ]);
  if (rawSpecsAr) {
    draft.keySpecsAr = parsePipeOrLineList(rawSpecsAr).slice(0, 5);
  }

  const rawSpecsEn = extractFirstMatch(text, [
    /\[(?:المواصفات\s*الثلاث\s*للمقارنة\s*بالإنجليزية|نقاط\s*المقارنة\s*بالإنجليزية|Key\s*Specs\s*EN)\]\s*:\s*([\s\S]*?)(?=\n\s*\[|$)/i,
  ]);
  if (rawSpecsEn) {
    draft.keySpecsEn = parsePipeOrLineList(rawSpecsEn).slice(0, 5);
  }

  draft.performanceScore = parseScoreField(
    extractFirstMatch(text, [
      /\[(?:مؤشر\s*الأداء\s*من\s*100|درجة\s*الأداء|Performance\s*Score)\]\s*:\s*([^\n\[]+)/i,
    ])
  );
  draft.valueScore = parseScoreField(
    extractFirstMatch(text, [
      /\[(?:مؤشر\s*القيمة\s*مقابل\s*السعر\s*من\s*100|درجة\s*القيمة|Value\s*Score)\]\s*:\s*([^\n\[]+)/i,
    ])
  );
  draft.reliabilityScore = parseScoreField(
    extractFirstMatch(text, [
      /\[(?:مؤشر\s*الاعتمادية\s*من\s*100|درجة\s*الاعتمادية|Reliability\s*Score)\]\s*:\s*([^\n\[]+)/i,
    ])
  );

  draft.handoffSummary = extractFirstMatch(text, [
    /\[(?:ملخص\s*التسليم\s*لوكيل\s*المقالات|بطاقة\s*التسليم|ملخص\s*التسليم|Agent\s*Handoff)\]\s*:\s*([\s\S]*?)(?=\n\s*\[|$)/i,
  ]);

  const rawAltAr = extractFirstMatch(text, [
    /\[(?:النصوص\s*البديلة\s*للصور\s*بالعربية|النص\s*البديل\s*للصور\s*بالعربية|أوصاف\s*الصور\s*بالعربية|Alt\s*Texts?\s*AR|Image\s*Alt\s*AR)\]\s*:\s*([\s\S]*?)(?=\n\s*\[|$)/i,
  ]);
  if (rawAltAr) {
    draft.altTextsAr = parsePipeOrLineList(rawAltAr);
  }

  const rawAltEn = extractFirstMatch(text, [
    /\[(?:النصوص\s*البديلة\s*للصور\s*بالإنجليزية|النص\s*البديل\s*للصور\s*بالإنجليزية|أوصاف\s*الصور\s*بالإنجليزية|Alt\s*Texts?\s*EN|Image\s*Alt\s*EN)\]\s*:\s*([\s\S]*?)(?=\n\s*\[|$)/i,
  ]);
  if (rawAltEn) {
    draft.altTextsEn = parsePipeOrLineList(rawAltEn);
  }

  const rawTags = extractFirstMatch(text, [
    /\[(?:الوسوم|الكلمات\s*المفتاحية|Tags)\]\s*:\s*([^\n\[]+)/i,
  ]);

  const rawLongTail = extractFirstMatch(text, [
    /\[(?:كلمات\s*Long\s*Tail|كلمات\s*البحث|Long\s*Tail\s*Keywords|Long\s*Tail)\]\s*:\s*([\s\S]*?)(?=\n\s*\[|$)/i,
  ]);

  if (rawTags && rawLongTail) {
    draft.tags = `${rawTags}, ${rawLongTail.replace(/\n+/g, ', ')}`;
  } else if (rawTags) {
    draft.tags = rawTags;
  } else if (rawLongTail) {
    draft.tags = rawLongTail.replace(/\n+/g, ', ');
  }

  // Extract unified media (both images and videos) from [روابط الصور], [روابط الفيديوهات], [رابط الفيديو], [الوسائط]
  const rawImagesBlock = extractFirstMatch(text, [
    /\[(?:روابط\s*الصور|روابط\s*الوسائط|الصور|Images|Image\s*URLs|Media\s*URLs)\]\s*:\s*([\s\S]*?)(?=\n\s*\[|$)/i,
  ]);
  const rawVideosBlock = extractFirstMatch(text, [
    /\[(?:روابط\s*الفيديوهات|رابط\s*الفيديو|الفيديوهات|فيديو|Video\s*URLs?|Videos?)\]\s*:\s*([\s\S]*?)(?=\n\s*\[|$)/i,
  ]);

  const combinedMediaRaw = [rawImagesBlock || '', rawVideosBlock || '']
    .filter(Boolean)
    .join('\n');

  if (combinedMediaRaw) {
    const classified = classifyMediaUrlsFromText(combinedMediaRaw);
    if (classified.imageUrls.length > 0) {
      draft.images = classified.imageUrls;
    }
    if (classified.videoUrls.length > 0) {
      draft.videoUrls = classified.videoUrls;
      draft.videoUrl = classified.videoUrls[0];
    }
  }

  const count = Object.values(draft).filter(
    (v) => v !== undefined && v !== '' && (!Array.isArray(v) || v.length > 0)
  ).length;
  return { draft, fieldsFoundCount: count };
}

export interface ParsedArticleDraft {
  slug?: string;
  titleAr?: string;
  titleEn?: string;
  excerptAr?: string;
  excerptEn?: string;
  contentAr?: string;
  contentEn?: string;
  editorVerdictAr?: string;
  editorVerdictEn?: string;
  seoTitleAr?: string;
  seoTitleEn?: string;
  seoDescriptionAr?: string;
  seoDescriptionEn?: string;
  seoKeywords?: string;
  authorName?: string;
  readingTimeMinutes?: string;
  categoryId?: string;
  coverImage?: string;
  relatedProductsQuery?: string[];
  agentReport?: string;
  affiliateCtaUrl?: string;
  affiliateCtaColor?: string;
  faqItems?: Array<{
    question: { ar: string; en: string };
    answer: { ar: string; en: string };
  }>;
}

export interface AffiliateCtaColorPreset {
  hex: string;
  nameAr: string;
  nameEn: string;
}

export const AFFILIATE_CTA_COLOR_PRESETS: AffiliateCtaColorPreset[] = [
  {
    hex: '#EA580C',
    nameAr: 'برتقالي نحاسي دافئ (الافتراضي المحفز)',
    nameEn: 'Warm Copper Orange (Default)',
  },
  {
    hex: '#059669',
    nameAr: 'أخضر زمردي موثوق',
    nameEn: 'Emerald Trust Green',
  },
  {
    hex: '#2563EB',
    nameAr: 'أزرق ياقوتي واضح',
    nameEn: 'Royal Sapphire Blue',
  },
  {
    hex: '#D97706',
    nameAr: 'ذهبي كهرماني مميز',
    nameEn: 'Amber Gold',
  },
  {
    hex: '#E11D48',
    nameAr: 'عنابي ياقوتي جذاب',
    nameEn: 'Crimson Ruby',
  },
  {
    hex: '#7C3AED',
    nameAr: 'بنفسجي ملكي أنيق',
    nameEn: 'Royal Violet',
  },
];

export function normalizeHexColor(input?: string | null, fallback = '#EA580C'): string {
  if (!input || typeof input !== 'string') return fallback;
  const trimmed = input.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed.toUpperCase();
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    const r = trimmed[1];
    const g = trimmed[2];
    const b = trimmed[3];
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return fallback;
}

/**
 * Applies or updates the affiliate link URL and chosen highlight color on contextual
 * buying-trigger anchor tags inside article HTML without disturbing internal category/product links.
 */
export function applyAffiliateCtaStylingToHtml(
  rawHtml: string,
  affiliateUrl?: string,
  highlightColor = '#EA580C'
): string {
  if (!rawHtml || typeof rawHtml !== 'string') return '';
  const safeColor = normalizeHexColor(highlightColor, '#EA580C');
  const trimmedAffiliateUrl = affiliateUrl?.trim() || '';

  let html = rawHtml;
  if (trimmedAffiliateUrl) {
    html = html
      .replace(/\[AFFILIATE_LINK\]/gi, trimmedAffiliateUrl)
      .replace(/\{\{\s*AFFILIATE_LINK\s*\}\}/gi, trimmedAffiliateUrl);
  }

  // Upgrade any <a ...> that is an affiliate CTA link while protecting video/internal links
  return html.replace(
    /<a\b([^>]*)>([\s\S]*?)<\/a>/gi,
    (fullMatch, rawAttrs: string, innerHtml: string) => {
      const hrefMatch = rawAttrs.match(/\bhref\s*=\s*(['"])(.*?)\1/i);
      const currentHref = hrefMatch ? hrefMatch[2].trim() : '';
      const cleanInner = innerHtml.replace(/\s*↗\s*$/g, '').trim();

      // Never style video links (YouTube, Shorts, Vimeo, direct video) as affiliate CTA links
      if (currentHref && isVideoMediaUrl(currentHref)) {
        return `<a href="${currentHref}" target="_blank" rel="noopener noreferrer">${cleanInner}</a>`;
      }

      const isExplicitCta =
        /data-affiliate-cta\s*=\s*(['"]?)true\1/i.test(rawAttrs) ||
        /\baffiliate-cta-link\b/i.test(rawAttrs) ||
        /data-cta-color\s*=/i.test(rawAttrs) ||
        /\brel\s*=\s*(['"])[^'"]*sponsored[^'"]*\1/i.test(rawAttrs);

      const isMatchingAffiliateHref =
        Boolean(trimmedAffiliateUrl) &&
        (currentHref === trimmedAffiliateUrl ||
          currentHref === '[AFFILIATE_LINK]' ||
          currentHref.startsWith('/go/'));

      const isExternalMerchantLink =
        /^https?:\/\//i.test(currentHref) &&
        !/aqurivo\.(?:store|com)/i.test(currentHref) &&
        !/(?:youtube\.com|youtu\.be|vimeo\.com|tiktok\.com|dailymotion\.com|wikipedia\.org)/i.test(
          currentHref
        );

      if (!isExplicitCta && !isMatchingAffiliateHref && !isExternalMerchantLink) {
        return fullMatch;
      }

      const finalHref =
        trimmedAffiliateUrl && (isExplicitCta || currentHref === '[AFFILIATE_LINK]')
          ? trimmedAffiliateUrl
          : currentHref || trimmedAffiliateUrl || '#';

      return `<a href="${finalHref}" class="affiliate-cta-link" data-affiliate-cta="true" data-cta-color="${safeColor}" style="--cta-color: ${safeColor};" target="_blank" rel="sponsored noopener noreferrer">${cleanInner}</a>`;
    }
  );
}

export const MAGIC_ARTICLE_AI_PROMPT_TEMPLATE = `1. الدور والهدف الأساسي

أنت وكيل بحث متخصص في المنتجات ومراجعات الشراء لصالح AQURIVO (https://aqurivo.store | https://aqurivo.com).

مهمتك ليست إنشاء مقالات تسويقية أو إعادة صياغة مواصفات الشركات المصنعة. مهمتك هي إجراء بحث فعلي ومنظم في الويب، وجمع الأدلة من مصادر متعددة، وتحليل الاختبارات المستقلة وتجارب المستخدمين، ثم إنتاج مراجعة أصلية ومحايدة تساعد القارئ على اتخاذ قرار شراء مستنير.

يجب أن تكون المراجعة مبنية على أدلة يمكن التحقق منها، لا على التخمين أو المعرفة العامة وحدها.

القاعدة الأساسية:
ابحث أولاً، تحقّق ثانياً، حلّل ثالثاً، ثم اكتب المقال.
لا تبدأ كتابة المراجعة النهائية قبل إكمال خطوات البحث والتحقق، أو قبل توثيق سبب تعذر إكمالها.

الأهداف التحريرية الأساسية، بالترتيب:
1. دقة المعلومات وعدم اختلاق أي حقيقة.
2. فائدة حقيقية ومحايدة للقارئ ومساعدته على اتخاذ القرار (متى يشتري ومتى يتجنب).
3. الشفافية التامة بشأن الاختبارات والمصادر والقيود.
4. محتوى أصلي وطبيعي، وليس نصاً قالبياً متكرراً أو حشواً تسويقياً.
5. تحسين SEO والظهور النزيه وتجربة القراءة وإمكانية الوصول.
6. استخدام الروابط التسويقية بطريقة واضحة وغير مزعجة مع التزام إفصاح العمولة القانوني.
7. إنتاج محتوى منظم ومتوافق 100% مع بنية ومخطط AQURIVO المعتمد.

لا تَعِد بتصدر Google أو التفوق حتماً على مواقع منافسة؛ لا يمكن ضمان ترتيب البحث عن طريق البرومبت وحده.

---

2. قواعد الصدق وعدم اختلاق المعلومات

تُطبّق هذه القواعد على جميع مراحل العمل:
1. لا تختلق اختبارات، أو تجارب استخدام، أو نتائج أداء، أو أرقاماً، أو إحصاءات، أو اقتباسات، أو روابط مصادر.
2. لا تدّعِ أن AQURIVO اشترى المنتج أو اختبره بنفسه ما لم تتوفر أدلة صريحة على ذلك.
3. إذا أجرى موقع مستقل اختباراً عملياً، فانسب الاختبار والنتائج إلى ذلك الموقع، مع ذكر المصدر.
4. ميّز بوضوح بين الاختبارات المنشورة، وتجارب المستخدمين، والمواصفات الرسمية، والاستنتاجات التحليلية.
5. لا تعتبر ادعاءات الشركة المصنعة دليلاً مستقلاً على جودة المنتج أو أدائه.
6. لا تستخدم مقتطفات نتائج محركات البحث وحدها لإثبات ادعاء مهم. افتح الصفحة الأصلية واقرأ المحتوى ذي الصلة.
7. لا تذكر أنك راجعت مصدراً لم تفتحه فعلياً، ولا تستخدم رابطاً لم تتحقق من صلته بالمعلومة.
8. إذا تعذر التحقق من معلومة، فضعها ضمن المعلومات غير المؤكدة أو احذفها.
9. إذا كانت الأدلة غير كافية، فلا تملأ الفراغ بعبارات عامة أو معلومات مخترعة.
10. لا تحوّل تجربة إيجابية أو سلبية واحدة إلى حكم عام على جميع المستخدمين.
11. لا تخفِ الأدلة أو العيوب التي تتعارض مع النتيجة الرئيسية للمقال.
12. يجب أن تعكس درجة الثقة قوة الأدلة وتوافق المصادر، لا مدى سلاسة صياغة المقال.

لا تعتبر عبارة «لم نختبر المنتج عملياً» بديلاً عن البحث. إذا لم يجرِ AQURIVO اختباراً مباشراً، فابحث عن الاختبارات المنشورة التي أجراها الآخرون واستفد منها بطريقة دقيقة ومنسوبة إلى أصحابها.

---

3. الأدوات المطلوبة قبل الكتابة والبحث الفعلي

استخدم أدوات البحث على الويب المتاحة لك، وافتح الصفحات الأصلية للمصادر، واقرأ محتواها الفعلي.
يجب تنفيذ عمليات البحث وجمع المصادر باستخدام الأدوات الحقيقية المتاحة في بيئة التشغيل، وليس بمجرد وصف ما كان ينبغي البحث عنه.

إذا لم تتوفر أداة بحث ويب أو تعذر فتح المصادر:
- لا تتظاهر بأنك أجريت بحثاً.
- لا تنشئ قائمة مصادر وهمية.
- لا تكتب مراجعة نهائية توحي بأنها مبنية على بحث مكتمل.
- أعد حالة واضحة تفيد بأن البحث متعذر أو غير مكتمل، وحدد ما يلزم لإكماله.

لا تعتبر قدرة النموذج على تذكّر المعلومات بديلاً عن البحث الحالي والتحقق من المصادر.

---

4. المدخلات التي يجب فحصها وتحديد المنتج بدقة

قبل البحث والكتابة، حدّد وافحص جميع البيانات المتاحة في الطلب وبطاقة التسليم:
- الاسم الكامل الدقيق للمنتج، والشركة والعلامة التجارية.
- رقم الموديل، الإصدار، أو المراجعة الجغرافية/العتادية، والفئة والسوق المستهدف.
- المواصفات والميزات التي قُدمت مع المنتج.
- روابط الشركة المصنعة وصفحات الدعم والأدلة الرسمية.
- نتائج الاختبارات الفعلية إن وُجدت.
- قائمة المنتجات والمقالات المنشورة في AQURIVO وروابطها الحقيقية.
- الصور والفيديوهات المتوفرة وروابطها.
- رابط الشراء أو رابط العمولة المطلوب دمجه.
- بنية المقال المطلوبة، وحقول SEO، وأي مخطط بيانات أو تنسيق تتطلبه المنصة.

لا تفترض وجود معلومة لمجرد أن هذا النوع من البيانات يكون شائعاً في مواقع المراجعات.
إذا كانت هناك بنية بيانات أو واجهة أو قالب معتمد بالفعل داخل المشروع، فالتزم به. لا تخترع أسماء حقول بديلة ولا تغيّر واجهة الموقع أو منطق قاعدة البيانات أو طريقة النشر.

إذا كانت بعض المدخلات مفقودة، فتابع بالمعلومات التي يمكن إثباتها، وسجّل النواقص بوضوح. أما إذا تعذر تحديد المنتج أو نسخته بدقة، فلا تقدّم مقالاً يوحي بأن الحقائق مؤكدة.

---

5. منهجية البحث والتحقق من الحقائق وترتيب المصادر

إذا كانت أدوات البحث على الويب متاحة، فابحث قبل صياغة المراجعة، خاصة عندما تتعلق المعلومات بالسعر الحالي أو إصدار المنتج أو توافقه أو تحديثات الشركة.

اعتمد ترتيب المصادر التالي:

1. الشركة المصنعة وصفحة المنتج الرسمية.
2. دليل الاستخدام وصفحة الدعم والمواصفات الرسمية للإصدار نفسه.
3. اختبارات مستقلة موثوقة، بشرط أن تكون منهجية الاختبار ونتائجه واضحتين.
4. مصادر موثوقة إضافية لتوضيح النقاط التي لا تغطيها المصادر السابقة.
5. البيانات التي زودك بها المستخدم، مع اعتبارها بيانات مقدمة وليست دليلاً مستقلاً على صحتها.

لا تعتمد على مقتطفات محركات البحث وحدها عندما تكون الصفحة الأصلية متاحة. لا تنقل صياغة المنافسين أو مقالاتهم؛ استخرج الحقائق ثم اكتب شرحاً أصلياً.

لكل معلومة مؤثرة في قرار الشراء، تحقّق من المصدر المناسب، خصوصاً:

- اسم المنتج ورقم الموديل والإصدار والمنطقة الجغرافية.
- المواصفات والأرقام ووحدات القياس.
- الميزات التي قد تختلف باختلاف الإصدار أو البرنامج الثابت.
- التوافق مع الأجهزة والأنظمة والمعايير.
- السعر والتوفر والضمان وسياسة الإرجاع.
- الادعاءات المتعلقة بالأداء أو الأمان أو الاعتمادية.
- أي مقارنة أو ترتيب أو توصية بمنتج بديل.

إذا اختلفت المصادر، لا تختر الرقم الذي يبدو أفضل؛ اشرح الاختلاف إذا كان مهماً، أو استبعد الادعاء إذا تعذر حسمه.

لا تستخدم كلمة «حالي» أو «الأحدث» أو «الأرخص» دون تحقق مناسب وحديث.

إذا لم تتوفر أدوات البحث، فلا تدّعِ أنك بحثت في الويب. استخدم المعلومات المتاحة فقط، وسجّل الحقائق التي تحتاج إلى تحقق قبل النشر.

4. سياسة صارمة ضد الاختلاق

هذه القواعد إلزامية ولا يجوز تجاوزها لتجميل المقال:

أ. الاختبارات والتجربة المباشرة

لا تقل «اختبرنا» أو «لاحظنا أثناء الاستخدام» أو «فتحنا الصندوق» أو «قِسنا درجة الحرارة» أو «سجّلنا سرعة كذا» ما لم توجد نتائج اختبار حقيقية موثقة ومقدمة لك.

لا تخترع:

- نتائج اختبارات الأداء أو السرعة أو زمن الاستجابة.
- تجارب الاستخدام أو الانطباعات الحسية.
- درجات الحرارة والضوضاء واستهلاك الطاقة.
- مدة البطارية أو نطاق الشبكة أو عدد الأجهزة التي تحمّلها الاختبارات.
- نتائج المختبرات أو ظروف الاختبار أو أسماء الأشخاص الذين اختبروا المنتج.

إذا لم توجد تجربة مباشرة، صنّف المقال بوضوح بأنه مراجعة مبنية على المواصفات والمصادر المتاحة، وليست اختباراً عملياً مستقلاً.

يمكنك تقديم تحليل مفيد للمواصفات، لكن افصل بين المعلومة الرسمية والاستنتاج التحريري.

ب. الأرقام والمواصفات

لا تخترع الأرقام الناقصة ولا تقدّم تقديراتك على أنها قياسات فعلية. تأكد من الوحدات والسياق.

مثال: سرعة Wi‑Fi النظرية المعلنة لا تعني أن سرعة الإنترنت الفعلية ستصل إلى الرقم نفسه. اشرح الفرق متى كان مهماً.

ج. التقييمات والدرجات

لا تمنح المنتج تقييماً رقمياً أو ترتيباً نهائياً يوحي بالدقة العلمية ما لم توجد معايير تقييم معلنة وأدلة كافية لكل درجة.

إذا كانت لديك منهجية تقييم واضحة، اذكر معاييرها وحدودها. وإذا لم تتوفر أدلة كافية، استخدم حكماً وصفياً بدلاً من اختراع درجة.

د. الادعاءات التسويقية

لا تحول عبارات الشركة الإعلانية إلى حقائق مثبتة مستقلة. انسبها إلى الشركة عند الحاجة، ووضح حدودها.

لا تستخدم عبارات مثل «ثبت علمياً» أو «أفضل منتج في السوق» أو «الأكثر أماناً» إلا إذا كان هناك دليل مناسب يدعم الصياغة المحددة.

هـ. الأسعار والعروض

لا تخترع السعر الحالي أو الخصم أو التوفر. إذا كان السعر المقدم قديماً أو غير متحقق منه، فاحذفه أو وضح أنه سعر مرجعي غير مؤكد.

و. نقص الأدلة

عندما لا يمكن إثبات معلومة مهمة، احذفها أو صغها بحذر. لا تخفِ عدم اليقين وراء جمل واثقة.

لا يجوز التضحية بهذه القواعد من أجل إكمال عدد كلمات معين أو جعل المقال أكثر إقناعاً.

5. تحديد نوع المراجعة

قبل الكتابة، اختر نوع المحتوى الأنسب:

- مراجعة مبنية على اختبارات فعلية: لا تستخدمها إلا عند توفر بيانات اختبار حقيقية.
- مراجعة مبنية على المصادر والمواصفات: عندما لا توجد بيانات اختبار مباشر.
- مقارنة بين المنتجات: عند توفر معلومات قابلة للمقارنة عن المنتجات المعنية.
- دليل شراء: عندما يكون الهدف شرح كيفية الاختيار بين أنواع أو فئات متعددة.
- تحليل منتج محدد: عندما تكون المعلومات المتاحة كافية لتحليل مميزاته وحدوده دون الادعاء بتجربة فعلية.

يمكن الجمع بين الأنواع عند الحاجة، بشرط التصريح بأساس كل استنتاج.

لا تستخدم عنواناً يوحي باختبار مخبري إذا كان المقال مجرد تحليل للمواصفات.

6. بنية تحريرية مرنة

لا تفرض عدد أقسام أو ترتيباً واحداً على جميع المنتجات. أنشئ الهيكل الذي يجيب عن أسئلة القارئ المهمة بحسب فئة المنتج وطبيعة البيانات المتاحة.

قد يتضمن المقال، عند الحاجة:

1. مقدمة مختصرة تشرح هوية المنتج والمشكلة التي يحلها.
2. أهم نقاط القوة والقيود.
3. تحليل المواصفات التي تؤثر في الاستخدام الفعلي.
4. الفئات التي يناسبها المنتج والفئات التي قد لا يناسبها.
5. التوافق والمتطلبات والقيود المهمة.
6. المقارنة ببدائل مناسبة.
7. القيمة مقابل السعر، إذا توفرت بيانات سعر موثوقة.
8. خلاصة واضحة تساعد على اتخاذ القرار.
9. أسئلة شائعة حقيقية تهم المشتري.

هذه خيارات تحريرية وليست قائمة إلزامية. احذف الأقسام التي لا تضيف قيمة، وأضف أقساماً متخصصة عندما تحتاجها فئة المنتج.

لا تفرض عدد كلمات ثابتاً. اجعل المقال بطول يكفي لتغطية الموضوع دون حشو أو تكرار. لا تطل المقال لمجرد الوصول إلى رقم مستهدف.

ابدأ بالجواب الأهم، واستخدم عناوين واضحة وفقرات مناسبة للقراءة على الهاتف.

7. التخصص حسب فئة المنتج

يجب أن تتغير أسئلة البحث ومعايير التحليل حسب المنتج. لا تستخدم قائمة مواصفات عامة نفسها لكل الفئات.

أمثلة إرشادية:

- الراوترات والشبكات: الفرق بين السرعات النظرية والسرعة الواقعية، نطاقات التردد، المنافذ، التغطية والبيئة التي تؤثر فيها، التوافق، الأمان، إصدار العتاد والبرنامج الثابت.
- الهواتف والأجهزة اللوحية: المعالج والشاشة والبطارية والتحديثات والتوافق والشحن، مع تجنب أرقام الأداء غير الموثقة.
- الحواسيب: نوع الاستخدام المتوقع، المعالج والذاكرة والتخزين والشاشة والمنافذ وقابلية الترقية، بحسب البيانات المتاحة.
- الأجهزة المنزلية: السعة والطاقة والأبعاد والصيانة والضوضاء والتوافق ومتطلبات التركيب، وفق الأدلة المتوفرة.
- ملحقات الأجهزة: التوافق الفعلي والمنافذ والمعايير والأجهزة المدعومة وحدود الاستخدام.
- المنتجات ذات المخاطر الصحية أو المالية أو القانونية أو السلامة: استخدم مستوى تحقق مناسباً للمخاطر، ولا تقدم وعوداً أو نصائح عالية التأثير بلا مصادر كافية.

هذه أمثلة فقط؛ حدّد المعايير ذات الصلة بالمنتج الفعلي.

8. الأصالة وجودة الأسلوب

اكتب بصوت تحريري طبيعي، مهني، مباشر، ومفهوم. اجعل كل فقرة تؤدي وظيفة واضحة.

لتجنب المحتوى القالبي:

- لا تبدأ كل المقالات بالجملة نفسها.
- لا تستخدم تسلسلاً موحداً للأقسام دون حاجة.
- لا تكرر اسم المنتج في كل فقرة.
- لا تكرر الخلاصة في المقدمة والنقاط الرئيسية والخاتمة بصيغ مختلفة دون إضافة.
- تجنب الصفات العامة مثل «مذهل» و«ثوري» و«لا مثيل له».
- استخدم المصطلح التقني عندما يفيد، واشرحه بلغة سهلة.
- قدم أمثلة عملية فقط عندما تكون دقيقة ومرتبطة بالمنتج.
- اشرح معنى المواصفات بالنسبة للمشتري بدلاً من مجرد نسخها في قائمة.

لا تقلّد أسلوب موقع منافس بعينه، ولا تدّعِ أن المقال من كتابة شخص اختبر المنتج. الأصالة تعني تحليلاً وصياغة مستقلين، لا إخفاء استخدام الذكاء الاصطناعي.

9. سياسة المقارنة والبدائل

استخدم قائمة المنتجات المنشورة داخل AQURIVO لاختيار روابط داخلية وبدائل ذات صلة.

لا تخترع منتجاً موجوداً في الموقع، ولا تخترع عنوان مقال أو مسار URL أو صفحة مقارنة غير موجودة.

قارن المنتجات على معايير متكافئة فقط. وضح عندما تكون البيانات ناقصة أو عندما تختلف ظروف الاختبار أو إصدارات المنتجات.

لا تصف منتجاً بأنه «أفضل» على نحو مطلق دون توضيح المعيار. فضّل توصيات محددة مثل «أنسب لمن يحتاج إلى…» أو «قد يكون الخيار الآخر أفضل إذا كانت الأولوية…».

لا تنتقص من المنافسين دون أدلة، ولا تخلط بين مواصفات المنتج وتوقعات الأداء.

إذا لم يوجد بديل موثوق أو ذو صلة في فهرس AQURIVO، فلا تخترع بديلاً لمجرد إكمال القسم.

10. تحسين SEO بما يخدم القارئ

اجعل SEO نتيجة لمحتوى واضح ومفيد، لا ذريعة لتكرار الكلمات المفتاحية.

لكل لغة، جهّز عنواناً ووصفاً مناسبين:

- عنوان صفحة واضح وطبيعي يذكر المنتج أو نية البحث عندما يكون ذلك مناسباً.
- وصف تعريفي موجز يوضح فائدة الصفحة دون وعود غير مثبتة.
- مسار URL قصير وواضح، مع المحافظة على المسار الحالي إن كان موجوداً ولا يوجد إذن لتغييره.
- عناوين فرعية تصف موضوع كل قسم بدقة.
- كلمات مفتاحية مرتبطة بنية البحث، دون حشو.
- روابط داخلية ذات صلة ومن صفحات موجودة بالفعل.
- نصوص بديلة للصور تصف محتواها فعلاً.
- بنية HTML دلالية وسليمة.

اجعل الوصف التعريفي عادةً ضمن نحو 140–160 حرفاً عند ملاءمة اللغة؛ تحقق من الطول الفعلي ولا تضف كلمات غير مفيدة لإكماله. لا تتعامل مع هذا النطاق بوصفه ضماناً لظهور الوصف كما هو في Google.

لا تكرر عنوان الصفحة الرئيسي داخل جسم المقال إذا كانت واجهة AQURIVO تعرضه بالفعل. استخدم بنية العناوين المتوافقة مع القالب الموجود.

لا تحشو الأسئلة الشائعة بالكلمات المفتاحية، ولا تضف FAQ أو Product structured data إلا عندما تكون مناسبة للصفحة ومتوافقة مع بياناتها الفعلية.

لا تعد القارئ بأن SEO سيضمن ترتيباً معيناً.

11. المحتوى العربي والإنجليزي

عندما تكون اللغتان مطلوبتين، أنشئ نسختين تحريريّتين كاملتين.

- يجب أن تكون العربية سليمة وطبيعية ومناسبة للقارئ العربي.
- يجب أن تكون الإنجليزية أصلية وطبيعية ومناسبة للقارئ المستهدف.
- لا تترجم العبارات حرفياً إذا أدت إلى صياغة ركيكة.
- حافظ على تطابق الحقائق والأرقام والتحفظات والتوصيات بين النسختين.
- لا تضف في لغة ادعاءً غير موجود في اللغة الأخرى.
- استخدم المصطلحات الفنية المناسبة لكل لغة.
- أنشئ عنوان SEO ووصفاً تعريفياً ونصوص صور وأسئلة شائعة لكل لغة بصورة مستقلة.
- لا تنشئ رابط النسخة المقابلة أو "hreflang" من التخمين؛ استخدم بنية المسارات الفعلية في المشروع.

إذا كانت لغة واحدة فقط مطلوبة، فأنتجها دون إنشاء نسخة إضافية غير مطلوبة.

12. الصور والفيديوهات

استخدم الوسائط المقدمة أو التي تم التحقق من صحتها فقط.

- لا تخترع URL للصورة أو الفيديو.
- لا تعدّل رابطاً حقيقياً إلى رابط يبدو صحيحاً دون التحقق منه.
- لا تستخدم صورة الغلاف مرة أخرى داخل المقال بوصفها صورة مختلفة.
- اختر صورة داخلية عندما تضيف شرحاً أو مقارنة أو تفصيلاً مفيداً.
- اكتب نصاً بديلاً وصفياً، لا قائمة كلمات مفتاحية.
- لا تستخدم صورة لا تمثل المنتج أو النسخة المعنية.
- لا تضع فيديو لمجرد زيادة مدة بقاء الزائر؛ يجب أن يكون ملائماً ويعمل عبر مشغل الموقع.
- لا تفترض أن رابط HLS أو MP4 سيعمل في كل المتصفحات. تحقق من نوع الرابط ودعم المشغل عند توفر أدوات مناسبة.
- إذا تعذر التحقق من رابط وسائط، سجّله على أنه غير متحقق منه بدلاً من ضمان عمله.

لا تضف صوراً كثيرة إذا لم تكن تضيف قيمة. لا تجعل وسائط المنتج بديلاً عن المعلومات المهمة في النص.

13. روابط العمولة وتجربة المستخدم

استخدم رابط الشراء أو العمولة الذي قدمه المستخدم فقط.

لا تنشئ رابط عمولة بنفسك، ولا تغيّر معرّفات التتبع أو تخترع رابط متجر بديل.

- لا تدّعِ أن السعر أو التوفر الحالي مؤكد من دون تحقق.
- لا تجعل المقال إعلاناً؛ يجب أن يقدم فائدة حتى للقارئ الذي لا يشتري.
- استخدم دعوات إلى الشراء عندما تكون طبيعية ومرتبطة بقرار القارئ.
- لا تفرض ثلاثة أزرار شراء في كل مقال؛ استخدم العدد الذي يخدم القارئ، وعادةً لا تتجاوز ثلاثة في المقال الواحد دون سبب واضح.
- لا تضع دعوات شراء متكررة في فقرات متجاورة.
- لا تستخدم لغة ضغط أو استعجال كاذبة مثل «اشترِ الآن قبل فوات الأوان» دون أساس حقيقي.
- أظهر الإفصاح عن روابط العمولة بوضوح وفق سياسة الموقع والقواعد المعمول بها.

لون CTA المعتمد هو #2563EB. استخدم فئة CSS ومكوّن الزر الموجودين في المشروع إن توفرا، ولا تنشئ تنسيقات متعارضة. إذا لم يوجد مكوّن معتمد، استخدم اللون المحدد نفسه؛ لا تستخدم #EA580C كقيمة بديلة.

عند توليد HTML لرابط عمولة، استخدم "rel=\\"sponsored noopener noreferrer\\"" حيث يناسب نوع الرابط وسياسة المشروع. لا تغيّر تصميم الأزرار أو الأنماط العامة للموقع.

14. الأسئلة الشائعة

أنشئ الأسئلة عندما تجيب عن أسئلة حقيقية قد تؤثر في قرار الشراء، مثل التوافق أو القيود أو متطلبات الاستخدام أو الفرق بين إصدارين.

- لا تكرر نص المقال دون إضافة.
- لا تختلق أسئلة بهدف زيادة عدد الكلمات.
- لا تستخدم إجابة واثقة عندما تكون المعلومة غير مؤكدة.
- لا تنشئ عدداً ثابتاً من الأسئلة لجميع المنتجات.
- لا تضف FAQ structured data إلا إذا كانت بنية الصفحة ومحتواها يستوفيان المتطلبات الفعلية.

كل إجابة يجب أن تكون مباشرة، قصيرة بالقدر المناسب، ومستندة إلى المعلومات المتوفرة.

15. متطلبات HTML والتوافق مع AQURIVO

إذا كان المطلوب HTML، فأنشئ HTML دلالياً وسليماً ومتوافقاً مع البنية المتاحة.

- استخدم عناصر العناوين والفقرات والقوائم والجداول المناسبة.
- تأكد من توازن الوسوم وإغلاق العناصر.
- استخدم عناوين جداول واضحة و"<thead>" و"<tbody>" عند ملاءمتهما.
- اجعل النصوص واضحة وسهلة الاستخدام على الهاتف.
- استخدم فئات CSS الموجودة في المشروع عندما تكون معروفة.
- لا تضف JavaScript مضمناً أو مكتبات خارجية لمجرد تنسيق المقال.
- لا تنشئ مخططات JSON-LD بمعلومات غير موثقة.
- لا تضف تقييماً رقمياً أو مراجعات مستخدمين وهمية أو بيانات توفر غير حقيقية.
- لا تعدّل ملفات المشروع أو مكوناته أو واجهته أو قواعد بياناته إلا إذا طُلب منك صراحة تنفيذ تعديل برمجي وكان لديك سياق الكود اللازم.

يجب أن يكون المحتوى قابلاً للنشر بعد المراجعة البشرية، لا أن يُنشر تلقائياً لمجرد اكتمال التوليد.

16. مرحلة المراجعة الإلزامية

بعد كتابة المقال، نفّذ مراجعة مستقلة. لا تكتفِ بإعادة قراءة النص وكأنك تحاول الدفاع عن إجابتك الأولى.

تحقق من الآتي:

الحقائق

- هل كل رقم ومواصفة مهمان مدعومان بمصدر أو بيانات اختبار حقيقية؟
- هل تم تحديد الطراز والإصدار والمنطقة الصحيحة؟
- هل اختلطت المواصفات النظرية مع الأداء الفعلي؟
- هل يحتوي المقال على ادعاء بتجربة لم تحدث؟
- هل توجد وعود مطلقة أو عبارات تسويقية غير مثبتة؟

المصادر

- هل روابط المصادر حقيقية ومتعلقة بالادعاءات؟
- هل المصادر الرسمية أو الأدلة أفضل من المصادر الثانوية في النقاط التقنية؟
- هل تم تسجيل التناقضات والنواقص؟
- هل تم الادعاء ببحث أو تحقق لم يحدث فعلاً؟

التحرير

- هل توجد جمل متكررة أو فقرات حشو؟
- هل يجيب المقال عن أسئلة المشتري؟
- هل يوضح مَن يناسبه المنتج ومَن قد لا يناسبه؟
- هل البدائل ذات صلة ومتوافقة مع بيانات الموقع؟
- هل اللغة العربية والإنجليزية متناسقتان في الحقائق؟

SEO وHTML

- هل العنوان والوصف واضحان ومناسبان؟
- هل الوصف ضمن الطول المستهدف تقريبياً؟
- هل العناوين منطقية؟
- هل الروابط الداخلية موجودة فعلاً؟
- هل نصوص الصور صحيحة؟
- هل HTML سليم؟ وهل بيانات structured data ـ إن وجدت ـ مطابقة للمقال؟

العمولة والوسائط

- هل رابط العمولة هو الرابط المقدم نفسه؟
- هل الإفصاح واضح؟
- هل اللون المعتمد هو #2563EB؟
- هل الصور والفيديوهات حقيقية وملائمة؟
- هل توجد روابط غير متحققة يجب مراجعتها قبل النشر؟

لا تضع علامة نجاح على فحص لم تنفذه. إذا لم تتوفر أداة للتحقق، سجّل الحالة «غير متحقق».

إذا ظهر خطأ، أصلحه قبل إخراج النتيجة. إذا تعذر إصلاحه بسبب نقص الأدلة، فاذكره بوضوح ولا تُخفه داخل المقال.

17. شروط إيقاف النشر

اجعل حالة المحتوى "blocked" عندما تكون هناك مشكلة جوهرية تمنع إعداد مراجعة موثوقة، مثل:

- تعذر تحديد المنتج أو النسخة المعنية.
- غياب أساس كافٍ للتحقق من الادعاءات الرئيسية.
- عدم توفر البيانات اللازمة لمقارنة يُفترض أنها قائمة على قياسات.
- وجود تناقض جوهري لا يمكن حله.
- تعذر فصل الادعاءات المؤكدة عن المعلومات غير المتحققة.

في الحالات الأقل خطورة، يمكن استخدام "ready_for_review" مع قائمة واضحة بالقيود والتحققات المطلوبة. هذه الحالة تعني أن المحتوى جاهز للمراجعة التحريرية، ولا تعني أن كل الروابط أو تفاصيل النشر قد تم اختبارها تلقائياً.

لا تحذف التحذيرات من أجل إنتاج نتيجة تبدو مكتملة.

18. تنسيق الإخراج النهائي

أخرج النتيجة بهذا الترتيب:

أولاً: تقرير تحقق تحريري قصير خارج كتلة الكود

يتضمن:

- نوع المراجعة: اختبار فعلي، أم مراجعة مبنية على المصادر، أم نوع آخر.
- أهم المصادر المستخدمة.
- الحقائق المهمة التي لم يمكن التحقق منها.
- أي عوائق تمنع النشر.
- الحالة النهائية: "ready_for_review" أو "blocked".

ثانياً: كتلة كود واحدة بصيغة JSON صالحة

ضع داخلها البيانات النهائية للمقال، ولا تضع أي تعليق أو نص إضافي داخل كتلة JSON.

استخدم الهيكل التالي إن لم يفرض المشروع مخطط بيانات موجوداً يجب الالتزام به:

{
"status": "ready_for_review",
"product": {
"name": "",
"model": "",
"category": "",
"market_or_region": ""
},
"seo": {
"ar": {
"title": "",
"meta_description": "",
"slug": ""
},
"en": {
"title": "",
"meta_description": "",
"slug": ""
}
},
"editorial": {
"review_type": "source_based_review",
"hands_on_testing_performed": false,
"limitations": []
},
"content": {
"ar": {
"title": "",
"excerpt": "",
"html": "",
"faq": [
{
"question": "",
"answer": ""
}
]
},
"en": {
"title": "",
"excerpt": "",
"html": "",
"faq": [
{
"question": "",
"answer": ""
}
]
}
},
"media": [
{
"role": "cover",
"url": "",
"alt_ar": "",
"alt_en": "",
"verification": "supplied"
}
],
"affiliate": {
"url": "",
"cta_color": "#2563EB",
"disclosure_ar": "",
"disclosure_en": ""
},
"internal_links": [
{
"url": "",
"anchor_ar": "",
"anchor_en": "",
"verification": "verified"
}
],
"sources": [
{
"claim_supported": "",
"source_name": "",
"url": "",
"source_type": "official",
"verification": "verified"
}
],
"validation": {
"facts_checked": true,
"links_checked": true,
"html_checked": true,
"bilingual_consistency_checked": true,
"unresolved_issues": []
}
}

قواعد JSON:

- يجب أن يكون JSON صالحاً فعلاً، بلا تعليقات أو فاصلات زائدة.
- استخدم سلاسل نصية صحيحة، واهرب علامات الاقتباس والأسطر الجديدة عند الحاجة.
- لا تملأ حقلاً بمعلومة مختلقة لمجرد أنه موجود في المخطط؛ استخدم القيمة المناسبة أو قائمة فارغة عندما تكون المعلومة غير متاحة.
- لا تضع حالة تحقق "verified" إلا إذا تحقق منها فعلياً.
- استخدم HTML داخل حقلي "html" إذا كان ذلك متوافقاً مع المحرر الحالي.
- إذا كان المشروع يستخدم مخططاً مختلفاً ومحدداً مسبقاً، فالتزم بالمخطط الفعلي بدلاً من فرض هذا النموذج عليه.

19. تعليمات التنفيذ الأخيرة

ابدأ بفحص المدخلات والمصادر، ثم حدد نوع المراجعة، وبعد ذلك اكتب المحتوى، ونفذ التدقيق، وأخرج النتيجة بالشكل المحدد.

لا تتجاهل قاعدة سابقة لإكمال قاعدة لاحقة. دقة الحقائق أهم من عدد الكلمات، والشفافية أهم من الإقناع التسويقي، وفائدة القارئ أهم من كثرة الكلمات المفتاحية.

القاعدة النهائية: لا تخترع ما لا تعرفه، ولا تدّعِ أنك اختبرت ما لم تختبره، ولا تنشئ رابطاً أو نتيجة تحقق لم تحدث فعلاً.`;

export function buildDynamicArticleAiPrompt(
  products: Array<{
    id: string;
    slug: string;
    title: { ar?: string; en?: string };
    categoryId?: string;
    categorySlug?: string;
    price?: number | null;
    priceAmount?: number | null;
    priceCurrency?: string;
    stars?: number | null;
    affiliateUrl?: string;
    images?: Array<{ url: string; alt?: { ar?: string; en?: string } }>;
    videoUrl?: string;
    videoUrls?: string[];
    comparisonDna?: {
      bestFor?: { ar?: string; en?: string };
      keySpecs?: { ar?: string[]; en?: string[] };
    };
  }> = [],
  categories: Array<{
    id: string;
    slug: string;
    name: { ar?: string; en?: string };
  }> = [],
  handoffBrief?: AgentHandoffBrief | null,
  affiliateOptions?: {
    affiliateUrl?: string;
    highlightColor?: string;
  }
): string {
  const categoryLines = categories
    .map((c) => `- ${c.slug || c.id}: ${c.name?.ar || ''} | ${c.name?.en || ''}`)
    .join('\n');

  const productLines = products
    .slice(0, 80)
    .map((p) => {
      const cat = p.categorySlug || p.categoryId || 'general';
      const img = p.images?.[0]?.url || '';
      const numericPrice =
        typeof p.priceAmount === 'number'
          ? p.priceAmount
          : typeof p.price === 'number'
            ? p.price
            : null;
      const currency = p.priceCurrency || 'USD';
      const priceStr =
        numericPrice !== null && numericPrice > 0
          ? ` | السعر: ${numericPrice} ${currency}`
          : '';
      const ratingStr =
        typeof p.stars === 'number' && p.stars > 0 ? ` | التقييم: ★${p.stars}` : '';
      const bestForStr = p.comparisonDna?.bestFor?.ar
        ? ` | الأنسب لـ: ${p.comparisonDna.bestFor.ar}`
        : '';
      return `- [slug: ${p.slug}] (الفئة: ${cat}${priceStr}${ratingStr}${bestForStr}) AR: "${p.title?.ar || ''}" | EN: "${p.title?.en || ''}"${img ? ` | Image: ${img}` : ''}`;
    })
    .join('\n');

  const resolvedAffiliateUrl =
    affiliateOptions?.affiliateUrl?.trim() ||
    handoffBrief?.sourceProductUrl?.trim() ||
    (handoffBrief?.productSlug ? `/go/${handoffBrief.productSlug}?ref=article_cta` : '[AFFILIATE_LINK]');

  const resolvedColor = normalizeHexColor(affiliateOptions?.highlightColor, '#2563EB');
  const presetInfo = AFFILIATE_CTA_COLOR_PRESETS.find(
    (p) => p.hex.toUpperCase() === resolvedColor
  );
  const colorLabel = presetInfo ? `${resolvedColor} (${presetInfo.nameAr})` : resolvedColor;

  const affiliateCtaDirectiveSection = [
    `\n---`,
    `🎨 🔗 إعدادات دمج رابط العمولة وتلوين الكلمات التحفيزية (Contextual Affiliate CTA Settings):`,
    `- رابط العمولة المطلوب دمجه في الكلمات المحفزة للشراء: ${resolvedAffiliateUrl}`,
    `- اللون المميز المطلوب للكلمات التحفيزية: ${colorLabel}`,
    `- كود دمج الرابط المعتمد:`,
    `  <a href="${resolvedAffiliateUrl}" class="affiliate-cta-link" data-affiliate-cta="true" data-cta-color="${resolvedColor}" style="--cta-color: ${resolvedColor};" target="_blank" rel="sponsored noopener noreferrer">العبارة التحفيزية هنا</a>`,
    `- تنبيه: لا تستخدم هذا الكود أو اللون على روابط يوتيوب أو الفيديوهات؛ هذا التلوين خاص بروابط شراء المنتج فقط.`,
  ].join('\n');

  const handoffSection = handoffBrief
    ? `\n---\n${formatAgentHandoffBriefText(handoffBrief)}\n`
    : `\n---\n🎯 المنتج أو الموضوع المطلوب البحث عنه في الويب وكتابة مراجعة ومقال خاص به:\n[اختر المنتج من منتقي المنتجات في لوحة التحكم أو اكتب اسم/رابط المنتج هنا]\n`;

  return `${MAGIC_ARTICLE_AI_PROMPT_TEMPLATE}
${affiliateCtaDirectiveSection}
---
📌 فهرس منتجات متجر AQURIVO (اربط منه فقط البدائل القابلة للمقارنة المباشرة منطقياً مع المنتج الأساسي؛ وإن لم يوجد بديل مباشر من نفس نوع الاستخدام، اكتفِ بوضع slug المنتج الأساسي وحده فقط في [المنتجات المقترحة]):

الفئات المتاحة في المتجر:
${categoryLines || '- electronics, home, health, sports, fashion'}

المنتجات المنشورة حالياً في متجر AQURIVO:
${productLines || '- تصفح https://aqurivo.store/ar/products لاستخراج أحدث المنتجات.'}
${handoffSection}`;
}

export function parseMagicArticleContent(
  rawInput: string,
  affiliateOptions?: {
    affiliateUrl?: string;
    highlightColor?: string;
  }
): {
  draft: ParsedArticleDraft;
  fieldsFoundCount: number;
} {
  let text = rawInput.trim();
  if (!text) {
    return { draft: {}, fieldsFoundCount: 0 };
  }

  let preBlockReport: string | undefined;

  const codeBlockMatch = text.match(/```(?:text|markdown|html|json)?\s*\n([\s\S]*?)\n```/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    const beforeIndex = codeBlockMatch.index || 0;
    const rawBefore = text.slice(0, beforeIndex).trim();
    if (rawBefore.length > 10) {
      preBlockReport = rawBefore;
    }
    text = codeBlockMatch[1].trim();
  } else if (text.startsWith('```')) {
    text = text.replace(/^```[a-zA-Z0-9_-]*\n?/, '').replace(/\n?```$/, '').trim();
  }

  const draft: ParsedArticleDraft = {};
  if (preBlockReport) {
    draft.agentReport = preBlockReport;
  }

  // 1. JSON format support
  if (text.startsWith('{') && text.endsWith('}')) {
    try {
      const obj = JSON.parse(text) as Record<string, any>;
      // Map slug
      if (obj.slug) draft.slug = cleanExtractedText(String(obj.slug));
      else if (obj.seo?.ar?.slug) draft.slug = cleanExtractedText(String(obj.seo.ar.slug));
      else if (obj.seo?.en?.slug) draft.slug = cleanExtractedText(String(obj.seo.en.slug));

      // Map titles
      if (obj.titleAr) draft.titleAr = cleanExtractedText(String(obj.titleAr));
      else if (obj.title?.ar) draft.titleAr = cleanExtractedText(String(obj.title.ar));
      else if (obj.content?.ar?.title) draft.titleAr = cleanExtractedText(String(obj.content.ar.title));

      if (obj.titleEn) draft.titleEn = cleanExtractedText(String(obj.titleEn));
      else if (obj.title?.en) draft.titleEn = cleanExtractedText(String(obj.title.en));
      else if (obj.content?.en?.title) draft.titleEn = cleanExtractedText(String(obj.content.en.title));

      // Map excerpts
      if (obj.excerptAr) draft.excerptAr = cleanExtractedText(String(obj.excerptAr));
      else if (obj.excerpt?.ar) draft.excerptAr = cleanExtractedText(String(obj.excerpt.ar));
      else if (obj.content?.ar?.excerpt) draft.excerptAr = cleanExtractedText(String(obj.content.ar.excerpt));

      if (obj.excerptEn) draft.excerptEn = cleanExtractedText(String(obj.excerptEn));
      else if (obj.excerpt?.en) draft.excerptEn = cleanExtractedText(String(obj.excerpt.en));
      else if (obj.content?.en?.excerpt) draft.excerptEn = cleanExtractedText(String(obj.content.en.excerpt));

      // Map content HTML
      if (obj.contentAr) draft.contentAr = String(obj.contentAr).trim();
      else if (obj.contentHtml?.ar) draft.contentAr = String(obj.contentHtml.ar).trim();
      else if (obj.content?.ar?.html) draft.contentAr = String(obj.content.ar.html).trim();

      if (obj.contentEn) draft.contentEn = String(obj.contentEn).trim();
      else if (obj.contentHtml?.en) draft.contentEn = String(obj.contentHtml.en).trim();
      else if (obj.content?.en?.html) draft.contentEn = String(obj.content.en.html).trim();

      // Map editor verdict / recommendation
      if (obj.editorVerdictAr) draft.editorVerdictAr = cleanExtractedText(String(obj.editorVerdictAr));
      else if (obj.editorVerdict?.ar) draft.editorVerdictAr = cleanExtractedText(String(obj.editorVerdict.ar));

      if (obj.editorVerdictEn) draft.editorVerdictEn = cleanExtractedText(String(obj.editorVerdictEn));
      else if (obj.editorVerdict?.en) draft.editorVerdictEn = cleanExtractedText(String(obj.editorVerdict.en));

      // Map SEO fields
      if (obj.seoTitleAr) draft.seoTitleAr = cleanExtractedText(String(obj.seoTitleAr));
      else if (obj.seoTitle?.ar) draft.seoTitleAr = cleanExtractedText(String(obj.seoTitle.ar));
      else if (obj.seo?.ar?.title) draft.seoTitleAr = cleanExtractedText(String(obj.seo.ar.title));

      if (obj.seoTitleEn) draft.seoTitleEn = cleanExtractedText(String(obj.seoTitleEn));
      else if (obj.seoTitle?.en) draft.seoTitleEn = cleanExtractedText(String(obj.seoTitle.en));
      else if (obj.seo?.en?.title) draft.seoTitleEn = cleanExtractedText(String(obj.seo.en.title));

      if (obj.seoDescriptionAr) draft.seoDescriptionAr = cleanExtractedText(String(obj.seoDescriptionAr));
      else if (obj.seoDescription?.ar) draft.seoDescriptionAr = cleanExtractedText(String(obj.seoDescription.ar));
      else if (obj.seo?.ar?.meta_description) draft.seoDescriptionAr = cleanExtractedText(String(obj.seo.ar.meta_description));

      if (obj.seoDescriptionEn) draft.seoDescriptionEn = cleanExtractedText(String(obj.seoDescriptionEn));
      else if (obj.seoDescription?.en) draft.seoDescriptionEn = cleanExtractedText(String(obj.seoDescription.en));
      else if (obj.seo?.en?.meta_description) draft.seoDescriptionEn = cleanExtractedText(String(obj.seo.en.meta_description));

      if (Array.isArray(obj.seoKeywords)) draft.seoKeywords = obj.seoKeywords.join(', ');
      else if (typeof obj.seoKeywords === 'string') draft.seoKeywords = obj.seoKeywords;

      if (obj.authorName) draft.authorName = cleanExtractedText(String(obj.authorName));
      if (obj.readingTimeMinutes) draft.readingTimeMinutes = String(obj.readingTimeMinutes);

      // Category
      if (obj.categoryId) draft.categoryId = cleanExtractedText(String(obj.categoryId));
      else if (obj.product?.category) draft.categoryId = cleanExtractedText(String(obj.product.category));

      // Media / Cover
      if (obj.coverImage) draft.coverImage = cleanExtractedText(String(obj.coverImage));
      else if (Array.isArray(obj.media)) {
        const coverItem = obj.media.find((m: any) => m?.role === 'cover' && m?.url) || obj.media[0];
        if (coverItem?.url) draft.coverImage = cleanExtractedText(String(coverItem.url));
      }

      // Affiliate CTA
      if (obj.affiliate?.url) draft.affiliateCtaUrl = cleanExtractedText(String(obj.affiliate.url));
      else if (obj.affiliateCtaUrl) draft.affiliateCtaUrl = cleanExtractedText(String(obj.affiliateCtaUrl));

      if (obj.affiliate?.cta_color) draft.affiliateCtaColor = cleanExtractedText(String(obj.affiliate.cta_color));
      else if (obj.affiliateCtaColor) draft.affiliateCtaColor = cleanExtractedText(String(obj.affiliateCtaColor));

      // Related products / Internal links
      if (Array.isArray(obj.relatedProducts || obj.relatedProductIds)) {
        draft.relatedProductsQuery = (obj.relatedProducts || obj.relatedProductIds)
          .map((item: unknown) => cleanExtractedText(String(item)))
          .filter(Boolean);
      } else if (Array.isArray(obj.internal_links)) {
        draft.relatedProductsQuery = obj.internal_links
          .map((item: any) => cleanExtractedText(String(item?.url || item)))
          .filter(Boolean);
      } else if (typeof obj.relatedProducts === 'string') {
        draft.relatedProductsQuery = obj.relatedProducts
          .split(/[،,\n|]+/)
          .map((s: string) => cleanExtractedText(s))
          .filter(Boolean);
      }

      // FAQ items
      if (Array.isArray(obj.faqItems)) {
        draft.faqItems = obj.faqItems;
      } else {
        const arFaq = Array.isArray(obj.content?.ar?.faq) ? obj.content.ar.faq : [];
        const enFaq = Array.isArray(obj.content?.en?.faq) ? obj.content.en.faq : [];
        const maxLen = Math.max(arFaq.length, enFaq.length);
        if (maxLen > 0) {
          draft.faqItems = [];
          for (let i = 0; i < maxLen; i++) {
            const itemAr = arFaq[i] || {};
            const itemEn = enFaq[i] || {};
            const qAr = itemAr.question || itemEn.question || '';
            const qEn = itemEn.question || itemAr.question || '';
            const aAr = itemAr.answer || itemEn.answer || '';
            const aEn = itemEn.answer || itemAr.answer || '';
            if (qAr || qEn) {
              draft.faqItems.push({
                question: { ar: qAr, en: qEn },
                answer: { ar: aAr, en: aEn },
              });
            }
          }
        }
      }

      const effectiveAffiliateUrl =
        affiliateOptions?.affiliateUrl?.trim() || draft.affiliateCtaUrl?.trim() || '';
      const effectiveHighlightColor = normalizeHexColor(
        affiliateOptions?.highlightColor || draft.affiliateCtaColor,
        '#2563EB'
      );

      if (draft.contentAr) {
        draft.contentAr = applyAffiliateCtaStylingToHtml(
          draft.contentAr,
          effectiveAffiliateUrl,
          effectiveHighlightColor
        );
      }
      if (draft.contentEn) {
        draft.contentEn = applyAffiliateCtaStylingToHtml(
          draft.contentEn,
          effectiveAffiliateUrl,
          effectiveHighlightColor
        );
      }

      const count = Object.values(draft).filter(
        (v) => v !== undefined && v !== '' && (!Array.isArray(v) || v.length > 0)
      ).length;
      return { draft, fieldsFoundCount: count };
    } catch {
      // Fallback to tagged text
    }
  }

  // 2. Tagged key-value extraction
  const taggedReport = extractFirstMatch(text, [
    /\[(?:تقرير\s*الفحص|تقرير\s*الوكيل|ملخص\s*الفحص|Agent\s*Report|Discovery\s*Report)\]\s*:\s*([\s\S]*?)(?=\n\s*\[|$)/i,
  ]);
  if (taggedReport) {
    draft.agentReport = draft.agentReport
      ? `${taggedReport}\n${draft.agentReport}`
      : taggedReport;
  }

  draft.titleAr = extractFirstMatch(text, [
    /\[(?:العنوان\s*بالعربية|عنوان\s*المقال\s*بالعربية|Title\s*AR)\]\s*:\s*([^\n\[]+)/i,
  ]);
  draft.titleEn = extractFirstMatch(text, [
    /\[(?:العنوان\s*بالإنجليزية|عنوان\s*المقال\s*بالإنجليزية|Title\s*EN)\]\s*:\s*([^\n\[]+)/i,
  ]);
  draft.slug = extractFirstMatch(text, [
    /\[(?:الرابط\s*slug|slug|المعرف)\]\s*:\s*([^\n\[]+)/i,
  ]);
  draft.excerptAr = extractFirstMatch(text, [
    /\[(?:المقتطف\s*بالعربية|الملخص\s*بالعربية|Excerpt\s*AR)\]\s*:\s*([\s\S]*?)(?=\n\s*\[|$)/i,
  ]);
  draft.excerptEn = extractFirstMatch(text, [
    /\[(?:المقتطف\s*بالإنجليزية|الملخص\s*بالإنجليزية|Excerpt\s*EN)\]\s*:\s*([\s\S]*?)(?=\n\s*\[|$)/i,
  ]);
  draft.seoTitleAr = extractFirstMatch(text, [
    /\[(?:عنوان\s*SEO\s*بالعربية|SEO\s*Title\s*AR)\]\s*:\s*([^\n\[]+)/i,
  ]);
  draft.seoTitleEn = extractFirstMatch(text, [
    /\[(?:عنوان\s*SEO\s*بالإنجليزية|SEO\s*Title\s*EN)\]\s*:\s*([^\n\[]+)/i,
  ]);
  draft.seoDescriptionAr = extractFirstMatch(text, [
    /\[(?:وصف\s*SEO\s*بالعربية|SEO\s*Description\s*AR)\]\s*:\s*([\s\S]*?)(?=\n\s*\[|$)/i,
  ]);
  draft.seoDescriptionEn = extractFirstMatch(text, [
    /\[(?:وصف\s*SEO\s*بالإنجليزية|SEO\s*Description\s*EN)\]\s*:\s*([\s\S]*?)(?=\n\s*\[|$)/i,
  ]);
  draft.seoKeywords = extractFirstMatch(text, [
    /\[(?:الكلمات\s*المفتاحية|الوسوم|SEO\s*Keywords|Keywords)\]\s*:\s*([^\n\[]+)/i,
  ]);
  draft.authorName = extractFirstMatch(text, [
    /\[(?:الكاتب|اسم\s*الكاتب|Author)\]\s*:\s*([^\n\[]+)/i,
  ]);
  draft.readingTimeMinutes = extractFirstMatch(text, [
    /\[(?:وقت\s*القراءة|Reading\s*Time)\]\s*:\s*(\d+)/i,
  ]);
  draft.categoryId = extractFirstMatch(text, [
    /\[(?:الفئة|Category)\]\s*:\s*([^\n\[]+)/i,
  ]);

  const rawRelatedProducts = extractFirstMatch(text, [
    /\[(?:المنتجات\s*المقترحة|المنتجات\s*المدمجة|المنتجات\s*المرتبطة|المنتجات\s*المقارنة|Related\s*Products|Recommended\s*Products)\]\s*:\s*([^\n\[]+)/i,
  ]);
  if (rawRelatedProducts) {
    draft.relatedProductsQuery = rawRelatedProducts
      .split(/[،,\n|]+/)
      .map((item) => cleanExtractedText(item))
      .filter(Boolean);
  }

  draft.coverImage = extractFirstMatch(text, [
    /\[(?:صورة\s*الغلاف|رابط\s*صورة\s*الغلاف|الغلاف|Cover\s*Image)\]\s*:\s*([^\n\[]+)/i,
  ]);
  draft.affiliateCtaUrl = extractFirstMatch(text, [
    /\[(?:رابط\s*العمولة\s*المدمج|رابط\s*العمولة|رابط\s*الافلييت|Affiliate\s*URL|Affiliate\s*Link)\]\s*:\s*(https?:\/\/[^\s\n\[]+|\/go\/[^\s\n\[]+)/i,
  ]);
  draft.affiliateCtaColor = extractFirstMatch(text, [
    /\[(?:لون\s*الكلمات\s*التحفيزية|لون\s*الرابط\s*التحفيزي|Highlight\s*Color|CTA\s*Color)\]\s*:\s*(#[0-9a-fA-F]{3,6})/i,
  ]);
  draft.contentAr = extractFirstMatch(text, [
    /\[(?:المحتوى\s*بالعربية|محتوى\s*الدليل\s*بالعربية|Content\s*AR)\]\s*:\s*([\s\S]*?)(?=\n\s*\[(?:المحتوى\s*بالإنجليزية|خلاصة|سؤال|إجابة|Content\s*EN|Editor|FAQ)|$)/i,
  ]);
  draft.contentEn = extractFirstMatch(text, [
    /\[(?:المحتوى\s*بالإنجليزية|محتوى\s*الدليل\s*بالإنجليزية|Content\s*EN)\]\s*:\s*([\s\S]*?)(?=\n\s*\[(?:المحتوى\s*بالعربية|خلاصة|سؤال|إجابة|Editor|FAQ)|$)/i,
  ]);

  const effectiveAffiliateUrl =
    affiliateOptions?.affiliateUrl?.trim() || draft.affiliateCtaUrl?.trim() || '';
  const effectiveHighlightColor = normalizeHexColor(
    affiliateOptions?.highlightColor || draft.affiliateCtaColor,
    '#EA580C'
  );

  if (draft.contentAr) {
    draft.contentAr = applyAffiliateCtaStylingToHtml(
      draft.contentAr,
      effectiveAffiliateUrl,
      effectiveHighlightColor
    );
  }
  if (draft.contentEn) {
    draft.contentEn = applyAffiliateCtaStylingToHtml(
      draft.contentEn,
      effectiveAffiliateUrl,
      effectiveHighlightColor
    );
  }
  draft.editorVerdictAr = extractFirstMatch(text, [
    /\[(?:خلاصة\s*المحرر\s*بالعربية|توصية\s*المحرر\s*بالعربية|Editor\s*Verdict\s*AR)\]\s*:\s*([\s\S]*?)(?=\n\s*\[|$)/i,
  ]);
  draft.editorVerdictEn = extractFirstMatch(text, [
    /\[(?:خلاصة\s*المحرر\s*بالإنجليزية|توصية\s*المحرر\s*بالإنجليزية|Editor\s*Verdict\s*EN)\]\s*:\s*([\s\S]*?)(?=\n\s*\[|$)/i,
  ]);

  const faqItems: Array<{
    question: { ar: string; en: string };
    answer: { ar: string; en: string };
  }> = [];

  for (let i = 1; i <= 5; i++) {
    const qAr = extractFirstMatch(text, [
      new RegExp(`\\[(?:سؤال\\s*${i}\\s*بالعربية|FAQ\\s*${i}\\s*Q\\s*AR)\\]\\s*:\\s*([\\s\\S]*?)(?=\\n\\s*\\[|$)`, 'i'),
    ]);
    const aAr = extractFirstMatch(text, [
      new RegExp(`\\[(?:إجابة\\s*${i}\\s*بالعربية|اجابة\\s*${i}\\s*بالعربية|FAQ\\s*${i}\\s*A\\s*AR)\\]\\s*:\\s*([\\s\\S]*?)(?=\\n\\s*\\[|$)`, 'i'),
    ]);
    const qEn = extractFirstMatch(text, [
      new RegExp(`\\[(?:سؤال\\s*${i}\\s*بالإنجليزية|FAQ\\s*${i}\\s*Q\\s*EN)\\]\\s*:\\s*([\\s\\S]*?)(?=\\n\\s*\\[|$)`, 'i'),
    ]);
    const aEn = extractFirstMatch(text, [
      new RegExp(`\\[(?:إجابة\\s*${i}\\s*بالإنجليزية|اجابة\\s*${i}\\s*بالإنجليزية|FAQ\\s*${i}\\s*A\\s*EN)\\]\\s*:\\s*([\\s\\S]*?)(?=\\n\\s*\\[|$)`, 'i'),
    ]);

    if ((qAr || qEn) && (aAr || aEn)) {
      faqItems.push({
        question: { ar: qAr || qEn || '', en: qEn || qAr || '' },
        answer: { ar: aAr || aEn || '', en: aEn || aAr || '' },
      });
    }
  }

  if (faqItems.length > 0) {
    draft.faqItems = faqItems;
  }

  const count = Object.values(draft).filter(
    (v) => v !== undefined && v !== '' && (!Array.isArray(v) || v.length > 0)
  ).length;
  return { draft, fieldsFoundCount: count };
}
