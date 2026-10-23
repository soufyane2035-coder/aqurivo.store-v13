export type ToolCategory = 'shopping' | 'finance' | 'work';

export type ToolComponentName =
  | 'IsItWorthBuying'
  | 'HiddenInterestCalculator'
  | 'CostOfLivingCompare'
  | 'RealSalaryCalculator'
  | 'SavingsGoalCalculator'
  | 'WorkTimeValueCalculator'
  | 'FreelancePriceChecker'
  | 'LoanComparison'
  | 'CarbonFootprintCalculator'
  | 'InvestmentGrowthCalculator'
  | 'CodeToImage';

export interface ToolItem {
  slug: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  category: ToolCategory;
  /** SVG path d attribute(s) rendered inside a 24x24 viewBox */
  icon: string;
  component: ToolComponentName;
  badgeAr?: string;
  badgeEn?: string;
  keywordsAr: string[];
  keywordsEn: string[];
}

export const TOOLS_DATA: ToolItem[] = [
  {
    slug: 'is-it-worth-buying',
    nameAr: 'هل يستحق الشراء؟',
    nameEn: 'Is It Worth Buying?',
    descriptionAr:
      'احسب تكلفة الاستخدام الواحد لأي منتج قبل شرائه واعرف فوراً هل يستحق أموالك أم لا.',
    descriptionEn:
      'Calculate the true cost-per-use of any product before buying and get an instant verdict.',
    category: 'shopping',
    icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    component: 'IsItWorthBuying',
    keywordsAr: ['هل يستحق الشراء', 'تكلفة الاستخدام', 'قرار شراء', 'منتج', 'سعر'],
    keywordsEn: ['worth buying', 'cost per use', 'shopping decision', 'price'],
  },
  {
    slug: 'hidden-interest-calculator',
    nameAr: 'حاسبة الفائدة المخفية للتقسيط',
    nameEn: 'Hidden Interest Calculator',
    descriptionAr:
      'اكشف المبلغ الحقيقي والنسبة الفعلية التي تدفعها زيادة عند شراء أي منتج بالتقسيط مقارنة بالكاش.',
    descriptionEn:
      'Uncover the exact extra cost and hidden interest percentage when buying on installments vs. cash.',
    category: 'shopping',
    icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    component: 'HiddenInterestCalculator',
    keywordsAr: ['فائدة مخفية', 'تقسيط', 'أقساط', 'كاش', 'تمويل'],
    keywordsEn: ['hidden interest', 'installments', 'bnpl', 'cash vs installment'],
  },
  {
    slug: 'cost-of-living-compare',
    nameAr: 'مقارنة تكلفة المعيشة بين المدن',
    nameEn: 'Global Cost of Living Comparison',
    descriptionAr:
      'قارن تكلفة المعيشة والقوة الشرائية لدخلك بين جميع دول ومدن العالم عبر 5 قطاعات أساسية مع كشف ذكي لموقعك.',
    descriptionEn:
      'Compare cost of living and purchasing power across countries and cities worldwide across 5 living pillars.',
    category: 'finance',
    icon: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    component: 'CostOfLivingCompare',
    keywordsAr: ['تكلفة المعيشة', 'مقارنة المدن', 'قوة شرائية', 'دول العالم', 'راتب', 'انتقال', 'سفر'],
    keywordsEn: ['cost of living', 'city comparison', 'global cities', 'purchasing power', 'relocation', 'salary'],
  },
  {
    slug: 'real-salary-calculator',
    nameAr: 'حاسبة الراتب الحقيقي وقيمة الساعة',
    nameEn: 'Real Salary & Hourly Value Calculator',
    descriptionAr:
      'اكشف الفرق بين أجر ساعتك على الورق وقيمتها الصافية الحقيقية بعد خصم وقت وتكلفة المواصلات والسكن والفواتير مع خريطة تشريح يوم العمل.',
    descriptionEn:
      'Uncover the gap between your nominal wage on paper and your true net hourly value after commute time, work expenses, and fixed living pillars.',
    category: 'finance',
    icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
    component: 'RealSalaryCalculator',
    keywordsAr: ['الراتب الحقيقي', 'صافي الراتب', 'قيمة ساعة العمل', 'مصاريف شهرية', 'وقت المواصلات', 'تشريح يوم العمل'],
    keywordsEn: ['real salary', 'net income', 'hourly wage', 'monthly expenses', 'commute drain', 'workday anatomy'],
  },
  {
    slug: 'savings-goal-calculator',
    nameAr: 'حاسبة هدف الادخار والتسريع الذكي',
    nameEn: 'Smart Savings Goal & Acceleration Calculator',
    descriptionAr:
      'خطط لهدفك المالي مع حساب العائد التراكمي وحماية القوة الشرائية من التضخم، وخريطة محطات الطريق (25%، 50%، 75%، 100%) ومحاكي التسريع الذكي.',
    descriptionEn:
      'Plan your financial target with compound APY yield, inflation adjustment, 4-milestone roadmap, and an interactive smart acceleration simulator.',
    category: 'finance',
    icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
    component: 'SavingsGoalCalculator',
    keywordsAr: ['هدف الادخار', 'توفير', 'ادخار شهري', 'خطة مالية', 'التضخم', 'عائد سنوي', 'محطات الادخار'],
    keywordsEn: ['savings goal', 'monthly saving', 'financial target', 'budget', 'inflation adjusted', 'compound yield'],
  },
  {
    slug: 'work-time-value-calculator',
    nameAr: 'حاسبة قيمة المنتج بوقت عملك',
    nameEn: 'Work Time Value Calculator',
    descriptionAr:
      'حوّل سعر أي منتج أو خدمة إلى عدد ساعات وأيام عملك الفعلية لتعرف هل يستحق جهدك ووقتك.',
    descriptionEn:
      'Convert any product price into the exact hours and days of work required to afford it.',
    category: 'shopping',
    icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
    component: 'WorkTimeValueCalculator',
    keywordsAr: ['وقت العمل', 'كم ساعة عمل', 'قيمة الوقت', 'سعر المنتج'],
    keywordsEn: ['work time value', 'hours of work', 'time cost', 'purchase'],
  },
  {
    slug: 'freelance-price-checker',
    nameAr: 'مستشار تسعير العمل الحر والمشاريع',
    nameEn: 'Freelance Rate & Project Pricing Advisor',
    descriptionAr:
      'احسب الحد الأدنى الآمن لساعتك وسعّر مشاريعك عبر 3 باقات احترافية مع احتساب الضرائب وعمولات المنصات وجولات التعديلات وملخص عرض سعر جاهز للعميل.',
    descriptionEn:
      'Calculate your walk-away hourly rate and generate 3-tier project quotes factoring in platform fees, scope buffer, urgency, and client-ready proposals.',
    category: 'work',
    icon: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
    component: 'FreelancePriceChecker',
    keywordsAr: ['فريلانسر', 'عمل حر', 'تسعير مشروع', 'سعر الساعة', 'برمجة', 'تصميم', 'عرض سعر'],
    keywordsEn: ['freelance rate', 'project pricing', 'freelancer calculator', 'proposal generator'],
  },
  {
    slug: 'loan-comparison',
    nameAr: 'مختبر مقارنة القروض والتمويل',
    nameEn: 'Loan & Financing Comparison Lab',
    descriptionAr:
      'قارن بدقة بين الفائدة المتناقصة (Reducing) والفائدة الثابتة (Flat Rate)، مع كشف الرسوم الإدارية وأثر السداد المبكر وجدول استهلاك الدفعات السنوي.',
    descriptionEn:
      'Compare two loan offers side-by-side across Reducing vs. Flat interest rates, upfront admin fees, extra monthly prepayments, and annual amortization.',
    category: 'finance',
    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    component: 'LoanComparison',
    keywordsAr: ['مقارنة القروض', 'حاسبة القرض', 'تمويل', 'فائدة متناقصة', 'فائدة ثابتة', 'سداد مبكر'],
    keywordsEn: ['loan comparison', 'mortgage calculator', 'reducing vs flat rate', 'early payoff', 'emi'],
  },
  {
    slug: 'carbon-footprint-calculator',
    nameAr: 'حاسبة البصمة الكربونية وتكلفة الطاقة',
    nameEn: 'Carbon Footprint & Eco-Savings Analyzer',
    descriptionAr:
      'حلل بصمتك الكربونية عبر 4 قطاعات (التنقل ونوع المركبة، الطيران، كهرباء المنزل، والغذاء) واكتشف عدد الأشجار المكافئة والوفر المالي السنوي لترشيد الطاقة.',
    descriptionEn:
      'Analyze your annual carbon footprint across 4 pillars (mobility, aviation, home energy, and diet) with tree equivalence and dual eco-financial savings.',
    category: 'work',
    icon: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    component: 'CarbonFootprintCalculator',
    keywordsAr: ['بصمة كربونية', 'انبعاثات', 'بيئة', 'كهرباء', 'طيران', 'توفير الطاقة', 'أشجار'],
    keywordsEn: ['carbon footprint', 'co2 calculator', 'emissions', 'sustainability', 'energy savings'],
  },
  {
    slug: 'investment-growth-calculator',
    nameAr: 'حاسبة نمو الاستثمار والعائد المركب',
    nameEn: 'Investment Growth & Compounding Calculator',
    descriptionAr:
      'شاهد مسار نمو ثروتك سنة بعد سنة مع فصل رأس المال عن الأرباح المركبة، وحساب القوة الشرائية الحقيقية بعد التضخم ونقطة الحرية المالية.',
    descriptionEn:
      'Project your wealth trajectory year-by-year with stacked principal vs. compound returns, real inflation-adjusted value, and crossover milestone.',
    category: 'finance',
    icon: 'M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z',
    component: 'InvestmentGrowthCalculator',
    keywordsAr: ['نمو الاستثمار', 'فائدة مركبة', 'عائد سنوي', 'ثروة', 'ادخار', 'حرية مالية'],
    keywordsEn: ['investment growth', 'compound interest', 'wealth calculator', 'roi', 'inflation adjusted'],
  },
  {
    slug: 'code-to-image',
    nameAr: 'استوديو تحويل الكود إلى صورة احترافية',
    nameEn: 'AQURIVO Code-to-Image Studio',
    descriptionAr:
      'حوّل مقاطعك البرمجية إلى لوحات بصرية عالية الدقة (2x Retina PNG) مع تلوين ذكي للكود و6 ثيمات استوديو فاخرة والنسخ المباشر للحافظة.',
    descriptionEn:
      'Transform source code into high-DPI 2x Retina PNG studio snapshots with multi-language syntax highlighting, 6 curated themes, and clipboard copy.',
    category: 'work',
    icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
    component: 'CodeToImage',
    keywordsAr: ['كود إلى صورة', 'مشاركة كود', 'برمجة', 'صورة كود', 'تلوين الكود'],
    keywordsEn: ['code to image', 'code snapshot', 'syntax screenshot', 'developer tool', 'retina png'],
  },
];

export function getToolBySlug(slug: string): ToolItem | undefined {
  return TOOLS_DATA.find((tool) => tool.slug === slug);
}

export function searchTools(rawQuery: string): ToolItem[] {
  const q = (rawQuery || '').trim().toLowerCase();
  if (!q) return TOOLS_DATA;

  return TOOLS_DATA.filter((tool) => {
    const haystack = [
      tool.nameAr,
      tool.nameEn,
      tool.descriptionAr,
      tool.descriptionEn,
      ...tool.keywordsAr,
      ...tool.keywordsEn,
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}
