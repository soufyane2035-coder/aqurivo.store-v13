import type { Article, Product, LocalizedText } from '@/types';
import {
  detectProductArchetype,
  areArchetypesSubstitutes,
  areArchetypesComplements,
} from './productArchetype';
import {
  computeSessionIntentVector,
  calculateDynamicExplorationRatio,
} from './browserSignals';
import { rankWithBanditExploration } from './banditEngine';

/**
 * Normalizes Arabic and Latin text for resilient single-letter, prefix,
 * and multi-word search matching:
 * - Removes Arabic tashkeel (diacritics) and tatweel
 * - Normalizes Alef variants (أ إ آ ٱ -> ا), Teh Marbuta (ة -> ه), Alef Maqsura (ى -> ي), Hamza (ؤ -> و, ئ -> ي)
 * - Lowercases Latin characters
 */
export function normalizeSearchText(input: string | undefined | null): string {
  if (!input) return '';
  return input
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '') // Strip Arabic diacritics & tatweel
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[ىئ]/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ء/g, '') // Strip standalone hamza
    .replace(/گ/g, 'ك')
    .replace(/ڤ/g, 'ف')
    .replace(/پ/g, 'ب')
    .replace(/چ/g, 'ج')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Strips Arabic definite articles and prepositions (ال, وال, فال, بال, كال, لل, و, ف, ب, ل)
 * so searching "بالسماعات", "للكمبيوتر", or "والماوس" seamlessly matches the base item.
 */
export function stripArabicPrefixes(word: string): string[] {
  const results = new Set<string>();
  results.add(word);

  if (!word || word.length < 3) return Array.from(results);

  // 1. Compound prefixes: وال, فال, بال, كال, ولل (3 chars)
  if (word.length >= 5) {
    if (
      word.startsWith('وال') ||
      word.startsWith('فال') ||
      word.startsWith('بال') ||
      word.startsWith('كال') ||
      word.startsWith('ولل')
    ) {
      results.add(word.slice(3));
    }
  }

  // 2. Preposition + Lam: لل (2 chars)
  if (word.length >= 4 && word.startsWith('لل')) {
    results.add(word.slice(2));
  }

  // 3. Definite article: ال (2 chars)
  if (word.length >= 4 && word.startsWith('ال')) {
    results.add(word.slice(2));
  }

  // 4. Single conjunctions / prepositions: و, ف, ب, ك, ل (1 char, word must have >= 3 chars left)
  if (
    word.length >= 4 &&
    (word.startsWith('و') ||
      word.startsWith('ف') ||
      word.startsWith('ب') ||
      word.startsWith('ك') ||
      word.startsWith('ل'))
  ) {
    const withoutPrefix = word.slice(1);
    results.add(withoutPrefix);
    if (withoutPrefix.startsWith('ال') && withoutPrefix.length >= 4) {
      results.add(withoutPrefix.slice(2));
    }
  }

  return Array.from(results).filter((w) => w.length >= 2);
}

/**
 * Strips the Arabic definite article "ال" from the start of a normalized word
 * (backward-compatible single-word helper).
 */
export function stripArabicDefiniteArticle(word: string): string {
  if (word.startsWith('ال') && word.length > 2) return word.slice(2);
  return word;
}

/**
 * Generates singular/plural and feminine inflection variants in Arabic and English
 * (e.g. "سماعات" <-> "سماعة", "ساعات" <-> "ساعة", "شواحن" <-> "شاحن", "headphones" <-> "headphone").
 */
export function getInflectionVariants(word: string): string[] {
  const variants = new Set<string>();
  variants.add(word);

  if (!word || word.length < 3) return Array.from(variants);

  // Arabic sound feminine plural suffix: ات (e.g. سماعات -> سماعه, ساعات -> ساعه)
  if (word.length >= 5 && word.endsWith('ات')) {
    const stem = word.slice(0, -2);
    variants.add(`${stem}ه`);
    variants.add(stem);
  } else if (word.length >= 4 && (word.endsWith('ه') || word.endsWith('ة'))) {
    // Arabic singular ending with Teh Marbuta: سماعه -> سماعات
    const stem = word.slice(0, -1);
    variants.add(`${stem}ات`);
  }

  // Arabic dual suffixes: ين, ان (e.g. ساعتين -> ساعه)
  if (word.length >= 6 && (word.endsWith('ين') || word.endsWith('ان'))) {
    const stem = word.slice(0, -2);
    variants.add(`${stem}ه`);
    variants.add(stem);
  }

  // Arabic broken plural patterns (جمع التكسير):
  // 1. فواعل -> فاعل (e.g. شواحن -> شاحن, هواتف -> هاتف, قوالب -> قالب, كوابل -> كابل)
  if (word.length === 5 && word[1] === 'و' && word[2] === 'ا') {
    const singular = `${word[0]}ا${word[3]}${word[4]}`;
    variants.add(singular);
  } else if (word.length === 4 && word[1] === 'ا') {
    // Reverse: فاعل -> فواعل (e.g. شاحن -> شواحن)
    const plural = `${word[0]}وا${word[2]}${word[3]}`;
    variants.add(plural);
  }

  // 2. مفاعيل -> مفعال (e.g. مصابيح -> مصباح, مفاتيح -> مفتاح)
  if (word.length === 6 && word[0] === 'م' && word[2] === 'ا' && word[4] === 'ي') {
    const singular = `${word[0]}${word[1]}${word[3]}ا${word[5]}`;
    variants.add(singular);
  } else if (word.length === 5 && word[0] === 'م' && word[3] === 'ا') {
    // Reverse: مفعال -> مفاعيل (e.g. مصباح -> مصابيح)
    const plural = `${word[0]}${word[1]}ا${word[2]}ي${word[4]}`;
    variants.add(plural);
  }

  // English plural suffixes: 's, ies -> y, es, s
  if (word.endsWith("'s") && word.length >= 4) {
    variants.add(word.slice(0, -2));
  } else if (word.endsWith('ies') && word.length >= 5) {
    variants.add(`${word.slice(0, -3)}y`);
  } else if (word.endsWith('es') && word.length >= 5) {
    variants.add(word.slice(0, -2));
    variants.add(word.slice(0, -1));
  } else if (word.endsWith('s') && !word.endsWith('ss') && word.length >= 4) {
    variants.add(word.slice(0, -1));
  } else if (word.length >= 4) {
    // Singular to plural in English (headphone -> headphones)
    variants.add(`${word}s`);
  }

  return Array.from(variants).filter((v) => v.length >= 2);
}

/**
 * Collapses consecutive duplicate characters (e.g., "ميييني" -> "ميني", "pcc" -> "pc")
 */
export function collapseDuplicateChars(word: string): string {
  return word.replace(/(.)\1+/gu, '$1');
}

/**
 * Produces an Arabic/Latin phonetic skeleton that tolerates omitted or swapped
 * long vowels (ا, و, ي), phonetic substitutions (ph -> f), and common letter confusions:
 * - "ميني" -> "من", "مني" -> "من"
 * - "بيسي" -> "بس", "بسيى" -> "بس", "بسي" -> "بس"
 * - "ماوس" -> "مس", "مواس" -> "مس"
 * - "سماعه" -> "سمع", "سمعه" -> "سمع"
 * - "كمبيوتر" -> "كمبتر", "كومبيوتر" -> "كمبتر"
 * - "headfone" <-> "headphone"
 */
export function toPhoneticSkeleton(rawWord: string): string {
  const base = collapseDuplicateChars(stripArabicDefiniteArticle(rawWord));
  if (base.length <= 2) return base;

  // Latin phonetic normalization
  if (/[a-z]/.test(base)) {
    return base
      .replace(/ph/g, 'f')
      .replace(/kn/g, 'n')
      .replace(/wr/g, 'r')
      .replace(/ck/g, 'k')
      .replace(/q/g, 'k');
  }

  // Normalize commonly confused Arabic consonants
  const phonetic = base
    .replace(/ظ/g, 'ض')
    .replace(/ذ/g, 'د')
    .replace(/ص/g, 'س')
    .replace(/ط/g, 'ت');

  // Keep the first character's identity if it's not a weak vowel, strip internal/trailing weak vowels (ا و ي ه)
  const firstChar = phonetic[0];
  const rest = phonetic.slice(1).replace(/[اوي]/g, '');
  const result = `${firstChar}${rest}`.replace(/ه$/g, '');
  return result.length >= 2 ? result : phonetic;
}

/**
 * Bounded Damerau-Levenshtein edit distance (supports character insertions,
 * deletions, substitutions, and adjacent transpositions like "مواس" <-> "ماوس" or "lpatop" <-> "laptop").
 */
export function damerauLevenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const lenA = a.length;
  const lenB = b.length;
  if (lenA === 0) return lenB;
  if (lenB === 0) return lenA;
  if (Math.abs(lenA - lenB) > 3) return Math.abs(lenA - lenB);

  const dp: number[][] = Array.from({ length: lenA + 1 }, () =>
    new Array(lenB + 1).fill(0)
  );

  for (let i = 0; i <= lenA; i += 1) dp[i][0] = i;
  for (let j = 0; j <= lenB; j += 1) dp[0][j] = j;

  for (let i = 1; i <= lenA; i += 1) {
    for (let j = 1; j <= lenB; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1, // deletion
        dp[i][j - 1] + 1, // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
      if (
        i > 1 &&
        j > 1 &&
        a[i - 1] === b[j - 2] &&
        a[i - 2] === b[j - 1]
      ) {
        dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + 1); // transposition
      }
    }
  }
  return dp[lenA][lenB];
}

/**
 * Bidirectional Arabic <-> English + Colloquial / Typo Concept Dictionary.
 * If ANY term in a group appears in a product or query, all sibling terms in that group
 * are recognized so searching "pc" matches "ميني بي سي" / "حاسوب" and searching "مني بسيى" matches "Mini PC".
 */
const BILINGUAL_CONCEPT_GROUPS: string[][] = [
  [
    'pc',
    'minipc',
    'mini pc',
    'computer',
    'desktop',
    'workstation',
    'beelink',
    'geekom',
    'mac mini',
    'ryzen',
    'intel',
    'بي سي',
    'بيسي',
    'بسي',
    'بسيي',
    'ميني بي سي',
    'مني بي سي',
    'مني بسي',
    'ميني بسي',
    'منيبسي',
    'مينيبيسي',
    'كمبيوتر',
    'كومبيوتر',
    'كمبيتر',
    'حاسوب',
    'حسوب',
    'حاسب',
    'مكتبي',
    'مصغر',
  ],
  [
    'mini',
    'compact',
    'portable',
    'pocket',
    'small',
    'ميني',
    'مني',
    'مصغر',
    'صغير',
    'محمول',
    'جيب',
  ],
  [
    'laptop',
    'notebook',
    'macbook',
    'ultrabook',
    'chromebook',
    'لابتوب',
    'لاب توب',
    'لبتوب',
    'لب توب',
    'ماك بوك',
    'ماكبوك',
    'حاسوب محمول',
    'كمبيوتر محمول',
    'نوتبوك',
  ],
  [
    'phone',
    'smartphone',
    'mobile',
    'iphone',
    'galaxy',
    'android',
    'pixel',
    'هاتف',
    'جوال',
    'موبايل',
    'مبيل',
    'تلفون',
    'تليفون',
    'ايفون',
    'سامسونج',
    'شاومي',
  ],
  [
    'tablet',
    'ipad',
    'tab',
    'تابلت',
    'تبلت',
    'ايباد',
    'لوحي',
    'جهاز لوحي',
  ],
  [
    'headphones',
    'headphone',
    'earbuds',
    'earphones',
    'airpods',
    'headset',
    'audio',
    'anc',
    'wireless',
    'bluetooth',
    'سماعه',
    'سماعات',
    'سمعه',
    'سمعات',
    'سماعه راس',
    'ايربودز',
    'بلوتوث',
    'لاسلكيه',
    'لاسلكي',
    'عزل',
    'صوت',
  ],
  [
    'speaker',
    'soundbar',
    'subwoofer',
    'سبيكر',
    'مكبر صوت',
    'مكبر',
    'ساوند بار',
    'صوتيات',
  ],
  [
    'watch',
    'smartwatch',
    'smart watch',
    'band',
    'fitness tracker',
    'wearable',
    'ساعه',
    'ساعات',
    'سعه',
    'ساعه ذكيه',
    'سوار',
    'سوار ذكي',
    'رياضيه',
  ],
  [
    'monitor',
    'screen',
    'display',
    'tv',
    'television',
    'oled',
    'qled',
    '4k',
    '144hz',
    'شاشه',
    'شاشات',
    'ششه',
    'مونيتور',
    'تلفزيون',
    'تلفاز',
    'عرض',
    'بوصه',
  ],
  [
    'keyboard',
    'mechanical',
    'keycaps',
    'switches',
    'كيبورد',
    'كيبرد',
    'كي بورد',
    'لوحه مفاتيح',
    'مفاتيح',
    'ميكانيكي',
  ],
  [
    'mouse',
    'mice',
    'trackpad',
    'ergonomic mouse',
    'ماوس',
    'مواس',
    'موس',
    'فاره',
    'فأره',
  ],
  [
    'gaming',
    'gamer',
    'controller',
    'gamepad',
    'joystick',
    'console',
    'ps5',
    'playstation',
    'xbox',
    'nintendo',
    'قيمنق',
    'جيمنج',
    'قيمينق',
    'العاب',
    'لعب',
    'يد تحكم',
    'ذراع تحكم',
    'كونسول',
    'بلايستيشن',
  ],
  [
    'camera',
    'webcam',
    'gopro',
    'action cam',
    'drone',
    'gimbal',
    'tripod',
    'lens',
    'كاميرا',
    'كميرا',
    'كمره',
    'ويب كام',
    'تصوير',
    'درون',
    'ترايبود',
    'حامل',
    'عدسه',
  ],
  [
    'microphone',
    'mic',
    'podcast',
    'streaming',
    'مايك',
    'ميكروفون',
    'مايكروفون',
    'ميكرفون',
    'بودكاست',
    'تسجيل',
  ],
  [
    'charger',
    'powerbank',
    'power bank',
    'battery',
    'cable',
    'adapter',
    'hub',
    'dock',
    'gan',
    'usb',
    'type c',
    'magsafe',
    'شاحن',
    'شحن',
    'شواحن',
    'باور بانك',
    'باوربانك',
    'بطاريه',
    'سلك',
    'كيبل',
    'كابل',
    'محول',
    'هاب',
    'موزع',
    'تايب سي',
  ],
  [
    'ssd',
    'nvme',
    'hard drive',
    'hdd',
    'storage',
    'flash drive',
    'memory',
    'sdcard',
    'هارد',
    'هاردسك',
    'قرص صلب',
    'تخزين',
    'ذاكره',
    'فلاش',
    'ميموري',
    'تيرا',
    'جيجا',
  ],
  [
    'coffee',
    'espresso',
    'barista',
    'grinder',
    'maker',
    'machine',
    'kitchen',
    'air fryer',
    'blender',
    'kettle',
    'قهوه',
    'اسبريسو',
    'باريستا',
    'ماكينه',
    'مكينه',
    'طاحونه',
    'مطبخ',
    'قلايه',
    'قلايه هوائيه',
    'خلاط',
    'غلايه',
  ],
  [
    'vacuum',
    'robot',
    'cleaner',
    'mop',
    'smart home',
    'مكنسه',
    'مكنسه ذكيه',
    'مكنسه روبوت',
    'روبوت',
    'تنظيف',
    'منزل ذكي',
  ],
  [
    'projector',
    'cinema',
    'beamer',
    'بروجكتر',
    'بروجيكتور',
    'برجكتر',
    'عارض',
    'سينما',
  ],
  [
    'router',
    'wifi',
    'mesh',
    'network',
    'modem',
    'راوتر',
    'روتر',
    'واي فاي',
    'وايفاي',
    'شبكه',
    'انترنت',
  ],
  [
    'chair',
    'desk',
    'office',
    'ergonomic',
    'stand',
    'holder',
    'mount',
    'كرسي',
    'مكتب',
    'مكتبي',
    'طبي',
    'مريح',
    'طاوله',
    'ستاند',
    'قاعده',
  ],
  [
    'bag',
    'backpack',
    'luggage',
    'travel',
    'case',
    'pouch',
    'حقيبه',
    'شنطه',
    'ظهر',
    'سفر',
    'حافظه',
  ],
  [
    'lamp',
    'light',
    'led',
    'lightbar',
    'ambient',
    'مصباح',
    'اضاءه',
    'اناره',
    'ليد',
  ],
  [
    'mug',
    'travel mug',
    'tumbler',
    'thermos',
    'contigo',
    'byron',
    'west loop',
    'flask',
    'bottle',
    'cup',
    'thermal mug',
    'coffee mug',
    'كوب',
    'كوب حراري',
    'كوب قهوه',
    'ثيرموس',
    'ترمس',
    'مج',
    'كونتيجو',
    'حافظ حراره',
    'حافظ حرارة',
    'قاروره',
    'مطاره',
  ],
  [
    'air fryer',
    'airfryer',
    'fryer',
    'cosori',
    'pro le',
    'ninja',
    'instant',
    'oven',
    'قلايه',
    'قلاية',
    'قلايه هوائيه',
    'قلاية هوائية',
    'كوسوري',
    'فرن',
    'طهي صحي',
  ],
  [
    'heating pad',
    'heat pad',
    'heat wrap',
    'pain relief',
    'thermal pad',
    'وساده حراريه',
    'وسادة حرارية',
    'كماده',
    'كمادة',
    'كماده حراريه',
    'كمادة حرارية',
    'تسكين',
    'تدفئه',
  ],
  [
    'anc',
    'noise cancelling',
    'noise cancellation',
    'transparency',
    'ldac',
    'soundcore',
    'q31i',
    'sony',
    'bose',
    'عزل',
    'عزل الضوضاء',
    'عزل صوتي',
    'سماعات عازله',
    'سماعات عازلة',
  ],
];

/**
 * Expands normalized text with all matching bilingual concept groups
 * so cross-language, colloquial, and category searches match seamlessly.
 */
export function expandWithBilingualSynonyms(normalizedText: string): string {
  if (!normalizedText) return '';
  const compactText = normalizedText.replace(/\s+/g, '');
  const rawWords = normalizedText.split(' ').filter(Boolean);

  const wordsSet = new Set<string>();
  for (const w of rawWords) {
    wordsSet.add(w);
    const prefixes = stripArabicPrefixes(w);
    for (const p of prefixes) {
      wordsSet.add(p);
      const inflections = getInflectionVariants(p);
      for (const inf of inflections) {
        wordsSet.add(inf);
        const skel = toPhoneticSkeleton(inf);
        if (skel) wordsSet.add(skel);
      }
    }
  }

  const additions: string[] = [];

  for (const group of BILINGUAL_CONCEPT_GROUPS) {
    let matched = false;
    for (const rawTerm of group) {
      const normTerm = normalizeSearchText(rawTerm);
      if (!normTerm) continue;
      const compactTerm = normTerm.replace(/\s+/g, '');

      if (normTerm.includes(' ')) {
        // Multi-word phrase match (either spaced or joined like "بي سي" / "بيسي")
        if (
          normalizedText.includes(normTerm) ||
          (compactTerm.length >= 3 && compactText.includes(compactTerm))
        ) {
          matched = true;
          break;
        }
      } else {
        const strippedTerm = stripArabicDefiniteArticle(normTerm);
        const skelTerm = toPhoneticSkeleton(normTerm);
        if (
          wordsSet.has(normTerm) ||
          wordsSet.has(strippedTerm) ||
          (skelTerm.length >= 3 && wordsSet.has(skelTerm)) ||
          (normTerm.length >= 3 && normalizedText.includes(normTerm))
        ) {
          matched = true;
          break;
        }
      }
    }

    if (matched) {
      for (const sibling of group) {
        additions.push(normalizeSearchText(sibling));
      }
    }
  }

  return additions.length > 0
    ? `${normalizedText} ${additions.join(' ')}`
    : normalizedText;
}

/**
 * Safely extracts text from a LocalizedText object, plain string, or undefined value.
 */
function extractLocalized(val: unknown): string {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object') {
    const rec = val as { ar?: unknown; en?: unknown };
    const ar = typeof rec.ar === 'string' ? rec.ar : '';
    const en = typeof rec.en === 'string' ? rec.en : '';
    return `${ar} ${en}`;
  }
  return '';
}

/**
 * Extracts words, prefix-stripped stems, plural/singular inflections, adjacent joined compound words
 * (e.g., "بي سي" -> "بيسي", "ميني بي سي" -> "مينيبيسي", "لاب توب" -> "لابتوب"),
 * and phonetic skeletons for resilient typo-tolerant matching.
 */
function buildWordAndSkeletonTokens(normText: string): {
  words: string[];
  skeletons: string[];
  compact: string;
} {
  const rawTokens = normText.split(' ').filter(Boolean);
  const wordSet = new Set<string>();
  const skeletonSet = new Set<string>();

  for (let i = 0; i < rawTokens.length; i += 1) {
    const w = rawTokens[i];
    const prefixVariants = stripArabicPrefixes(w);

    for (const pv of prefixVariants) {
      wordSet.add(pv);
      const collapsed = collapseDuplicateChars(pv);
      wordSet.add(collapsed);

      const inflections = getInflectionVariants(pv);
      for (const inf of inflections) {
        wordSet.add(inf);
        const infSkel = toPhoneticSkeleton(inf);
        if (infSkel) skeletonSet.add(infSkel);
      }

      const skel = toPhoneticSkeleton(pv);
      if (skel) skeletonSet.add(skel);
    }

    // Join adjacent 2-word and 3-word compounds (handles "بي سي" <-> "بيسي" / "بسي", "mini pc" <-> "minipc")
    if (i + 1 < rawTokens.length) {
      const strippedNext = stripArabicDefiniteArticle(rawTokens[i + 1]);
      const pair = `${stripArabicDefiniteArticle(w)}${strippedNext}`;
      wordSet.add(pair);
      const pairSkel = toPhoneticSkeleton(pair);
      if (pairSkel) skeletonSet.add(pairSkel);
    }
    if (i + 2 < rawTokens.length) {
      const strippedNext1 = stripArabicDefiniteArticle(rawTokens[i + 1]);
      const strippedNext2 = stripArabicDefiniteArticle(rawTokens[i + 2]);
      const triple = `${stripArabicDefiniteArticle(w)}${strippedNext1}${strippedNext2}`;
      wordSet.add(triple);
      const tripleSkel = toPhoneticSkeleton(triple);
      if (tripleSkel) skeletonSet.add(tripleSkel);
    }
  }

  return {
    words: Array.from(wordSet).filter(Boolean),
    skeletons: Array.from(skeletonSet).filter(Boolean),
    compact: normText.replace(/\s+/g, ''),
  };
}

/**
 * Core smart scoring engine used by both full Product objects and BrowserProductSnapshot items.
 * Supports:
 * 1. Exact, prefix, middle-word, last-word, and internal substring matching in Arabic & English
 * 2. Cross-language & synonym matching (e.g., "pc" <-> "ميني بي سي" / "حاسوب" / "كمبيوتر")
 * 3. Prefix stripping & inflection stemming (e.g., "بالسماعات" <-> "سماعة", "headphones" <-> "headphone")
 * 4. Phonetic vowel-omission & Arabic letter confusion correction (e.g., "مني بسيى" <-> "ميني بي سي")
 * 5. Joined/split compound word matching ("بي سي" <-> "بيسي" / "بسي", "لاب توب" <-> "لابتوب")
 * 6. Damerau-Levenshtein typo tolerance (1–2 character typos or swapped adjacent letters)
 */
export function scoreSmartSearchCandidate(
  primaryTitleText: string,
  secondaryMetaText: string,
  rawQuery: string
): number {
  const normalizedQuery = normalizeSearchText(rawQuery);
  if (!normalizedQuery) return 1;

  const titleNorm = normalizeSearchText(primaryTitleText);
  const metaNorm = normalizeSearchText(secondaryMetaText);
  const baseAllText = `${titleNorm} ${metaNorm}`.trim();

  // Expand both product text and user query with bilingual concept synonyms
  const expandedProductText = expandWithBilingualSynonyms(baseAllText);
  const expandedQueryText = expandWithBilingualSynonyms(normalizedQuery);

  const titleTokens = buildWordAndSkeletonTokens(titleNorm);
  const allTokens = buildWordAndSkeletonTokens(expandedProductText);

  const rawQueryWords = normalizedQuery.split(' ').filter(Boolean);
  const queryTerms = rawQueryWords.map((token) => {
    const prefixVariants = stripArabicPrefixes(token);
    const inflectionVariants = prefixVariants.flatMap((pv) => getInflectionVariants(pv));
    const allVariants = Array.from(new Set([token, ...prefixVariants, ...inflectionVariants]));
    const collapsed = collapseDuplicateChars(token);
    const skeleton = toPhoneticSkeleton(token);
    const synonymExpanded = expandWithBilingualSynonyms(token)
      .split(' ')
      .filter((t) => Boolean(t && t !== token));

    return {
      raw: token,
      variants: allVariants,
      collapsed,
      skeleton,
      synonyms: synonymExpanded,
    };
  });

  if (queryTerms.length === 0) return 1;

  let totalScore = 0;
  let matchedTokensCount = 0;

  const compactQuery = normalizedQuery.replace(/\s+/g, '');

  // Phrase-level bonuses (contiguous or joined compound phrase in title or expanded synonyms)
  if (titleNorm.startsWith(normalizedQuery)) {
    totalScore += 160;
  } else if (titleNorm.includes(normalizedQuery)) {
    totalScore += 115;
  } else if (
    compactQuery.length >= 2 &&
    titleTokens.compact.includes(compactQuery)
  ) {
    totalScore += 95;
  } else if (expandedProductText.includes(normalizedQuery)) {
    totalScore += 80;
  } else if (
    compactQuery.length >= 2 &&
    allTokens.compact.includes(compactQuery)
  ) {
    totalScore += 70;
  }

  // Check if query as a whole phrase triggered a bilingual synonym present in the product
  if (totalScore === 0 && rawQueryWords.length > 1) {
    const phraseSynonyms = expandedQueryText.split(' ').filter(Boolean);
    if (
      phraseSynonyms.some(
        (syn) => syn.length >= 2 && allTokens.words.includes(syn)
      )
    ) {
      totalScore += 75;
    }
  }

  for (const q of queryTerms) {
    let tokenScore = 0;

    for (const term of q.variants) {
      if (!term || term.length < 2) continue;

      // 1. Exact word match in title (any position: first, middle, or last word)
      if (titleTokens.words.some((w) => w === term)) {
        tokenScore = Math.max(tokenScore, 105);
      } else if (titleTokens.words.some((w) => w.startsWith(term))) {
        // 2. Prefix of any word in title
        tokenScore = Math.max(tokenScore, 90);
      } else if (
        titleNorm.includes(term) ||
        (term.length >= 2 && titleTokens.compact.includes(term))
      ) {
        // 3. Substring anywhere inside title or joined title words
        tokenScore = Math.max(tokenScore, 78);
      } else if (allTokens.words.some((w) => w === term)) {
        // 4. Exact match in bilingual synonyms, category, tags, or specs (e.g. "pc" -> "ميني بي سي")
        tokenScore = Math.max(tokenScore, 74);
      } else if (allTokens.words.some((w) => w.startsWith(term))) {
        // 5. Prefix match in bilingual synonyms, category, tags, or description
        tokenScore = Math.max(tokenScore, 62);
      } else if (
        expandedProductText.includes(term) ||
        (term.length >= 2 && allTokens.compact.includes(term))
      ) {
        // 6. Substring anywhere in expanded product text
        tokenScore = Math.max(tokenScore, 50);
      }
    }

    // 7. Bilingual synonym cross-check from query token -> product words
    if (tokenScore < 65 && q.synonyms.length > 0) {
      for (const syn of q.synonyms) {
        if (syn.length < 2) continue;
        if (titleTokens.words.some((w) => w === syn || w.includes(syn))) {
          tokenScore = Math.max(tokenScore, 76);
          break;
        }
        if (allTokens.words.some((w) => w === syn)) {
          tokenScore = Math.max(tokenScore, 68);
          break;
        }
      }
    }

    // 8. Phonetic Vowel-Skeleton Match (handles "مني" -> "ميني", "بسيى" -> "بي سي", "مواس" -> "ماوس", "سمعه" -> "سماعة")
    if (tokenScore < 60 && q.skeleton.length >= 2) {
      if (titleTokens.skeletons.some((sk) => sk === q.skeleton)) {
        tokenScore = Math.max(tokenScore, 70);
      } else if (
        q.skeleton.length >= 3 &&
        titleTokens.skeletons.some(
          (sk) => sk.includes(q.skeleton) || q.skeleton.includes(sk)
        )
      ) {
        tokenScore = Math.max(tokenScore, 60);
      } else if (allTokens.skeletons.some((sk) => sk === q.skeleton)) {
        tokenScore = Math.max(tokenScore, 56);
      }
    }

    // 9. Damerau-Levenshtein Fuzzy Typo Correction (handles misspelled letters or swapped keys)
    if (tokenScore === 0 && q.collapsed.length >= 3) {
      const maxAllowedDist = q.collapsed.length >= 6 ? 2 : 1;

      for (const word of titleTokens.words) {
        if (word.length < 2) continue;
        const dist = damerauLevenshtein(q.collapsed, word);
        const prefixTarget =
          word.length > q.collapsed.length
            ? word.slice(0, q.collapsed.length)
            : word;
        const prefixDist = damerauLevenshtein(q.collapsed, prefixTarget);

        if (dist <= maxAllowedDist) {
          tokenScore = Math.max(tokenScore, dist === 1 ? 64 : 52);
          break;
        }
        if (q.collapsed.length >= 4 && prefixDist <= 1) {
          tokenScore = Math.max(tokenScore, 55);
          break;
        }
      }

      if (tokenScore === 0) {
        for (const word of allTokens.words) {
          if (word.length < 3) continue;
          const dist = damerauLevenshtein(q.collapsed, word);
          if (dist <= maxAllowedDist) {
            tokenScore = Math.max(tokenScore, dist === 1 ? 48 : 38);
            break;
          }
        }
      }

      // Skeleton-level fuzzy check (e.g., vowel omission + 1 consonant typo)
      if (tokenScore === 0 && q.skeleton.length >= 3) {
        for (const sk of titleTokens.skeletons) {
          if (sk.length >= 3 && damerauLevenshtein(q.skeleton, sk) <= 1) {
            tokenScore = Math.max(tokenScore, 46);
            break;
          }
        }
      }
    }

    if (tokenScore > 0) {
      matchedTokensCount += 1;
      totalScore += tokenScore;
    }
  }

  // Also test if joining two adjacent query words into one word matches a product word or skeleton
  // (e.g., user typed "مني بسيى" and product has "ميني بي سي")
  if (matchedTokensCount === 0 && rawQueryWords.length >= 2) {
    const joinedQuerySkel = toPhoneticSkeleton(compactQuery);
    if (
      joinedQuerySkel.length >= 3 &&
      allTokens.skeletons.some(
        (sk) =>
          sk === joinedQuerySkel ||
          sk.includes(joinedQuerySkel) ||
          damerauLevenshtein(joinedQuerySkel, sk) <= 1
      )
    ) {
      return 65;
    }
  }

  if (matchedTokensCount === 0) {
    return 0;
  }

  // Reward matching all words in a multi-word query, and lightly penalize partial token matches
  if (queryTerms.length > 1) {
    if (matchedTokensCount === queryTerms.length) {
      totalScore += 65;
    } else {
      totalScore = Math.round(
        totalScore * (matchedTokensCount / queryTerms.length) * 0.85
      );
    }
  }

  return totalScore;
}

/**
 * Builds weighted searchable fields for a product across all its Arabic & English attributes.
 */
function getProductSearchIndex(product: Product) {
  const titleText = `${extractLocalized(product?.title)} ${extractLocalized(product?.name)}`;

  const specsText = Array.isArray(product?.specs)
    ? product.specs
        .map(
          (s: { label?: unknown; value?: unknown }) =>
            `${extractLocalized(s?.label)} ${extractLocalized(s?.value)}`
        )
        .join(' ')
    : '';

  const prosText = Array.isArray(product?.pros)
    ? product.pros.map((p: unknown) => extractLocalized(p)).join(' ')
    : '';

  const consText = Array.isArray(product?.cons)
    ? product.cons.map((c: unknown) => extractLocalized(c)).join(' ')
    : '';

  const metaText = [
    extractLocalized(product?.categoryName),
    product?.categorySlug || '',
    extractLocalized(product?.sourceName),
    product?.sourceSlug || '',
    ...(Array.isArray(product?.tags) ? product.tags : []),
    extractLocalized(product?.shortSummary),
    extractLocalized(product?.whyWePickedIt),
    extractLocalized(product?.whatToConsider),
    extractLocalized(product?.description),
    specsText,
    prosText,
    consText,
    product?.slug || '',
    product?.priceAmount ? String(product.priceAmount) : '',
  ].join(' ');

  return {
    titleText,
    metaText,
  };
}

/**
 * Scores a single product against a user search query.
 * Supports:
 * - Single-letter instant matching (e.g., "ك", "س", "a")
 * - Cross-language & synonym matching (e.g., "pc" <-> "ميني بي سي")
 * - Typo tolerance & phonetic vowel normalization (e.g., "مني بسيى" <-> "ميني بي سي")
 * - Any word (first, middle, or last) or partial word in any order
 * Returns 0 if the product does not match.
 */
export function scoreProductMatch(product: Product, rawQuery: string): number {
  const idx = getProductSearchIndex(product);
  return scoreSmartSearchCandidate(idx.titleText, idx.metaText, rawQuery);
}

/**
 * Scores a single article/buying guide against a user search query
 * across Arabic and English title, category, excerpt, keywords, and body.
 */
export function scoreArticleMatch(article: Article, rawQuery: string): number {
  const normalizedQuery = normalizeSearchText(rawQuery);
  if (!normalizedQuery) return 1;

  const queryTokens = normalizedQuery
    .split(' ')
    .filter(Boolean)
    .map((token) => ({
      raw: token,
      stripped: stripArabicDefiniteArticle(token),
    }));

  if (queryTokens.length === 0) return 1;

  const titleNorm = normalizeSearchText(
    `${extractLocalized(article?.title)} ${extractLocalized(article?.seoTitle)}`
  );
  const titleWords = titleNorm
    .split(' ')
    .filter(Boolean)
    .flatMap((w) => [w, stripArabicDefiniteArticle(w)]);

  const faqText = Array.isArray(article?.faqItems)
    ? article.faqItems
        .map(
          (f) =>
            `${extractLocalized(f?.question)} ${extractLocalized(f?.answer)}`
        )
        .join(' ')
    : '';

  const metaNorm = normalizeSearchText(
    [
      extractLocalized(article?.categoryName),
      article?.categorySlug || '',
      extractLocalized(article?.excerpt),
      extractLocalized(article?.seoDescription),
      extractLocalized(article?.editorVerdict),
      article?.slug || '',
      ...(Array.isArray(article?.seoKeywords) ? article.seoKeywords : []),
    ].join(' ')
  );

  const bodyPlain = `${extractLocalized(article?.contentHtml).replace(/<[^>]*>/g, ' ')} ${faqText}`;
  const bodyNorm = normalizeSearchText(bodyPlain);
  const allText = `${titleNorm} ${metaNorm} ${bodyNorm}`;
  const allWords = allText
    .split(' ')
    .filter(Boolean)
    .flatMap((w) => [w, stripArabicDefiniteArticle(w)]);

  let totalScore = 0;
  let matchedTokensCount = 0;

  if (titleNorm.startsWith(normalizedQuery)) {
    totalScore += 150;
  } else if (titleNorm.includes(normalizedQuery)) {
    totalScore += 105;
  } else if (metaNorm.includes(normalizedQuery)) {
    totalScore += 65;
  } else if (allText.includes(normalizedQuery)) {
    totalScore += 35;
  }

  for (const { raw, stripped } of queryTokens) {
    let tokenScore = 0;
    const candidates = raw === stripped ? [raw] : [raw, stripped];

    for (const term of candidates) {
      if (!term) continue;
      if (titleWords.some((w) => w === term)) {
        tokenScore = Math.max(tokenScore, 100);
      } else if (titleWords.some((w) => w.startsWith(term))) {
        tokenScore = Math.max(tokenScore, 85);
      } else if (titleNorm.includes(term)) {
        tokenScore = Math.max(tokenScore, 65);
      } else if (metaNorm.includes(term)) {
        tokenScore = Math.max(tokenScore, 45);
      } else if (allWords.some((w) => w.startsWith(term))) {
        tokenScore = Math.max(tokenScore, 30);
      } else if (bodyNorm.includes(term)) {
        tokenScore = Math.max(tokenScore, 20);
      }
    }

    if (tokenScore > 0) {
      matchedTokensCount += 1;
      totalScore += tokenScore;
    }
  }

  if (matchedTokensCount === 0) return 0;

  if (matchedTokensCount === queryTokens.length && queryTokens.length > 1) {
    totalScore += 50;
  }

  return totalScore;
}

/**
 * Filters and ranks articles/buying guides by relevance for real-time search.
 * Also matches articles whose category or reviewed products match the user's product search.
 */
export function searchAndRankArticles(
  articles: Article[],
  rawQuery: string,
  products?: Product[]
): Article[] {
  const normalizedQuery = normalizeSearchText(rawQuery);
  if (!normalizedQuery) return articles;

  const matchedProductIds = new Set<string>();
  const matchedProductCategories = new Set<string>();
  if (Array.isArray(products) && products.length > 0) {
    for (const p of products) {
      if (scoreProductMatch(p, rawQuery) > 0) {
        if (p.id) matchedProductIds.add(p.id);
        if (p.slug) matchedProductIds.add(p.slug);
        if (p.categorySlug) matchedProductCategories.add(p.categorySlug);
        if (p.categoryId) matchedProductCategories.add(p.categoryId);
      }
    }
  }

  const scored: Array<{ article: Article; score: number }> = [];
  for (const article of articles) {
    let score = scoreArticleMatch(article, rawQuery);

    if (matchedProductIds.size > 0) {
      const relatedIds = Array.isArray(article.relatedProductIds)
        ? article.relatedProductIds
        : [];
      if (
        (article.topPickProductId &&
          matchedProductIds.has(article.topPickProductId)) ||
        relatedIds.some((id) => matchedProductIds.has(id))
      ) {
        score += 70;
      }
    }

    if (
      matchedProductCategories.size > 0 &&
      ((article.categorySlug &&
        matchedProductCategories.has(article.categorySlug)) ||
        (article.categoryId &&
          matchedProductCategories.has(article.categoryId)))
    ) {
      score += 35;
    }

    if (score > 0) {
      scored.push({ article, score });
    }
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (b.article.publishedAt || '').localeCompare(a.article.publishedAt || '');
  });

  return scored.map((entry) => entry.article);
}

/**
 * Deduplicates product arrays by unique id, slug, and canonical title.
 */
export function deduplicateProducts(products: Product[]): Product[] {
  if (!Array.isArray(products) || products.length <= 1) return products || [];

  const seenIds = new Set<string>();
  const seenSlugs = new Set<string>();
  const seenTitles = new Set<string>();
  const unique: Product[] = [];

  for (const p of products) {
    if (!p) continue;
    const idKey = (p.id || '').trim().toLowerCase();
    const slugKey = (p.slug || '').trim().toLowerCase();
    const titleKey = normalizeSearchText(extractLocalized(p.title) || extractLocalized(p.name));

    if (idKey && seenIds.has(idKey)) continue;
    if (slugKey && seenSlugs.has(slugKey)) continue;
    if (titleKey && titleKey.length >= 6 && seenTitles.has(titleKey)) continue;

    if (idKey) seenIds.add(idKey);
    if (slugKey) seenSlugs.add(slugKey);
    if (titleKey && titleKey.length >= 6) seenTitles.add(titleKey);

    unique.push(p);
  }

  return unique;
}

/**
 * Applies diversity (dispersion) across categories and merchant stores:
 * Prevents a single category or merchant store from dominating more than
 * maxConsecutive slots in the ranked feed, unless the user specifically searched or filtered for it.
 */
export function applyCategoryAndStoreDiversity(
  rankedItems: Product[],
  options?: {
    isSpecificSearchQuery?: boolean;
    maxConsecutivePerCategory?: number;
    maxConsecutivePerStore?: number;
  }
): Product[] {
  if (!Array.isArray(rankedItems) || rankedItems.length <= 2) return rankedItems;
  if (options?.isSpecificSearchQuery) return rankedItems;

  const maxCat = options?.maxConsecutivePerCategory ?? 2;
  const maxStore = options?.maxConsecutivePerStore ?? 3;

  const result: Product[] = [];
  const pool = [...rankedItems];

  while (pool.length > 0) {
    let candidateIndex = 0;

    for (let i = 0; i < pool.length; i += 1) {
      const candidate = pool[i];
      const candCat = (candidate.categorySlug || candidate.categoryId || '').toLowerCase();
      const candStore = (candidate.sourceSlug || candidate.sourceId || '').toLowerCase();

      // Check last maxCat items in result
      const recentCats = result
        .slice(-maxCat)
        .map((p) => (p.categorySlug || p.categoryId || '').toLowerCase());
      const catCount = candCat ? recentCats.filter((c) => c === candCat).length : 0;

      // Check last maxStore items in result
      const recentStores = result
        .slice(-maxStore)
        .map((p) => (p.sourceSlug || p.sourceId || '').toLowerCase());
      const storeCount = candStore ? recentStores.filter((s) => s === candStore).length : 0;

      if (catCount < maxCat && storeCount < maxStore) {
        candidateIndex = i;
        break;
      }
    }

    result.push(pool.splice(candidateIndex, 1)[0]);
  }

  return result;
}

/**
 * Returns direct matches + article-linked matches + similar-category matches
 * for instant live search dropdown previews. Automatically deduplicated.
 */
export function findMatchingProducts(
  products: Product[],
  rawQuery: string,
  articles?: Article[]
): Product[] {
  const normalizedQuery = normalizeSearchText(rawQuery);
  const cleanProducts = deduplicateProducts(products);
  if (!normalizedQuery) return cleanProducts;

  const directMatches: Array<{ product: Product; score: number }> = [];
  const matchedCategories = new Set<string>();
  const matchedTags = new Set<string>();
  const articleRelatedProductKeys = new Set<string>();

  if (Array.isArray(articles) && articles.length > 0) {
    const matchedArticles = searchAndRankArticles(articles, rawQuery);
    for (const art of matchedArticles) {
      if (art.categorySlug) matchedCategories.add(art.categorySlug);
      if (art.categoryId) matchedCategories.add(art.categoryId);
      if (art.topPickProductId) articleRelatedProductKeys.add(art.topPickProductId);
      if (Array.isArray(art.relatedProductIds)) {
        for (const idOrSlug of art.relatedProductIds) {
          if (idOrSlug) articleRelatedProductKeys.add(idOrSlug);
        }
      }
    }
  }

  for (const product of cleanProducts) {
    let score = scoreProductMatch(product, rawQuery);
    if (
      articleRelatedProductKeys.has(product.id) ||
      articleRelatedProductKeys.has(product.slug)
    ) {
      score += 75;
    }

    if (score > 0) {
      // Incorporate Unified Ranking: Combines query relevance (70%) with multi-objective ranking (30%)
      const unified = computeUnifiedRankingScore(product, {
        rawQuery,
      });
      const combinedScore = Math.round((score * 0.7 + unified.compositeScore * 0.3) * 10) / 10;
      directMatches.push({ product, score: combinedScore });

      if (product.categorySlug) matchedCategories.add(product.categorySlug);
      if (product.categoryId) matchedCategories.add(product.categoryId);
      if (Array.isArray(product.tags)) {
        for (const t of product.tags) {
          const normTag = normalizeSearchText(t);
          if (normTag) matchedTags.add(normTag);
        }
      }
    }
  }

  directMatches.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return String(b.product.createdAt || '').localeCompare(
      String(a.product.createdAt || '')
    );
  });

  const directIds = new Set(directMatches.map((entry) => entry.product.id));

  const similarFieldMatches: Array<{ product: Product; similarityScore: number }> = [];
  if (matchedCategories.size > 0 || matchedTags.size > 0) {
    for (const product of cleanProducts) {
      if (directIds.has(product.id)) continue;

      let similarityScore = 0;
      if (
        (product.categorySlug && matchedCategories.has(product.categorySlug)) ||
        (product.categoryId && matchedCategories.has(product.categoryId))
      ) {
        similarityScore += 30;
      }

      if (Array.isArray(product.tags) && matchedTags.size > 0) {
        for (const t of product.tags) {
          if (matchedTags.has(normalizeSearchText(t))) {
            similarityScore += 15;
          }
        }
      }

      if (similarityScore > 0) {
        const unified = computeUnifiedRankingScore(product, {
          targetCategorySlug: product.categorySlug || product.categoryId,
        });
        const combinedSimilarity =
          Math.round((similarityScore * 0.6 + unified.compositeScore * 0.4) * 10) / 10;
        similarFieldMatches.push({ product, similarityScore: combinedSimilarity });
      }
    }

    similarFieldMatches.sort((a, b) => {
      if (b.similarityScore !== a.similarityScore) {
        return b.similarityScore - a.similarityScore;
      }
      return String(b.product.createdAt || '').localeCompare(
        String(a.product.createdAt || '')
      );
    });
  }

  const combined = [
    ...directMatches.map((entry) => entry.product),
    ...similarFieldMatches.map((entry) => entry.product),
  ];

  return deduplicateProducts(combined);
}

/**
 * Ranks products by relevance for real-time search:
 * 1. Direct product matches first (scored with unified multi-objective balance)
 * 2. Products related to matching articles and products in the same/similar category second
 * 3. Remaining catalog products after that so products NEVER disappear from the page during search.
 * Ensures deduplication and balanced diversity, with cold-start consideration for new visitors.
 */
export function searchAndRankProducts(
  products: Product[],
  rawQuery: string,
  articles?: Article[],
  visitorContext?: {
    isNewVisitor?: boolean;
    visitorCategories?: string[];
    preferredPriceTarget?: number;
  }
): Product[] {
  const cleanProducts = deduplicateProducts(products);
  const normalizedQuery = normalizeSearchText(rawQuery);
  if (!normalizedQuery) {
    if (visitorContext?.isNewVisitor) {
      const scoredCold = cleanProducts.map((product) => ({
        product,
        score: computeUnifiedRankingScore(product, { isNewVisitor: true }).compositeScore,
      }));
      scoredCold.sort((a, b) => b.score - a.score);
      return deduplicateProducts(applyCategoryAndStoreDiversity(scoredCold.map((s) => s.product)));
    }
    return cleanProducts;
  }

  const matchedAndSimilar = findMatchingProducts(cleanProducts, rawQuery, articles);
  const includedIds = new Set(matchedAndSimilar.map((p) => p.id));
  const remainingProducts = cleanProducts.filter((p) => !includedIds.has(p.id));

  // If new visitor, sort remaining items by verified data quality instead of arbitrary order
  if (visitorContext?.isNewVisitor && remainingProducts.length > 0) {
    remainingProducts.sort((a, b) => {
      const qA = computeProductDataQualityScore(a);
      const qB = computeProductDataQualityScore(b);
      return qB - qA;
    });
  }

  const isSpecific = normalizedQuery.length >= 3;
  const diversifiedMatched = applyCategoryAndStoreDiversity(matchedAndSimilar, {
    isSpecificSearchQuery: isSpecific,
  });

  return deduplicateProducts([...diversifiedMatched, ...remainingProducts]);
}

const VISITOR_PROFILE_KEY = 'aqurivo_visitor_profile_v2';
const OUTBOUND_CLICK_HALF_LIFE_MS = 7 * 24 * 60 * 60 * 1000;

export interface VisitorInterestProfile {
  queries: string[];
  categories: string[];
  viewedProductIds: string[];
  savedProductIds: string[];
  outboundClickedProductIds: string[];
  outboundClickTimestamps: Record<string, number>;
  preferredPriceMin: number | null;
  preferredPriceMax: number | null;
  seed: number;
}

export function getOrInitVisitorProfile(): VisitorInterestProfile {
  if (typeof window === 'undefined') {
    return {
      queries: [],
      categories: [],
      viewedProductIds: [],
      savedProductIds: [],
      outboundClickedProductIds: [],
      outboundClickTimestamps: {},
      preferredPriceMin: null,
      preferredPriceMax: null,
      seed: 1,
    };
  }
  try {
    const raw = window.localStorage.getItem(VISITOR_PROFILE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<VisitorInterestProfile>;
      return {
        queries: Array.isArray(parsed.queries) ? parsed.queries.slice(0, 10) : [],
        categories: Array.isArray(parsed.categories) ? parsed.categories.slice(0, 10) : [],
        viewedProductIds: Array.isArray(parsed.viewedProductIds)
          ? parsed.viewedProductIds.slice(0, 16)
          : [],
        savedProductIds: Array.isArray(parsed.savedProductIds)
          ? parsed.savedProductIds.filter((id): id is string => typeof id === 'string').slice(0, 16)
          : [],
        outboundClickedProductIds: Array.isArray(parsed.outboundClickedProductIds)
          ? parsed.outboundClickedProductIds
              .filter((id): id is string => typeof id === 'string')
              .slice(0, 16)
          : [],
        outboundClickTimestamps:
          parsed.outboundClickTimestamps &&
          typeof parsed.outboundClickTimestamps === 'object' &&
          !Array.isArray(parsed.outboundClickTimestamps)
            ? Object.fromEntries(
                Object.entries(parsed.outboundClickTimestamps).filter(
                  (entry): entry is [string, number] =>
                    typeof entry[1] === 'number' && Number.isFinite(entry[1])
                )
              )
            : {},
        preferredPriceMin:
          typeof parsed.preferredPriceMin === 'number' && Number.isFinite(parsed.preferredPriceMin)
            ? parsed.preferredPriceMin
            : null,
        preferredPriceMax:
          typeof parsed.preferredPriceMax === 'number' && Number.isFinite(parsed.preferredPriceMax)
            ? parsed.preferredPriceMax
            : null,
        seed:
          typeof parsed.seed === 'number' && Number.isFinite(parsed.seed)
            ? parsed.seed
            : Math.floor(Math.random() * 10000) + 1,
      };
    }
  } catch {}

  const fresh: VisitorInterestProfile = {
    queries: [],
    categories: [],
    viewedProductIds: [],
    savedProductIds: [],
    outboundClickedProductIds: [],
    outboundClickTimestamps: {},
    preferredPriceMin: null,
    preferredPriceMax: null,
    seed: Math.floor(Math.random() * 10000) + 1,
  };
  try {
    window.localStorage.setItem(VISITOR_PROFILE_KEY, JSON.stringify(fresh));
  } catch {}
  return fresh;
}

/**
 * Records rich visitor interactions (clicks, dwell, category interest, search, price cues)
 * purely in client localStorage without any serverless or database calls (Zero Operational Cost).
 */
export function recordVisitorInteraction(input: {
  productId?: string;
  categorySlug?: string;
  priceAmount?: number | null;
  query?: string;
  action?: 'view' | 'swipe' | 'save' | 'unsave' | 'outbound' | 'search';
}): void {
  if (typeof window === 'undefined') return;
  const profile = getOrInitVisitorProfile();

  if (input.productId) {
    if (input.action === 'save') {
      profile.savedProductIds = [
        input.productId,
        ...profile.savedProductIds.filter((id) => id !== input.productId),
      ].slice(0, 16);
    } else if (input.action === 'unsave') {
      profile.savedProductIds = profile.savedProductIds.filter(
        (id) => id !== input.productId
      );
    } else {
      profile.viewedProductIds = [
        input.productId,
        ...profile.viewedProductIds.filter((id) => id !== input.productId),
      ].slice(0, 16);
      if (input.action === 'outbound') {
        profile.outboundClickedProductIds = [
          input.productId,
          ...profile.outboundClickedProductIds.filter((id) => id !== input.productId),
        ].slice(0, 16);
        profile.outboundClickTimestamps[input.productId] = Date.now();
        const retainedIds = new Set(profile.outboundClickedProductIds);
        profile.outboundClickTimestamps = Object.fromEntries(
          Object.entries(profile.outboundClickTimestamps).filter(([id]) =>
            retainedIds.has(id)
          )
        );
      }
    }
  }

  if (input.categorySlug && input.categorySlug !== 'all') {
    profile.categories = [
      input.categorySlug,
      ...profile.categories.filter((c) => c !== input.categorySlug),
    ].slice(0, 10);
  }

  if (typeof input.priceAmount === 'number' && input.priceAmount > 0) {
    if (profile.preferredPriceMin === null || profile.preferredPriceMax === null) {
      profile.preferredPriceMin = input.priceAmount * 0.7;
      profile.preferredPriceMax = input.priceAmount * 1.4;
    } else {
      profile.preferredPriceMin = Math.min(profile.preferredPriceMin, input.priceAmount * 0.75);
      profile.preferredPriceMax = Math.max(profile.preferredPriceMax, input.priceAmount * 1.35);
    }
  }

  if (input.query) {
    const normQuery = normalizeSearchText(input.query);
    if (normQuery && normQuery.length >= 2) {
      profile.queries = [
        normQuery,
        ...profile.queries.filter((q) => q !== normQuery),
      ].slice(0, 10);
    }
  }

  try {
    window.localStorage.setItem(VISITOR_PROFILE_KEY, JSON.stringify(profile));
  } catch {}
}

/**
 * Backward-compatible helper for recording visitor search/category interest.
 */
export function recordVisitorInterest(input: {
  query?: string;
  categorySlug?: string;
  products?: Product[];
}): void {
  recordVisitorInteraction({
    query: input.query,
    categorySlug: input.categorySlug,
  });

  if (input.query && Array.isArray(input.products)) {
    const norm = normalizeSearchText(input.query);
    for (const p of input.products) {
      if (scoreProductMatch(p, norm) > 0 && p.categorySlug) {
        recordVisitorInteraction({ categorySlug: p.categorySlug });
        break;
      }
    }
  }
}

/**
 * Detects the visitor's country/region signal from browser timezone & locale
 * to prioritize stores and products suited to their region.
 */
function getVisitorRegionStoreAffinity(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const tz = (Intl.DateTimeFormat().resolvedOptions().timeZone || '').toLowerCase();
    const lang = (navigator.language || '').toLowerCase();

    // Gulf / Middle East region (SA, AE, KW, QA, BH, OM, EG)
    if (
      tz.includes('riyadh') ||
      tz.includes('dubai') ||
      tz.includes('kuwait') ||
      tz.includes('qatar') ||
      tz.includes('bahrain') ||
      tz.includes('muscat') ||
      tz.includes('cairo') ||
      lang.includes('-sa') ||
      lang.includes('-ae') ||
      lang.includes('-kw') ||
      lang.includes('-qa') ||
      lang.includes('-eg')
    ) {
      return ['noon', 'amazon', 'temu'];
    }

    // North Africa / Morocco / Algeria / Tunisia / Europe
    if (
      tz.includes('casablanca') ||
      tz.includes('algiers') ||
      tz.includes('tunis') ||
      tz.includes('europe') ||
      lang.includes('-ma') ||
      lang.includes('-dz') ||
      lang.includes('-tn')
    ) {
      return ['amazon', 'temu', 'aliexpress'];
    }
  } catch {}
  return ['amazon', 'noon', 'temu'];
}

function deterministicHash(str: string, seed: number): number {
  let h = seed ^ 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 1000;
}

/**
 * Objective, documented Data Quality & Editorial Completeness Score (0 - 100).
 * Never invents ratings, reviews, or sales numbers.
 */
export function computeProductDataQualityScore(product: Product): number {
  if (!product) return 0;
  let score = 0;

  // 1. High-Resolution Visual Quality (up to 25 pts)
  if (Array.isArray(product.images) && product.images.length > 0 && product.images[0]?.url) {
    score += 15;
    if (product.images.length >= 3) score += 10;
  }

  // 2. Editorial Curation & Expert Verdict (up to 25 pts)
  const whyObj = product.whyWePickedIt as unknown as (LocalizedText | string);
  const hasWhy = Boolean(
    (typeof whyObj === 'string' && whyObj.trim()) ||
    (whyObj && typeof whyObj === 'object' && ((whyObj as LocalizedText).ar || (whyObj as LocalizedText).en))
  );
  if (hasWhy) score += 20;

  const considerObj = product.whatToConsider as unknown as (LocalizedText | string);
  const hasConsider = Boolean(
    (typeof considerObj === 'string' && considerObj.trim()) ||
    (considerObj && typeof considerObj === 'object' && ((considerObj as LocalizedText).ar || (considerObj as LocalizedText).en))
  );
  if (hasConsider) score += 5;

  // 3. Structured Specs & Comparison DNA (up to 20 pts)
  const specsCount = Array.isArray(product.specs) ? product.specs.length : 0;
  const dnaCount =
    (product.comparisonDna?.keySpecs?.ar?.length || 0) +
    (product.comparisonDna?.keySpecs?.en?.length || 0);
  if (specsCount >= 3 || dnaCount >= 2) {
    score += 20;
  } else if (specsCount > 0 || dnaCount > 0) {
    score += 10;
  }

  // 4. Honest, Balanced Pros & Cons (up to 15 pts)
  const prosCount = Array.isArray(product.pros) ? product.pros.length : 0;
  const consCount = Array.isArray(product.cons) ? product.cons.length : 0;
  if (prosCount > 0 && consCount > 0) {
    score += 15;
  } else if (prosCount > 0 || consCount > 0) {
    score += 7;
  }

  // 5. Official Store Link & Positive Valid Price (up to 15 pts)
  if (typeof product.priceAmount === 'number' && product.priceAmount > 0) {
    score += 10;
  }
  if (product.affiliateUrl) {
    score += 5;
  }

  return Math.min(100, score);
}

/**
 * Returns legitimately documented user ratings, or null if unrated.
 * Prevents any unverified star defaults.
 */
export function getVerifiedProductRating(product: Product): number | null {
  if (typeof product.rating === 'number' && !Number.isNaN(product.rating) && product.rating > 0) {
    return Math.min(5, Math.max(1, product.rating));
  }
  if (typeof product.stars === 'number' && !Number.isNaN(product.stars) && product.stars > 0) {
    return Math.min(5, Math.max(1, product.stars));
  }
  return null;
}

/**
 * Complementary Category Matrix (Cross-Category Ecosystem graph).
 */
export const COMPLEMENTARY_CATEGORY_MATRIX: Record<string, string[]> = {
  computers: ['accessories', 'monitors', 'keyboards-mice', 'audio', 'cables', 'storage', 'office'],
  'mini-pc': ['monitors', 'keyboards-mice', 'accessories', 'audio', 'cables', 'storage'],
  laptops: ['accessories', 'monitors', 'keyboards-mice', 'audio', 'bags', 'chargers'],
  gaming: ['keyboards-mice', 'audio', 'monitors', 'accessories', 'chairs'],
  electronics: ['accessories', 'cables', 'chargers', 'audio', 'tools'],
  audio: ['accessories', 'cables', 'electronics', 'smart-home'],
  headphones: ['accessories', 'cables', 'audio', 'stands'],
  'smart-home': ['electronics', 'lighting', 'accessories', 'security'],
  wearables: ['fitness', 'accessories', 'chargers', 'health'],
  smartwatches: ['accessories', 'fitness', 'chargers', 'health'],
  office: ['desk-setup', 'ergonomics', 'accessories', 'electronics'],
  'desk-setup': ['office', 'monitors', 'keyboards-mice', 'lighting', 'accessories'],
  tools: ['electronics', 'accessories', 'hardware'],
};

/**
 * Detects whether the current session is a new visitor with no prior interaction history.
 */
export function isNewVisitor(
  profile: VisitorInterestProfile,
  sessionIntent?: { totalActiveSeconds?: number }
): boolean {
  if (!profile) return true;
  const hasViewed = Array.isArray(profile.viewedProductIds) && profile.viewedProductIds.length > 0;
  const hasSaved = Array.isArray(profile.savedProductIds) && profile.savedProductIds.length > 0;
  const hasOutboundClicks =
    Array.isArray(profile.outboundClickedProductIds) &&
    profile.outboundClickedProductIds.length > 0;
  const hasCategories = Array.isArray(profile.categories) && profile.categories.length > 0;
  const hasQueries = Array.isArray(profile.queries) && profile.queries.length > 0;
  const hasActiveDwell = (sessionIntent?.totalActiveSeconds || 0) > 6;

  return !hasViewed && !hasSaved && !hasOutboundClicks && !hasCategories && !hasQueries && !hasActiveDwell;
}

export interface UnifiedRankingComponents {
  relevance: number;
  similarity: number;
  categoryAffinity: number;
  priceAlignment: number;
  engagement: number;
  dataQuality: number;
  compositeScore: number;
}

/**
 * Unified multi-objective ranking formulation that combines:
 * 1. Search Query Relevance (0..100)
 * 2. Product Similarity / Archetype Compatibility (0..100)
 * 3. Category Context (0..100)
 * 4. Price Alignment & Elasticity (0..100)
 * 5. Real Engagement (Bayesian CTR, confirmed conversions, dwell time) (0..100)
 * 6. Data Quality & Editorial Completeness (0..100)
 */
export function computeUnifiedRankingScore(
  product: Product,
  context?: {
    rawQuery?: string;
    targetProduct?: Product | null;
    targetCategorySlug?: string;
    preferredPriceTarget?: number;
    preferredPriceMin?: number | null;
    preferredPriceMax?: number | null;
    visitorCategories?: string[];
    visitorQueries?: string[];
    dwellAffinities?: Record<string, number>;
    isNewVisitor?: boolean;
  }
): UnifiedRankingComponents {
  // 1. Search Query Relevance
  let relevance = 50;
  if (context?.rawQuery && context.rawQuery.trim()) {
    relevance = scoreProductMatch(product, context.rawQuery);
  }

  // 2. Product Similarity
  let similarity = 50;
  if (context?.targetProduct) {
    similarity = calculateProductSimilarityScore(context.targetProduct, product);
  }

  // 3. Category Context
  let categoryAffinity = 40;
  const prodCat = (product.categorySlug || product.categoryId || '').toLowerCase();
  if (context?.targetCategorySlug) {
    const targetCat = context.targetCategorySlug.toLowerCase();
    if (prodCat === targetCat) {
      categoryAffinity = 100;
    } else if (COMPLEMENTARY_CATEGORY_MATRIX[targetCat]?.includes(prodCat)) {
      categoryAffinity = 75;
    } else {
      categoryAffinity = 20;
    }
  } else if (context?.visitorCategories && context.visitorCategories.length > 0) {
    const catIdx = context.visitorCategories.indexOf(prodCat);
    if (catIdx !== -1) {
      categoryAffinity = Math.max(40, 95 - catIdx * 15);
    }
  }

  // 4. Price Alignment
  let priceAlignment = 50;
  const price = typeof product.priceAmount === 'number' && product.priceAmount > 0 ? product.priceAmount : 0;
  if (price > 0) {
    if (context?.preferredPriceTarget && context.preferredPriceTarget > 0) {
      const ratio = price / context.preferredPriceTarget;
      if (ratio >= 0.75 && ratio <= 1.35) {
        priceAlignment = Math.round(100 * (1 - Math.abs(1 - ratio) * 0.8));
      } else {
        priceAlignment = Math.max(20, Math.round(60 / (1 + Math.abs(Math.log(ratio)))));
      }
    } else if (
      context?.preferredPriceMin !== null &&
      context?.preferredPriceMin !== undefined &&
      context?.preferredPriceMax !== null &&
      context?.preferredPriceMax !== undefined
    ) {
      if (price >= context.preferredPriceMin * 0.75 && price <= context.preferredPriceMax * 1.35) {
        priceAlignment = 85;
      }
    } else {
      priceAlignment = 65; // Valid positive price
    }
  }

  // 5. Engagement & Interaction (Real metrics, no fabrication)
  let engagement = 30;
  const clicks = typeof product.clicksCount === 'number' ? Math.max(0, product.clicksCount) : 0;
  const impressions =
    typeof product.impressionsCount === 'number'
      ? Math.max(clicks, product.impressionsCount)
      : clicks * 25;
  const affiliateClicks =
    typeof product.affiliateClicksCount === 'number'
      ? Math.max(0, product.affiliateClicksCount)
      : 0;
  const conversions = (product.confirmedConversionsCount ?? product.salesCount ?? 0) as number;

  const ctr = impressions > 0 ? clicks / impressions : 0.04;
  const cvr = clicks > 0 ? (affiliateClicks + conversions) / clicks : 0.05;
  engagement = Math.min(100, Math.round(ctr * 600 + cvr * 400 + Math.log1p(clicks) * 4));

  if (context?.dwellAffinities && prodCat && context.dwellAffinities[prodCat]) {
    engagement = Math.min(100, engagement + Math.round(context.dwellAffinities[prodCat] * 4));
  }

  // 6. Data Quality & Editorial Completeness
  const dataQuality = computeProductDataQualityScore(product);
  const verifiedRating = getVerifiedProductRating(product);
  let qualityWithRating = dataQuality;
  if (verifiedRating !== null) {
    qualityWithRating = Math.min(100, dataQuality * 0.7 + (verifiedRating / 5) * 30);
  }

  // Composite formulation based on operational mode
  let compositeScore = 0;
  if (context?.rawQuery && context.rawQuery.trim()) {
    // Search mode: Query match dominates (55%), then category (15%), data quality (15%), price (8%), engagement (7%)
    compositeScore =
      relevance * 0.55 +
      categoryAffinity * 0.15 +
      qualityWithRating * 0.15 +
      priceAlignment * 0.08 +
      engagement * 0.07;
  } else if (context?.isNewVisitor) {
    // New visitor cold-start mode: Data quality & editorial completeness lead (40%), verified store/merchant (25%), category diversity (25%), price validity (10%)
    compositeScore =
      qualityWithRating * 0.40 +
      dataQuality * 0.25 +
      categoryAffinity * 0.25 +
      priceAlignment * 0.10;
  } else if (context?.targetProduct) {
    // Related / item affinity mode: Similarity leads (45%), category (20%), price (15%), data quality (10%), engagement (10%)
    compositeScore =
      similarity * 0.45 +
      categoryAffinity * 0.20 +
      priceAlignment * 0.15 +
      qualityWithRating * 0.10 +
      engagement * 0.10;
  } else {
    // General personalized browse mode:
    compositeScore =
      categoryAffinity * 0.30 +
      qualityWithRating * 0.25 +
      priceAlignment * 0.15 +
      engagement * 0.15 +
      similarity * 0.15;
  }

  return {
    relevance,
    similarity,
    categoryAffinity,
    priceAlignment,
    engagement,
    dataQuality: qualityWithRating,
    compositeScore: Math.round(compositeScore * 10) / 10,
  };
}

/**
 * Zero-Cost Multi-Dimensional Similarity Calculator
 * Evaluates category domain, price tier bracket, DNA specs keywords, store, and quality.
 * Returns a normalized affinity score between 0 and 100.
 */
export function calculateProductSimilarityScore(
  target: Product,
  candidate: Product
): number {
  if (!target || !candidate) return 0;
  if (target.id === candidate.id || target.slug === candidate.slug) return -1;

  let score = 0;

  // 1. Archetype Domain Affinity (Max 40 pts)
  const targetArch = detectProductArchetype(target);
  const candArch = detectProductArchetype(candidate);

  const isExactArch = targetArch !== 'general' && targetArch === candArch;
  const isSubArch = areArchetypesSubstitutes(targetArch, candArch);
  const isCompArch = areArchetypesComplements(targetArch, candArch);

  if (isExactArch) {
    score += 40;
  } else if (isSubArch) {
    score += 30;
  } else if (isCompArch) {
    score += 20;
  } else {
    const targetCat = (target.categorySlug || target.categoryId || '').toLowerCase();
    const candCat = (candidate.categorySlug || candidate.categoryId || '').toLowerCase();
    if (targetCat && candCat && targetCat === candCat && (targetArch === 'general' || candArch === 'general')) {
      score += 15;
    }
  }

  // 2. Price Bracket Affinity (Max 25 pts)
  const p1 =
    typeof target.priceAmount === 'number' && target.priceAmount > 0
      ? target.priceAmount
      : null;
  const p2 =
    typeof candidate.priceAmount === 'number' && candidate.priceAmount > 0
      ? candidate.priceAmount
      : null;

  if (p1 !== null && p2 !== null) {
    const minP = Math.min(p1, p2);
    const maxP = Math.max(p1, p2);
    const ratio = minP / maxP;
    if (ratio >= 0.75) {
      score += 25;
    } else if (ratio >= 0.5) {
      score += 18;
    } else if (ratio >= 0.25) {
      score += 10;
    } else {
      score += 4;
    }
  } else {
    score += 12;
  }

  // 3. DNA Features & Semantic Specification Tokens (Max 25 pts)
  const getProductFeatureTokens = (p: Product): Set<string> => {
    const tokens = new Set<string>();
    const addTokens = (txt?: string | null) => {
      if (!txt) return;
      const normalized = normalizeSearchText(txt);
      for (const word of normalized.split(/\s+/)) {
        if (
          word.length >= 3 &&
          !['and', 'the', 'for', 'with', 'من', 'في', 'على', 'مع', 'هذا', 'هذه'].includes(word)
        ) {
          tokens.add(word);
        }
      }
    };

    if (typeof p.title === 'string') addTokens(p.title);
    else if (p.title) {
      addTokens(p.title.ar);
      addTokens(p.title.en);
    }
    if (typeof p.shortSummary === 'string') addTokens(p.shortSummary);
    else if (p.shortSummary) {
      addTokens(p.shortSummary.ar);
      addTokens(p.shortSummary.en);
    }
    if (p.comparisonDna?.keySpecs) {
      p.comparisonDna.keySpecs.ar?.forEach(addTokens);
      p.comparisonDna.keySpecs.en?.forEach(addTokens);
    }
    return tokens;
  };

  const targetTokens = getProductFeatureTokens(target);
  const candTokens = getProductFeatureTokens(candidate);

  let sharedTokenCount = 0;
  targetTokens.forEach((token) => {
    if (candTokens.has(token)) {
      sharedTokenCount += 1;
    }
  });

  const featurePoints = Math.min(25, sharedTokenCount * 5);
  score += featurePoints;

  // 4. Quality & Editorial Completeness Signal (Max 10 pts) - No fabricated default stars
  const verifiedRating = getVerifiedProductRating(candidate);
  const dataQuality = computeProductDataQualityScore(candidate);

  if (verifiedRating !== null) {
    if (verifiedRating >= 4.7) score += 6;
    else if (verifiedRating >= 4.2) score += 4;
    else score += 2;
  } else {
    // Pure documented editorial data completeness
    score += Math.round((dataQuality / 100) * 5);
  }

  const sold =
    typeof candidate.soldCount === 'number' && candidate.soldCount > 0
      ? candidate.soldCount
      : 0;
  if (sold > 200) score += 4;
  else if (sold > 50) score += 2;

  // 5. Store / Fulfillment Continuity (Max 5 pts)
  const s1 = (target.sourceSlug || target.sourceId || '').toLowerCase();
  const s2 = (candidate.sourceSlug || candidate.sourceId || '').toLowerCase();
  if (s1 && s2 && s1 === s2) {
    score += 5;
  }

  return Math.min(100, Math.max(0, score));
}

/**
 * Intelligent in-memory substitute & complementary product selector (Zero Extra Database Calls).
 * Balances direct comparable alternatives with smart complementary pairings.
 */
export function getSmartRelatedProducts(
  currentProduct: Product,
  allProducts: Product[],
  maxResults = 4
): Product[] {
  if (!currentProduct || !Array.isArray(allProducts) || allProducts.length === 0) {
    return [];
  }

  const scored = allProducts
    .filter((p) => p.id !== currentProduct.id && p.slug !== currentProduct.slug)
    .map((candidate) => ({
      product: candidate,
      score: calculateProductSimilarityScore(currentProduct, candidate),
    }))
    .sort((a, b) => b.score - a.score);

  if (scored.length <= maxResults) {
    return scored.map((s) => s.product);
  }

  const targetCat = (currentProduct.categorySlug || currentProduct.categoryId || '').toLowerCase();
  const sameCat = scored.filter(
    (s) => (s.product.categorySlug || s.product.categoryId || '').toLowerCase() === targetCat
  );
  const diffCat = scored.filter(
    (s) => (s.product.categorySlug || s.product.categoryId || '').toLowerCase() !== targetCat
  );

  const selected: Product[] = [];
  const selectedIds = new Set<string>();

  // 1. Pick top 2 same-category products (Direct Substitutes for comparison)
  for (const item of sameCat) {
    if (selected.length < 2) {
      selected.push(item.product);
      selectedIds.add(item.product.id);
    }
  }

  // 2. Pick top complementary cross-category products if available
  for (const item of diffCat) {
    if (selected.length < maxResults && !selectedIds.has(item.product.id)) {
      selected.push(item.product);
      selectedIds.add(item.product.id);
    }
  }

  // 3. Fill any remaining slots with highest overall scores
  for (const item of scored) {
    if (selected.length < maxResults && !selectedIds.has(item.product.id)) {
      selected.push(item.product);
      selectedIds.add(item.product.id);
    }
  }

  return selected;
}

/**
 * In-browser background re-ranking for similar products on a product detail page.
 * Seamlessly adapts ordering to the visitor's session velocity, dwell signals, and price affinities.
 * Runs completely in the background without any visual footprint.
 */
export function rankSimilarProductsForVisitor(
  similarProducts: Product[],
  currentProduct: Product
): Product[] {
  if (typeof window === 'undefined' || !Array.isArray(similarProducts) || similarProducts.length <= 1) {
    return similarProducts;
  }

  const sessionIntent = computeSessionIntentVector();
  const dynamicExploration = calculateDynamicExplorationRatio();
  const preferredStores = getVisitorRegionStoreAffinity();

  const scored = similarProducts.map((cand) => {
    // 1. Base item similarity to current product
    let score = calculateProductSimilarityScore(currentProduct, cand);

    // 2. Intent price match
    if (
      sessionIntent.preferredPriceTarget > 0 &&
      typeof cand.priceAmount === 'number' &&
      cand.priceAmount > 0
    ) {
      const priceRatio = cand.priceAmount / sessionIntent.preferredPriceTarget;
      if (priceRatio >= 0.75 && priceRatio <= 1.35) {
        score += Math.round(20 * (1 - Math.abs(1 - priceRatio)));
      }
    }

    // 3. Category dwell affinity
    if (cand.categorySlug && sessionIntent.categoryAffinities[cand.categorySlug]) {
      const implicitWeight = sessionIntent.categoryAffinities[cand.categorySlug];
      score += Math.min(25, implicitWeight * 8);
    }

    // 4. Preferred store affinity
    const storeSlug = (cand.sourceSlug || cand.sourceId || '').toLowerCase();
    const storeRank = preferredStores.indexOf(storeSlug);
    if (storeRank !== -1) {
      score += (preferredStores.length - storeRank) * 4;
    }

    return { cand, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const maxScore = Math.max(1, scored[0]?.score || 1);
  const candidates = scored.map((s) => ({
    item: s.cand,
    relevanceScore: Math.max(0, Math.min(1, s.score / maxScore)),
    clicksCount: typeof s.cand.clicksCount === 'number' ? s.cand.clicksCount : 0,
    impressionsCount: s.cand.impressionsCount,
    affiliateClicksCount: s.cand.affiliateClicksCount,
    conversionsCount: s.cand.confirmedConversionsCount ?? s.cand.salesCount ?? s.cand.soldCount ?? 0,
  }));

  const banditRanked = rankWithBanditExploration(candidates, dynamicExploration);
  return banditRanked.map((b) => b.item);
}

/**
 * High-performance, zero-compute personalized catalog ranker.
 * Combines search recency, category weights, Markov session similarity,
 * learned price preferences, and an 80/20 Bandit Exploration ratio.
 */
export function rankProductsForVisitor(
  products: Product[],
  options?: {
    activeQuery?: string;
    activeCategorySlug?: string;
  }
): Product[] {
  let base = deduplicateProducts(products);

  if (options?.activeCategorySlug && options.activeCategorySlug !== 'all') {
    const catSlug = options.activeCategorySlug;
    const exactCat = base.filter(
      (p) => p.categorySlug === catSlug || p.categoryId === catSlug
    );
    base = exactCat.length > 0 ? exactCat : base;
  }

  if (options?.activeQuery && options.activeQuery.trim()) {
    if (typeof window !== 'undefined') {
      const profile = getOrInitVisitorProfile();
      const sessionIntent = computeSessionIntentVector();
      const coldStart = isNewVisitor(profile, sessionIntent);
      return searchAndRankProducts(base, options.activeQuery, undefined, {
        isNewVisitor: coldStart,
        visitorCategories: profile.categories,
        preferredPriceTarget: sessionIntent.preferredPriceTarget,
      });
    }
    return searchAndRankProducts(base, options.activeQuery);
  }

  if (typeof window === 'undefined' || base.length <= 1) {
    return base;
  }

  const profile = getOrInitVisitorProfile();
  const sessionIntent = computeSessionIntentVector();
  const dynamicExploration = calculateDynamicExplorationRatio();
  const preferredStores = getVisitorRegionStoreAffinity();
  const findProfileProducts = (ids: string[]) =>
    ids
      .map((id) => base.find((product) => product.id === id || product.slug === id))
      .filter((product): product is Product => Boolean(product));
  const savedProducts = findProfileProducts(profile.savedProductIds);
  const outboundClickedProducts = findProfileProducts(profile.outboundClickedProductIds);

  // New Visitor Cold-Start Flow: Focus on editorial data quality, store diversity, and balanced showcase
  const coldStart = isNewVisitor(profile, sessionIntent);
  if (coldStart) {
    const scoredCold = base.map((product) => {
      const unified = computeUnifiedRankingScore(product, { isNewVisitor: true });
      const storeSlug = (product.sourceSlug || product.sourceId || '').toLowerCase();
      const storeRank = preferredStores.indexOf(storeSlug);
      const storeBonus = storeRank !== -1 ? (preferredStores.length - storeRank) * 2 : 0;
      const tieBreaker = (deterministicHash(product.id || product.slug, profile.seed) / 1000) * 3;

      return {
        product,
        score: unified.compositeScore + storeBonus + tieBreaker,
      };
    });

    scoredCold.sort((a, b) => b.score - a.score);
    const sortedCold = scoredCold.map((s) => s.product);
    return deduplicateProducts(applyCategoryAndStoreDiversity(sortedCold));
  }

  const recentlyViewedProducts = profile.viewedProductIds
    .map((vId) => base.find((p) => p.id === vId || p.slug === vId))
    .filter(Boolean) as Product[];

  const scored = base.map((product) => {
    let score = 0;

    score += computeExplicitIntentBoost(
      product,
      savedProducts,
      outboundClickedProducts,
      profile.outboundClickTimestamps
    );

    // 1. Boost products matching visitor's recent searches (Exponential Recency Decay)
    for (let i = 0; i < profile.queries.length; i += 1) {
      const q = profile.queries[i];
      const matchScore = scoreProductMatch(product, q);
      if (matchScore > 0) {
        const recencyWeight = Math.max(1, 4 - i);
        score += matchScore * recencyWeight;
      }
    }

    // 2. Direct Category Affinity (Explicit + Implicit Dwell)
    if (product.categorySlug) {
      const catIndex = profile.categories.indexOf(product.categorySlug);
      if (catIndex !== -1) {
        score += Math.max(20, 85 - catIndex * 15);
      }
      if (sessionIntent.categoryAffinities[product.categorySlug]) {
        const implicitWeight = sessionIntent.categoryAffinities[product.categorySlug];
        score += Math.min(60, implicitWeight * 18);
      }
    }

    // 3. Item-to-Item Similarity to recently dwelled products
    if (recentlyViewedProducts.length > 0) {
      let maxSimScore = 0;
      for (let i = 0; i < recentlyViewedProducts.length; i += 1) {
        const viewed = recentlyViewedProducts[i];
        const sim = calculateProductSimilarityScore(viewed, product);
        if (sim > maxSimScore) {
          const recencyMultiplier = Math.max(0.5, 1 - i * 0.15);
          maxSimScore = sim * recencyMultiplier;
        }
      }
      score += maxSimScore * 0.6;
    }

    // 4. Learned & Implicit Session Price Bracket Affinity
    if (
      profile.preferredPriceMin !== null &&
      profile.preferredPriceMax !== null &&
      typeof product.priceAmount === 'number' &&
      product.priceAmount > 0
    ) {
      if (
        product.priceAmount >= profile.preferredPriceMin * 0.75 &&
        product.priceAmount <= profile.preferredPriceMax * 1.35
      ) {
        score += 25;
      }
    }

    if (
      sessionIntent.preferredPriceTarget > 0 &&
      typeof product.priceAmount === 'number' &&
      product.priceAmount > 0
    ) {
      const priceRatio = product.priceAmount / sessionIntent.preferredPriceTarget;
      if (priceRatio >= 0.7 && priceRatio <= 1.4) {
        score += Math.round(25 * (1 - Math.abs(1 - priceRatio)));
      }
    }

    // 5. Country / Region store relevance
    const storeSlug = (product.sourceSlug || product.sourceId || '').toLowerCase();
    const storeRank = preferredStores.indexOf(storeSlug);
    if (storeRank !== -1) {
      score += (preferredStores.length - storeRank) * 6;
    }

    // 6. Objective Editorial Data Quality & Verified Ratings (No fabricated defaults)
    const dataQuality = computeProductDataQualityScore(product);
    const verifiedRating = getVerifiedProductRating(product);
    if (verifiedRating !== null) {
      score += (verifiedRating - 3.5) * 5;
    }
    score += (dataQuality / 100) * 8;

    // 7. Deterministic visitor tie-breaker for lively rotation
    const visitorTieBreaker =
      deterministicHash(product.id || product.slug, profile.seed) / 1000;
    score += visitorTieBreaker * 10;

    return { product, score };
  });

  scored.sort((a, b) => b.score - a.score);

  // 8. Adaptive Multi-Armed Bandit Exploration (Thompson Sampling with Session Velocity)
  const hasSignals =
    profile.categories.length > 0 ||
    profile.viewedProductIds.length > 0 ||
    profile.savedProductIds.length > 0 ||
    profile.outboundClickedProductIds.length > 0 ||
    sessionIntent.totalActiveSeconds > 0;

  let rankedProducts: Product[];
  if (hasSignals && scored.length > 1) {
    const maxScore = Math.max(1, scored[0]?.score || 1);
    const candidates = scored.map((s) => ({
      item: s.product,
      relevanceScore: Math.max(0, Math.min(1, s.score / maxScore)),
      clicksCount: typeof s.product.clicksCount === 'number' ? s.product.clicksCount : 0,
      impressionsCount: s.product.impressionsCount,
      affiliateClicksCount: s.product.affiliateClicksCount,
      conversionsCount:
        s.product.confirmedConversionsCount ?? s.product.salesCount ?? s.product.soldCount ?? 0,
    }));

    const banditRanked = rankWithBanditExploration(candidates, dynamicExploration);
    rankedProducts = banditRanked.map((b) => b.item);
  } else {
    rankedProducts = scored.map((entry) => entry.product);
  }

  // Apply diversity to prevent same-category monopolies in browse mode
  return deduplicateProducts(applyCategoryAndStoreDiversity(rankedProducts));
}

/**
 * Converts explicit purchase-intent actions into a bounded ranking boost.
 * Outbound store clicks are stronger than saves; both fade with recency.
 */
export function computeExplicitIntentBoost(
  candidate: Product,
  savedProducts: Product[],
  outboundClickedProducts: Product[],
  outboundClickTimestamps: Record<string, number> = {}
): number {
  const getBestIntentBoost = (
    references: Product[],
    directBoost: number,
    similarityWeight: number
  ) =>
    references.reduce((best, reference, index) => {
      const clickedAt = outboundClickTimestamps[reference.id];
      const ageMs = typeof clickedAt === 'number' ? Date.now() - clickedAt : -1;
      const timeDecay =
        directBoost === 120 && ageMs >= 0
          ? Math.pow(0.5, ageMs / OUTBOUND_CLICK_HALF_LIFE_MS)
          : 1;
      const recencyWeight = Math.max(0.5, 1 - index * 0.1) * timeDecay;
      const isSameProduct =
        candidate.id === reference.id || candidate.slug === reference.slug;
      const boost = isSameProduct
        ? directBoost
        : Math.max(0, calculateProductSimilarityScore(reference, candidate)) *
          similarityWeight;
      return Math.max(best, boost * recencyWeight);
    }, 0);

  return Math.max(
    getBestIntentBoost(savedProducts, 90, 0.65),
    getBestIntentBoost(outboundClickedProducts, 120, 0.85)
  );
}

export type ProductFeedEntry =
  | { type: 'product'; product: Product }
  | {
      type: 'article';
      article: Article;
      matchedProduct?: Product;
    };

function nextSeededRandom(state: { seed: number }): number {
  let x = state.seed || 123456789;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  state.seed = x >>> 0;
  return (state.seed % 10000) / 10000;
}

/**
 * Matches an unused review article to a batch of products that just appeared to the user:
 * 1. Exact product reference (topPickProductId, relatedProductIds, or slug in HTML)
 * 2. Same category / field as one of the products in the batch
 * 3. Random available unused article
 */
function pickReviewArticleForBatch(
  batchProducts: Product[],
  articles: Article[],
  usedArticleIds: Set<string>,
  rngState: { seed: number }
): { article: Article; matchedProduct?: Product } | null {
  const available = articles.filter((a) => !usedArticleIds.has(a.id));
  if (available.length === 0) return null;

  // 1. Direct product matches
  const directCandidates: Array<{ article: Article; matchedProduct: Product }> = [];
  for (const product of batchProducts) {
    const prodId = product.id;
    const prodSlug = product.slug;
    for (const article of available) {
      const relatedIds = Array.isArray(article.relatedProductIds)
        ? article.relatedProductIds
        : [];
      const htmlCombined = `${article.contentHtml?.ar || ''} ${article.contentHtml?.en || ''}`;
      if (
        article.topPickProductId === prodId ||
        article.topPickProductId === prodSlug ||
        relatedIds.includes(prodId) ||
        relatedIds.includes(prodSlug) ||
        (prodSlug && htmlCombined.includes(prodSlug))
      ) {
        directCandidates.push({ article, matchedProduct: product });
      }
    }
  }
  if (directCandidates.length > 0) {
    const idx = Math.floor(nextSeededRandom(rngState) * directCandidates.length);
    return directCandidates[idx];
  }

  // 2. Same category / field matches
  const categoryCandidates: Array<{ article: Article; matchedProduct: Product }> = [];
  for (const product of batchProducts) {
    if (!product.categorySlug && !product.categoryId) continue;
    for (const article of available) {
      if (
        (product.categorySlug && article.categorySlug === product.categorySlug) ||
        (product.categoryId && article.categoryId === product.categoryId)
      ) {
        categoryCandidates.push({ article, matchedProduct: product });
      }
    }
  }
  if (categoryCandidates.length > 0) {
    const idx = Math.floor(nextSeededRandom(rngState) * categoryCandidates.length);
    return categoryCandidates[idx];
  }

  // 3. Fallback to a randomly chosen available article
  const fallbackIdx = Math.floor(nextSeededRandom(rngState) * available.length);
  return {
    article: available[fallbackIdx],
    matchedProduct: batchProducts[0],
  };
}

/**
 * Interleaves review articles inside the product feed at randomly chosen intervals
 * from [6, 8, 10, 12, 15] on every visit/session so the user never feels a fixed pattern.
 */
export function buildInterleavedProductFeed(
  products: Product[],
  articles: Article[],
  randomSeed = 1
): ProductFeedEntry[] {
  if (!Array.isArray(articles) || articles.length === 0) {
    return products.map((product) => ({ type: 'product', product }));
  }

  const intervalPool = [6, 8, 10, 12];
  const rngState = { seed: randomSeed || 1 };
  const checkpoints = new Set<number>();

  let cumulative = 0;
  let lastPickedStep = -1;
  while (cumulative < products.length) {
    const candidates = intervalPool.filter((step) => step !== lastPickedStep);
    const chosenStep =
      candidates[Math.floor(nextSeededRandom(rngState) * candidates.length)] ||
      intervalPool[0];
    lastPickedStep = chosenStep;
    cumulative += chosenStep;
    checkpoints.add(cumulative);
  }

  const entries: ProductFeedEntry[] = [];
  const usedArticleIds = new Set<string>();
  let currentBatch: Product[] = [];

  for (let i = 0; i < products.length; i += 1) {
    const product = products[i];
    entries.push({ type: 'product', product });
    currentBatch.push(product);

    const countSoFar = i + 1;
    const remainingProducts = products.length - countSoFar;

    // Ensure at least 4 trailing products exist after an inline article so CSS `grid-auto-flow: row dense`
    // can always backfill every column (2, 3, 4, or 5 columns) in the row above the article without any empty slot.
    if (checkpoints.has(countSoFar) && remainingProducts >= 4) {
      const picked = pickReviewArticleForBatch(
        currentBatch,
        articles,
        usedArticleIds,
        rngState
      );
      if (picked) {
        usedArticleIds.add(picked.article.id);
        entries.push({
          type: 'article',
          article: picked.article,
          matchedProduct: picked.matchedProduct,
        });
      }
      currentBatch = [];
    }
  }

  return entries;
}
