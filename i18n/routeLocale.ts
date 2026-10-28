import type { Locale } from '@/types';

const LEGACY_ARABIC_ROUTES = /^(\/(?:products|categories|guides|blog))(?:\/|$)/;

export function resolvePathLocale(pathname: string | null): Locale | null {
  if (!pathname) return null;
  if (pathname === '/en' || pathname.startsWith('/en/')) return 'en';
  if (pathname === '/ar' || pathname.startsWith('/ar/')) return 'ar';
  if (LEGACY_ARABIC_ROUTES.test(pathname)) return 'ar';
  return null;
}

export function buildLocalizedPathname(
  pathname: string | null,
  nextLocale: Locale
): string | null {
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

  const legacyMatch = pathname.match(/^\/(products|categories|guides|blog)(\/.*)?$/);
  if (legacyMatch) {
    const localizedSection = legacyMatch[1] === 'blog' ? 'guides' : legacyMatch[1];
    return `/${nextLocale}/${localizedSection}${legacyMatch[2] || ''}`;
  }

  return null;
}
