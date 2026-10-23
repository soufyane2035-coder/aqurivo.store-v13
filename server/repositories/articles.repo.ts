import 'server-only';
import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache';
import { getAdminDb, invalidateCollectionCache } from '@/server/config/firebase-admin';
import type { Article, ArticleFaqItem, ArticleCardDto } from '@/types';
import {
  sanitizeEditorialHtml,
  sanitizePlainText,
  validateLocalizedText,
  validateSlug,
} from '@/server/validators';
import { listAllCategoriesAdmin } from './categories.repo';

const COLLECTION = 'articles';
const ARTICLES_CACHE_TTL_MS = 30 * 1000; // 30 seconds in-memory

let publishedArticlesCache: { data: Article[]; expiresAt: number } | null = null;
let publishedArticlesInFlight: Promise<Article[]> | null = null;

export function invalidateArticlesCache(articleSlug?: string): void {
  publishedArticlesCache = null;
  publishedArticlesInFlight = null;
  invalidateCollectionCache(COLLECTION);
  try {
    revalidateTag('articles');
    revalidatePath('/', 'layout');
    revalidatePath('/[locale]/guides', 'page');
    revalidatePath('/ar/guides');
    revalidatePath('/en/guides');
    revalidatePath('/guides');
    revalidatePath('/blog');
    revalidatePath('/ar/blog');
    revalidatePath('/en/blog');
    revalidatePath('/admin/articles');
    revalidatePath('/admin/articles/new');
    revalidatePath('/[locale]', 'page');
    revalidatePath('/ar');
    revalidatePath('/en');
    if (articleSlug) {
      revalidatePath(`/[locale]/guides/${articleSlug}`, 'page');
      revalidatePath(`/ar/guides/${articleSlug}`);
      revalidatePath(`/en/guides/${articleSlug}`);
    }
  } catch {
    // Ignore outside request context
  }
}

const DEFAULT_ARTICLES: Article[] = [
  {
    id: 'best-wireless-headphones-guide-2026',
    slug: 'best-wireless-headphones-guide-2026',
    title: {
      ar: 'أفضل 5 سماعات رأس لاسلكية عازلة للضوضاء في 2026',
      en: 'Top 5 Wireless Noise-Cancelling Headphones in 2026',
    },
    excerpt: {
      ar: 'دليل شامل ومقارنة عملية لأفضل سماعات الرأس اللاسلكية مع مراجعة جودة العزل والبطارية والراحة.',
      en: 'In-depth comparison of top wireless ANC headphones with real-world battery, audio fidelity, and comfort testing.',
    },
    contentHtml: {
      ar: '<h2>لماذا تحتاج سماعات عازلة للضوضاء؟</h2><p>تعتبر سماعات العزل النشط (ANC) رفيقاً أساسياً للعمل والتركيز والسفر. قمنا بتجربة أبرز الخيارات المتوفرة للوصول إلى الخيارات الأفضل قيمة وجودة.</p><h2>أهم المعايير لاختيار السماعة المناسبة</h2><p>عند الشراء، ركز على: كفاءة عزل الصوت المحيط، عمر البطارية الذي يجب ألا يقل عن 30 ساعة، والراحة عند الاستخدام الطويل.</p><h2>نصيحة للشراء الذكي</h2><p>اختر السماعة التي توفر توازناً بين الميكروفون الواضح للمكالمات وسهولة التنقل بين الأجهزة الذكية عبر البلوتوث الحديث.</p>',
      en: '<h2>Why Invest in Active Noise Cancelling?</h2><p>ANC headphones are essential for high-focus work, travel, and daily commuting. We evaluated the top market contenders to bring you verified recommendations.</p><h2>Key Buying Criteria</h2><p>Look for dynamic frequency response, long battery life (30+ hours), and comfortable memory foam padding.</p>',
    },
    coverImage: '/images/hero-bg.jpg',
    authorName: 'AQURIVO Editorial Team',
    seoTitle: {
      ar: 'أفضل 5 سماعات لاسلكية عازلة للضوضاء 2026 — دليل الشراء | AQURIVO',
      en: 'Top 5 Wireless ANC Headphones 2026 — Buying Guide | AQURIVO',
    },
    seoDescription: {
      ar: 'مقارنة شاملة لأفضل سماعات الرأس اللاسلكية العازلة للضوضاء لعام 2026 من حيث الصوت والبطارية والسعر.',
      en: 'Compare the best wireless noise-cancelling headphones in 2026 tested for comfort, ANC depth, and battery life.',
    },
    seoKeywords: [
      'أفضل سماعات لاسلكية',
      'سماعات عازلة للضوضاء 2026',
      'best ANC headphones',
      'wireless headphones buying guide',
    ],
    editorVerdict: {
      ar: 'إذا كنت تبحث عن أفضل قيمة مقابل السعر مع عزل ممتاز وبطارية تدوم طوال الأسبوع، اختر السماعة ذات وسائد الميموري فوم ودعم الاتصال المزدوج.',
      en: 'For the best balance of active noise cancellation, all-day comfort, and multi-device pairing, prioritize models with 30+ hours of battery life.',
    },
    faqItems: [
      {
        question: {
          ar: 'هل تؤثر ميزة عزل الضوضاء النشط (ANC) على عمر البطارية؟',
          en: 'Does Active Noise Cancellation (ANC) reduce battery life?',
        },
        answer: {
          ar: 'نعم، تشغيل العزل النشط يستهلك حوالي 15% إلى 20% إضافية من البطارية، لكن السماعات الحديثة توفر ما بين 30 إلى 40 ساعة حتى مع تفعيل العزل.',
          en: 'Yes, enabling ANC typically uses 15-20% more power, though modern flagship headphones still deliver 30 to 40 hours with ANC on.',
        },
      },
      {
        question: {
          ar: 'هل يمكن استخدام السماعات اللاسلكية أثناء الشحن أو عبر السلك؟',
          en: 'Can wireless headphones be used with an audio cable?',
        },
        answer: {
          ar: 'معظم سماعات الرأس الاحترافية تأتي بمنفذ 3.5 ملم أو USB-C يتيح استخدامها سلكياً حتى عند نفاد البطارية.',
          en: 'Most over-ear ANC headphones include a 3.5mm or USB-C audio cable for wired listening when the battery runs low.',
        },
      },
    ],
    categoryId: 'electronics',
    categorySlug: 'electronics',
    categoryName: { ar: 'إلكترونيات', en: 'Electronics' },
    relatedProductIds: [],
    readingTimeMinutes: 5,
    status: 'published',
    publishedAt: '2026-03-15T10:00:00.000Z',
    updatedAt: '2026-03-15T10:00:00.000Z',
  },
  {
    id: 'smart-home-essentials-buying-guide',
    slug: 'smart-home-essentials-buying-guide',
    title: {
      ar: 'دليل تأسيس المنزل الذكي: أهم الأجهزة الأساسية للمبتدئين',
      en: 'Smart Home Essentials: The Beginner Buying Guide',
    },
    excerpt: {
      ar: 'كيف تبدأ في تحويل منزلك إلى منزل ذكي خطوة بخطوة بأقل تكلفة ودون تعقيد في الإعداد.',
      en: 'A step-by-step guide to setting up your first smart home devices without breaking the bank.',
    },
    contentHtml: {
      ar: '<h2>البداية البسيطة: الإضاءة والمقابس الذكية</h2><p>أسهل وأسرع طريقة للبدء هي المقابس الذكية التي تمكنك من التحكم بأي جهاز كهربائي عبر هاتفك وجدولة أوقات التشغيل والإيقاف تلقائياً.</p><h2>أجهزة الاستشعار والأمان</h2><p>إضافة حساسات الحركة والكاميرات الذكية يمنحك راحة بال وتحكماً كاملاً في استهلاك الطاقة وحماية المنزل أثناء غيابك.</p>',
      en: '<h2>Start Simple: Smart Plugs and Lighting</h2><p>Smart plugs give you immediate remote control over coffee makers, lamps, and chargers via your phone.</p><h2>Sensors and Home Security</h2><p>Motion sensors and wireless cameras provide effortless peace of mind and energy savings.</p>',
    },
    coverImage: '/images/hero-bg.jpg',
    authorName: 'AQURIVO Editorial Team',
    seoTitle: {
      ar: 'دليل تأسيس المنزل الذكي للمبتدئين بأقل تكلفة | AQURIVO',
      en: 'Smart Home Essentials Buying Guide for Beginners | AQURIVO',
    },
    seoDescription: {
      ar: 'تعرف على أهم أجهزة المنزل الذكي للمبتدئين وكيفية اختيار المقابس والإضاءة الذكية المتوافقة.',
      en: 'Discover essential smart home devices, from Wi-Fi smart plugs to automated lighting and security sensors.',
    },
    seoKeywords: ['منزل ذكي', 'أجهزة ذكية للمنزل', 'smart home guide', 'smart plugs'],
    editorVerdict: {
      ar: 'ابدأ دائماً بالمقابس الذكية والإضاءة المتوافقة مع Wi-Fi مباشر دون الحاجة لجهاز مركزي معقد.',
      en: 'Start with hub-free Wi-Fi smart plugs and dimmable bulbs before expanding to full home automation.',
    },
    faqItems: [
      {
        question: {
          ar: 'هل أحتاج إلى سرعة إنترنت عالية لتشغيل أجهزة المنزل الذكي؟',
          en: 'Do smart home devices require high-speed internet?',
        },
        answer: {
          ar: 'لا، معظم المقابس والمصابيح الذكية تستهلك قدراً ضئيلاً جداً من البيانات وتعمل بكفاءة على أي شبكة Wi-Fi منزلية بتردد 2.4GHz.',
          en: 'No, smart plugs and lights use minimal bandwidth and work reliably on standard 2.4GHz home Wi-Fi networks.',
        },
      },
    ],
    categoryId: 'home',
    categorySlug: 'home',
    categoryName: { ar: 'المنزل والمطبخ', en: 'Home & Kitchen' },
    relatedProductIds: [],
    readingTimeMinutes: 4,
    status: 'published',
    publishedAt: '2026-03-10T10:00:00.000Z',
    updatedAt: '2026-03-10T10:00:00.000Z',
  },
  {
    id: 'fitness-tracker-vs-smartwatch-guide',
    slug: 'fitness-tracker-vs-smartwatch-guide',
    title: {
      ar: 'مقارنة شاملة: سوار اللياقة البدنية أم الساعة الذكية؟ أيهما تختار؟',
      en: 'Fitness Tracker vs Smartwatch: Which One Should You Buy?',
    },
    excerpt: {
      ar: 'مقارنة عملية توضح الفروقات الجوهرية في البطارية والميزات والسعر لمساعدتك في اتخاذ القرار الصحيح.',
      en: 'A practical head-to-head comparison covering battery life, sensors, and everyday usability.',
    },
    contentHtml: {
      ar: '<h2>عمر البطارية مقابل الميزات المتقدمة</h2><p>إذا كنت تبحث عن جهاز ترتديه لأسبوعين دون شحن لتتبع الخطوات والنوم، فإن أساور اللياقة هي الخيار المثالي. أما إذا كنت تحتاج لإجراء المكالمات والرد على الإشعارات، فالساعة الذكية تناسبك أكثر.</p><h2>دقة الحساسات وتتبع التمارين</h2><p>كلا الخيارين يقدمان الآن دقة ممتازة في قياس نبضات القلب ومستوى الأكسجين، لكن الساعات توفر شاشات أكبر وأوضح للقراءة تحت أشعة الشمس.</p>',
      en: '<h2>Battery Life vs Advanced Features</h2><p>If you want a 14-day battery life for basic step and sleep tracking, fitness trackers win easily. If you want calling and notifications on your wrist, get a smartwatch.</p>',
    },
    coverImage: '/images/hero-bg.jpg',
    authorName: 'AQURIVO Editorial Team',
    seoTitle: {
      ar: 'الفرق بين سوار اللياقة البدنية والساعة الذكية — أيهما أفضل؟ | AQURIVO',
      en: 'Fitness Tracker vs Smartwatch Comparison Guide | AQURIVO',
    },
    seoDescription: {
      ar: 'دليل مقارنة شامل بين الساعات الذكية وأساور اللياقة البدنية من حيث البطارية ودقة الحساسات والسعر.',
      en: 'Compare fitness trackers and smartwatches across battery life, health sensors, and price.',
    },
    seoKeywords: ['ساعة ذكية', 'سوار لياقة بدنية', 'smartwatch vs fitness tracker'],
    editorVerdict: {
      ar: 'اختر سوار اللياقة للبطارية الطويلة والوزن الخفيف أثناء النوم، واختر الساعة الذكية إذا كنت تعتمد على الإشعارات والمكالمات الصوتية.',
      en: 'Pick a fitness band for lightweight 14-day sleep and step tracking, or a smartwatch for wrist calls and larger displays.',
    },
    faqItems: [
      {
        question: {
          ar: 'هل الساعات الذكية وأساور اللياقة مقاومة للماء والسباحة؟',
          en: 'Are fitness trackers and smartwatches waterproof for swimming?',
        },
        answer: {
          ar: 'الأجهزة التي تحمل معيار 5ATM أو IP68 تتحمل السباحة في المياه الضحلة والاستحمام بأمان تام.',
          en: 'Models rated at 5ATM or IP68 are safe for pool swimming and everyday water exposure.',
        },
      },
    ],
    categoryId: 'health',
    categorySlug: 'health',
    categoryName: { ar: 'صحة وعناية', en: 'Health & Care' },
    relatedProductIds: [],
    readingTimeMinutes: 6,
    status: 'published',
    publishedAt: '2026-03-05T10:00:00.000Z',
    updatedAt: '2026-03-05T10:00:00.000Z',
  },
];

async function fetchPublishedArticlesFromStore(): Promise<Article[]> {
  const db = getAdminDb();
  if (!db) return DEFAULT_ARTICLES;

  try {
    const snap = await db.collection(COLLECTION).where('status', '==', 'published').get();
    if (!snap.empty) {
      const items = snap.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Article, 'id'>),
      }));
      return items.sort((a, b) =>
        String(b.publishedAt || '').localeCompare(String(a.publishedAt || ''))
      );
    }
  } catch {
    // Fall through to default articles
  }

  return DEFAULT_ARTICLES;
}

const getCachedPublishedArticlesFromDataCache = unstable_cache(
  fetchPublishedArticlesFromStore,
  ['aqurivo_published_articles_catalog'],
  { revalidate: 60, tags: ['articles'] }
);

export async function listPublishedArticles(): Promise<Article[]> {
  const now = Date.now();
  if (publishedArticlesCache && publishedArticlesCache.expiresAt > now) {
    return publishedArticlesCache.data;
  }
  if (publishedArticlesInFlight) {
    return publishedArticlesInFlight;
  }

  publishedArticlesInFlight = (async () => {
    try {
      const data = await getCachedPublishedArticlesFromDataCache();
      publishedArticlesCache = {
        data,
        expiresAt: Date.now() + ARTICLES_CACHE_TTL_MS,
      };
      return data;
    } catch {
      const fallback = await fetchPublishedArticlesFromStore();
      publishedArticlesCache = {
        data: fallback,
        expiresAt: Date.now() + ARTICLES_CACHE_TTL_MS,
      };
      return fallback;
    }
  })();

  try {
    return await publishedArticlesInFlight;
  } finally {
    publishedArticlesInFlight = null;
  }
}

export async function getPublishedArticleBySlug(slug: string): Promise<Article | null> {
  if (!slug) return null;
  const cleanSlug = slug.trim();

  // Check warm published articles cache first (0 Firestore reads!)
  const now = Date.now();
  if (publishedArticlesCache && publishedArticlesCache.expiresAt > now) {
    const matched = publishedArticlesCache.data.find(
      (a) => a.slug === cleanSlug || a.id === cleanSlug
    );
    if (matched) return matched;
  }

  const allPublished = await listPublishedArticles();
  const fromCatalog = allPublished.find((a) => a.slug === cleanSlug || a.id === cleanSlug);
  if (fromCatalog) return fromCatalog;

  return DEFAULT_ARTICLES.find((a) => a.slug === cleanSlug || a.id === cleanSlug) || null;
}

export async function listAllArticlesAdmin(): Promise<Article[]> {
  const db = getAdminDb();
  if (!db) return DEFAULT_ARTICLES;

  try {
    const snap = await db.collection(COLLECTION).get();
    if (!snap.empty) {
      const items = snap.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Article, 'id'>),
      }));
      return items.sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
    }
  } catch {
    // Ignore error
  }

  return DEFAULT_ARTICLES;
}

export async function getArticleByIdAdmin(articleId: string): Promise<Article | null> {
  const db = getAdminDb();
  if (!db) {
    return DEFAULT_ARTICLES.find((a) => a.id === articleId || a.slug === articleId) || null;
  }

  try {
    const doc = await db.collection(COLLECTION).doc(articleId).get();
    if (doc.exists) {
      return { id: doc.id, ...(doc.data() as Omit<Article, 'id'>) };
    }
  } catch {
    // Ignore error
  }

  return DEFAULT_ARTICLES.find((a) => a.id === articleId || a.slug === articleId) || null;
}

export async function upsertArticleAdmin(input: unknown, existingId?: string): Promise<Article> {
  const db = getAdminDb();
  if (!db) {
    throw new Error('Database connection is not configured yet.');
  }

  const data = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const title = validateLocalizedText(data.title, 'عنوان المقال / Title', 1, 180);
  const slug = validateSlug(data.slug || title.en || title.ar, 'guide');
  const rawExcerpt = validateLocalizedText(data.excerpt, 'المقتطف', 0, 400);
  const excerpt = {
    en: rawExcerpt.en || title.en,
    ar: rawExcerpt.ar || title.ar,
  };

  const rawContent = (data.contentHtml && typeof data.contentHtml === 'object'
    ? data.contentHtml
    : {}) as Record<string, unknown>;

  const sanitizedEn = sanitizeEditorialHtml(rawContent.en);
  const sanitizedAr = sanitizeEditorialHtml(rawContent.ar);
  const contentHtml = {
    en: sanitizedEn || sanitizedAr || `<p>${excerpt.en}</p>`,
    ar: sanitizedAr || sanitizedEn || `<p>${excerpt.ar}</p>`,
  };

  const categoryId = sanitizePlainText(data.categoryId, 128) || 'general';
  const categories = await listAllCategoriesAdmin();
  const matchedCat = categories.find((c) => c.id === categoryId || c.slug === categoryId);

  const relatedProductIds = Array.isArray(data.relatedProductIds)
    ? data.relatedProductIds
        .slice(0, 12)
        .map((id) => sanitizePlainText(id, 128))
        .filter(Boolean)
    : [];

  const coverImage = typeof data.coverImage === 'string' ? sanitizePlainText(data.coverImage, 500) : undefined;
  const topPickProductId = typeof data.topPickProductId === 'string' ? sanitizePlainText(data.topPickProductId, 128) : undefined;
  const authorName = typeof data.authorName === 'string' ? sanitizePlainText(data.authorName, 128) : 'AQURIVO Editorial Team';

  const rawSeoTitle = validateLocalizedText(data.seoTitle, 'عنوان SEO', 0, 180);
  const seoTitle = rawSeoTitle.ar || rawSeoTitle.en ? rawSeoTitle : undefined;

  const rawSeoDescription = validateLocalizedText(data.seoDescription, 'وصف SEO', 0, 320);
  const seoDescription = rawSeoDescription.ar || rawSeoDescription.en ? rawSeoDescription : undefined;

  const seoKeywords = Array.isArray(data.seoKeywords)
    ? data.seoKeywords
        .slice(0, 20)
        .map((kw) => sanitizePlainText(kw, 80))
        .filter(Boolean)
    : typeof data.seoKeywords === 'string'
      ? data.seoKeywords
          .split(/[،,]/)
          .map((kw) => sanitizePlainText(kw, 80))
          .filter(Boolean)
          .slice(0, 20)
      : undefined;

  const rawEditorVerdict = validateLocalizedText(data.editorVerdict, 'خلاصة المحرر', 0, 1200);
  const editorVerdict = rawEditorVerdict.ar || rawEditorVerdict.en ? rawEditorVerdict : undefined;

  const faqItems: ArticleFaqItem[] = Array.isArray(data.faqItems)
    ? data.faqItems
        .slice(0, 10)
        .map((item): ArticleFaqItem | null => {
          if (!item || typeof item !== 'object') return null;
          const obj = item as Record<string, unknown>;
          const q = validateLocalizedText(obj.question, 'السؤال', 0, 300);
          const a = validateLocalizedText(obj.answer, 'الإجابة', 0, 1200);
          if ((!q.ar && !q.en) || (!a.ar && !a.en)) return null;
          return { question: q, answer: a };
        })
        .filter((x): x is ArticleFaqItem => x !== null)
    : [];

  const status: 'published' | 'draft' = data.status === 'published' ? 'published' : 'draft';
  const readingTimeMinutes = Math.max(
    1,
    Math.min(60, Number(data.readingTimeMinutes) || 4)
  );

  const now = new Date().toISOString();
  const docId = existingId || slug;
  const docRef = db.collection(COLLECTION).doc(docId);
  const existing = await docRef.get();

  const record: Omit<Article, 'id'> = {
    slug,
    title,
    excerpt,
    contentHtml,
    ...(coverImage ? { coverImage } : {}),
    ...(topPickProductId ? { topPickProductId } : {}),
    ...(authorName ? { authorName } : {}),
    ...(seoTitle ? { seoTitle } : {}),
    ...(seoDescription ? { seoDescription } : {}),
    ...(seoKeywords && seoKeywords.length > 0 ? { seoKeywords } : {}),
    ...(editorVerdict ? { editorVerdict } : {}),
    ...(faqItems.length > 0 ? { faqItems } : {}),
    categoryId: matchedCat ? matchedCat.id : categoryId,
    categorySlug: matchedCat ? matchedCat.slug : categoryId,
    categoryName: matchedCat ? matchedCat.name : { en: 'Buying Guide', ar: 'دليل شراء' },
    relatedProductIds,
    readingTimeMinutes,
    status,
    publishedAt: existing.exists ? (existing.data()?.publishedAt as string) || now : now,
    updatedAt: now,
  };

  await docRef.set(record, { merge: true });
  invalidateArticlesCache(slug);
  return { id: docId, ...record };
}

export async function deleteArticleAdmin(articleId: string): Promise<void> {
  const db = getAdminDb();
  if (!db) {
    throw new Error('Database connection is not configured yet.');
  }
  await db.collection(COLLECTION).doc(articleId).delete();
  invalidateArticlesCache(articleId);
}

export async function listPublishedArticlesSlim(): Promise<ArticleCardDto[]> {
  const articles = await listPublishedArticles();
  return articles.map((a) => ({
    id: a.id,
    slug: a.slug,
    title: a.title,
    excerpt: a.excerpt,
    coverImage: a.coverImage,
    categoryName: a.categoryName,
    categorySlug: a.categorySlug,
    readingTimeMinutes: a.readingTimeMinutes,
    status: a.status,
    publishedAt: a.publishedAt,
  }));
}

