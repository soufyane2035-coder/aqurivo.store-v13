import type { Product, Article } from '@/types';
import { normalizeSearchText } from './productSearch';

export type ProductArchetype =
  | 'laptops'
  | 'smartwatches'
  | 'audio_headphones'
  | 'audio_speakers'
  | 'drinkware_bottles'
  | 'coffee_espresso'
  | 'coffee_grinders'
  | 'air_fryers'
  | 'cookers_kitchen'
  | 'kitchen_cutlery'
  | 'oral_care'
  | 'skincare'
  | 'therapeutic_heat'
  | 'vacuums_cleaning'
  | 'air_treatment'
  | 'chargers_power'
  | 'storage_ssd'
  | 'peripherals_input'
  | 'networking_smart_home'
  | 'cameras_streaming'
  | 'fitness_workout'
  | 'general';

interface ArchetypeDefinition {
  id: ProductArchetype;
  labelAr: string;
  labelEn: string;
  keywords: string[];
  substitutes: ProductArchetype[];
  complements: ProductArchetype[];
}

export const ARCHETYPE_DEFINITIONS: Record<ProductArchetype, ArchetypeDefinition> = {
  drinkware_bottles: {
    id: 'drinkware_bottles',
    labelAr: 'قوارير وأكواب المشروبات المعزولة',
    labelEn: 'Insulated Water Bottles & Travel Mugs',
    keywords: [
      'bottle', 'water bottle', 'mug', 'travel mug', 'tumbler', 'flask', 'insulated', 'byron', 'raymylo', 'contigo',
      'قارورة', 'زجاجة ماء', 'زمزمية', 'مطارة', 'كوب سفر', 'مج معزول', 'كوب معزول', 'ثيرموس', 'ترمس'
    ],
    substitutes: ['drinkware_bottles'],
    complements: ['fitness_workout', 'coffee_espresso']
  },
  laptops: {
    id: 'laptops',
    labelAr: 'أجهزة اللابتوب والكمبيوتر',
    labelEn: 'Laptops & Computers',
    keywords: [
      'laptop', 'notebook', 'macbook', 'thinkpad', 'computer', 'pc', 'mini pc',
      'لابتوب', 'حاسوب', 'كمبيوتر محمول', 'ميني بي سي', 'حاسوب مكتبي'
    ],
    substitutes: ['laptops'],
    complements: ['peripherals_input', 'storage_ssd', 'chargers_power', 'audio_headphones', 'cameras_streaming']
  },
  smartwatches: {
    id: 'smartwatches',
    labelAr: 'الساعات الذكية وأساور اللياقة',
    labelEn: 'Smartwatches & Fitness Trackers',
    keywords: [
      'smartwatch', 'smart watch', 'garmin', 'fitbit', 'instinct', 'charge', 'apple watch', 'tracker', 'amoled',
      'ساعة ذكية', 'سوار لياقة', 'ساعة رياضية', 'جارمن', 'فيتبت', 'تتبع النشاط'
    ],
    substitutes: ['smartwatches'],
    complements: ['audio_headphones', 'fitness_workout', 'drinkware_bottles', 'chargers_power']
  },
  audio_headphones: {
    id: 'audio_headphones',
    labelAr: 'سماعات الرأس والأذن',
    labelEn: 'Headphones & Earbuds',
    keywords: [
      'headphone', 'headphones', 'earbuds', 'earphone', 'airpods', 'soundcore', 'skullcandy', 'crusher', 'anc',
      'سماعة', 'سماعات', 'ايربودز', 'سماعات رأس', 'عزل الضوضاء', 'سماعات بلوتوث'
    ],
    substitutes: ['audio_headphones'],
    complements: ['chargers_power', 'peripherals_input', 'smartwatches', 'laptops']
  },
  audio_speakers: {
    id: 'audio_speakers',
    labelAr: 'مكبرات الصوت والساوند بار',
    labelEn: 'Bluetooth Speakers & Audio',
    keywords: [
      'speaker', 'bluetooth speaker', 'soundbar', 'bolabutty', 'echo dot',
      'مكبر صوت', 'سماعة بلوتوث لاسلكية', 'سبيكر', 'ساوند بار'
    ],
    substitutes: ['audio_speakers'],
    complements: ['chargers_power', 'networking_smart_home']
  },
  coffee_espresso: {
    id: 'coffee_espresso',
    labelAr: 'ماكينات القهوة والاسبريسو',
    labelEn: 'Coffee Makers & Espresso Machines',
    keywords: [
      'coffee maker', 'espresso', 'pour over', 'barista', 'keurig', 'bodum', 'breville', 'kettle', 'gooseneck',
      'ماكينة قهوة', 'صانعة قهوة', 'اسبريسو', 'ماكينة اسبريسو', 'تقطير قهوة', 'غلاية قهوة', 'غلاية ترشيح'
    ],
    substitutes: ['coffee_espresso'],
    complements: ['coffee_grinders', 'drinkware_bottles', 'kitchen_cutlery']
  },
  coffee_grinders: {
    id: 'coffee_grinders',
    labelAr: 'مطاحن القهوة',
    labelEn: 'Coffee Grinders',
    keywords: [
      'coffee grinder', 'burr grinder', 'grinder', 'ollygrin',
      'مطحنة قهوة', 'مطحنة حبوب القهوة', 'طاحونة قهوة'
    ],
    substitutes: ['coffee_grinders'],
    complements: ['coffee_espresso', 'drinkware_bottles']
  },
  air_fryers: {
    id: 'air_fryers',
    labelAr: 'القلايات الهوائية',
    labelEn: 'Air Fryers',
    keywords: [
      'air fryer', 'cosori', 'turboblaze', 'pro le',
      'قلاية هوائية', 'مقلاة هوائية', 'قلاية بدون زيت', 'كوسوري'
    ],
    substitutes: ['air_fryers', 'cookers_kitchen'],
    complements: ['kitchen_cutlery', 'cookers_kitchen']
  },
  cookers_kitchen: {
    id: 'cookers_kitchen',
    labelAr: 'قدور الضغط وطباخات الأرز والأجهزة المطبخية',
    labelEn: 'Pressure Cookers, Rice Cookers & Kitchen Multi-Cookers',
    keywords: [
      'pressure cooker', 'instant pot', 'rice cooker', 'zojirushi', 'slow cooker',
      'قدر ضغط', 'قدر أرز', 'طباخة أرز', 'طنجرة ضغط', 'متعدد الوظائف'
    ],
    substitutes: ['cookers_kitchen', 'air_fryers'],
    complements: ['kitchen_cutlery', 'air_fryers']
  },
  kitchen_cutlery: {
    id: 'kitchen_cutlery',
    labelAr: 'سكاكين الطهي وأدوات التحضير والموازين',
    labelEn: 'Chef Knives, Salad Spinners & Kitchen Prep Tools',
    keywords: [
      'chef knife', 'knife', 'salad spinner', 'meat thermometer', 'thermomaven', 'imarku', 'oxo',
      'سكين', 'سكين طاه', 'سكين مطبخ', 'مجفف سلطة', 'ميزان حرارة اللحوم', 'ميزان طعام'
    ],
    substitutes: ['kitchen_cutlery'],
    complements: ['air_fryers', 'cookers_kitchen', 'coffee_espresso']
  },
  oral_care: {
    id: 'oral_care',
    labelAr: 'العناية بالفم والأسنان',
    labelEn: 'Oral Care & Electric Toothbrushes',
    keywords: [
      'toothbrush', 'oral-b', 'oral b', 'crest', 'whitestrips', 'whitening', 'teeth', 'dental',
      'فرشاة اسنان', 'فرشاة كهربائية', 'تبييض اسنان', 'شرائط تبييض', 'معجون اسنان'
    ],
    substitutes: ['oral_care'],
    complements: ['skincare']
  },
  skincare: {
    id: 'skincare',
    labelAr: 'العناية بالبشرة والوجه',
    labelEn: 'Skincare, Moisturizers & Facial Care',
    keywords: [
      'hydro boost', 'water gel', 'neutrogena', 'retinol', 'collagen', 'face cream', 'moisturizer', 'simplyvital',
      'مرطب', 'كريم وجه', 'سيروم', 'ريتينول', 'كولاجين', 'عناية بالبشرة', 'جل ترطيب'
    ],
    substitutes: ['skincare'],
    complements: ['oral_care', 'therapeutic_heat']
  },
  therapeutic_heat: {
    id: 'therapeutic_heat',
    labelAr: 'وسادات التدفئة والمساج والاسترخاء',
    labelEn: 'Heating Pads, Massage & Therapeutic Wellness',
    keywords: [
      'heating pad', 'geniani', 'heat therapy', 'massager', 'pillow', 'dreamyblue',
      'وسادة تدفئة', 'كمادة ساخنة', 'وسادة نوم', 'مساج', 'تسكين الآلام'
    ],
    substitutes: ['therapeutic_heat'],
    complements: ['skincare']
  },
  vacuums_cleaning: {
    id: 'vacuums_cleaning',
    labelAr: 'المكانس الكهربائية وروبوتات التنظيف',
    labelEn: 'Vacuum Cleaners, Robot Mops & Carpet Cleaners',
    keywords: [
      'vacuum', 'robot vacuum', 'mop', 'bissell', 'little green', 'eufy', 'shark', 'lift-away', 'cleaner',
      'مكنسة', 'روبوت كنس', 'مكنسة سجاد', 'تنظيف بقع', 'ممسحة روبوتية', 'مكنسة كهربائية'
    ],
    substitutes: ['vacuums_cleaning'],
    complements: ['air_treatment']
  },
  air_treatment: {
    id: 'air_treatment',
    labelAr: 'أجهزة تنقية وترطيب الهواء',
    labelEn: 'Air Purifiers & Humidifiers',
    keywords: [
      'humidifier', 'air purifier', 'levoit', 'hepa', 'eleva',
      'مرطب جو', 'منقي هواء', 'فلتر هواء', 'ترطيب الهواء', 'تنقية الهواء'
    ],
    substitutes: ['air_treatment'],
    complements: ['vacuums_cleaning']
  },
  chargers_power: {
    id: 'chargers_power',
    labelAr: 'الشواحن وبنوك الطاقة والبطاريات',
    labelEn: 'Chargers, Power Banks & Batteries',
    keywords: [
      'charger', 'power bank', 'anker', 'belkin', 'battery', 'batteries', 'aaa', 'fast charging', 'wireless charger',
      'شاحن', 'بنك طاقة', 'بطارية متنقلة', 'شاحن لاسلكي', 'بطاريات'
    ],
    substitutes: ['chargers_power'],
    complements: ['laptops', 'smartwatches', 'audio_headphones', 'peripherals_input']
  },
  storage_ssd: {
    id: 'storage_ssd',
    labelAr: 'أقراص التخزين وSSDs المحمولة',
    labelEn: 'Portable SSDs & Storage',
    keywords: [
      'ssd', 'portable ssd', 'samsung t7', 'hard drive', 'storage', 'terabyte',
      'قرص تخزين', 'هارد ديسك', 'اس اس دي', 'تخزين خارجي', 'قرص صلب'
    ],
    substitutes: ['storage_ssd'],
    complements: ['laptops', 'peripherals_input', 'cameras_streaming']
  },
  peripherals_input: {
    id: 'peripherals_input',
    labelAr: 'لوحات المفاتيح والفأرة وإكسسوارات التحكم',
    labelEn: 'Keyboards, Mice & Input Accessories',
    keywords: [
      'mouse', 'keyboard', 'mx master', 'logitech', 'redragon', 'stream deck', 'elgato',
      'فأرة', 'ماوس', 'لوحة مفاتيح', 'كيبورد', 'طقم العاب'
    ],
    substitutes: ['peripherals_input'],
    complements: ['laptops', 'storage_ssd', 'chargers_power', 'cameras_streaming']
  },
  networking_smart_home: {
    id: 'networking_smart_home',
    labelAr: 'الشبكات والراوترات والمقابس الذكية',
    labelEn: 'Routers, Wi-Fi 6 & Smart Plugs',
    keywords: [
      'router', 'archer', 'tp-link', 'wifi 6', 'smart plug', 'ghome', 'fire tv',
      'راوتر', 'واي فاي', 'مقبس ذكي', 'فيش ذكي', 'جهاز بث'
    ],
    substitutes: ['networking_smart_home'],
    complements: ['cameras_streaming', 'audio_speakers']
  },
  cameras_streaming: {
    id: 'cameras_streaming',
    labelAr: 'كاميرات المراقبة والويبكام والبث',
    labelEn: 'Webcams, Security Cameras & Stream Gear',
    keywords: [
      'webcam', 'security camera', 'c960', 'emeet', 'tapo', 'pan tilt', 'camera', 'airtag',
      'كاميرا مراقبة', 'ويبكام', 'كاميرا بث', 'كاميرا داخلية', 'ايرتاج'
    ],
    substitutes: ['cameras_streaming'],
    complements: ['networking_smart_home', 'peripherals_input', 'laptops']
  },
  fitness_workout: {
    id: 'fitness_workout',
    labelAr: 'أدوات اللياقة البدنية والتمارين',
    labelEn: 'Fitness, Resistance Bands & Workout Kits',
    keywords: [
      'pushup', 'push-up', 'workout', 'resistance bands', 'hotwave', 'fitness board',
      'تمارين', 'لوح ضغط', 'حبال مقاومة', 'تمارين منزلية', 'لياقة'
    ],
    substitutes: ['fitness_workout'],
    complements: ['drinkware_bottles', 'smartwatches']
  },
  general: {
    id: 'general',
    labelAr: 'منتجات عامة',
    labelEn: 'General Products',
    keywords: [],
    substitutes: ['general'],
    complements: []
  }
};

/**
 * Detects the specific archetype of a product from its titles, summary, specs, and category.
 */
export function detectProductArchetype(product: Product): ProductArchetype {
  const combinedText = [
    typeof product.title === 'string' ? product.title : `${product.title?.ar || ''} ${product.title?.en || ''}`,
    typeof product.name === 'string' ? product.name : `${product.name?.ar || ''} ${product.name?.en || ''}`,
    typeof product.shortSummary === 'string' ? product.shortSummary : `${product.shortSummary?.ar || ''} ${product.shortSummary?.en || ''}`,
    product.slug || '',
    product.id || '',
    Array.isArray(product.tags) ? product.tags.join(' ') : '',
    product.categorySlug || '',
    typeof product.categoryName === 'string' ? product.categoryName : `${product.categoryName?.ar || ''} ${product.categoryName?.en || ''}`,
    Array.isArray(product.comparisonDna?.keySpecs?.ar) ? product.comparisonDna.keySpecs.ar.join(' ') : '',
    Array.isArray(product.comparisonDna?.keySpecs?.en) ? product.comparisonDna.keySpecs.en.join(' ') : '',
  ].join(' ');

  const normalized = normalizeSearchText(combinedText);

  let bestArchetype: ProductArchetype = 'general';
  let highestScore = 0;

  for (const [key, def] of Object.entries(ARCHETYPE_DEFINITIONS)) {
    if (key === 'general') continue;
    let matchScore = 0;

    for (const kw of def.keywords) {
      const normKw = normalizeSearchText(kw);
      if (!normKw) continue;

      if (normKw.includes(' ')) {
        // Multi-word phrase has very strong weight
        if (normalized.includes(normKw)) {
          matchScore += 8;
        }
      } else {
        // Exact single word match
        const regex = new RegExp(`\\b${normKw}\\b`, 'i');
        if (regex.test(normalized)) {
          matchScore += 3;
        } else if (normalized.includes(normKw) && normKw.length >= 4) {
          matchScore += 1.5;
        }
      }
    }

    if (matchScore > highestScore) {
      highestScore = matchScore;
      bestArchetype = key as ProductArchetype;
    }
  }

  return highestScore >= 3 ? bestArchetype : 'general';
}

/**
 * Detects the core target archetype(s) for a buying guide or editorial article.
 */
export function detectGuideArchetype(article: Article): ProductArchetype {
  const combinedText = [
    typeof article.title === 'string' ? article.title : `${article.title?.ar || ''} ${article.title?.en || ''}`,
    typeof article.excerpt === 'string' ? article.excerpt : `${article.excerpt?.ar || ''} ${article.excerpt?.en || ''}`,
    typeof article.seoTitle === 'string' ? article.seoTitle : `${article.seoTitle?.ar || ''} ${article.seoTitle?.en || ''}`,
    Array.isArray(article.seoKeywords) ? article.seoKeywords.join(' ') : '',
    article.slug || '',
    article.categorySlug || '',
    typeof article.categoryName === 'string' ? article.categoryName : `${article.categoryName?.ar || ''} ${article.categoryName?.en || ''}`,
    `${article.contentHtml?.ar || ''} ${article.contentHtml?.en || ''}`.slice(0, 1500),
  ].join(' ');

  const normalized = normalizeSearchText(combinedText);

  let bestArchetype: ProductArchetype = 'general';
  let highestScore = 0;

  for (const [key, def] of Object.entries(ARCHETYPE_DEFINITIONS)) {
    if (key === 'general') continue;
    let matchScore = 0;

    for (const kw of def.keywords) {
      const normKw = normalizeSearchText(kw);
      if (!normKw) continue;

      if (normKw.includes(' ')) {
        if (normalized.includes(normKw)) {
          matchScore += 10;
        }
      } else {
        const regex = new RegExp(`\\b${normKw}\\b`, 'i');
        if (regex.test(normalized)) {
          matchScore += 4;
        } else if (normalized.includes(normKw) && normKw.length >= 4) {
          matchScore += 2;
        }
      }
    }

    if (matchScore > highestScore) {
      highestScore = matchScore;
      bestArchetype = key as ProductArchetype;
    }
  }

  return highestScore >= 4 ? bestArchetype : 'general';
}

/**
 * Checks if two archetypes can be considered direct comparable substitutes.
 */
export function areArchetypesSubstitutes(a: ProductArchetype, b: ProductArchetype): boolean {
  if (a === 'general' || b === 'general') return false;
  if (a === b) return true;
  return ARCHETYPE_DEFINITIONS[a]?.substitutes?.includes(b) ?? false;
}

/**
 * Checks if archetype B is a known complementary companion for archetype A.
 */
export function areArchetypesComplements(a: ProductArchetype, b: ProductArchetype): boolean {
  if (a === 'general' || b === 'general') return false;
  if (a === b) return false;
  return ARCHETYPE_DEFINITIONS[a]?.complements?.includes(b) ?? false;
}
