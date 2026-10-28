import type { MetadataRoute } from 'next';
import type { Locale } from '@/types';

export interface SitemapProduct {
  slug: string;
  status: string;
  updatedAt?: string;
  createdAt?: string;
  images?: Array<{ url?: string }>;
  hasArabicVideo: boolean;
  hasEnglishVideo: boolean;
}

export interface SitemapArticle {
  slug: string;
  status: string;
  updatedAt?: string;
  publishedAt?: string;
  coverImage?: string;
}

export interface SitemapCategory {
  slug: string;
  isActive?: boolean;
}

export interface SitemapTool {
  slug: string;
}

function absoluteImageUrl(rawUrl: string | undefined, baseUrl: string): string | null {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed || trimmed.startsWith('data:')) return null;
  const full =
    trimmed.startsWith('http://') || trimmed.startsWith('https://')
      ? trimmed
      : `${baseUrl}${trimmed.startsWith('/') ? trimmed : `/${trimmed}`}`;
  return full.replace(/&(?!(amp;|lt;|gt;|quot;|apos;))/g, '&amp;');
}

function lastModified(...timestamps: Array<string | undefined>): Date | undefined {
  for (const timestamp of timestamps) {
    if (!timestamp) continue;
    const date = new Date(timestamp);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return undefined;
}

function hasSlug(slug: string): boolean {
  return slug.trim().length > 0;
}

export function buildSeoSitemap(
  siteUrl: string,
  products: SitemapProduct[],
  articles: SitemapArticle[],
  categories: SitemapCategory[],
  tools: SitemapTool[]
): MetadataRoute.Sitemap {
  const baseUrl = siteUrl.replace(/\/+$/, '');
  const locales: Locale[] = ['en', 'ar'];
  const mainPaths = ['', '/products', '/categories', '/guides', '/tools'] as const;

  const mainEntries: MetadataRoute.Sitemap = locales.flatMap((locale) =>
    mainPaths.map((pathSuffix) => {
      const arUrl = `${baseUrl}/ar${pathSuffix}`;
      const enUrl = `${baseUrl}/en${pathSuffix}`;
      const isHome = pathSuffix === '';
      return {
        url: locale === 'ar' ? arUrl : enUrl,
        changeFrequency: pathSuffix === '/tools' ? ('weekly' as const) : ('daily' as const),
        priority: isHome ? 1.0 : 0.9,
        ...(isHome ? { images: [`${baseUrl}/images/hero-desktop.jpg`] } : {}),
        alternates: {
          languages: { ar: arUrl, en: enUrl, 'x-default': enUrl },
        },
      };
    })
  );

  const staticPages = ['about', 'contact', 'privacy-policy', 'terms', 'report', 'security'];
  const staticEntries: MetadataRoute.Sitemap = locales.flatMap((locale) =>
    staticPages.map((page) => {
      const arUrl = `${baseUrl}/ar/${page}`;
      const enUrl = `${baseUrl}/en/${page}`;
      return {
        url: locale === 'ar' ? arUrl : enUrl,
        changeFrequency: 'monthly' as const,
        priority: 0.7,
        alternates: {
          languages: { ar: arUrl, en: enUrl, 'x-default': enUrl },
        },
      };
    })
  );

  const transparencyEntries: MetadataRoute.Sitemap = [
    'how-it-works',
    'affiliate-disclosure',
    'cookies',
  ].map((page) => ({
    url: `${baseUrl}/${page}`,
    changeFrequency: 'monthly' as const,
    priority: 0.65,
  }));

  const publishedProducts = products.filter(
    (product) => product.status === 'published' && hasSlug(product.slug)
  );
  const productEntries: MetadataRoute.Sitemap = locales.flatMap((locale) =>
    publishedProducts.map((product) => {
      const encoded = encodeURIComponent(product.slug);
      const arUrl = `${baseUrl}/ar/products/${encoded}`;
      const enUrl = `${baseUrl}/en/products/${encoded}`;
      const productImages = (product.images || [])
        .map((image) => absoluteImageUrl(image.url, baseUrl))
        .filter((url): url is string => Boolean(url));
      const modifiedAt = lastModified(product.updatedAt, product.createdAt);

      return {
        url: locale === 'ar' ? arUrl : enUrl,
        ...(modifiedAt ? { lastModified: modifiedAt } : {}),
        changeFrequency: 'weekly' as const,
        priority: 0.85,
        ...(productImages.length > 0 ? { images: productImages } : {}),
        alternates: {
          languages: { ar: arUrl, en: enUrl, 'x-default': enUrl },
        },
      };
    })
  );

  const videoEntries: MetadataRoute.Sitemap = locales.flatMap((locale) =>
    publishedProducts
      .filter((product) =>
        locale === 'ar' ? product.hasArabicVideo : product.hasEnglishVideo
      )
      .map((product) => {
        const encoded = encodeURIComponent(product.slug);
        const arUrl = `${baseUrl}/ar/videos/${encoded}`;
        const enUrl = `${baseUrl}/en/videos/${encoded}`;
        const languages = {
          ...(product.hasArabicVideo ? { ar: arUrl } : {}),
          ...(product.hasEnglishVideo ? { en: enUrl, 'x-default': enUrl } : {}),
        };
        const modifiedAt = lastModified(product.updatedAt);
        return {
          url: locale === 'ar' ? arUrl : enUrl,
          ...(modifiedAt ? { lastModified: modifiedAt } : {}),
          changeFrequency: 'weekly' as const,
          priority: 0.75,
          alternates: { languages },
        };
      })
  );

  const publishedArticles = articles.filter(
    (article) => article.status === 'published' && hasSlug(article.slug)
  );
  const articleEntries: MetadataRoute.Sitemap = locales.flatMap((locale) =>
    publishedArticles.map((article) => {
      const encoded = encodeURIComponent(article.slug);
      const arUrl = `${baseUrl}/ar/guides/${encoded}`;
      const enUrl = `${baseUrl}/en/guides/${encoded}`;
      const coverUrl = absoluteImageUrl(article.coverImage, baseUrl);
      const modifiedAt = lastModified(article.updatedAt, article.publishedAt);
      return {
        url: locale === 'ar' ? arUrl : enUrl,
        ...(modifiedAt ? { lastModified: modifiedAt } : {}),
        changeFrequency: 'weekly' as const,
        priority: 0.85,
        ...(coverUrl ? { images: [coverUrl] } : {}),
        alternates: {
          languages: { ar: arUrl, en: enUrl, 'x-default': enUrl },
        },
      };
    })
  );

  const activeCategories = categories.filter(
    (category) => category.isActive !== false && hasSlug(category.slug)
  );
  const categoryEntries: MetadataRoute.Sitemap = locales.flatMap((locale) =>
    activeCategories.map((category) => {
      const encoded = encodeURIComponent(category.slug);
      const arUrl = `${baseUrl}/ar/categories/${encoded}`;
      const enUrl = `${baseUrl}/en/categories/${encoded}`;
      return {
        url: locale === 'ar' ? arUrl : enUrl,
        changeFrequency: 'weekly' as const,
        priority: 0.85,
        alternates: {
          languages: { ar: arUrl, en: enUrl, 'x-default': enUrl },
        },
      };
    })
  );

  const toolEntries: MetadataRoute.Sitemap = locales.flatMap((locale) =>
    tools
      .filter((tool) => hasSlug(tool.slug))
      .map((tool) => {
        const arUrl = `${baseUrl}/ar/tools/${tool.slug}`;
        const enUrl = `${baseUrl}/en/tools/${tool.slug}`;
        return {
          url: locale === 'ar' ? arUrl : enUrl,
          changeFrequency: 'monthly' as const,
          priority: 0.85,
          alternates: {
            languages: { ar: arUrl, en: enUrl, 'x-default': enUrl },
          },
        };
      })
  );

  return [
    ...mainEntries,
    ...staticEntries,
    ...transparencyEntries,
    ...categoryEntries,
    ...productEntries,
    ...videoEntries,
    ...articleEntries,
    ...toolEntries,
  ];
}
