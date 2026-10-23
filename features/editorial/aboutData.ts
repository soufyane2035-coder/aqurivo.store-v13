export interface TeamWorkflowStep {
  index: string;
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
  tagAr: string;
  tagEn: string;
}

export interface TeamMemberDossier {
  id: string;
  memberCode: string;
  nameAr: string;
  nameEn: string;
  roleAr: string;
  roleEn: string;
  badgeAr: string;
  badgeEn: string;
  departmentAr: string;
  departmentEn: string;
  iconName: 'Compass' | 'ScanSearch' | 'PenTool' | 'ShieldCheck' | 'LayoutGrid';
  scopeAr: string;
  scopeEn: string;
  illustrationType: 'roadmap' | 'market-radar' | 'editorial-canvas' | 'audit-ledger' | 'ux-inspector';
  illustrationTitleAr: string;
  illustrationTitleEn: string;
  illustrationCaptionAr: string;
  illustrationCaptionEn: string;
  workflowSteps: TeamWorkflowStep[];
  responsibilitiesAr: string[];
  responsibilitiesEn: string[];
  initialAr: string;
  initialEn: string;
  accentColor: 'emerald' | 'terracotta' | 'teal' | 'olive' | 'clay';
  signatureMottoAr: string;
  signatureMottoEn: string;
}

export interface MethodologyPillar {
  step: string;
  titleAr: string;
  titleEn: string;
  subtitleAr: string;
  subtitleEn: string;
  descAr: string;
  descEn: string;
  tagsAr: string[];
  tagsEn: string[];
}

export interface IntegrityCharterItem {
  number: string;
  titleAr: string;
  titleEn: string;
  principleAr: string;
  principleEn: string;
  guaranteeAr: string;
  guaranteeEn: string;
}

export interface EditorialMetric {
  value: string;
  labelAr: string;
  labelEn: string;
  captionAr: string;
  captionEn: string;
}

export interface AboutFaqItem {
  questionAr: string;
  questionEn: string;
  answerAr: string;
  answerEn: string;
}

export const ABOUT_ORIGIN_DATA = {
  headingAr: 'قصة التأسيس: مراجعات تحريرية واضحة ومستقلة للمتسوق',
  headingEn: 'The Origin Story: Independent Product Curation & Clear Guidance',
  subtitleAr:
    'كيف نشأت AQURIVO لتقديم تقييمات موضوعية تعتمد على المواصفات الموثقة وتجارب المشترين الحقيقيين',
  subtitleEn:
    'How AQURIVO was founded to provide transparent, research-backed product guidance without promotional bias',
  paragraphsAr: [
    'تأسست منصة AQURIVO لتقديم مراجعات وتحليلات مستقلة للمنتجات ومساعدة المتسوقين في اتخاذ قرارات مدروسة. أصبحت التجارة الإلكترونية اليوم مليئة بالعروض المتكررة والتسعير المتقلب والمراجعات الترويجية التي تصعّب تمييز الخيارات الجيدة.',
    'نعمل في AQURIVO كدليل تحريري يركز على البحث الموضوعي. لا نبيع المنتجات بشكل مباشر، وقد نحصل على عمولة تسويق من المتاجر الشريكة عند الشراء عبر بعض الروابط، دون أن يؤثر ذلك في تقييماتنا أو ترتيب توصياتنا. نعتمد على المواصفات المنشورة ومراجعات المشترين المتاحة، ونوضح نقاط القوة والقيود لكل منتج.',
    'مبدأنا التحريري واضح وصريح: نوضح عيوب الاستخدام والقيود بصراحة تامة إلى جانب المزايا، ولا نتقاضى عمولات ترويجية لتغيير ترتيب التوصيات، ونوجه المتسوق حصرياً إلى صفحات المتاجر الرسمية المعتمدة للشراء الآمن والشفاف.',
  ],
  paragraphsEn: [
    'AQURIVO was established to bring clarity and independent evaluation to online consumer purchases. Navigating digital marketplaces often involves sifting through repetitive product listings, shifting prices, and promotional bias.',
    'We built AQURIVO as a focused, human-curated editorial resource. We do not sell products directly, and we may earn affiliate commissions from partner stores when readers purchase through some links. These commissions do not influence our assessments or recommendation rankings. Our research uses published specifications and available buyer reviews, and clearly presents product benefits and limitations.',
    'Our editorial standards are straightforward: we document practical drawbacks alongside highlights, never accept payment from manufacturers to influence our assessments, and direct shoppers straight to verified official merchant pages.',
  ],
};

export const METHODOLOGY_PILLARS_DATA: MethodologyPillar[] = [
  {
    step: '01',
    titleAr: 'مقارنة الأسعار والتحقق من العروض',
    titleEn: 'Price Comparison & Deal Verification',
    subtitleAr: 'فحص مصداقية السعر المعلن',
    subtitleEn: 'Auditing Stated Pricing & Offers',
    descAr:
      'نفحص الأسعار المعلنة في المتاجر الرسمية ونقارنها مع الأسعار المعتادة للتأكد من مصداقية العرض واستبعاد التخفيضات المصطنعة.',
    descEn:
      'We examine published prices across official stores and compare them with standard benchmarks to verify offer authenticity and avoid manufactured discounts.',
    tagsAr: ['مقارنة الأسعار المعلنة', 'التحقق من الخصومات', 'مطابقة العملة الرسمية'],
    tagsEn: ['Published Price Check', 'Discount Verification', 'Official Currency Matching'],
  },
  {
    step: '02',
    titleAr: 'مراجعة آراء المشترين الفعليين',
    titleEn: 'Real Buyer Feedback Review',
    subtitleAr: 'تحليل تجارب الاستخدام الواقعية',
    subtitleEn: 'Analyzing Practical User Experiences',
    descAr:
      'نراجع تجارب وتقييمات المشترين الموثقين في المتاجر المعتمدة لفهم الأداء العملي ورصد أي مشاكل متكررة تم الإبلاغ عنها.',
    descEn:
      'We examine reviews from verified buyers on official platforms to understand real-world performance and spot recurring reported issues.',
    tagsAr: ['تحليل آراء المشترين', 'رصد المشاكل المتكررة', 'فرز الملاحظات الواقعية'],
    tagsEn: ['Buyer Feedback Analysis', 'Recurring Issue Tracking', 'Practical Notes Screening'],
  },
  {
    step: '03',
    titleAr: 'فحص المواصفات ومطابقتها',
    titleEn: 'Specification & Feature Verification',
    subtitleAr: 'مقارنة المواصفات المعلنة مع احتياج المستخدم',
    subtitleEn: 'Matching Stated Specs Against User Needs',
    descAr:
      'ندقق في المواصفات الفنية المعتمدة من الشركات المصنعة، ونقارنها بين الخيارات المتاحة، ونبرز القيود ونقاط الضعف بوضوح إلى جانب المزايا.',
    descEn:
      'We cross-check official manufacturer specifications, compare competing options, and highlight limitations and trade-offs alongside key features.',
    tagsAr: ['مطابقة المواصفات الرسمية', 'توضيح القيود والعيوب', 'مقارنة دقيقة'],
    tagsEn: ['Official Spec Matching', 'Clear Trade-offs', 'Detailed Comparison'],
  },
  {
    step: '04',
    titleAr: 'التوجيه المباشر للمتاجر الرسمية',
    titleEn: 'Direct Official Store Routing',
    subtitleAr: 'روابط واضحة وآمنة',
    subtitleEn: 'Clear & Direct Links',
    descAr:
      'نوجه القارئ بروابط مباشرة وواضحة إلى صفحات المنتجات في المتاجر الرسمية الموثوقة دون نوافذ مزعجة أو إعادة توجيه معقدة.',
    descEn:
      'We route readers through clear, direct links to official product pages on recognized stores without intrusive popups or complicated redirection.',
    tagsAr: ['روابط مباشرة', 'متاجر موثوقة', 'وضوح وشفافية'],
    tagsEn: ['Direct Store Links', 'Trusted Merchants', 'Full Transparency'],
  },
];

export const INTEGRITY_CHARTER_DATA: IntegrityCharterItem[] = [
  {
    number: '01',
    titleAr: 'صفر رعاية أو مدفوعات من الشركات',
    titleEn: 'Zero Paid Corporate Endorsements',
    principleAr: 'لا نبيع تقييماتنا أو نسمح للعمولات بتغيير ترتيب توصياتنا',
    principleEn: 'We never sell ratings or let commissions change our rankings',
    guaranteeAr:
      'كل منتج يظهر في AQURIVO اختاره فريقنا بناءً على جدارته وقيمته للمتسوق فقط. لا يمكن لأي شركة مصنعة دفع مال لتغيير حكمنا أو حجز موقع مميز.',
    guaranteeEn:
      'Every product on AQURIVO is selected strictly on merit. No manufacturer can buy placement or alter our editorial verdict under any circumstances.',
  },
  {
    number: '02',
    titleAr: 'ذكر عيوب الاستخدام قبل المزايا',
    titleEn: 'Flaws-First Editorial Transparency',
    principleAr: 'الأمانة تقتضي تحذير المتسوق من نقاط القصور قبل الإيجابيات',
    principleEn: 'Integrity demands alerting shoppers to drawbacks before benefits',
    guaranteeAr:
      'نخصص في كل مراجعة مساحة بارزة تحت عنوان «ما يجب الانتباه إليه» لتوثيق أي عيب تصنيعي أو قيد في الاستخدام، لكي تشتري وأنت على دراية تامة بكل التفاصيل.',
    guaranteeEn:
      'Every review includes an explicit ‘Things to Consider’ breakdown detailing limitations and manufacturing quirks, so you make fully informed purchases.',
  },
  {
    number: '03',
    titleAr: 'نزاهة العمولات وعدم زيادة السعر',
    titleEn: 'Affiliate Honesty & Zero Markups',
    principleAr: 'عمولتنا التسويقية لا تزيد فلساً واحداً على سعر مشترياتك',
    principleEn: 'Our partner commissions add exactly zero cents to what you pay',
    guaranteeAr:
      'عند الشراء عبر روابطنا قد يدفع لنا المتجر الشريك عمولة تسويقية صغيرة من أرباحه هو، دون أي زيادة أو رسوم خفية عليك. سعر المنتج هو نفس السعر الرسمي تماماً.',
    guaranteeEn:
      'When buying through our links, partner stores share a modest affiliate fee from their margin, at zero additional cost to you. The price is identical or better.',
  },
  {
    number: '04',
    titleAr: 'استقلالية القرار التحريري التامة',
    titleEn: 'Uncompromising Editorial Autonomy',
    principleAr: 'نستبعد أي منتج تنخفض جودته فوراً دون تردد',
    principleEn: 'We immediately delist products whose real-world quality drops',
    guaranteeAr:
      'إذا تراجع تقييم منتج لدى المشترين أو ظهرت فيه عيوب متكررة، نقوم بإزالته أو تنبيه المتسوق فوراً، بغض النظر عن حجم المبيعات أو عمولة المتجر الشريك.',
    guaranteeEn:
      'If buyer sentiment drops or recurring manufacturing defects emerge, we delist the item immediately, irrespective of its sales volume or affiliate yield.',
  },
];

export const EDITORIAL_METRICS_DATA: EditorialMetric[] = [
  {
    value: '49',
    labelAr: 'منتج منتقى وموثق في الدليل',
    labelEn: 'Vetted products in catalog',
    captionAr: 'فحص للمواصفات والأسعار المعلنة',
    captionEn: 'Verification of specs and stated pricing',
  },
  {
    value: '30+',
    labelAr: 'دليل شراء تحريري ومقارنة',
    labelEn: 'Buying guides and comparisons',
    captionAr: 'مقارنات موضوعية وعرض المزايا والعيوب',
    captionEn: 'Objective comparisons detailing pros and cons',
  },
  {
    value: '0',
    labelAr: 'إعلانات ممولة أو تقييمات مدفوعة',
    labelEn: 'Paid sponsorships or paid reviews',
    captionAr: 'استقلالية تحريرية كاملة بدون رعاية علامات تجارية',
    captionEn: '100% editorial impartiality with zero brand sponsors',
  },
  {
    value: '100%',
    labelAr: 'توجيه مباشر للمتاجر الرسمية',
    labelEn: 'Direct official merchant routing',
    captionAr: 'روابط واضحة وشفافة إلى المتاجر المعتمدة',
    captionEn: 'Clear, direct links to verified merchants',
  },
];

export const TEAM_DOSSIERS_DATA: TeamMemberDossier[] = [
  {
    id: 'soufiane',
    memberCode: 'AQ-STRAT-01',
    nameAr: 'سفيان العرايش',
    nameEn: 'Soufiane Laraich',
    roleAr: 'إدارة المشروع والاستراتيجية',
    roleEn: 'Project Management & Strategy',
    badgeAr: 'الإدارة والاستراتيجية',
    badgeEn: 'Executive Strategy',
    departmentAr: 'القيادة والتخطيط الاستراتيجي',
    departmentEn: 'Executive Strategy & Operations',
    iconName: 'Compass',
    scopeAr: 'تنظيم العمل وتطوير رؤية AQURIVO وتحسين تجربة الزوار.',
    scopeEn:
      'Organizing operations, developing the vision of AQURIVO, and enhancing visitor experience.',
    illustrationType: 'roadmap',
    illustrationTitleAr: 'مخطط حوكمة المنصة ومسار القرار الشرائي',
    illustrationTitleEn: 'Platform Governance & Strategic Decision Roadmap',
    illustrationCaptionAr: 'ربط ميثاق النزاهة والمراجعة التحريرية بحماية المتسوق النهائي',
    illustrationCaptionEn: 'Connecting integrity standards and editorial review to shopper protection',
    signatureMottoAr: 'بناء منصة تضع مصلحة المتسوق وثقته فوق أي اعتبار تسويقي.',
    signatureMottoEn: 'Building a platform that prioritizes shopper trust above any commercial hype.',
    workflowSteps: [
      {
        index: '01',
        titleAr: 'حوكمة المعايير التحريرية',
        titleEn: 'Editorial Governance',
        descAr: 'تطبيق ميثاق الاستقلالية التامة واستبعاد أي رعاية أو تمويل خارجي.',
        descEn: 'Enforcing full editorial independence and banning commercial sponsorships.',
        tagAr: 'ميثاق النزاهة',
        tagEn: 'Integrity Charter',
      },
      {
        index: '02',
        titleAr: 'تنسيق دورة البحث والتدقيق',
        titleEn: 'Research Workflow Coordination',
        descAr: 'إدارة تدفق العمل بين باحثي العروض ومحرري الأدلة ومدققي المواصفات.',
        descEn: 'Managing workflows across deal scouts, guide editors, and fact-checkers.',
        tagAr: 'تكامل العمليات',
        tagEn: 'Integrated Pipeline',
      },
      {
        index: '03',
        titleAr: 'تطوير تجربة الزائر وحمايته',
        titleEn: 'Shopper Protection & UX Evolution',
        descAr: 'تطوير سهولة الوصول للمعلومات وحماية المتسوق من عروض التخفيضات الزائفة.',
        descEn: 'Improving information accessibility and safeguarding users from inflated deals.',
        tagAr: 'ثقة المستهلك',
        tagEn: 'Shopper Trust',
      },
    ],
    responsibilitiesAr: [
      'تنظيم وتنسيق عمل الفريق',
      'تطوير رؤية ورسالة المنصة',
      'تحسين تجربة الزوار وتسهيل الوصول للمعلومات',
    ],
    responsibilitiesEn: [
      'Team workflow coordination',
      'Platform vision and mission roadmap',
      'Visitor experience and accessibility improvements',
    ],
    initialAr: 'س',
    initialEn: 'S',
    accentColor: 'emerald',
  },
  {
    id: 'said',
    memberCode: 'AQ-RSCH-02',
    nameAr: 'سعيد طلحة',
    nameEn: 'Said Talha',
    roleAr: 'البحث عن المنتجات',
    roleEn: 'Product Research',
    badgeAr: 'البحث والتقييم الميداني',
    badgeEn: 'Market Research',
    departmentAr: 'استطلاع السوق وتدقيق الأسعار',
    departmentEn: 'Market Intelligence & Price Verification',
    iconName: 'ScanSearch',
    scopeAr: 'جمع معلومات المنتجات ومقارنة المواصفات والأسعار المعلنة.',
    scopeEn:
      'Gathering product details and comparing published specifications and prices.',
    illustrationType: 'market-radar',
    illustrationTitleAr: 'رادار مسح المتاجر ومطابقة الأسعار الحقيقية',
    illustrationTitleEn: 'Market Radar & Price Discrepancy Matrix',
    illustrationCaptionAr: 'مقارنة الأسعار اللحظية وكشف الخصومات المصطنعة قبل التوصية',
    illustrationCaptionEn: 'Real-time price checking and fake sale detection prior to recommendation',
    signatureMottoAr: 'السعر الحقيقي هو المعيار الوحيد، ولا مكان للتخفيضات المصطنعة.',
    signatureMottoEn: 'Only genuine prices count; artificial discounts are systematically rejected.',
    workflowSteps: [
      {
        index: '01',
        titleAr: 'استطلاع المتاجر الرسمية المعتمدة',
        titleEn: 'Official Merchant Sweeps',
        descAr: 'فحص المنتجات الأكثر طلباً في Amazon والمنصات الكبرى الموثقة.',
        descEn: 'Scanning popular product catalogs across Amazon and verified marketplaces.',
        tagAr: 'مسح الكتالوجات',
        tagEn: 'Catalog Audit',
      },
      {
        index: '02',
        titleAr: 'مقارنة الأسعار وكشف الخصومات',
        titleEn: 'Price Comparison & Fake-Sale Check',
        descAr: 'مقارنة السعر المعروض مع الأسعار المعتادة لرصد أي تضخيم مفتعل.',
        descEn: 'Comparing listed promotional prices against standard benchmarks.',
        tagAr: 'كشف التضخيم',
        tagEn: 'Markup Detection',
      },
      {
        index: '03',
        titleAr: 'مطابقة وثائق المواصفات الرسمية',
        titleEn: 'Manufacturer Specification Matching',
        descAr: 'جمع بيانات الموديلات وتفاصيل الخامات المعتمدة للمقارنة.',
        descEn: 'Gathering official hardware models and verified material specifications.',
        tagAr: 'بيانات موثقة',
        tagEn: 'Certified Specs',
      },
    ],
    responsibilitiesAr: [
      'جمع معلومات المنتجات من المصادر الرسمية',
      'مقارنة الأسعار المعلنة في المتاجر المعتمدة',
      'متابعة العروض والتخفيضات المتاحة',
    ],
    responsibilitiesEn: [
      'Collecting product details from official sources',
      'Comparing published prices on recognized stores',
      'Tracking available offers and valid discounts',
    ],
    initialAr: 'س',
    initialEn: 'S',
    accentColor: 'terracotta',
  },
  {
    id: 'youssef',
    memberCode: 'AQ-EDIT-03',
    nameAr: 'Youssef Bouchoi',
    nameEn: 'Youssef Bouchoi',
    roleAr: 'تحرير المحتوى',
    roleEn: 'Content Editorial',
    badgeAr: 'التحرير وصياغة الأدلة',
    badgeEn: 'Content Architecture',
    departmentAr: 'التحرير التحريري وصياغة الأدلة',
    departmentEn: 'Content Architecture & Buying Guides',
    iconName: 'PenTool',
    scopeAr: 'إعداد أدلة الشراء وتنظيم المعلومات لتكون واضحة وسهلة الفهم.',
    scopeEn:
      'Preparing buying guides and organizing information to be clear and easy to understand.',
    illustrationType: 'editorial-canvas',
    illustrationTitleAr: 'هيكل الدليل التحريري ومصفوفة المقارنة',
    illustrationTitleEn: 'Editorial Guide Canvas & Comparative Matrix',
    illustrationCaptionAr: 'صياغة أدلة متوازنة توضح العيوب والقيود قبل المزايا للمتسوق',
    illustrationCaptionEn: 'Crafting balanced guides detailing caveats and trade-offs before benefits',
    signatureMottoAr: 'تبسيط التعقيد التقني وتقديم الحقيقة الكاملة لمساعدة القارئ في اختياره.',
    signatureMottoEn: 'Translating technical complexity into clear, actionable advice for shoppers.',
    workflowSteps: [
      {
        index: '01',
        titleAr: 'هيكلة أدلة الشراء المقارنة',
        titleEn: 'Structured Buying Guide Layout',
        descAr: 'بناء مقالات متخصصة تضع الخيارات المتقاربة جنباً إلى جنب بشكل عادل.',
        descEn: 'Drafting side-by-side product breakdowns that allow balanced evaluation.',
        tagAr: 'مقارنات متوازنة',
        tagEn: 'Fair Comparison',
      },
      {
        index: '02',
        titleAr: 'توثيق القيود والسلبيات أولاً',
        titleEn: 'Flaws-First Documentation',
        descAr: 'إبراز ما يجب الانتباه إليه وعيوب الاستخدام قبل استعراض الإيجابيات.',
        descEn: 'Detailing practical caveats and drawbacks before listing positive features.',
        tagAr: 'الشفافية أولاً',
        tagEn: 'Flaws-First',
      },
      {
        index: '03',
        titleAr: 'تبسيط اللغة للمستهلك العادي',
        titleEn: 'Clarity & Technical Demystification',
        descAr: 'تحويل المصطلحات المعقدة إلى معلومات واضحة تمكن الزائر من اتخاذ قراره.',
        descEn: 'Converting jargon into accessible prose empowering shopper confidence.',
        tagAr: 'سهولة القراءة',
        tagEn: 'Plain Language',
      },
    ],
    responsibilitiesAr: [
      'إعداد أدلة الشراء والمقارنات المتوازنة',
      'تنظيم وتنسيق المعلومات لتسهيل القراءة',
      'صياغة محتوى موضوعي يبرز المزايا والعيوب',
    ],
    responsibilitiesEn: [
      'Drafting well-balanced buying guides and comparisons',
      'Structuring information for quick comprehension',
      'Writing objective copy detailing pros and limitations',
    ],
    initialAr: 'Y',
    initialEn: 'Y',
    accentColor: 'teal',
  },
  {
    id: 'ilyas',
    memberCode: 'AQ-FACT-04',
    nameAr: 'إلياس حيطان',
    nameEn: 'Ilyas Hitane',
    roleAr: 'مراجعة المعلومات',
    roleEn: 'Information Fact-Checking',
    badgeAr: 'التدقيق ومراجعة المصادر',
    badgeEn: 'Fact-Checking',
    departmentAr: 'مراجعة وتدقيق الحقائق والمصادر',
    departmentEn: 'Fact-Checking & Source Audit',
    iconName: 'ShieldCheck',
    scopeAr: 'التحقق من المواصفات والمصادر وتحديد المعلومات غير المؤكدة.',
    scopeEn:
      'Verifying specifications and sources, and identifying unconfirmed details.',
    illustrationType: 'audit-ledger',
    illustrationTitleAr: 'سجل التحقق المرجعي وختم تدقيق المواصفات',
    illustrationTitleEn: 'Fact-Checking Ledger & Verification Stamp',
    illustrationCaptionAr: 'عزل الادعاءات التسويقية غير المثبتة والتحقق من صحة الروابط الصادرة',
    illustrationCaptionEn: 'Isolating unsubstantiated marketing hype and auditing official link destinations',
    signatureMottoAr: 'لا يمر ادعاء أو رقم واحد دون مصدر رسمي موثق وقابل للإثبات.',
    signatureMottoEn: 'Not a single spec or claim passes without verified, traceable evidence.',
    workflowSteps: [
      {
        index: '01',
        titleAr: 'التدقيق المرجعي للمواصفات',
        titleEn: 'Reference Benchmark Auditing',
        descAr: 'مطابقة كل رقم وميزة تقنية مع الأدلة الرسمية للشركة المصنعة.',
        descEn: 'Cross-verifying each technical spec with official manufacturer documentation.',
        tagAr: 'فحص المصادر',
        tagEn: 'Source Cross-Check',
      },
      {
        index: '02',
        titleAr: 'استبعاد الادعاءات غير المثبتة',
        titleEn: 'Filtering Unverified Marketing Claims',
        descAr: 'شطب أي مبالغات تسويقية أو عبارات رنانة لا تدعمها حقائق فنية واضحة.',
        descEn: 'Purging speculative promotional slogans unsupported by empirical data.',
        tagAr: 'تنقية المحتوى',
        tagEn: 'Hype Filtration',
      },
      {
        index: '03',
        titleAr: 'فحص الروابط والأمان الرقمي',
        titleEn: 'Direct Destination & Link Integrity',
        descAr: 'التأكد من أن روابط الشراء توجه مباشرة إلى المتجر الأصلي دون وسطاء.',
        descEn: 'Ensuring all outbound links route safely and directly to genuine merchants.',
        tagAr: 'روابط آمنة',
        tagEn: 'Safe Routing',
      },
    ],
    responsibilitiesAr: [
      'التحقق من دقة المواصفات والمصادر الفنية',
      'تحديد واستبعاد المعلومات غير المؤكدة أو المبالغ فيها',
      'فحص روابط المنتجات والتأكد من مطابقتها',
    ],
    responsibilitiesEn: [
      'Verifying specification accuracy and official sources',
      'Identifying and removing unconfirmed or inflated claims',
      'Auditing product links for correctness and integrity',
    ],
    initialAr: 'إ',
    initialEn: 'I',
    accentColor: 'olive',
  },
  {
    id: 'farah',
    memberCode: 'AQ-UXQC-05',
    nameAr: 'فراح العرايش',
    nameEn: 'Farah Laraich',
    roleAr: 'جودة المحتوى وتجربة المستخدم',
    roleEn: 'Content Quality & User Experience',
    badgeAr: 'جودة التجربة وسهولة القراءة',
    badgeEn: 'Quality & UX',
    departmentAr: 'جودة التجربة وقابلية القراءة',
    departmentEn: 'Quality Assurance & Reader Experience',
    iconName: 'LayoutGrid',
    scopeAr: 'تحسين ووضوح المقالات وسهولة تصفح الموقع.',
    scopeEn: 'Improving article clarity and website navigation ease.',
    illustrationType: 'ux-inspector',
    illustrationTitleAr: 'فاحص التجاوب وقابلية القراءة على مختلف الشاشات',
    illustrationTitleEn: 'Multi-Device Viewport & Readability Inspector',
    illustrationCaptionAr: 'ضبط إتاحة القراءة وانسيابية التصفح والوضوح التام على الهواتف',
    illustrationCaptionEn: 'Fine-tuning reading rhythm, accessibility contrast, and seamless mobile ergonomics',
    signatureMottoAr: 'تصميم يحترم وقت المتسوق، يزيل أي تشويش، ويجعل المعرفة سهلة ومريحة.',
    signatureMottoEn: 'An interface that respects the shopper’s focus, eliminates noise, and clarifies insight.',
    workflowSteps: [
      {
        index: '01',
        titleAr: 'مراجعة وضوح وسلاسة القراءة',
        titleEn: 'Typography & Readability Audit',
        descAr: 'ضبط التباين وحجم الخطوط والمسافات البصرية لتوفير تجربة مريحة للعين.',
        descEn: 'Optimizing font scales, contrast, and visual rhythm for effortless reading.',
        tagAr: 'إتاحة القراءة',
        tagEn: 'WCAG 2.2 AA',
      },
      {
        index: '02',
        titleAr: 'اختبار التجاوب على الهواتف',
        titleEn: 'Mobile Ergonomics Testing',
        descAr: 'فحص عرض الجداول والبطاقات والمقارنات على الشاشات الصغيرة بدقة.',
        descEn: 'Verifying tables, spec cards, and comparisons fit small smartphone viewports.',
        tagAr: 'تجاوب الهواتف',
        tagEn: 'Mobile Optimized',
      },
      {
        index: '03',
        titleAr: 'حظر الأنماط المخادعة (No Dark Patterns)',
        titleEn: 'Zero Dark Patterns Enforcement',
        descAr: 'ضمان وضوح الأزرار والروابط وتجنب أي عناصر بصرية تضلل القارئ.',
        descEn: 'Guaranteeing transparent callouts and preventing any deceptive UI traps.',
        tagAr: 'تصميم صادق',
        tagEn: 'Honest Design',
      },
    ],
    responsibilitiesAr: [
      'مراجعة جودة ووضوح صياغة المقالات',
      'تحسين سهولة تصفح الموقع والوصول للمحتوى',
      'التأكد من التوافق وسلاسة التجربة على الهواتف والحواسيب',
    ],
    responsibilitiesEn: [
      'Reviewing article clarity and readability flow',
      'Enhancing website navigation and usability',
      'Ensuring consistent responsiveness across mobile and desktop',
    ],
    initialAr: 'ف',
    initialEn: 'F',
    accentColor: 'clay',
  },
];

export const ABOUT_FAQS_DATA: AboutFaqItem[] = [
  {
    questionAr: 'كيف تختارون المنتجات التي تنشرونها على منصة AQURIVO؟',
    questionEn: 'How do you select the products showcased on AQURIVO?',
    answerAr:
      'يقوم فريقنا بالبحث في المنتجات المتاحة ومقارنة المواصفات والأسعار المعلنة في المتاجر الرسمية الموثوقة، مع مراجعة تجارب المشترين وتوثيق المزايا والعيوب بموضوعية قبل إعداد ونشر أي دليل شراء.',
    answerEn:
      'Our team researches available products and compares published specifications and prices on trusted official stores, reviewing genuine buyer feedback and documenting pros and cons objectively before publishing any buying guide.',
  },
  {
    questionAr: 'هل تدفع لكم الشركات المصنعة أموالاً مقابل تقييم إيجابي لمنتجاتها؟',
    questionEn: 'Do manufacturers pay you for positive product evaluations?',
    answerAr:
      'لا نقبل أموالاً أو هدايا أو رعاية مدفوعة مقابل تقييم إيجابي أو للتأثير في ترتيب التوصيات. وقد نحصل على عمولة تسويق من المتاجر الشريكة عند الشراء عبر بعض روابطنا، دون أن تؤثر في تقييماتنا. ونوضح ذلك في إفصاح الشراكة.',
    answerEn:
      'We do not accept fees, gifts, or paid sponsorships in exchange for positive reviews or to influence recommendation rankings. We may earn affiliate commissions when readers buy through some partner links; these do not affect our assessments, and we disclose them.',
  },
  {
    questionAr: 'هل يترتب عليّ أي دفع مالي إضافي عند الشراء عبر روابطكم؟',
    questionEn: 'Do I incur any additional fees when buying via your links?',
    answerAr:
      'لا على الإطلاق. السعر الذي تدفعه في المتجر الشريك هو السعر الرسمي الأصلي تماماً (أو أقل في حال وجود كوبون خصم مباشر). المتجر يشاركنا عمولة تسويقية بسيطة من هامش ربحه المعتاد دون أن تتحمل أنت أي فلس إضافي.',
    answerEn:
      'Not a single penny. You pay the exact official price on the merchant store (or less if an active promotion applies). The merchant shares a standard affiliate margin from their profits, with zero markup added to your cart.',
  },
  {
    questionAr: 'كيف تتأكدون من أن الروابط آمنة وتذهب للمتجر الرسمي فقط؟',
    questionEn: 'How do you guarantee outbound links lead only to official stores?',
    answerAr:
      'نحن نستخدم فحصاً مستمراً لجميع الروابط الصادرة للتأكد من توجيهها المباشر للنطاقات الرسمية الموثقة للمتاجر الشريكة عبر تشفير آمن، دون أي نوافذ منبثقة أو روابط تتبع مشبوهة تضر بخصوصيتك.',
    answerEn:
      'We run ongoing link integrity checks verifying that every outbound redirect points directly to the certified official store domain via encrypted HTTPS, free from intrusive popups or deceptive intermediaries.',
  },
  {
    questionAr: 'كيف يمكنني التواصل مع فريق العمل أو تقديم ملاحظة؟',
    questionEn: 'How can I reach your team or submit feedback?',
    answerAr:
      'نرحب دائماً بملاحظات المتسوقين وتجاربهم. يمكنك مراسلة فريق العمل عبر البريد الإلكتروني contact@aqurivo.store أو عبر واتساب الرسمي على الرقم +212684063908.',
    answerEn:
      'We welcome feedback from buyers. You can reach our team directly at contact@aqurivo.store or via official WhatsApp at +212684063908.',
  },
];
