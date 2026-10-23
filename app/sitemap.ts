import type { MetadataRoute } from 'next';
import { listPublishedProducts } from '@/server/repositories/products.repo';
import { listPublishedArticles } from '@/server/repositories/articles.repo';
import { listActiveCategories } from '@/server/repositories/categories.repo';
import { TOOLS_DATA } from '@/lib/tools-data';

export const revalidate = 3600; // 1 hour ISR cache for search engine crawlers

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://aqurivo.store';
const LOCALES = ['en', 'ar'] as const;

function toAbsoluteImageUrl(rawUrl: string | undefined): string | null {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed || trimmed.startsWith('data:')) return null;
  const full =
    trimmed.startsWith('http://') || trimmed.startsWith('https://')
      ? trimmed
      : `${BASE_URL}${trimmed.startsWith('/') ? trimmed : `/${trimmed}`}`;
  // XML sitemaps require ampersands in URLs to be escaped or avoided
  return full.replace(/&(?!(amp;|lt;|gt;|quot;|apos;))/g, '&amp;');
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, articles, categories] = await Promise.all([
    listPublishedProducts(),
    listPublishedArticles(),
    listActiveCategories(),
  ]);

  const heroImageUrl = `${BASE_URL}/images/hero-desktop.jpg`;
  const mainPaths = ['', '/products', '/categories', '/guides', '/tools'] as const;

  const mainEntries: MetadataRoute.Sitemap = LOCALES.flatMap((locale) =>
    mainPaths.map((pathSuffix) => {
      const arUrl = `${BASE_URL}/ar${pathSuffix}`;
      const enUrl = `${BASE_URL}/en${pathSuffix}`;
      const isHome = pathSuffix === '';
      return {
        url: locale === 'ar' ? arUrl : enUrl,
        changeFrequency: pathSuffix === '/tools' ? ('weekly' as const) : ('daily' as const),
        priority: isHome ? 1.0 : 0.9,
        ...(isHome ? { images: [heroImageUrl] } : {}),
        alternates: {
          languages: {
            ar: arUrl,
            en: enUrl,
            'x-default': enUrl,
          },
        },
      };
    })
  );

  const staticPages = ['about', 'contact', 'privacy-policy', 'terms', 'report', 'security'] as const;
  const localizedStaticEntries: MetadataRoute.Sitemap = LOCALES.flatMap(
    (locale) =>
      staticPages.map((page) => {
        const arUrl = `${BASE_URL}/ar/${page}`;
        const enUrl = `${BASE_URL}/en/${page}`;
        return {
          url: locale === 'ar' ? arUrl : enUrl,
          changeFrequency: 'monthly' as const,
          priority: 0.7,
          alternates: {
            languages: {
              ar: arUrl,
              en: enUrl,
              'x-default': enUrl,
            },
          },
        };
      })
  );

  const rootTransparencyPages = [
    'how-it-works',
    'affiliate-disclosure',
    'cookies',
  ] as const;
  const transparencyEntries: MetadataRoute.Sitemap = rootTransparencyPages.map(
    (page) => ({
      url: `${BASE_URL}/${page}`,
      changeFrequency: 'monthly' as const,
      priority: 0.65,
    })
  );

  const productEntries: MetadataRoute.Sitemap = LOCALES.flatMap((locale) =>
    products.map((product) => {
      const encoded = encodeURIComponent(product.slug);
      const modifiedAt = product.updatedAt || product.createdAt;
      const arUrl = `${BASE_URL}/ar/products/${encoded}`;
      const enUrl = `${BASE_URL}/en/products/${encoded}`;
      const productImages = Array.isArray(product.images)
        ? product.images
            .map((img) => toAbsoluteImageUrl(img?.url))
            .filter((u): u is string => Boolean(u))
        : [];

      return {
        url: locale === 'ar' ? arUrl : enUrl,
        ...(modifiedAt ? { lastModified: new Date(modifiedAt) } : {}),
        changeFrequency: 'weekly' as const,
        priority: 0.85,
        ...(productImages.length > 0 ? { images: productImages } : {}),
        alternates: {
          languages: {
            ar: arUrl,
            en: enUrl,
            'x-default': enUrl,
          },
        },
      };
    })
  );

  const articleEntries: MetadataRoute.Sitemap = LOCALES.flatMap((locale) =>
    articles.map((article) => {
      const encoded = encodeURIComponent(article.slug);
      const modifiedAt = article.updatedAt || article.publishedAt;
      const arUrl = `${BASE_URL}/ar/guides/${encoded}`;
      const enUrl = `${BASE_URL}/en/guides/${encoded}`;
      const coverUrl = toAbsoluteImageUrl(article.coverImage);

      return {
        url: locale === 'ar' ? arUrl : enUrl,
        ...(modifiedAt ? { lastModified: new Date(modifiedAt) } : {}),
        changeFrequency: 'weekly' as const,
        priority: 0.85,
        ...(coverUrl ? { images: [coverUrl] } : {}),
        alternates: {
          languages: {
            ar: arUrl,
            en: enUrl,
            'x-default': enUrl,
          },
        },
      };
    })
  );

  const categoryEntries: MetadataRoute.Sitemap = LOCALES.flatMap((locale) =>
    categories.map((cat) => {
      const encoded = encodeURIComponent(cat.slug);
      const arUrl = `${BASE_URL}/ar/categories/${encoded}`;
      const enUrl = `${BASE_URL}/en/categories/${encoded}`;
      return {
        url: locale === 'ar' ? arUrl : enUrl,
        changeFrequency: 'weekly' as const,
        priority: 0.85,
        alternates: {
          languages: {
            ar: arUrl,
            en: enUrl,
            'x-default': enUrl,
          },
        },
      };
    })
  );

  const toolEntries: MetadataRoute.Sitemap = LOCALES.flatMap((locale) =>
    TOOLS_DATA.map((tool) => {
      const arUrl = `${BASE_URL}/ar/tools/${tool.slug}`;
      const enUrl = `${BASE_URL}/en/tools/${tool.slug}`;
      return {
        url: locale === 'ar' ? arUrl : enUrl,
        changeFrequency: 'monthly' as const,
        priority: 0.85,
        alternates: {
          languages: {
            ar: arUrl,
            en: enUrl,
            'x-default': enUrl,
          },
        },
      };
    })
  );

  return [
    ...mainEntries,
    ...localizedStaticEntries,
    ...transparencyEntries,
    ...categoryEntries,
    ...productEntries,
    ...articleEntries,
    ...toolEntries,
  ];
}
