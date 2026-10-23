import type { Direction, Locale, LocalizedText } from '@/types';
import { arMessages } from './ar';
import { enMessages, type MessagesDictionary } from './en';

export const SUPPORTED_LOCALES: Locale[] = ['en', 'ar'];
export const DEFAULT_LOCALE: Locale = 'en';

export const i18nConfig = {
  defaultLocale: 'en' as const,
  locales: ['en', 'ar'] as const,
};

const dictionaries: Record<Locale, MessagesDictionary> = {
  en: enMessages,
  ar: arMessages,
};

export function getDictionary(locale: Locale): MessagesDictionary {
  return dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
}

export function getDirection(locale: Locale): Direction {
  return locale === 'ar' ? 'rtl' : 'ltr';
}

export function pickLocalizedText(text: LocalizedText | undefined, locale: Locale): string {
  if (!text) return '';
  return text[locale]?.trim() || text.en?.trim() || text.ar?.trim() || '';
}

export function interpolateMessage(
  template: string,
  params?: Record<string, string | number>
): string {
  if (!params) return template;
  return Object.entries(params).reduce((acc, [key, value]) => {
    return acc.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
  }, template);
}
