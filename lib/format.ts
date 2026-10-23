import type { Locale } from '@/types';

const INTL_LOCALE_MAP: Record<Locale, string> = {
  en: 'en-US',
  ar: 'ar-MA-u-nu-latn',
};

/**
 * Exchange rates relative to 1 USD.
 * Used to convert product prices dynamically into the visitor's local currency,
 * or keep them in USD if the visitor's country is not recognized.
 */
export const USD_EXCHANGE_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  CAD: 1.38,
  AUD: 1.52,
  MAD: 10.0,
  DH: 10.0,
  SAR: 3.75,
  AED: 3.67,
  KWD: 0.31,
  QAR: 3.64,
  BHD: 0.38,
  OMR: 0.38,
  JOD: 0.71,
  EGP: 49.5,
  DZD: 134.0,
  TND: 3.1,
  TRY: 34.2,
};

export const COUNTRY_TO_CURRENCY: Record<string, string> = {
  US: 'USD',
  MA: 'MAD',
  SA: 'SAR',
  AE: 'AED',
  KW: 'KWD',
  QA: 'QAR',
  BH: 'BHD',
  OM: 'OMR',
  JO: 'JOD',
  EG: 'EGP',
  DZ: 'DZD',
  TN: 'TND',
  TR: 'TRY',
  GB: 'GBP',
  UK: 'GBP',
  CA: 'CAD',
  AU: 'AUD',
  FR: 'EUR',
  DE: 'EUR',
  ES: 'EUR',
  IT: 'EUR',
  NL: 'EUR',
  BE: 'EUR',
  AT: 'EUR',
  PT: 'EUR',
  IE: 'EUR',
};

const TIMEZONE_TO_COUNTRY: Record<string, string> = {
  'Africa/Casablanca': 'MA',
  'Africa/El_Aaiun': 'MA',
  'Asia/Riyadh': 'SA',
  'Asia/Dubai': 'AE',
  'Asia/Kuwait': 'KW',
  'Asia/Qatar': 'QA',
  'Asia/Bahrain': 'BH',
  'Asia/Muscat': 'OM',
  'Asia/Amman': 'JO',
  'Africa/Cairo': 'EG',
  'Africa/Algiers': 'DZ',
  'Africa/Tunis': 'TN',
  'Europe/Istanbul': 'TR',
  'Europe/London': 'GB',
  'Europe/Paris': 'FR',
  'Europe/Berlin': 'DE',
  'Europe/Madrid': 'ES',
  'Europe/Rome': 'IT',
  'Europe/Amsterdam': 'NL',
  'Europe/Brussels': 'BE',
  'America/New_York': 'US',
  'America/Chicago': 'US',
  'America/Denver': 'US',
  'America/Los_Angeles': 'US',
  'America/Toronto': 'CA',
  'America/Vancouver': 'CA',
  'Australia/Sydney': 'AU',
  'Australia/Melbourne': 'AU',
};

let activeVisitorCurrency = 'USD';

export function setActiveVisitorCurrency(currencyCode: string): void {
  const clean = (currencyCode || 'USD').toUpperCase().trim();
  activeVisitorCurrency = USD_EXCHANGE_RATES[clean] ? clean : 'USD';
}

export function getActiveVisitorCurrency(): string {
  return activeVisitorCurrency;
}

/**
 * Detects visitor country from cookie, timezone, or browser locale on the client.
 * Returns the mapped currency code, or 'USD' if the country cannot be determined.
 */
export function detectVisitorCurrencyClient(): string {
  if (typeof window === 'undefined') return 'USD';

  try {
    // 1. Check cookie set by edge middleware (if available)
    const cookieMatch = document.cookie.match(/(?:^|;\s*)aqurivo_country=([A-Z]{2})/i);
    if (cookieMatch && cookieMatch[1]) {
      const code = cookieMatch[1].toUpperCase();
      if (COUNTRY_TO_CURRENCY[code]) {
        return COUNTRY_TO_CURRENCY[code];
      }
    }

    // 2. Check IANA Timezone (most accurate client-side geographic signal)
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && TIMEZONE_TO_COUNTRY[tz]) {
      const country = TIMEZONE_TO_COUNTRY[tz];
      if (COUNTRY_TO_CURRENCY[country]) {
        return COUNTRY_TO_CURRENCY[country];
      }
    }

    // 3. Check navigator.language region subtag (e.g. ar-MA, ar-SA, en-GB)
    const navLangs = navigator.languages?.length
      ? navigator.languages
      : [navigator.language];
    for (const lang of navLangs) {
      if (!lang) continue;
      const parts = lang.split(/[-_]/);
      if (parts.length >= 2) {
        const region = parts[1].toUpperCase();
        // Only use region if it's not generic 'US' on an Arabic browser unless timezone is America
        if (region === 'US' && parts[0].toLowerCase() === 'ar' && (!tz || !tz.startsWith('America/'))) {
          continue;
        }
        if (COUNTRY_TO_CURRENCY[region]) {
          return COUNTRY_TO_CURRENCY[region];
        }
      }
    }
  } catch {
    // Fallback to USD
  }

  return 'USD';
}

/**
 * Converts an amount from its stored product currency into the target visitor currency.
 */
export function convertCurrencyAmount(
  amount: number,
  fromCurrencyCode: string,
  toCurrencyCode: string
): { convertedAmount: number; currency: string } {
  const fromClean = (fromCurrencyCode || 'USD').toUpperCase().trim();
  const toClean = (toCurrencyCode || 'USD').toUpperCase().trim();

  const fromRate = USD_EXCHANGE_RATES[fromClean] || 1;
  const toRate = USD_EXCHANGE_RATES[toClean] || 1;
  const finalCurrency = USD_EXCHANGE_RATES[toClean] ? toClean : 'USD';

  if (fromClean === finalCurrency || (fromClean === 'DH' && finalCurrency === 'MAD')) {
    return { convertedAmount: amount, currency: finalCurrency };
  }

  const amountInUsd = amount / fromRate;
  const rawConverted = amountInUsd * toRate;

  // Smart rounding: whole numbers for currencies like MAD, SAR, AED, EGP, DZD; 2 decimals for USD, EUR, GBP, KWD
  const highUnitCurrencies = new Set(['MAD', 'DH', 'SAR', 'AED', 'QAR', 'EGP', 'DZD', 'TRY']);
  const convertedAmount = highUnitCurrencies.has(finalCurrency)
    ? Math.round(rawConverted)
    : Math.round(rawConverted * 100) / 100;

  return { convertedAmount, currency: finalCurrency };
}

/**
 * Formats currency using the visitor's detected country currency (or USD fallback) via standard Intl.NumberFormat.
 */
export function formatProductPrice(
  amount: number | null | undefined,
  currencyCode: string,
  locale: Locale,
  targetCurrencyOverride?: string
): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) {
    return '';
  }

  const targetCurrency = targetCurrencyOverride || activeVisitorCurrency || 'USD';
  const { convertedAmount, currency: normalizedCurrency } = convertCurrencyAmount(
    amount,
    currencyCode || 'USD',
    targetCurrency
  );

  const intlLocale = INTL_LOCALE_MAP[locale] || 'en-US';

  if (normalizedCurrency === 'DH' || normalizedCurrency === 'MAD') {
    const formattedNum = new Intl.NumberFormat(intlLocale, {
      maximumFractionDigits: 0,
    }).format(convertedAmount);
    return locale === 'ar' ? `${formattedNum} د.م.` : `${formattedNum} MAD`;
  }

  try {
    return new Intl.NumberFormat(intlLocale, {
      style: 'currency',
      currency: normalizedCurrency,
      currencyDisplay: 'narrowSymbol',
      maximumFractionDigits: convertedAmount % 1 === 0 ? 0 : 2,
    }).format(convertedAmount);
  } catch {
    const formattedNum = new Intl.NumberFormat(intlLocale, {
      maximumFractionDigits: 2,
    }).format(convertedAmount);
    return `${formattedNum} ${normalizedCurrency}`;
  }
}

/**
 * Formats numbers using standard Intl.NumberFormat.
 */
export function formatNumber(value: number, locale: Locale): string {
  const intlLocale = INTL_LOCALE_MAP[locale] || 'en-US';
  return new Intl.NumberFormat(intlLocale).format(value);
}

/**
 * Formats ISO dates using standard Intl.DateTimeFormat so visitors see clear price check dates.
 */
export function formatCalendarDate(isoDate: string | undefined, locale: Locale): string {
  if (!isoDate) return '';
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return '';

  const intlLocale = INTL_LOCALE_MAP[locale] || 'en-US';
  return new Intl.DateTimeFormat(intlLocale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(parsed);
}
