import { TOOLS_DATA, type ToolItem } from '@/lib/tools-data';
import type { Locale } from '@/types';

export interface ProductToolContext {
  productSlug: string;
  productName: string;
  priceUsd: number | null;
  formattedPrice?: string;
  categorySlug?: string;
  categoryName?: string;
  discount?: number | null;
  shortSummary?: string;
  locale: Locale;
}

export interface SmartToolRecommendation {
  tool: ToolItem;
  matchScore: number;
  badgeAr: string;
  badgeEn: string;
  personalizedHookAr: string;
  personalizedHookEn: string;
  ctaAr: string;
  ctaEn: string;
  href: string;
  accent: 'teal' | 'gold';
  carriesPrice: boolean;
  isUnvisited: boolean;
}

export interface SmartChainRecommendation {
  tool: ToolItem;
  badgeAr: string;
  badgeEn: string;
  reasonAr: string;
  reasonEn: string;
  ctaAr: string;
  ctaEn: string;
  href: string;
  accent: 'teal' | 'gold';
  carriesPrice: boolean;
  isUnvisited: boolean;
}

const VISITED_TOOLS_STORAGE_KEY = 'aqurivo_visited_tools_v1';

const PRICE_AWARE_TOOL_SLUGS = new Set<string>([
  'is-it-worth-buying',
  'work-time-value-calculator',
  'hidden-interest-calculator',
  'savings-goal-calculator',
]);

/**
 * Reads the list of tool slugs the visitor has previously opened in this browser.
 */
export function getVisitedTools(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(VISITED_TOOLS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === 'string');
  } catch {
    return [];
  }
}

/**
 * Records that the visitor opened a specific tool so the recommendation engine
 * can prioritize complementary unvisited tools.
 */
export function recordToolVisit(toolSlug: string): void {
  if (typeof window === 'undefined' || !toolSlug) return;
  try {
    const existing = getVisitedTools().filter((slug) => slug !== toolSlug);
    const updated = [toolSlug, ...existing].slice(0, 15);
    window.localStorage.setItem(
      VISITED_TOOLS_STORAGE_KEY,
      JSON.stringify(updated)
    );
  } catch {
    // Ignore storage quota or privacy restrictions
  }
}

/**
 * Builds a URL to a tool carrying the product's price and metadata automatically.
 */
export function buildSmartToolHref(
  locale: Locale,
  toolSlug: string,
  context?: {
    priceUsd?: number | null;
    productSlug?: string;
    productName?: string;
  }
): string {
  const params = new URLSearchParams();
  if (
    context?.priceUsd &&
    Number.isFinite(context.priceUsd) &&
    context.priceUsd > 0
  ) {
    params.set('price', String(Math.round(context.priceUsd * 100) / 100));
  }
  if (context?.productSlug?.trim()) {
    params.set('productSlug', context.productSlug.trim());
  }
  if (context?.productName?.trim()) {
    params.set('productName', context.productName.trim().slice(0, 120));
  }
  const qs = params.toString();
  return `/${locale}/tools/${toolSlug}${qs ? `?${qs}` : ''}`;
}

/**
 * Smart Scoring & Recommendation Engine for a Product Page.
 * Analyzes price tier, category semantics, discount level, and user history
 * to recommend the top 3-4 most relevant financial/shopping tools for the product.
 */
export function getSmartToolsForProduct(
  context: ProductToolContext,
  visitedTools: string[] = []
): SmartToolRecommendation[] {
  const {
    productSlug,
    productName,
    priceUsd,
    formattedPrice,
    categorySlug = '',
    categoryName = '',
    discount = null,
    shortSummary = '',
    locale,
  } = context;

  const visitedSet = new Set(visitedTools);
  const priceDisplay =
    formattedPrice ||
    (priceUsd && priceUsd > 0 ? `$${Math.round(priceUsd)}` : '');
  const shortProductTitle =
    productName.length > 34
      ? `${productName.slice(0, 34).trim()}…`
      : productName;

  const haystack = `${categorySlug} ${categoryName} ${productName} ${shortSummary}`.toLowerCase();

  const isTechOrWork =
    /tech|pc|laptop|computer|monitor|desk|office|code|dev|phone|tablet|keyboard|mouse|audio|headphone|حاسوب|لابتوب|ميني بي سي|شاشة|مكتب|برمجة|تقني|إلكتروني|سماعات|كيبورد|ماوس|هاتف/.test(
      haystack
    );

  const isHomeOrEco =
    /home|kitchen|coffee|appliance|energy|light|scooter|car|air|heater|filter|منزل|مطبخ|قهوة|كهرباء|طاقة|إضاءة|تكييف|تنقية|سخان|مكنسة/.test(
      haystack
    );

  const isHighTicket = typeof priceUsd === 'number' && priceUsd >= 140;
  const isVeryHighTicket = typeof priceUsd === 'number' && priceUsd >= 350;
  const hasStrongDiscount = typeof discount === 'number' && discount >= 15;

  const scored: SmartToolRecommendation[] = [];

  for (const tool of TOOLS_DATA) {
    let score = 50;
    let badgeAr = 'أداة ذكية مقترحة';
    let badgeEn = 'Smart Recommended Tool';
    let hookAr = tool.descriptionAr;
    let hookEn = tool.descriptionEn;
    let ctaAr = 'افتح الأداة الذكية';
    let ctaEn = 'Open Smart Tool';
    let accent: 'teal' | 'gold' = 'teal';

    const carriesPrice =
      PRICE_AWARE_TOOL_SLUGS.has(tool.slug) &&
      Boolean(priceUsd && priceUsd > 0);
    const isUnvisited = !visitedSet.has(tool.slug);

    switch (tool.slug) {
      case 'is-it-worth-buying': {
        score = 96;
        badgeAr = hasStrongDiscount
          ? `خصم ${discount}% • قرار الشراء`
          : 'الأكثر دقة لقرار الشراء';
        badgeEn = hasStrongDiscount
          ? `${discount}% Off • Buy Verdict`
          : 'Top Buy Decision Tool';
        hookAr = priceDisplay
          ? `احسب تكلفة الاستخدام الواحد لـ «${shortProductTitle}» بسعر ${priceDisplay} واعرف فوراً هل يستحق أموالك.`
          : `احسب تكلفة الاستخدام الواحد لـ «${shortProductTitle}» واعرف فوراً هل يستحق الشراء.`;
        hookEn = priceDisplay
          ? `Calculate the true cost-per-use for "${shortProductTitle}" at ${priceDisplay} and get an instant verdict.`
          : `Calculate the true cost-per-use for "${shortProductTitle}" before buying.`;
        ctaAr = 'اختبر هل يستحق الشراء';
        ctaEn = 'Test If Worth Buying';
        accent = 'teal';
        break;
      }

      case 'work-time-value-calculator': {
        score = 93;
        badgeAr = 'معادل ساعات عملك';
        badgeEn = 'Your Work Hours Equivalent';
        hookAr = priceDisplay
          ? `حوّل سعر هذا المنتج (${priceDisplay}) إلى عدد ساعات وأيام عملك الفعلية لتعرف قيمته الحقيقية.`
          : `اعرف كم ساعة ويوم من عملك الفعلي يعادل سعر اقتناء هذا المنتج.`;
        hookEn = priceDisplay
          ? `Convert this product's price (${priceDisplay}) into your actual work hours and days.`
          : `See how many hours of your real work it takes to afford this item.`;
        ctaAr = 'احسب كم ساعة عمل يساوي';
        ctaEn = 'Calculate Work Hours';
        accent = 'gold';
        break;
      }

      case 'hidden-interest-calculator': {
        score = isHighTicket ? 95 : 86;
        badgeAr = isHighTicket
          ? 'مهم قبل التقسيط'
          : 'كاش أم تقسيط؟';
        badgeEn = isHighTicket
          ? 'Essential Before Installments'
          : 'Cash vs. Installments';
        hookAr = priceDisplay
          ? `هل تفكر في شرائه بالتقسيط بدل ${priceDisplay} كاش؟ اكشف الفائدة المخفية والمبلغ الإضافي بدقة.`
          : `اكشف الفرق المالي الحقيقي والفائدة المخفية إذا اشتريت هذا المنتج بالتقسيط.`;
        hookEn = priceDisplay
          ? `Considering installments instead of ${priceDisplay} cash? Uncover any hidden interest instantly.`
          : `Uncover the true extra cost when buying on installments vs. cash.`;
        ctaAr = 'افحص تكلفة التقسيط';
        ctaEn = 'Check Installment Cost';
        accent = isHighTicket ? 'gold' : 'teal';
        break;
      }

      case 'savings-goal-calculator': {
        score = isHighTicket ? 89 : 76;
        badgeAr = 'خطة امتلاك ذكية';
        badgeEn = 'Smart Saving Plan';
        hookAr = priceDisplay
          ? `خطط للادخار لشراء هذا المنتج (${priceDisplay}) أو لهدفك المالي القادم بدون ضغط على ميزانيتك.`
          : `ضع خطة ادخار ذكية ومريحة للوصول إلى مبلغ هذا المنتج بأسرع وقت.`;
        hookEn = priceDisplay
          ? `Build a stress-free saving plan for ${priceDisplay} or your next financial target.`
          : `Create a smart milestone roadmap to save for this purchase.`;
        ctaAr = 'خطط للادخار له';
        ctaEn = 'Plan Savings Goal';
        accent = 'teal';
        break;
      }

      case 'real-salary-calculator': {
        score = isTechOrWork ? 84 : 74;
        badgeAr = 'تقييم القوة الشرائية';
        badgeEn = 'Purchasing Power Check';
        hookAr =
          'اكشف أجر ساعتك الصافي الحقيقي بعد مصاريف المواصلات والفواتير لتعرف أثر أي عملية شراء على دخلك.';
        hookEn =
          'Discover your true net hourly wage after commute and fixed bills before making purchases.';
        ctaAr = 'احسب راتبك الحقيقي';
        ctaEn = 'Calculate Real Salary';
        accent = 'teal';
        break;
      }

      case 'carbon-footprint-calculator': {
        score = isHomeOrEco ? 88 : 62;
        badgeAr = isHomeOrEco ? 'مناسب لأجهزة المنزل والطاقة' : 'وفر الطاقة والبيئة';
        badgeEn = isHomeOrEco ? 'Ideal for Home & Energy' : 'Energy & Eco Savings';
        hookAr =
          'احسب استهلاك الطاقة الكهربائية والوفر المالي السنوي لترشيد استهلاك المنزل والتنقل.';
        hookEn =
          'Analyze home energy consumption and discover annual financial savings from efficiency.';
        ctaAr = 'احسب وفر الطاقة';
        ctaEn = 'Calculate Energy Savings';
        accent = 'teal';
        break;
      }

      case 'freelance-price-checker': {
        score = isTechOrWork ? 85 : 64;
        badgeAr = isTechOrWork ? 'لمعدات العمل والإنتاجية' : 'تسعير العمل الحر';
        badgeEn = isTechOrWork ? 'For Work & Productivity Gear' : 'Freelance Pricing';
        hookAr =
          'تشتري معدات لتطوير عملك؟ احسب كيف تسعّر ساعتك ومشاريعك لتسترد تكلفة معداتك بسرعة.';
        hookEn =
          'Upgrading your work gear? Calculate your hourly rate and project quotes to recoup costs fast.';
        ctaAr = 'سعّر ساعتك ومشاريعك';
        ctaEn = 'Price Your Projects';
        accent = 'gold';
        break;
      }

      case 'loan-comparison': {
        score = isVeryHighTicket ? 83 : 65;
        badgeAr = 'مقارنة عروض التمويل';
        badgeEn = 'Financing Comparison';
        hookAr =
          'قارن بدقة بين الفائدة المتناقصة والثابتة والرسوم الإدارية قبل الالتزام بأي تمويل.';
        hookEn =
          'Compare reducing vs. flat interest rates and admin fees side-by-side.';
        ctaAr = 'قارن عروض التمويل';
        ctaEn = 'Compare Financing';
        accent = 'teal';
        break;
      }

      case 'cost-of-living-compare': {
        score = 68;
        badgeAr = 'مقارنة الأسعار والقوة الشرائية';
        badgeEn = 'Global Purchasing Power';
        hookAr =
          'قارن القوة الشرائية لدخلك وتكاليف المعيشة بين مدينتك ومئات المدن حول العالم.';
        hookEn =
          'Compare your purchasing power and living costs across global cities.';
        ctaAr = 'قارن تكلفة المعيشة';
        ctaEn = 'Compare Living Costs';
        accent = 'teal';
        break;
      }

      case 'investment-growth-calculator': {
        score = 67;
        badgeAr = 'العائد المركب للثروة';
        badgeEn = 'Compound Wealth Growth';
        hookAr =
          'شاهد كم سينمو أي مبلغ توفره اليوم لو استثمرته بعائد مركب على مدار السنوات.';
        hookEn =
          'See how money saved today compounds into long-term wealth over time.';
        ctaAr = 'احسب نمو الاستثمار';
        ctaEn = 'Project Wealth Growth';
        accent = 'gold';
        break;
      }

      case 'code-to-image': {
        score = isTechOrWork ? 72 : 55;
        badgeAr = 'أداة المطورين وصناع المحتوى';
        badgeEn = 'For Developers & Creators';
        hookAr =
          'حوّل أكوادك البرمجية إلى لقطات بصرية فاخرة بدقة Retina لمشاركتها باحترافية.';
        hookEn =
          'Turn code snippets into studio-grade Retina PNG snapshots in one click.';
        ctaAr = 'افتح استوديو الكود';
        ctaEn = 'Open Code Studio';
        accent = 'teal';
        break;
      }
    }

    // Subtle discovery boost for unvisited tools so repeat visitors see fresh angles
    if (isUnvisited && score < 94) {
      score += 2;
    }

    scored.push({
      tool,
      matchScore: Math.min(99, score),
      badgeAr,
      badgeEn,
      personalizedHookAr: hookAr,
      personalizedHookEn: hookEn,
      ctaAr,
      ctaEn,
      href: buildSmartToolHref(locale, tool.slug, {
        priceUsd,
        productSlug,
        productName,
      }),
      accent,
      carriesPrice,
      isUnvisited,
    });
  }

  scored.sort((a, b) => b.matchScore - a.matchScore);
  return scored.slice(0, 4);
}

interface ChainBlueprint {
  slug: string;
  badgeAr: string;
  badgeEn: string;
  reasonAr: string;
  reasonEn: string;
  ctaAr: string;
  ctaEn: string;
  accent: 'teal' | 'gold';
}

const TOOL_CHAIN_GRAPH: Record<string, ChainBlueprint[]> = {
  'is-it-worth-buying': [
    {
      slug: 'work-time-value-calculator',
      badgeAr: 'الخطوة المكملة 1 • معادل الجهد',
      badgeEn: 'Next Step 1 • Effort Equivalent',
      reasonAr:
        'بعد معرفة تكلفة الاستخدام، اكتشف كم ساعة عمل صافية من وقتك يعادل سعر هذا المنتج.',
      reasonEn:
        'Now that you know the cost-per-use, see how many net work hours this price equals.',
      ctaAr: 'احسب قيمته بوقت عملك',
      ctaEn: 'Calculate in Work Hours',
      accent: 'gold',
    },
    {
      slug: 'hidden-interest-calculator',
      badgeAr: 'الخطوة المكملة 2 • كاش أم تقسيط؟',
      badgeEn: 'Next Step 2 • Cash vs. Installment',
      reasonAr:
        'تفكر في شرائه على دفعات؟ اكشف الفائدة المخفية والمبلغ الزائد قبل اتخاذ القرار.',
      reasonEn:
        'Thinking of paying in installments? Uncover the hidden interest and extra cost first.',
      ctaAr: 'افحص الفائدة المخفية',
      ctaEn: 'Check Hidden Interest',
      accent: 'teal',
    },
    {
      slug: 'savings-goal-calculator',
      badgeAr: 'الخطوة المكملة 3 • خطة الادخار',
      badgeEn: 'Next Step 3 • Saving Roadmap',
      reasonAr:
        'لا تريد ضغط ميزانيتك هذا الشهر؟ صمّم خطة ادخار ذكية لامتلاكه براحة تامة.',
      reasonEn:
        'Prefer not to strain this month’s budget? Build a smart saving plan to own it debt-free.',
      ctaAr: 'صمّم خطة ادخار له',
      ctaEn: 'Build a Saving Plan',
      accent: 'teal',
    },
    {
      slug: 'real-salary-calculator',
      badgeAr: 'تحليل الدخل الصافي',
      badgeEn: 'Net Income Analysis',
      reasonAr:
        'احسب أجر ساعتك الحقيقي بعد خصم وقت وتكلفة المواصلات والفواتير الثابتة.',
      reasonEn:
        'Calculate your true net hourly wage after commute time and fixed monthly bills.',
      ctaAr: 'احسب راتبك الحقيقي',
      ctaEn: 'Calculate Real Salary',
      accent: 'teal',
    },
  ],

  'work-time-value-calculator': [
    {
      slug: 'is-it-worth-buying',
      badgeAr: 'الخطوة المكملة 1 • تكلفة الاستخدام',
      badgeEn: 'Next Step 1 • Cost Per Use',
      reasonAr:
        'الآن قسّم ساعات عملك على عدد مرات استخدام المنتج لتعرف هل يستحق اقتناءه فعلاً.',
      reasonEn:
        'Now divide your work hours by expected uses to see if the product truly pays off.',
      ctaAr: 'اختبر هل يستحق الشراء',
      ctaEn: 'Test If Worth Buying',
      accent: 'teal',
    },
    {
      slug: 'real-salary-calculator',
      badgeAr: 'الخطوة المكملة 2 • تشريح الراتب',
      badgeEn: 'Next Step 2 • Salary Anatomy',
      reasonAr:
        'احسب بدقة الفرق بين راتبك الاسمي على الورق وصافي قيمة ساعتك بعد كل التزاماتك.',
      reasonEn:
        'Uncover the exact gap between your paper salary and net hourly value after all expenses.',
      ctaAr: 'حلل راتبك الحقيقي',
      ctaEn: 'Analyze Real Salary',
      accent: 'gold',
    },
    {
      slug: 'hidden-interest-calculator',
      badgeAr: 'الخطوة المكملة 3 • فحص التقسيط',
      badgeEn: 'Next Step 3 • Installment Check',
      reasonAr:
        'شاهد كم ساعة عمل إضافية ستخسرها إذا اشتريت المنتج بالتقسيط بدلاً من الكاش.',
      reasonEn:
        'See how many extra work hours you lose if you buy on installments instead of cash.',
      ctaAr: 'اكشف تكلفة التقسيط',
      ctaEn: 'Uncover Installment Cost',
      accent: 'teal',
    },
    {
      slug: 'freelance-price-checker',
      badgeAr: 'للمستقلين وأصحاب المهارات',
      badgeEn: 'For Freelancers & Pros',
      reasonAr:
        'ارفع قيمة ساعة عملك عبر تسعير مشاريعك الحرة باحترافية لتقليل ساعات الجهد.',
      reasonEn:
        'Boost your hourly value by pricing your freelance projects across 3 smart tiers.',
      ctaAr: 'سعّر ساعتك الحرة',
      ctaEn: 'Price Freelance Rate',
      accent: 'teal',
    },
  ],

  'hidden-interest-calculator': [
    {
      slug: 'is-it-worth-buying',
      badgeAr: 'الخطوة المكملة 1 • جدوى المنتج',
      badgeEn: 'Next Step 1 • Product Verdict',
      reasonAr:
        'قبل الشراء كاش أو تقسيط، اختبر تكلفة الاستخدام الواحد لتتأكد أن المنتج يستحق.',
      reasonEn:
        'Before paying cash or installments, test the cost-per-use to verify it is worth buying.',
      ctaAr: 'اختبر هل يستحق الشراء',
      ctaEn: 'Test If Worth Buying',
      accent: 'teal',
    },
    {
      slug: 'loan-comparison',
      badgeAr: 'الخطوة المكملة 2 • مختبر التمويل',
      badgeEn: 'Next Step 2 • Financing Lab',
      reasonAr:
        'لديك أكثر من عرض تمويل؟ قارن بين الفائدة المتناقصة والثابتة والرسوم الإدارية.',
      reasonEn:
        'Have multiple financing offers? Compare reducing vs. flat rates and admin fees.',
      ctaAr: 'قارن عروض التمويل',
      ctaEn: 'Compare Loan Offers',
      accent: 'gold',
    },
    {
      slug: 'savings-goal-calculator',
      badgeAr: 'الخطوة المكملة 3 • البديل الذكي',
      badgeEn: 'Next Step 3 • Debt-Free Alternative',
      reasonAr:
        'بدل دفع فوائد التقسيط، احسب كم شهراً تحتاج لجمع المبلغ وشرائه نقداً.',
      reasonEn:
        'Instead of paying interest, calculate how fast you can save up and buy it in cash.',
      ctaAr: 'احسب خطة الادخار نقداً',
      ctaEn: 'Plan Cash Savings',
      accent: 'teal',
    },
    {
      slug: 'work-time-value-calculator',
      badgeAr: 'تكلفة الوقت',
      badgeEn: 'Time Cost Check',
      reasonAr:
        'اعرف كم ساعة من عملك الفعلي يعادل سعر هذا المنتج.',
      reasonEn:
        'See how many hours of your real work this purchase represents.',
      ctaAr: 'احسب قيمته بوقت عملك',
      ctaEn: 'Calculate Work Hours',
      accent: 'teal',
    },
  ],

  'real-salary-calculator': [
    {
      slug: 'work-time-value-calculator',
      badgeAr: 'الخطوة المكملة 1 • تطبيق مباشر',
      badgeEn: 'Next Step 1 • Direct Application',
      reasonAr:
        'استخدم أجر ساعتك الصافي الذي اكتشفته الآن لتحويل سعر أي منتج إلى ساعات عمل.',
      reasonEn:
        'Use the net hourly wage you just found to convert any product price into work hours.',
      ctaAr: 'قيّم مشترياتك بوقت عملك',
      ctaEn: 'Value Purchases in Time',
      accent: 'gold',
    },
    {
      slug: 'cost-of-living-compare',
      badgeAr: 'الخطوة المكملة 2 • القوة الشرائية',
      badgeEn: 'Next Step 2 • Purchasing Power',
      reasonAr:
        'قارن ماذا يساوي راتبك الحالي لو عشت في مدينة أو دولة أخرى عبر 5 قطاعات.',
      reasonEn:
        'Compare what your current salary buys in other cities and countries across 5 pillars.',
      ctaAr: 'قارن تكلفة المعيشة',
      ctaEn: 'Compare Cities',
      accent: 'teal',
    },
    {
      slug: 'savings-goal-calculator',
      badgeAr: 'الخطوة المكملة 3 • استثمار الفائض',
      badgeEn: 'Next Step 3 • Surplus Planning',
      reasonAr:
        'حوّل الفائض الصافي من راتبك الشهري إلى خطة ادخار محمية من التضخم.',
      reasonEn:
        'Turn your net monthly surplus into an inflation-protected savings roadmap.',
      ctaAr: 'ابنِ هدفك الادخاري',
      ctaEn: 'Build Savings Goal',
      accent: 'teal',
    },
  ],

  'cost-of-living-compare': [
    {
      slug: 'real-salary-calculator',
      badgeAr: 'الخطوة المكملة 1 • صافي الدخل',
      badgeEn: 'Next Step 1 • True Net Income',
      reasonAr:
        'حلل صافي راتبك وقيمة ساعتك بعد خصم مصاريف المعيشة والمواصلات التي قارنتها.',
      reasonEn:
        'Calculate your net hourly income after deducting living and commute costs.',
      ctaAr: 'احسب راتبك الحقيقي',
      ctaEn: 'Calculate Real Salary',
      accent: 'teal',
    },
    {
      slug: 'savings-goal-calculator',
      badgeAr: 'الخطوة المكملة 2 • صندوق الانتقال',
      badgeEn: 'Next Step 2 • Relocation Fund',
      reasonAr:
        'تخطط للانتقال أو السفر؟ احسب المدة والادخار الشهري المطلوب لتحقيق هدفك.',
      reasonEn:
        'Planning a move or trip? Calculate the exact monthly savings to reach your target.',
      ctaAr: 'خطط لهدفك المالي',
      ctaEn: 'Plan Financial Target',
      accent: 'gold',
    },
    {
      slug: 'investment-growth-calculator',
      badgeAr: 'الخطوة المكملة 3 • بناء الثروة',
      badgeEn: 'Next Step 3 • Wealth Building',
      reasonAr:
        'شاهد كيف ينمو فرق تكلفة المعيشة لو استثمرته بعائد سنوي مركب.',
      reasonEn:
        'See how investing your cost-of-living savings grows with compound returns.',
      ctaAr: 'احسب نمو الاستثمار',
      ctaEn: 'Project Investment Growth',
      accent: 'teal',
    },
  ],

  'savings-goal-calculator': [
    {
      slug: 'investment-growth-calculator',
      badgeAr: 'الخطوة المكملة 1 • الفائدة المركبة',
      badgeEn: 'Next Step 1 • Compounding Lab',
      reasonAr:
        'بعد الوصول لهدفك الادخاري، شاهد كيف تتضاعف ثروتك سنة بعد سنة بالعائد المركب.',
      reasonEn:
        'After hitting your savings target, project how your wealth multiplies over the years.',
      ctaAr: 'شاهد مسار نمو الثروة',
      ctaEn: 'Project Wealth Trajectory',
      accent: 'gold',
    },
    {
      slug: 'is-it-worth-buying',
      badgeAr: 'الخطوة المكملة 2 • اختبار الهدف',
      badgeEn: 'Next Step 2 • Test Your Purchase',
      reasonAr:
        'تدخر لشراء منتج معين؟ تأكد أنه يستحق أموالك بحساب تكلفة الاستخدام الواحد.',
      reasonEn:
        'Saving up for a specific product? Verify it is worth your money with cost-per-use.',
      ctaAr: 'اختبر هل يستحق الشراء',
      ctaEn: 'Test If Worth Buying',
      accent: 'teal',
    },
    {
      slug: 'real-salary-calculator',
      badgeAr: 'الخطوة المكملة 3 • تسريع الادخار',
      badgeEn: 'Next Step 3 • Boost Monthly Saving',
      reasonAr:
        'اكتشف أين يتسرب راتبك الشهري وكيف تزيد مبلغ الادخار للوصول لهدفك أسرع.',
      reasonEn:
        'Find where your salary leaks and increase your monthly saving capacity.',
      ctaAr: 'حلل راتبك ومصاريفك',
      ctaEn: 'Analyze Salary & Bills',
      accent: 'teal',
    },
  ],

  'freelance-price-checker': [
    {
      slug: 'real-salary-calculator',
      badgeAr: 'الخطوة المكملة 1 • مقارنة الدخل',
      badgeEn: 'Next Step 1 • Income Comparison',
      reasonAr:
        'قارن صافي عائد عملك الحر مع الراتب الوظيفي بعد خصم الضرائب والتكاليف.',
      reasonEn:
        'Compare your net freelance income with a salaried job after expenses.',
      ctaAr: 'قارن بالراتب الحقيقي',
      ctaEn: 'Compare with Real Salary',
      accent: 'teal',
    },
    {
      slug: 'work-time-value-calculator',
      badgeAr: 'الخطوة المكملة 2 • عائد المعدات',
      badgeEn: 'Next Step 2 • Gear ROI',
      reasonAr:
        'احسب كم ساعة عمل توفرها لك أجهزتك ومعداتك الاحترافية مقارنة بسعرها.',
      reasonEn:
        'Calculate how many billable hours your work gear saves you vs. its cost.',
      ctaAr: 'احسب عائد وقت العمل',
      ctaEn: 'Calculate Time ROI',
      accent: 'gold',
    },
    {
      slug: 'code-to-image',
      badgeAr: 'الخطوة المكملة 3 • عرض أعمالك',
      badgeEn: 'Next Step 3 • Showcase Portfolio',
      reasonAr:
        'صدّر مقتطفات الكود والحلول التقنية في صور فاخرة لإرفاقها في عروض أسعارك.',
      reasonEn:
        'Export sleek Retina code snapshots to attach to your client proposals.',
      ctaAr: 'افتح استوديو الكود',
      ctaEn: 'Open Code Studio',
      accent: 'teal',
    },
  ],

  'loan-comparison': [
    {
      slug: 'hidden-interest-calculator',
      badgeAr: 'الخطوة المكملة 1 • تقسيط المشتريات',
      badgeEn: 'Next Step 1 • BNPL & Store Installments',
      reasonAr:
        'افحص عروض تقسيط المتاجر السريعة واكشف النسبة الفعلية المضافة على سعر الكاش.',
      reasonEn:
        'Check store installment offers and uncover the true markup over cash price.',
      ctaAr: 'افحص فائدة التقسيط',
      ctaEn: 'Check Store Installments',
      accent: 'gold',
    },
    {
      slug: 'savings-goal-calculator',
      badgeAr: 'الخطوة المكملة 2 • التمويل الذاتي',
      badgeEn: 'Next Step 2 • Self-Financing Plan',
      reasonAr:
        'قارن تكلفة القرض بخطة ادخار ذكية تمنحك عوائد بدلاً من دفع الفوائد.',
      reasonEn:
        'Compare borrowing costs against a smart saving plan that earns yield instead.',
      ctaAr: 'جرّب خطة الادخار',
      ctaEn: 'Try Savings Roadmap',
      accent: 'teal',
    },
    {
      slug: 'investment-growth-calculator',
      badgeAr: 'الخطوة المكملة 3 • أثر الاستثمار',
      badgeEn: 'Next Step 3 • Investment Impact',
      reasonAr:
        'شاهد كم ستبلغ ثروتك لو استثمرت مبلغ الفوائد البنكية في محفظة استثمارية.',
      reasonEn:
        'See how much wealth you would build by investing the loan interest amount.',
      ctaAr: 'احسب العائد المركب',
      ctaEn: 'Calculate Compounding',
      accent: 'teal',
    },
  ],

  'carbon-footprint-calculator': [
    {
      slug: 'is-it-worth-buying',
      badgeAr: 'الخطوة المكملة 1 • الأجهزة الموفرة',
      badgeEn: 'Next Step 1 • Eco Gear Verdict',
      reasonAr:
        'اختبر الجدوى المالية لاقتناء جهاز موفر للطاقة أو وسيلة تنقل اقتصادية.',
      reasonEn:
        'Test the financial payoff of buying an energy-efficient appliance or vehicle.',
      ctaAr: 'اختبر جدوى الشراء',
      ctaEn: 'Test Purchase Payoff',
      accent: 'teal',
    },
    {
      slug: 'cost-of-living-compare',
      badgeAr: 'الخطوة المكملة 2 • فواتير المدن',
      badgeEn: 'Next Step 2 • Global Utility Costs',
      reasonAr:
        'قارن تكاليف الكهرباء والمواصلات والمعيشة بين مدينتك ومدن العالم.',
      reasonEn:
        'Compare utility, transport, and living costs across global cities.',
      ctaAr: 'قارن تكلفة المعيشة',
      ctaEn: 'Compare Living Costs',
      accent: 'gold',
    },
    {
      slug: 'savings-goal-calculator',
      badgeAr: 'الخطوة المكملة 3 • استثمار الوفر',
      badgeEn: 'Next Step 3 • Save Energy Surplus',
      reasonAr:
        'حوّل الوفر المالي السنوي من ترشيد الطاقة إلى خطة ادخار واضحة المعالم.',
      reasonEn:
        'Channel your annual energy bill savings into a structured financial goal.',
      ctaAr: 'ابدأ خطة الادخار',
      ctaEn: 'Start Saving Plan',
      accent: 'teal',
    },
  ],

  'investment-growth-calculator': [
    {
      slug: 'savings-goal-calculator',
      badgeAr: 'الخطوة المكملة 1 • محطات الطريق',
      badgeEn: 'Next Step 1 • Milestone Roadmap',
      reasonAr:
        'حول هدفك الاستثماري إلى 4 محطات عملية (25%، 50%، 75%، 100%) مع محاكي التسريع.',
      reasonEn:
        'Break your target into 4 actionable milestones with an acceleration simulator.',
      ctaAr: 'صمّم محطات ادخارك',
      ctaEn: 'Build Milestone Plan',
      accent: 'teal',
    },
    {
      slug: 'real-salary-calculator',
      badgeAr: 'الخطوة المكملة 2 • زيادة الاستقطاع',
      badgeEn: 'Next Step 2 • Maximize Contributions',
      reasonAr:
        'حلل راتبك الحقيقي لاكتشاف كم يمكنك إضافته شهرياً لتسريع الحرية المالية.',
      reasonEn:
        'Analyze your net salary to find extra monthly capacity for faster compounding.',
      ctaAr: 'حلل صافي راتبك',
      ctaEn: 'Analyze Net Salary',
      accent: 'gold',
    },
    {
      slug: 'cost-of-living-compare',
      badgeAr: 'الخطوة المكملة 3 • القوة الشرائية للثروة',
      badgeEn: 'Next Step 3 • Global Wealth Power',
      reasonAr:
        'قارن القوة الشرائية لعوائدك الاستثمارية في مختلف دول ومدن العالم.',
      reasonEn:
        'Compare how far your investment returns go across different global cities.',
      ctaAr: 'قارن مدن العالم',
      ctaEn: 'Compare Global Cities',
      accent: 'teal',
    },
  ],

  'code-to-image': [
    {
      slug: 'freelance-price-checker',
      badgeAr: 'الخطوة المكملة 1 • تسعير المشاريع',
      badgeEn: 'Next Step 1 • Project Pricing',
      reasonAr:
        'احسب سعر ساعتك كمطور أو مستقل وأنشئ عرض سعر احترافي بثلاث باقات لعملائك.',
      reasonEn:
        'Calculate your developer hourly rate and generate 3-tier client proposals.',
      ctaAr: 'سعّر مشاريعك البرمجية',
      ctaEn: 'Price Dev Projects',
      accent: 'gold',
    },
    {
      slug: 'work-time-value-calculator',
      badgeAr: 'الخطوة المكملة 2 • قيمة وقتك',
      badgeEn: 'Next Step 2 • Time Value ROI',
      reasonAr:
        'احسب العائد الزمني لمعداتك البرمجية وكم ساعة عمل توفرها لك سنوياً.',
      reasonEn:
        'Calculate the time ROI of your developer setup and hours saved per year.',
      ctaAr: 'احسب قيمة وقت عملك',
      ctaEn: 'Calculate Time Value',
      accent: 'teal',
    },
    {
      slug: 'is-it-worth-buying',
      badgeAr: 'الخطوة المكملة 3 • تقييم المعدات',
      badgeEn: 'Next Step 3 • Hardware Verdict',
      reasonAr:
        'تفكر في ترقية جهازك أو شاشتك؟ احسب تكلفة الاستخدام اليومي قبل الشراء.',
      reasonEn:
        'Upgrading your laptop or monitor? Calculate daily cost-per-use before buying.',
      ctaAr: 'اختبر جدوى الترقية',
      ctaEn: 'Test Upgrade Worth',
      accent: 'teal',
    },
  ],
};

/**
 * Returns smart chained tools to suggest inside a Tool Detail Page.
 * Automatically carries forward any active product price/name and boosts unvisited tools.
 */
export function getSmartNextToolsForTool(
  currentToolSlug: string,
  options: {
    locale: Locale;
    priceUsd?: number | null;
    productSlug?: string;
    productName?: string;
    visitedTools?: string[];
  }
): SmartChainRecommendation[] {
  const {
    locale,
    priceUsd,
    productSlug,
    productName,
    visitedTools = [],
  } = options;

  const visitedSet = new Set(visitedTools);
  const blueprints =
    TOOL_CHAIN_GRAPH[currentToolSlug] ||
    TOOL_CHAIN_GRAPH['is-it-worth-buying'];

  const results: SmartChainRecommendation[] = [];

  for (const bp of blueprints) {
    const tool = TOOLS_DATA.find((item) => item.slug === bp.slug);
    if (!tool || tool.slug === currentToolSlug) continue;

    const carriesPrice =
      PRICE_AWARE_TOOL_SLUGS.has(tool.slug) &&
      Boolean(priceUsd && priceUsd > 0);
    const isUnvisited = !visitedSet.has(tool.slug);

    results.push({
      tool,
      badgeAr: bp.badgeAr,
      badgeEn: bp.badgeEn,
      reasonAr: bp.reasonAr,
      reasonEn: bp.reasonEn,
      ctaAr: bp.ctaAr,
      ctaEn: bp.ctaEn,
      href: buildSmartToolHref(locale, tool.slug, {
        priceUsd,
        productSlug,
        productName,
      }),
      accent: bp.accent,
      carriesPrice,
      isUnvisited,
    });
  }

  // Gently prioritize tools the user hasn't visited yet while preserving logical chain order
  results.sort((a, b) => {
    if (a.isUnvisited !== b.isUnvisited) {
      return a.isUnvisited ? -1 : 1;
    }
    return 0;
  });

  return results;
}
