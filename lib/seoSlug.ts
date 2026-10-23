/**
 * Arabic-to-Latin transliteration map for generating readable, SEO-friendly URL slugs.
 */
const ARABIC_TRANSLITERATION_MAP: Record<string, string> = {
  ا: 'a',
  أ: 'a',
  إ: 'i',
  آ: 'aa',
  ٱ: 'a',
  ء: '',
  ب: 'b',
  ت: 't',
  ث: 'th',
  ج: 'j',
  ح: 'h',
  خ: 'kh',
  د: 'd',
  ذ: 'dh',
  ر: 'r',
  ز: 'z',
  س: 's',
  ش: 'sh',
  ص: 's',
  ض: 'd',
  ط: 't',
  ظ: 'z',
  ع: 'a',
  غ: 'gh',
  ف: 'f',
  ق: 'q',
  ك: 'k',
  ل: 'l',
  م: 'm',
  ن: 'n',
  ه: 'h',
  ة: 'a',
  و: 'w',
  ؤ: 'w',
  ي: 'y',
  ى: 'a',
  ئ: 'y',
  '٠': '0',
  '١': '1',
  '٢': '2',
  '٣': '3',
  '٤': '4',
  '٥': '5',
  '٦': '6',
  '٧': '7',
  '٨': '8',
  '٩': '9',
};

/**
 * Transliterates Arabic characters into Latin characters and normalizes the string into a clean slug segment.
 */
export function transliterateToLatinSlug(input: string): string {
  if (!input) return '';
  const stripped = input.replace(/[\u064B-\u065F\u0670\u0640]/g, '');
  let out = '';
  for (const ch of stripped) {
    if (ARABIC_TRANSLITERATION_MAP[ch] !== undefined) {
      out += ARABIC_TRANSLITERATION_MAP[ch];
    } else {
      out += ch;
    }
  }
  return out
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Generates an SEO-friendly product slug combining the transliterated product title and source store:
 * Example: generateSlug("Samsung Galaxy S24", "amazon") -> "samsung-galaxy-s24-amazon"
 * Example: generateSlug("سماعات بلوتوث لاسلكية", "noon") -> "smaaat-blwtwth-laslkya-noon"
 */
export function generateSlug(title: string, source?: string): string {
  const baseSlug = transliterateToLatinSlug(title).slice(0, 90).replace(/-$/g, '');
  const sourceSlug = source ? transliterateToLatinSlug(source).slice(0, 24) : '';

  const fallbackBase = baseSlug || `item-${Date.now().toString(36)}`;
  if (!sourceSlug || fallbackBase.endsWith(`-${sourceSlug}`) || fallbackBase === sourceSlug) {
    return fallbackBase;
  }
  return `${fallbackBase}-${sourceSlug}`;
}
