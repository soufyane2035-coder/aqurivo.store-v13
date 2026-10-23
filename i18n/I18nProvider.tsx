'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { Direction, Locale, LocalizedText } from '@/types';
import {
  DEFAULT_LOCALE,
  getDictionary,
  getDirection,
  interpolateMessage,
  pickLocalizedText,
} from './index';
import type { MessagesDictionary } from './en';
import {
  detectVisitorCurrencyClient,
  setActiveVisitorCurrency,
} from '@/lib/format';

interface I18nContextValue {
  locale: Locale;
  dir: Direction;
  messages: MessagesDictionary;
  currency: string;
  setLocale: (nextLocale: Locale) => void;
  t: (text: LocalizedText | undefined) => string;
  formatTemplate: (template: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

const LOCALE_STORAGE_KEY = 'soufshop_locale';
const LOCALE_SCROLL_KEY = 'soufshop_locale_scroll_y';

function resolvePathLocale(pathname: string | null): Locale | null {
  if (!pathname) return null;
  if (pathname === '/en' || pathname.startsWith('/en/')) return 'en';
  if (pathname === '/ar' || pathname.startsWith('/ar/')) return 'ar';
  return null;
}

const ARAB_COUNTRIES_CLIENT = new Set([
  'MA', 'DZ', 'TN', 'LY', 'EG', 'SD', 'MR', 'SO', 'DJ', 'KM',
  'SA', 'AE', 'QA', 'BH', 'KW', 'OM', 'YE', 'IQ', 'SY', 'LB', 'JO', 'PS',
]);

function readCookieValue(name: string): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[1]) : '';
}

function detectClientFallbackLocale(): Locale {
  const cookieLocale = readCookieValue(LOCALE_STORAGE_KEY);
  if (cookieLocale === 'ar' || cookieLocale === 'en') {
    return cookieLocale;
  }

  if (typeof navigator !== 'undefined') {
    const navLang = (navigator.language || '').toLowerCase();
    if (navLang.startsWith('ar')) {
      return 'ar';
    }
  }

  const countryCookie = readCookieValue('aqurivo_country').toUpperCase();
  if (countryCookie && ARAB_COUNTRIES_CLIENT.has(countryCookie)) {
    return 'ar';
  }

  return 'en';
}

function buildLocalizedPathname(pathname: string | null, nextLocale: Locale): string | null {
  if (!pathname) return null;
  if (pathname === '/' || pathname === '/en' || pathname === '/ar') {
    return `/${nextLocale}`;
  }
  if (pathname.startsWith('/en/')) {
    return `/${nextLocale}${pathname.slice(3)}`;
  }
  if (pathname.startsWith('/ar/')) {
    return `/${nextLocale}${pathname.slice(3)}`;
  }
  return null;
}

export function I18nProvider({
  initialLocale = DEFAULT_LOCALE,
  children,
}: {
  initialLocale?: Locale;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const pathLocale = resolvePathLocale(pathname);
  const [userLocale, setUserLocale] = useState<Locale>(initialLocale);
  const [optimisticLocale, setOptimisticLocale] = useState<Locale | null>(null);
  const [currency, setCurrency] = useState<string>('USD');
  const pendingScrollYRef = useRef<number | null>(null);
  const locale: Locale = optimisticLocale || pathLocale || userLocale;

  useEffect(() => {
    if (pathLocale && optimisticLocale === pathLocale) {
      setOptimisticLocale(null);
    }
  }, [pathLocale, optimisticLocale]);

  useEffect(() => {
    const oppositeLocale: Locale = locale === 'ar' ? 'en' : 'ar';
    const nextPath = buildLocalizedPathname(pathname, oppositeLocale);
    if (nextPath) {
      try {
        router.prefetch(nextPath);
      } catch {}
    }
  }, [locale, pathname, router]);

  useEffect(() => {
    const detected = detectVisitorCurrencyClient();
    setActiveVisitorCurrency(detected || 'USD');

    queueMicrotask(() => {
      if (!pathLocale) {
        try {
          const saved = window.localStorage.getItem(LOCALE_STORAGE_KEY);
          if (saved === 'en' || saved === 'ar') {
            setUserLocale(saved);
          } else {
            setUserLocale(detectClientFallbackLocale());
          }
        } catch {
          setUserLocale(detectClientFallbackLocale());
        }
      }

      if (detected && detected !== 'USD') {
        setCurrency(detected);
      }
    });
  }, [pathLocale]);

  useEffect(() => {
    const dir = getDirection(locale);
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;

    let savedY = pendingScrollYRef.current;
    if (savedY === null && typeof window !== 'undefined') {
      try {
        const raw = window.sessionStorage.getItem(LOCALE_SCROLL_KEY);
        if (raw !== null) {
          const parsed = Number(raw);
          if (Number.isFinite(parsed)) {
            savedY = parsed;
          }
        }
      } catch {}
    }

    if (savedY !== null && typeof window !== 'undefined') {
      const targetY = savedY;
      pendingScrollYRef.current = null;
      try {
        window.sessionStorage.removeItem(LOCALE_SCROLL_KEY);
      } catch {}

      const restoreScroll = () => {
        window.scrollTo({ top: targetY, behavior: 'instant' as ScrollBehavior });
      };

      restoreScroll();
      const raf1 = window.requestAnimationFrame(() => {
        restoreScroll();
        window.requestAnimationFrame(restoreScroll);
      });
      return () => window.cancelAnimationFrame(raf1);
    }
  }, [locale, pathname]);

  const setLocale = useCallback(
    (nextLocale: Locale) => {
      if (typeof window !== 'undefined') {
        const currentScrollY = window.scrollY;
        pendingScrollYRef.current = currentScrollY;
        try {
          window.sessionStorage.setItem(LOCALE_SCROLL_KEY, String(currentScrollY));
        } catch {}
      }

      // 1. Update UI language & RTL/LTR direction immediately (0ms)
      setOptimisticLocale(nextLocale);
      setUserLocale(nextLocale);
      if (typeof document !== 'undefined') {
        document.documentElement.lang = nextLocale;
        document.documentElement.dir = getDirection(nextLocale);
      }

      try {
        window.localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);
        document.cookie = `${LOCALE_STORAGE_KEY}=${nextLocale}; path=/; max-age=31536000; SameSite=Lax`;
      } catch {
        // Ignore cookie/storage write failures
      }

      const nextPath = buildLocalizedPathname(pathname, nextLocale);
      if (nextPath && nextPath !== pathname) {
        const search = typeof window !== 'undefined' ? window.location.search : '';
        const hash = typeof window !== 'undefined' ? window.location.hash : '';
        const targetUrl = `${nextPath}${search}${hash}`;
        if (typeof window !== 'undefined') {
          try {
            window.history.replaceState(window.history.state, '', targetUrl);
          } catch {}
        }
        React.startTransition(() => {
          router.replace(targetUrl, { scroll: false });
        });
      }
    },
    [pathname, router]
  );

  const t = useCallback(
    (text: LocalizedText | undefined) => pickLocalizedText(text, locale),
    [locale]
  );

  const dir = getDirection(locale);
  const messages = getDictionary(locale);

  return (
    <I18nContext.Provider
      value={{
        locale,
        dir,
        messages,
        currency,
        setLocale,
        t,
        formatTemplate: interpolateMessage,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
