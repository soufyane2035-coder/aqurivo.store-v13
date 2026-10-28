import type { MetadataRoute } from 'next';
import { listPublishedProducts } from '@/server/repositories/products.repo';
import { listPublishedArticles } from '@/server/repositories/articles.repo';
import { listActiveCategories } from '@/server/repositories/categories.repo';
import { TOOLS_DATA } from '@/lib/tools-data';
import { getProductVideoSources } from '@/lib/product-video';
import { buildSeoSitemap } from '@/lib/seo-sitemap';

export const revalidate = 3600; // 1 hour ISR cache for search engine crawlers

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://aqurivo.store';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, articles, categories] = await Promise.all([
    listPublishedProducts(),
    listPublishedArticles(),
    listActiveCategories(),
  ]);

  const sitemapProducts = products.map((product) => ({
    slug: product.slug,
    status: product.status,
    updatedAt: product.updatedAt,
    createdAt: product.createdAt,
    images: product.images,
    hasArabicVideo: getProductVideoSources(product, 'ar', BASE_URL).length > 0,
    hasEnglishVideo: getProductVideoSources(product, 'en', BASE_URL).length > 0,
  }));

  return buildSeoSitemap(
    BASE_URL,
    sitemapProducts,
    articles,
    categories,
    TOOLS_DATA
  );
}
