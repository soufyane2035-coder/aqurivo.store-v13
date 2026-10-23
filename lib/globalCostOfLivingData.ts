export type GlobalRegionId =
  | 'europe'
  | 'americas'
  | 'asia_pacific'
  | 'mena'
  | 'africa';

export interface GlobalCityBenchmark {
  id: string;
  countryCode: string; // ISO-2 e.g. 'US', 'DE', 'JP', 'MA', 'SA', 'BR', 'ZA'
  countryAr: string;
  countryEn: string;
  cityAr: string;
  cityEn: string;
  region: GlobalRegionId;
  currencyCode: string;
  currencySymbol: string;
  /** Units of local currency per 1 USD */
  rateFromUsd: number;
  /** Timezones mapped to this city for instant browser detection */
  timezones: string[];
  /** Search keywords, aliases, airport codes, colloquial names */
  keywords: string[];
  /**
   * Realistic Monthly Base Costs in USD for a single independent adult
   * (Standard international benchmark anchored to 2025/2026 global cost indices)
   */
  baseUsd: {
    /** 1-bedroom apartment in city center */
    rentCenter: number;
    /** 1-bedroom apartment outside center */
    rentSuburb: number;
    /** Monthly groceries & household supplies */
    groceries: number;
    /** Monthly transit pass, taxi & local mobility */
    transport: number;
    /** Electricity, heating/cooling, water, high-speed fiber internet */
    utilities: number;
    /** Dining out, coffee, fitness, cinema & lifestyle */
    diningLifestyle: number;
  };
  /** Typical monthly net salary in USD for reference */
  typicalNetSalaryUsd: number;
}

export interface GlobalRegionMeta {
  id: GlobalRegionId | 'all';
  labelAr: string;
  labelEn: string;
}

export const GLOBAL_REGIONS: GlobalRegionMeta[] = [
  { id: 'all', labelAr: 'جميع القارات', labelEn: 'All Regions' },
  { id: 'europe', labelAr: 'أوروبا', labelEn: 'Europe' },
  { id: 'americas', labelAr: 'الأمريكتان', labelEn: 'Americas' },
  { id: 'asia_pacific', labelAr: 'آسيا والمحيط الهادئ', labelEn: 'Asia-Pacific' },
  { id: 'mena', labelAr: 'الشرق الأوسط وشمال أفريقيا', labelEn: 'Middle East & North Africa' },
  { id: 'africa', labelAr: 'أفريقيا', labelEn: 'Sub-Saharan Africa' },
];

export const GLOBAL_CITIES_DATA: GlobalCityBenchmark[] = [
  // ================= EUROPE =================
  {
    id: 'london_gb',
    countryCode: 'GB',
    countryAr: 'المملكة المتحدة',
    countryEn: 'United Kingdom',
    cityAr: 'لندن',
    cityEn: 'London',
    region: 'europe',
    currencyCode: 'GBP',
    currencySymbol: '£',
    rateFromUsd: 0.79,
    timezones: ['Europe/London'],
    keywords: ['uk', 'britain', 'england', 'بريطانيا', 'انجلترا', 'لندن', 'gbp'],
    baseUsd: {
      rentCenter: 2750,
      rentSuburb: 2050,
      groceries: 490,
      transport: 215,
      utilities: 310,
      diningLifestyle: 460,
    },
    typicalNetSalaryUsd: 4300,
  },
  {
    id: 'manchester_gb',
    countryCode: 'GB',
    countryAr: 'المملكة المتحدة',
    countryEn: 'United Kingdom',
    cityAr: 'مانشستر',
    cityEn: 'Manchester',
    region: 'europe',
    currencyCode: 'GBP',
    currencySymbol: '£',
    rateFromUsd: 0.79,
    timezones: [],
    keywords: ['uk', 'britain', 'england', 'بريطانيا', 'مانشستر'],
    baseUsd: {
      rentCenter: 1520,
      rentSuburb: 1180,
      groceries: 420,
      transport: 125,
      utilities: 280,
      diningLifestyle: 340,
    },
    typicalNetSalaryUsd: 3400,
  },
  {
    id: 'paris_fr',
    countryCode: 'FR',
    countryAr: 'فرنسا',
    countryEn: 'France',
    cityAr: 'باريس',
    cityEn: 'Paris',
    region: 'europe',
    currencyCode: 'EUR',
    currencySymbol: '€',
    rateFromUsd: 0.92,
    timezones: ['Europe/Paris'],
    keywords: ['france', 'فرنسا', 'باريس', 'eur', 'اوروبا'],
    baseUsd: {
      rentCenter: 1580,
      rentSuburb: 1190,
      groceries: 480,
      transport: 95,
      utilities: 240,
      diningLifestyle: 390,
    },
    typicalNetSalaryUsd: 3350,
  },
  {
    id: 'lyon_fr',
    countryCode: 'FR',
    countryAr: 'فرنسا',
    countryEn: 'France',
    cityAr: 'ليون',
    cityEn: 'Lyon',
    region: 'europe',
    currencyCode: 'EUR',
    currencySymbol: '€',
    rateFromUsd: 0.92,
    timezones: [],
    keywords: ['france', 'فرنسا', 'ليون'],
    baseUsd: {
      rentCenter: 980,
      rentSuburb: 760,
      groceries: 430,
      transport: 80,
      utilities: 220,
      diningLifestyle: 310,
    },
    typicalNetSalaryUsd: 2950,
  },
  {
    id: 'berlin_de',
    countryCode: 'DE',
    countryAr: 'ألمانيا',
    countryEn: 'Germany',
    cityAr: 'برلين',
    cityEn: 'Berlin',
    region: 'europe',
    currencyCode: 'EUR',
    currencySymbol: '€',
    rateFromUsd: 0.92,
    timezones: ['Europe/Berlin'],
    keywords: ['germany', 'المانيا', 'ألمانيا', 'برلين', 'deutschland'],
    baseUsd: {
      rentCenter: 1540,
      rentSuburb: 1160,
      groceries: 440,
      transport: 65,
      utilities: 330,
      diningLifestyle: 360,
    },
    typicalNetSalaryUsd: 3600,
  },
  {
    id: 'munich_de',
    countryCode: 'DE',
    countryAr: 'ألمانيا',
    countryEn: 'Germany',
    cityAr: 'ميونخ',
    cityEn: 'Munich',
    region: 'europe',
    currencyCode: 'EUR',
    currencySymbol: '€',
    rateFromUsd: 0.92,
    timezones: [],
    keywords: ['germany', 'المانيا', 'ميونخ', 'ميونيخ', 'munchen'],
    baseUsd: {
      rentCenter: 1890,
      rentSuburb: 1450,
      groceries: 460,
      transport: 65,
      utilities: 350,
      diningLifestyle: 410,
    },
    typicalNetSalaryUsd: 4150,
  },
  {
    id: 'zurich_ch',
    countryCode: 'CH',
    countryAr: 'سويسرا',
    countryEn: 'Switzerland',
    cityAr: 'زيورخ',
    cityEn: 'Zurich',
    region: 'europe',
    currencyCode: 'CHF',
    currencySymbol: 'CHF',
    rateFromUsd: 0.88,
    timezones: ['Europe/Zurich'],
    keywords: ['switzerland', 'سويسرا', 'زيورخ', 'جنيف', 'chf'],
    baseUsd: {
      rentCenter: 2850,
      rentSuburb: 2180,
      groceries: 820,
      transport: 105,
      utilities: 260,
      diningLifestyle: 640,
    },
    typicalNetSalaryUsd: 7400,
  },
  {
    id: 'amsterdam_nl',
    countryCode: 'NL',
    countryAr: 'هولندا',
    countryEn: 'Netherlands',
    cityAr: 'أمستردام',
    cityEn: 'Amsterdam',
    region: 'europe',
    currencyCode: 'EUR',
    currencySymbol: '€',
    rateFromUsd: 0.92,
    timezones: ['Europe/Amsterdam'],
    keywords: ['netherlands', 'holland', 'هولندا', 'امستردام', 'أمستردام'],
    baseUsd: {
      rentCenter: 2150,
      rentSuburb: 1690,
      groceries: 460,
      transport: 115,
      utilities: 275,
      diningLifestyle: 420,
    },
    typicalNetSalaryUsd: 4200,
  },
  {
    id: 'madrid_es',
    countryCode: 'ES',
    countryAr: 'إسبانيا',
    countryEn: 'Spain',
    cityAr: 'مدريد',
    cityEn: 'Madrid',
    region: 'europe',
    currencyCode: 'EUR',
    currencySymbol: '€',
    rateFromUsd: 0.92,
    timezones: ['Europe/Madrid'],
    keywords: ['spain', 'اسبانيا', 'إسبانيا', 'مدريد'],
    baseUsd: {
      rentCenter: 1380,
      rentSuburb: 1020,
      groceries: 370,
      transport: 60,
      utilities: 195,
      diningLifestyle: 310,
    },
    typicalNetSalaryUsd: 2450,
  },
  {
    id: 'barcelona_es',
    countryCode: 'ES',
    countryAr: 'إسبانيا',
    countryEn: 'Spain',
    cityAr: 'برشلونة',
    cityEn: 'Barcelona',
    region: 'europe',
    currencyCode: 'EUR',
    currencySymbol: '€',
    rateFromUsd: 0.92,
    timezones: [],
    keywords: ['spain', 'اسبانيا', 'برشلونة', 'برشلونه'],
    baseUsd: {
      rentCenter: 1460,
      rentSuburb: 1090,
      groceries: 380,
      transport: 58,
      utilities: 200,
      diningLifestyle: 325,
    },
    typicalNetSalaryUsd: 2400,
  },
  {
    id: 'milan_it',
    countryCode: 'IT',
    countryAr: 'إيطاليا',
    countryEn: 'Italy',
    cityAr: 'ميلانو',
    cityEn: 'Milan',
    region: 'europe',
    currencyCode: 'EUR',
    currencySymbol: '€',
    rateFromUsd: 0.92,
    timezones: ['Europe/Rome'],
    keywords: ['italy', 'ايطاليا', 'إيطاليا', 'ميلانو', 'روما', 'rome'],
    baseUsd: {
      rentCenter: 1520,
      rentSuburb: 1080,
      groceries: 420,
      transport: 48,
      utilities: 230,
      diningLifestyle: 340,
    },
    typicalNetSalaryUsd: 2300,
  },
  {
    id: 'stockholm_se',
    countryCode: 'SE',
    countryAr: 'السويد',
    countryEn: 'Sweden',
    cityAr: 'ستوكهولم',
    cityEn: 'Stockholm',
    region: 'europe',
    currencyCode: 'SEK',
    currencySymbol: 'kr',
    rateFromUsd: 10.4,
    timezones: ['Europe/Stockholm'],
    keywords: ['sweden', 'السويد', 'ستوكهولم', 'sek'],
    baseUsd: {
      rentCenter: 1490,
      rentSuburb: 1060,
      groceries: 450,
      transport: 100,
      utilities: 165,
      diningLifestyle: 370,
    },
    typicalNetSalaryUsd: 3300,
  },
  {
    id: 'vienna_at',
    countryCode: 'AT',
    countryAr: 'النمسا',
    countryEn: 'Austria',
    cityAr: 'فيينا',
    cityEn: 'Vienna',
    region: 'europe',
    currencyCode: 'EUR',
    currencySymbol: '€',
    rateFromUsd: 0.92,
    timezones: ['Europe/Vienna'],
    keywords: ['austria', 'النمسا', 'فيينا'],
    baseUsd: {
      rentCenter: 1180,
      rentSuburb: 890,
      groceries: 430,
      transport: 55,
      utilities: 260,
      diningLifestyle: 330,
    },
    typicalNetSalaryUsd: 3150,
  },
  {
    id: 'dublin_ie',
    countryCode: 'IE',
    countryAr: 'أيرلندا',
    countryEn: 'Ireland',
    cityAr: 'دبلن',
    cityEn: 'Dublin',
    region: 'europe',
    currencyCode: 'EUR',
    currencySymbol: '€',
    rateFromUsd: 0.92,
    timezones: ['Europe/Dublin'],
    keywords: ['ireland', 'ايرلندا', 'أيرلندا', 'دبلن'],
    baseUsd: {
      rentCenter: 2290,
      rentSuburb: 1840,
      groceries: 470,
      transport: 115,
      utilities: 265,
      diningLifestyle: 420,
    },
    typicalNetSalaryUsd: 3900,
  },
  {
    id: 'lisbon_pt',
    countryCode: 'PT',
    countryAr: 'البرتغال',
    countryEn: 'Portugal',
    cityAr: 'لشبونة',
    cityEn: 'Lisbon',
    region: 'europe',
    currencyCode: 'EUR',
    currencySymbol: '€',
    rateFromUsd: 0.92,
    timezones: ['Europe/Lisbon'],
    keywords: ['portugal', 'البرتغال', 'لشبونة', 'بورتو'],
    baseUsd: {
      rentCenter: 1390,
      rentSuburb: 1020,
      groceries: 340,
      transport: 45,
      utilities: 155,
      diningLifestyle: 260,
    },
    typicalNetSalaryUsd: 1650,
  },
  {
    id: 'warsaw_pl',
    countryCode: 'PL',
    countryAr: 'بولندا',
    countryEn: 'Poland',
    cityAr: 'وارسو',
    cityEn: 'Warsaw',
    region: 'europe',
    currencyCode: 'PLN',
    currencySymbol: 'zł',
    rateFromUsd: 3.98,
    timezones: ['Europe/Warsaw'],
    keywords: ['poland', 'بولندا', 'وارسو', 'pln'],
    baseUsd: {
      rentCenter: 1120,
      rentSuburb: 860,
      groceries: 310,
      transport: 38,
      utilities: 240,
      diningLifestyle: 250,
    },
    typicalNetSalaryUsd: 2100,
  },
  {
    id: 'prague_cz',
    countryCode: 'CZ',
    countryAr: 'التشيك',
    countryEn: 'Czechia',
    cityAr: 'براغ',
    cityEn: 'Prague',
    region: 'europe',
    currencyCode: 'CZK',
    currencySymbol: 'Kč',
    rateFromUsd: 23.2,
    timezones: ['Europe/Prague'],
    keywords: ['czech', 'التشيك', 'براغ'],
    baseUsd: {
      rentCenter: 1190,
      rentSuburb: 910,
      groceries: 340,
      transport: 32,
      utilities: 270,
      diningLifestyle: 260,
    },
    typicalNetSalaryUsd: 2250,
  },
  {
    id: 'athens_gr',
    countryCode: 'GR',
    countryAr: 'اليونان',
    countryEn: 'Greece',
    cityAr: 'أثينا',
    cityEn: 'Athens',
    region: 'europe',
    currencyCode: 'EUR',
    currencySymbol: '€',
    rateFromUsd: 0.92,
    timezones: ['Europe/Athens'],
    keywords: ['greece', 'اليونان', 'أثينا', 'اثينا'],
    baseUsd: {
      rentCenter: 690,
      rentSuburb: 540,
      groceries: 330,
      transport: 35,
      utilities: 210,
      diningLifestyle: 240,
    },
    typicalNetSalaryUsd: 1350,
  },
  {
    id: 'istanbul_tr',
    countryCode: 'TR',
    countryAr: 'تركيا',
    countryEn: 'Turkey',
    cityAr: 'إسطنبول',
    cityEn: 'Istanbul',
    region: 'europe',
    currencyCode: 'TRY',
    currencySymbol: '₺',
    rateFromUsd: 34.2,
    timezones: ['Europe/Istanbul'],
    keywords: ['turkey', 'turkiye', 'تركيا', 'اسطنبول', 'إسطنبول', 'انقرة', 'try'],
    baseUsd: {
      rentCenter: 890,
      rentSuburb: 610,
      groceries: 310,
      transport: 48,
      utilities: 110,
      diningLifestyle: 230,
    },
    typicalNetSalaryUsd: 1150,
  },
  {
    id: 'ankara_tr',
    countryCode: 'TR',
    countryAr: 'تركيا',
    countryEn: 'Turkey',
    cityAr: 'أنقرة',
    cityEn: 'Ankara',
    region: 'europe',
    currencyCode: 'TRY',
    currencySymbol: '₺',
    rateFromUsd: 34.2,
    timezones: [],
    keywords: ['turkey', 'تركيا', 'أنقرة', 'انقرة'],
    baseUsd: {
      rentCenter: 620,
      rentSuburb: 430,
      groceries: 280,
      transport: 42,
      utilities: 95,
      diningLifestyle: 185,
    },
    typicalNetSalaryUsd: 1050,
  },

  // ================= AMERICAS =================
  {
    id: 'new_york_us',
    countryCode: 'US',
    countryAr: 'الولايات المتحدة',
    countryEn: 'United States',
    cityAr: 'نيويورك',
    cityEn: 'New York',
    region: 'americas',
    currencyCode: 'USD',
    currencySymbol: '$',
    rateFromUsd: 1,
    timezones: ['America/New_York'],
    keywords: ['usa', 'us', 'america', 'nyc', 'امريكا', 'أمريكا', 'نيويورك', 'الولايات المتحدة'],
    baseUsd: {
      rentCenter: 3850,
      rentSuburb: 2750,
      groceries: 640,
      transport: 145,
      utilities: 245,
      diningLifestyle: 580,
    },
    typicalNetSalaryUsd: 6200,
  },
  {
    id: 'san_francisco_us',
    countryCode: 'US',
    countryAr: 'الولايات المتحدة',
    countryEn: 'United States',
    cityAr: 'سان فرانسيسكو',
    cityEn: 'San Francisco',
    region: 'americas',
    currencyCode: 'USD',
    currencySymbol: '$',
    rateFromUsd: 1,
    timezones: ['America/Los_Angeles'],
    keywords: ['usa', 'california', 'sf', 'silicon valley', 'امريكا', 'سان فرانسيسكو', 'لوس انجلوس'],
    baseUsd: {
      rentCenter: 3350,
      rentSuburb: 2580,
      groceries: 620,
      transport: 135,
      utilities: 250,
      diningLifestyle: 540,
    },
    typicalNetSalaryUsd: 6800,
  },
  {
    id: 'chicago_us',
    countryCode: 'US',
    countryAr: 'الولايات المتحدة',
    countryEn: 'United States',
    cityAr: 'شيكاغو',
    cityEn: 'Chicago',
    region: 'americas',
    currencyCode: 'USD',
    currencySymbol: '$',
    rateFromUsd: 1,
    timezones: ['America/Chicago'],
    keywords: ['usa', 'امريكا', 'شيكاغو'],
    baseUsd: {
      rentCenter: 2250,
      rentSuburb: 1680,
      groceries: 510,
      transport: 115,
      utilities: 210,
      diningLifestyle: 430,
    },
    typicalNetSalaryUsd: 5100,
  },
  {
    id: 'austin_us',
    countryCode: 'US',
    countryAr: 'الولايات المتحدة',
    countryEn: 'United States',
    cityAr: 'أوستن (تكساس)',
    cityEn: 'Austin, TX',
    region: 'americas',
    currencyCode: 'USD',
    currencySymbol: '$',
    rateFromUsd: 1,
    timezones: [],
    keywords: ['usa', 'texas', 'امريكا', 'تكساس', 'أوستن', 'اوستن', 'هيوستن'],
    baseUsd: {
      rentCenter: 1950,
      rentSuburb: 1460,
      groceries: 470,
      transport: 120,
      utilities: 225,
      diningLifestyle: 390,
    },
    typicalNetSalaryUsd: 5200,
  },
  {
    id: 'toronto_ca',
    countryCode: 'CA',
    countryAr: 'كندا',
    countryEn: 'Canada',
    cityAr: 'تورونتو',
    cityEn: 'Toronto',
    region: 'americas',
    currencyCode: 'CAD',
    currencySymbol: 'CA$',
    rateFromUsd: 1.36,
    timezones: ['America/Toronto'],
    keywords: ['canada', 'كندا', 'تورونتو', 'تورنتو', 'cad'],
    baseUsd: {
      rentCenter: 1920,
      rentSuburb: 1560,
      groceries: 460,
      transport: 120,
      utilities: 185,
      diningLifestyle: 360,
    },
    typicalNetSalaryUsd: 3850,
  },
  {
    id: 'montreal_ca',
    countryCode: 'CA',
    countryAr: 'كندا',
    countryEn: 'Canada',
    cityAr: 'مونتريال',
    cityEn: 'Montreal',
    region: 'americas',
    currencyCode: 'CAD',
    currencySymbol: 'CA$',
    rateFromUsd: 1.36,
    timezones: ['America/Montreal'],
    keywords: ['canada', 'كندا', 'مونتريال', 'quebec'],
    baseUsd: {
      rentCenter: 1380,
      rentSuburb: 1050,
      groceries: 430,
      transport: 82,
      utilities: 145,
      diningLifestyle: 320,
    },
    typicalNetSalaryUsd: 3400,
  },
  {
    id: 'vancouver_ca',
    countryCode: 'CA',
    countryAr: 'كندا',
    countryEn: 'Canada',
    cityAr: 'فانكوفر',
    cityEn: 'Vancouver',
    region: 'americas',
    currencyCode: 'CAD',
    currencySymbol: 'CA$',
    rateFromUsd: 1.36,
    timezones: ['America/Vancouver'],
    keywords: ['canada', 'كندا', 'فانكوفر'],
    baseUsd: {
      rentCenter: 2080,
      rentSuburb: 1680,
      groceries: 480,
      transport: 105,
      utilities: 165,
      diningLifestyle: 375,
    },
    typicalNetSalaryUsd: 3900,
  },
  {
    id: 'mexico_city_mx',
    countryCode: 'MX',
    countryAr: 'المكسيك',
    countryEn: 'Mexico',
    cityAr: 'مكسيكو سيتي',
    cityEn: 'Mexico City',
    region: 'americas',
    currencyCode: 'MXN',
    currencySymbol: 'MX$',
    rateFromUsd: 19.6,
    timezones: ['America/Mexico_City'],
    keywords: ['mexico', 'cdmx', 'المكسيك', 'مكسيكو'],
    baseUsd: {
      rentCenter: 980,
      rentSuburb: 640,
      groceries: 290,
      transport: 42,
      utilities: 95,
      diningLifestyle: 230,
    },
    typicalNetSalaryUsd: 1250,
  },
  {
    id: 'sao_paulo_br',
    countryCode: 'BR',
    countryAr: 'البرازيل',
    countryEn: 'Brazil',
    cityAr: 'ساو باولو',
    cityEn: 'São Paulo',
    region: 'americas',
    currencyCode: 'BRL',
    currencySymbol: 'R$',
    rateFromUsd: 5.5,
    timezones: ['America/Sao_Paulo'],
    keywords: ['brazil', 'البرازيل', 'ساو باولو', 'ريو', 'brl'],
    baseUsd: {
      rentCenter: 740,
      rentSuburb: 510,
      groceries: 260,
      transport: 58,
      utilities: 115,
      diningLifestyle: 210,
    },
    typicalNetSalaryUsd: 980,
  },
  {
    id: 'buenos_aires_ar',
    countryCode: 'AR',
    countryAr: 'الأرجنتين',
    countryEn: 'Argentina',
    cityAr: 'بوينس آيرس',
    cityEn: 'Buenos Aires',
    region: 'americas',
    currencyCode: 'ARS',
    currencySymbol: 'ARS',
    rateFromUsd: 980,
    timezones: ['America/Argentina/Buenos_Aires'],
    keywords: ['argentina', 'الارجنتين', 'الأرجنتين', 'بوينس ايرس'],
    baseUsd: {
      rentCenter: 560,
      rentSuburb: 410,
      groceries: 240,
      transport: 35,
      utilities: 85,
      diningLifestyle: 190,
    },
    typicalNetSalaryUsd: 820,
  },

  // ================= ASIA-PACIFIC =================
  {
    id: 'tokyo_jp',
    countryCode: 'JP',
    countryAr: 'اليابان',
    countryEn: 'Japan',
    cityAr: 'طوكيو',
    cityEn: 'Tokyo',
    region: 'asia_pacific',
    currencyCode: 'JPY',
    currencySymbol: '¥',
    rateFromUsd: 148,
    timezones: ['Asia/Tokyo'],
    keywords: ['japan', 'اليابان', 'طوكيو', 'اوساكا', 'jpy'],
    baseUsd: {
      rentCenter: 1180,
      rentSuburb: 790,
      groceries: 410,
      transport: 95,
      utilities: 195,
      diningLifestyle: 310,
    },
    typicalNetSalaryUsd: 2850,
  },
  {
    id: 'singapore_sg',
    countryCode: 'SG',
    countryAr: 'سنغافورة',
    countryEn: 'Singapore',
    cityAr: 'سنغافورة',
    cityEn: 'Singapore',
    region: 'asia_pacific',
    currencyCode: 'SGD',
    currencySymbol: 'S$',
    rateFromUsd: 1.31,
    timezones: ['Asia/Singapore'],
    keywords: ['singapore', 'سنغافورة', 'سنغافوره', 'sgd'],
    baseUsd: {
      rentCenter: 2950,
      rentSuburb: 2150,
      groceries: 490,
      transport: 115,
      utilities: 210,
      diningLifestyle: 420,
    },
    typicalNetSalaryUsd: 4900,
  },
  {
    id: 'seoul_kr',
    countryCode: 'KR',
    countryAr: 'كوريا الجنوبية',
    countryEn: 'South Korea',
    cityAr: 'سيول',
    cityEn: 'Seoul',
    region: 'asia_pacific',
    currencyCode: 'KRW',
    currencySymbol: '₩',
    rateFromUsd: 1350,
    timezones: ['Asia/Seoul'],
    keywords: ['korea', 'south korea', 'كوريا', 'سيول', 'سول', 'krw'],
    baseUsd: {
      rentCenter: 980,
      rentSuburb: 690,
      groceries: 460,
      transport: 68,
      utilities: 185,
      diningLifestyle: 310,
    },
    typicalNetSalaryUsd: 2750,
  },
  {
    id: 'sydney_au',
    countryCode: 'AU',
    countryAr: 'أستراليا',
    countryEn: 'Australia',
    cityAr: 'سيدني',
    cityEn: 'Sydney',
    region: 'asia_pacific',
    currencyCode: 'AUD',
    currencySymbol: 'A$',
    rateFromUsd: 1.49,
    timezones: ['Australia/Sydney', 'Australia/Melbourne'],
    keywords: ['australia', 'استراليا', 'أستراليا', 'سيدني', 'ملبورن', 'aud'],
    baseUsd: {
      rentCenter: 2280,
      rentSuburb: 1690,
      groceries: 510,
      transport: 155,
      utilities: 230,
      diningLifestyle: 420,
    },
    typicalNetSalaryUsd: 4300,
  },
  {
    id: 'kuala_lumpur_my',
    countryCode: 'MY',
    countryAr: 'ماليزيا',
    countryEn: 'Malaysia',
    cityAr: 'كوالالمبور',
    cityEn: 'Kuala Lumpur',
    region: 'asia_pacific',
    currencyCode: 'MYR',
    currencySymbol: 'RM',
    rateFromUsd: 4.3,
    timezones: ['Asia/Kuala_Lumpur'],
    keywords: ['malaysia', 'kl', 'ماليزيا', 'كوالالمبور', 'myr'],
    baseUsd: {
      rentCenter: 560,
      rentSuburb: 380,
      groceries: 250,
      transport: 48,
      utilities: 85,
      diningLifestyle: 180,
    },
    typicalNetSalaryUsd: 1150,
  },
  {
    id: 'bangkok_th',
    countryCode: 'TH',
    countryAr: 'تايلاند',
    countryEn: 'Thailand',
    cityAr: 'بانكوك',
    cityEn: 'Bangkok',
    region: 'asia_pacific',
    currencyCode: 'THB',
    currencySymbol: '฿',
    rateFromUsd: 33.5,
    timezones: ['Asia/Bangkok'],
    keywords: ['thailand', 'تايلاند', 'بانكوك', 'thb'],
    baseUsd: {
      rentCenter: 640,
      rentSuburb: 390,
      groceries: 270,
      transport: 55,
      utilities: 95,
      diningLifestyle: 195,
    },
    typicalNetSalaryUsd: 950,
  },
  {
    id: 'jakarta_id',
    countryCode: 'ID',
    countryAr: 'إندونيسيا',
    countryEn: 'Indonesia',
    cityAr: 'جاكرتا',
    cityEn: 'Jakarta',
    region: 'asia_pacific',
    currencyCode: 'IDR',
    currencySymbol: 'Rp',
    rateFromUsd: 15500,
    timezones: ['Asia/Jakarta'],
    keywords: ['indonesia', 'bali', 'اندونيسيا', 'إندونيسيا', 'جاكرتا', 'بالي'],
    baseUsd: {
      rentCenter: 520,
      rentSuburb: 330,
      groceries: 230,
      transport: 42,
      utilities: 90,
      diningLifestyle: 165,
    },
    typicalNetSalaryUsd: 780,
  },
  {
    id: 'shanghai_cn',
    countryCode: 'CN',
    countryAr: 'الصين',
    countryEn: 'China',
    cityAr: 'شنغهاي',
    cityEn: 'Shanghai',
    region: 'asia_pacific',
    currencyCode: 'CNY',
    currencySymbol: '¥',
    rateFromUsd: 7.1,
    timezones: ['Asia/Shanghai', 'Asia/Chongqing'],
    keywords: ['china', 'الصين', 'شنغهاي', 'بكين', 'beijing', 'cny'],
    baseUsd: {
      rentCenter: 1090,
      rentSuburb: 640,
      groceries: 310,
      transport: 45,
      utilities: 95,
      diningLifestyle: 240,
    },
    typicalNetSalaryUsd: 1950,
  },
  {
    id: 'mumbai_in',
    countryCode: 'IN',
    countryAr: 'الهند',
    countryEn: 'India',
    cityAr: 'مومباي',
    cityEn: 'Mumbai',
    region: 'asia_pacific',
    currencyCode: 'INR',
    currencySymbol: '₹',
    rateFromUsd: 84,
    timezones: ['Asia/Kolkata', 'Asia/Calcutta'],
    keywords: ['india', 'الهند', 'مومباي', 'دلهي', 'بنغالور', 'inr'],
    baseUsd: {
      rentCenter: 680,
      rentSuburb: 390,
      groceries: 185,
      transport: 38,
      utilities: 72,
      diningLifestyle: 145,
    },
    typicalNetSalaryUsd: 890,
  },

  // ================= MIDDLE EAST & NORTH AFRICA =================
  {
    id: 'dubai_ae',
    countryCode: 'AE',
    countryAr: 'الإمارات',
    countryEn: 'United Arab Emirates',
    cityAr: 'دبي',
    cityEn: 'Dubai',
    region: 'mena',
    currencyCode: 'AED',
    currencySymbol: 'AED',
    rateFromUsd: 3.67,
    timezones: ['Asia/Dubai'],
    keywords: ['uae', 'emirates', 'الامارات', 'الإمارات', 'دبي', 'aed'],
    baseUsd: {
      rentCenter: 2180,
      rentSuburb: 1520,
      groceries: 440,
      transport: 135,
      utilities: 240,
      diningLifestyle: 420,
    },
    typicalNetSalaryUsd: 4200,
  },
  {
    id: 'abu_dhabi_ae',
    countryCode: 'AE',
    countryAr: 'الإمارات',
    countryEn: 'United Arab Emirates',
    cityAr: 'أبوظبي',
    cityEn: 'Abu Dhabi',
    region: 'mena',
    currencyCode: 'AED',
    currencySymbol: 'AED',
    rateFromUsd: 3.67,
    timezones: [],
    keywords: ['uae', 'emirates', 'الامارات', 'أبوظبي', 'ابوظبي'],
    baseUsd: {
      rentCenter: 1890,
      rentSuburb: 1360,
      groceries: 420,
      transport: 115,
      utilities: 225,
      diningLifestyle: 380,
    },
    typicalNetSalaryUsd: 4300,
  },
  {
    id: 'riyadh_sa',
    countryCode: 'SA',
    countryAr: 'السعودية',
    countryEn: 'Saudi Arabia',
    cityAr: 'الرياض',
    cityEn: 'Riyadh',
    region: 'mena',
    currencyCode: 'SAR',
    currencySymbol: 'SAR',
    rateFromUsd: 3.75,
    timezones: ['Asia/Riyadh'],
    keywords: ['saudi', 'ksa', 'السعودية', 'الرياض', 'sar'],
    baseUsd: {
      rentCenter: 1180,
      rentSuburb: 840,
      groceries: 390,
      transport: 110,
      utilities: 155,
      diningLifestyle: 320,
    },
    typicalNetSalaryUsd: 3300,
  },
  {
    id: 'jeddah_sa',
    countryCode: 'SA',
    countryAr: 'السعودية',
    countryEn: 'Saudi Arabia',
    cityAr: 'جدة',
    cityEn: 'Jeddah',
    region: 'mena',
    currencyCode: 'SAR',
    currencySymbol: 'SAR',
    rateFromUsd: 3.75,
    timezones: [],
    keywords: ['saudi', 'ksa', 'السعودية', 'جدة', 'جده', 'مكة'],
    baseUsd: {
      rentCenter: 960,
      rentSuburb: 690,
      groceries: 375,
      transport: 100,
      utilities: 145,
      diningLifestyle: 290,
    },
    typicalNetSalaryUsd: 2950,
  },
  {
    id: 'doha_qa',
    countryCode: 'QA',
    countryAr: 'قطر',
    countryEn: 'Qatar',
    cityAr: 'الدوحة',
    cityEn: 'Doha',
    region: 'mena',
    currencyCode: 'QAR',
    currencySymbol: 'QAR',
    rateFromUsd: 3.64,
    timezones: ['Asia/Qatar'],
    keywords: ['qatar', 'قطر', 'الدوحة', 'الدوحه', 'qar'],
    baseUsd: {
      rentCenter: 1750,
      rentSuburb: 1240,
      groceries: 420,
      transport: 105,
      utilities: 150,
      diningLifestyle: 360,
    },
    typicalNetSalaryUsd: 3950,
  },
  {
    id: 'kuwait_kw',
    countryCode: 'KW',
    countryAr: 'الكويت',
    countryEn: 'Kuwait',
    cityAr: 'مدينة الكويت',
    cityEn: 'Kuwait City',
    region: 'mena',
    currencyCode: 'KWD',
    currencySymbol: 'KWD',
    rateFromUsd: 0.31,
    timezones: ['Asia/Kuwait'],
    keywords: ['kuwait', 'الكويت', 'kwd'],
    baseUsd: {
      rentCenter: 1190,
      rentSuburb: 890,
      groceries: 390,
      transport: 95,
      utilities: 110,
      diningLifestyle: 320,
    },
    typicalNetSalaryUsd: 3200,
  },
  {
    id: 'manama_bh',
    countryCode: 'BH',
    countryAr: 'البحرين',
    countryEn: 'Bahrain',
    cityAr: 'المنامة',
    cityEn: 'Manama',
    region: 'mena',
    currencyCode: 'BHD',
    currencySymbol: 'BHD',
    rateFromUsd: 0.38,
    timezones: ['Asia/Bahrain'],
    keywords: ['bahrain', 'البحرين', 'المنامة', 'bhd'],
    baseUsd: {
      rentCenter: 980,
      rentSuburb: 710,
      groceries: 360,
      transport: 90,
      utilities: 135,
      diningLifestyle: 280,
    },
    typicalNetSalaryUsd: 2600,
  },
  {
    id: 'muscat_om',
    countryCode: 'OM',
    countryAr: 'سلطنة عُمان',
    countryEn: 'Oman',
    cityAr: 'مسقط',
    cityEn: 'Muscat',
    region: 'mena',
    currencyCode: 'OMR',
    currencySymbol: 'OMR',
    rateFromUsd: 0.385,
    timezones: ['Asia/Muscat'],
    keywords: ['oman', 'عمان', 'سلطنة عمان', 'مسقط', 'omr'],
    baseUsd: {
      rentCenter: 790,
      rentSuburb: 560,
      groceries: 340,
      transport: 85,
      utilities: 120,
      diningLifestyle: 245,
    },
    typicalNetSalaryUsd: 2450,
  },
  {
    id: 'casablanca_ma',
    countryCode: 'MA',
    countryAr: 'المغرب',
    countryEn: 'Morocco',
    cityAr: 'الدار البيضاء',
    cityEn: 'Casablanca',
    region: 'mena',
    currencyCode: 'MAD',
    currencySymbol: 'MAD',
    rateFromUsd: 10,
    timezones: ['Africa/Casablanca'],
    keywords: ['morocco', 'maroc', 'المغرب', 'الدار البيضاء', 'كازابلانكا', 'كازا', 'mad'],
    baseUsd: {
      rentCenter: 540,
      rentSuburb: 360,
      groceries: 235,
      transport: 48,
      utilities: 85,
      diningLifestyle: 165,
    },
    typicalNetSalaryUsd: 920,
  },
  {
    id: 'rabat_ma',
    countryCode: 'MA',
    countryAr: 'المغرب',
    countryEn: 'Morocco',
    cityAr: 'الرباط',
    cityEn: 'Rabat',
    region: 'mena',
    currencyCode: 'MAD',
    currencySymbol: 'MAD',
    rateFromUsd: 10,
    timezones: [],
    keywords: ['morocco', 'maroc', 'المغرب', 'الرباط', 'طنجة', 'مراكش', 'tanger', 'marrakech'],
    baseUsd: {
      rentCenter: 520,
      rentSuburb: 340,
      groceries: 225,
      transport: 44,
      utilities: 80,
      diningLifestyle: 155,
    },
    typicalNetSalaryUsd: 900,
  },
  {
    id: 'cairo_eg',
    countryCode: 'EG',
    countryAr: 'مصر',
    countryEn: 'Egypt',
    cityAr: 'القاهرة',
    cityEn: 'Cairo',
    region: 'mena',
    currencyCode: 'EGP',
    currencySymbol: 'EGP',
    rateFromUsd: 49,
    timezones: ['Africa/Cairo'],
    keywords: ['egypt', 'مصر', 'القاهرة', 'القاهره', 'الاسكندرية', 'egp'],
    baseUsd: {
      rentCenter: 320,
      rentSuburb: 210,
      groceries: 175,
      transport: 32,
      utilities: 52,
      diningLifestyle: 120,
    },
    typicalNetSalaryUsd: 480,
  },
  {
    id: 'amman_jo',
    countryCode: 'JO',
    countryAr: 'الأردن',
    countryEn: 'Jordan',
    cityAr: 'عمّان',
    cityEn: 'Amman',
    region: 'mena',
    currencyCode: 'JOD',
    currencySymbol: 'JOD',
    rateFromUsd: 0.71,
    timezones: ['Asia/Amman'],
    keywords: ['jordan', 'الاردن', 'الأردن', 'عمان', 'عمّان', 'jod'],
    baseUsd: {
      rentCenter: 560,
      rentSuburb: 390,
      groceries: 280,
      transport: 68,
      utilities: 115,
      diningLifestyle: 195,
    },
    typicalNetSalaryUsd: 890,
  },
  {
    id: 'tunis_tn',
    countryCode: 'TN',
    countryAr: 'تونس',
    countryEn: 'Tunisia',
    cityAr: 'تونس العاصمة',
    cityEn: 'Tunis',
    region: 'mena',
    currencyCode: 'TND',
    currencySymbol: 'TND',
    rateFromUsd: 3.1,
    timezones: ['Africa/Tunis'],
    keywords: ['tunisia', 'تونس', 'tnd'],
    baseUsd: {
      rentCenter: 360,
      rentSuburb: 250,
      groceries: 195,
      transport: 35,
      utilities: 68,
      diningLifestyle: 130,
    },
    typicalNetSalaryUsd: 540,
  },
  {
    id: 'algiers_dz',
    countryCode: 'DZ',
    countryAr: 'الجزائر',
    countryEn: 'Algeria',
    cityAr: 'الجزائر العاصمة',
    cityEn: 'Algiers',
    region: 'mena',
    currencyCode: 'DZD',
    currencySymbol: 'DZD',
    rateFromUsd: 134,
    timezones: ['Africa/Algiers'],
    keywords: ['algeria', 'الجزائر', 'وهران', 'dzd'],
    baseUsd: {
      rentCenter: 350,
      rentSuburb: 240,
      groceries: 190,
      transport: 30,
      utilities: 58,
      diningLifestyle: 125,
    },
    typicalNetSalaryUsd: 510,
  },

  // ================= SUB-SAHARAN AFRICA =================
  {
    id: 'johannesburg_za',
    countryCode: 'ZA',
    countryAr: 'جنوب أفريقيا',
    countryEn: 'South Africa',
    cityAr: 'جوهانسبرغ',
    cityEn: 'Johannesburg',
    region: 'africa',
    currencyCode: 'ZAR',
    currencySymbol: 'R',
    rateFromUsd: 17.8,
    timezones: ['Africa/Johannesburg'],
    keywords: ['south africa', 'جنوب افريقيا', 'جوهانسبرغ', 'كيب تاون', 'cape town', 'zar'],
    baseUsd: {
      rentCenter: 540,
      rentSuburb: 410,
      groceries: 250,
      transport: 65,
      utilities: 135,
      diningLifestyle: 190,
    },
    typicalNetSalaryUsd: 1450,
  },
  {
    id: 'nairobi_ke',
    countryCode: 'KE',
    countryAr: 'كينيا',
    countryEn: 'Kenya',
    cityAr: 'نيروبي',
    cityEn: 'Nairobi',
    region: 'africa',
    currencyCode: 'KES',
    currencySymbol: 'KSh',
    rateFromUsd: 129,
    timezones: ['Africa/Nairobi'],
    keywords: ['kenya', 'كينيا', 'نيروبي', 'kes'],
    baseUsd: {
      rentCenter: 460,
      rentSuburb: 310,
      groceries: 210,
      transport: 48,
      utilities: 85,
      diningLifestyle: 155,
    },
    typicalNetSalaryUsd: 680,
  },
  {
    id: 'lagos_ng',
    countryCode: 'NG',
    countryAr: 'نيجيريا',
    countryEn: 'Nigeria',
    cityAr: 'لاغوس',
    cityEn: 'Lagos',
    region: 'africa',
    currencyCode: 'NGN',
    currencySymbol: '₦',
    rateFromUsd: 1620,
    timezones: ['Africa/Lagos'],
    keywords: ['nigeria', 'نيجيريا', 'لاغوس', 'ابوجا', 'ngn'],
    baseUsd: {
      rentCenter: 580,
      rentSuburb: 360,
      groceries: 220,
      transport: 45,
      utilities: 95,
      diningLifestyle: 150,
    },
    typicalNetSalaryUsd: 520,
  },
];

function normalizeSearchToken(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[ًٌٍَُِّْ]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ');
}

function editDistanceAtMostOne(a: string, b: string): boolean {
  if (a === b) return true;
  const lenA = a.length;
  const lenB = b.length;
  if (Math.abs(lenA - lenB) > 1) return false;
  if (lenA < 3 || lenB < 3) return false;

  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < lenA && j < lenB) {
    if (a[i] === b[j]) {
      i++;
      j++;
    } else {
      edits++;
      if (edits > 1) return false;
      if (lenA > lenB) i++;
      else if (lenB > lenA) j++;
      else {
        i++;
        j++;
      }
    }
  }
  return true;
}

export function searchGlobalCities(
  cities: GlobalCityBenchmark[],
  rawQuery: string,
  regionFilter: GlobalRegionId | 'all' = 'all'
): GlobalCityBenchmark[] {
  const pool =
    regionFilter === 'all'
      ? cities
      : cities.filter((c) => c.region === regionFilter);

  const qNorm = normalizeSearchToken(rawQuery);
  if (!qNorm) return pool;

  const qTokens = qNorm.split(' ').filter(Boolean);

  const scored: Array<{ city: GlobalCityBenchmark; score: number }> = [];

  for (const city of pool) {
    const haystackRaw = [
      city.cityAr,
      city.cityEn,
      city.countryAr,
      city.countryEn,
      city.countryCode,
      city.currencyCode,
      ...city.keywords,
    ].join(' ');
    const haystackNorm = normalizeSearchToken(haystackRaw);
    const haystackWords = haystackNorm.split(' ').filter(Boolean);

    let totalScore = 0;
    let allMatched = true;

    for (const token of qTokens) {
      if (haystackNorm.includes(token)) {
        // Exact substring or middle/last word match
        const cityNormAr = normalizeSearchToken(city.cityAr);
        const cityNormEn = normalizeSearchToken(city.cityEn);
        const countryNormAr = normalizeSearchToken(city.countryAr);
        const countryNormEn = normalizeSearchToken(city.countryEn);

        if (cityNormAr.startsWith(token) || cityNormEn.startsWith(token)) {
          totalScore += 30;
        } else if (
          countryNormAr.startsWith(token) ||
          countryNormEn.startsWith(token)
        ) {
          totalScore += 24;
        } else {
          totalScore += 16;
        }
      } else {
        // Check typo-tolerant 1-edit match against any word
        const fuzzyHit = haystackWords.some((w) =>
          editDistanceAtMostOne(token, w)
        );
        if (fuzzyHit) {
          totalScore += 9;
        } else {
          allMatched = false;
          break;
        }
      }
    }

    if (allMatched && totalScore > 0) {
      scored.push({ city, score: totalScore });
    }
  }

  return scored.sort((a, b) => b.score - a.score).map((s) => s.city);
}

/**
 * Detects the user's current city & country from the browser's IANA timezone and locale.
 */
export function detectBrowserCityBenchmark(): {
  detectedCity: GlobalCityBenchmark;
  suggestedTargetCity: GlobalCityBenchmark;
  detectedTimezone: string;
  isAutoDetected: boolean;
} {
  let tz = '';
  let lang = '';
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    lang = typeof navigator !== 'undefined' ? navigator.language || '' : '';
  } catch {
    // Fallback if Intl is unavailable
  }

  const tzLower = tz.toLowerCase();

  // 1. Exact timezone match
  let match = GLOBAL_CITIES_DATA.find((c) =>
    c.timezones.some((t) => t.toLowerCase() === tzLower)
  );

  // 2. Partial timezone city or region match
  if (!match && tzLower) {
    const tzParts = tzLower.split('/');
    const tzCitySlug = (tzParts[tzParts.length - 1] || '').replace(/_/g, ' ');
    if (tzCitySlug) {
      match = GLOBAL_CITIES_DATA.find(
        (c) =>
          c.cityEn.toLowerCase().includes(tzCitySlug) ||
          c.keywords.some((k) => k.toLowerCase() === tzCitySlug)
      );
    }
  }

  // 3. Language region code fallback (e.g. en-GB -> GB, fr-FR -> FR, ar-MA -> MA)
  if (!match && lang.includes('-')) {
    const countryCode = lang.split('-')[1]?.toUpperCase();
    if (countryCode) {
      match = GLOBAL_CITIES_DATA.find((c) => c.countryCode === countryCode);
    }
  }

  // 4. Broad continent timezone fallback
  if (!match && tzLower) {
    if (tzLower.startsWith('europe/')) {
      match = GLOBAL_CITIES_DATA.find((c) => c.id === 'london_gb');
    } else if (tzLower.startsWith('america/')) {
      match = GLOBAL_CITIES_DATA.find((c) => c.id === 'new_york_us');
    } else if (tzLower.startsWith('asia/')) {
      match = GLOBAL_CITIES_DATA.find((c) => c.id === 'singapore_sg');
    } else if (tzLower.startsWith('africa/')) {
      match = GLOBAL_CITIES_DATA.find((c) => c.id === 'casablanca_ma');
    } else if (tzLower.startsWith('australia/')) {
      match = GLOBAL_CITIES_DATA.find((c) => c.id === 'sydney_au');
    }
  }

  const detectedCity =
    match ||
    GLOBAL_CITIES_DATA.find((c) => c.id === 'london_gb') ||
    GLOBAL_CITIES_DATA[0];

  // Pick a compelling, distinct global destination city for comparison
  const defaultTargets = [
    'london_gb',
    'new_york_us',
    'dubai_ae',
    'tokyo_jp',
    'berlin_de',
    'singapore_sg',
  ];
  const targetId =
    defaultTargets.find(
      (id) =>
        id !== detectedCity.id &&
        GLOBAL_CITIES_DATA.find((c) => c.id === id)?.countryCode !==
          detectedCity.countryCode
    ) || 'new_york_us';

  const suggestedTargetCity =
    GLOBAL_CITIES_DATA.find((c) => c.id === targetId) || GLOBAL_CITIES_DATA[1];

  return {
    detectedCity,
    suggestedTargetCity,
    detectedTimezone: tz || 'UTC',
    isAutoDetected: Boolean(match),
  };
}

export interface GlobalCurrencyEntry {
  code: string;
  symbol: string;
  nameAr: string;
  nameEn: string;
  usdRate: number;
}

export const CURRENCIES: GlobalCurrencyEntry[] = [
  { code: 'SAR', symbol: 'ر.س', nameAr: 'ريال سعودي', nameEn: 'Saudi Riyal', usdRate: 3.75 },
  { code: 'AED', symbol: 'د.إ', nameAr: 'درهم إماراتي', nameEn: 'UAE Dirham', usdRate: 3.67 },
  { code: 'USD', symbol: '$', nameAr: 'دولار أمريكي', nameEn: 'US Dollar', usdRate: 1 },
  { code: 'EUR', symbol: '€', nameAr: 'يورو أوروبي', nameEn: 'Euro', usdRate: 0.92 },
  { code: 'GBP', symbol: '£', nameAr: 'جنيه إسترليني', nameEn: 'British Pound', usdRate: 0.79 },
  { code: 'MAD', symbol: 'د.م.', nameAr: 'درهم مغربي', nameEn: 'Moroccan Dirham', usdRate: 9.95 },
  { code: 'EGP', symbol: 'ج.م', nameAr: 'جنيه مصري', nameEn: 'Egyptian Pound', usdRate: 48.5 },
  { code: 'KWD', symbol: 'د.ك', nameAr: 'دينار كويتي', nameEn: 'Kuwaiti Dinar', usdRate: 0.307 },
  { code: 'QAR', symbol: 'ر.ق', nameAr: 'ريال قطري', nameEn: 'Qatari Riyal', usdRate: 3.64 },
  { code: 'BHD', symbol: 'د.ب', nameAr: 'دينار بحريني', nameEn: 'Bahraini Dinar', usdRate: 0.377 },
  { code: 'OMR', symbol: 'ر.ع', nameAr: 'ريال عماني', nameEn: 'Omani Rial', usdRate: 0.385 },
  { code: 'JOD', symbol: 'د.أ', nameAr: 'دينار أردني', nameEn: 'Jordanian Dinar', usdRate: 0.709 },
  { code: 'CAD', symbol: 'CA$', nameAr: 'دولار كندي', nameEn: 'Canadian Dollar', usdRate: 1.38 },
  { code: 'AUD', symbol: 'A$', nameAr: 'دولار أسترالي', nameEn: 'Australian Dollar', usdRate: 1.52 },
  { code: 'TRY', symbol: '₺', nameAr: 'ليرة تركية', nameEn: 'Turkish Lira', usdRate: 34.2 },
  { code: 'JPY', symbol: '¥', nameAr: 'ين ياباني', nameEn: 'Japanese Yen', usdRate: 152 },
];

export function getCurrencyByCode(code?: string): GlobalCurrencyEntry {
  const clean = (code || 'USD').trim().toUpperCase();
  const found = CURRENCIES.find((c) => c.code === clean);
  if (found) return found;

  const fromCity = GLOBAL_CITIES_DATA.find(
    (c) => c.currencyCode.toUpperCase() === clean
  );
  if (fromCity) {
    return {
      code: fromCity.currencyCode,
      symbol: fromCity.currencySymbol,
      nameAr: `${fromCity.currencyCode} (${fromCity.countryAr})`,
      nameEn: `${fromCity.currencyCode} (${fromCity.countryEn})`,
      usdRate: fromCity.rateFromUsd || 1,
    };
  }

  return CURRENCIES[2]; // USD fallback
}

export function formatCurrencyAmount(
  amount: number,
  currencyOrCode: GlobalCurrencyEntry | string,
  locale: 'ar' | 'en' = 'ar'
): string {
  const entry =
    typeof currencyOrCode === 'string'
      ? getCurrencyByCode(currencyOrCode)
      : currencyOrCode;
  const safeVal = Number.isFinite(amount) ? Math.round(amount) : 0;
  const formatted = safeVal.toLocaleString('en-US');
  return locale === 'ar'
    ? `${formatted} ${entry.symbol}`
    : `${entry.symbol}${formatted}`;
}

