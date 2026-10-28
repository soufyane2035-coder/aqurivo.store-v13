import type { Article, Product } from '@/types';
import { convertCurrencyAmount } from '@/lib/format';
import { normalizeSearchText } from '@/lib/productSearch';
import { paginateByCursor, sortByCursor, type CursorPage } from '@/lib/listPagination';

const PRODUCT_PAGE_SIZE = 24;
const ARTICLE_PAGE_SIZE = 18;

export interface ProductCatalogPage extends CursorPage<Product> {
  categoryCounts: Record<string, number>;
  matchedArticles: Article[];
}

function productMatchesQuery(product: Product, query: string): boolean {
  if (!query) return true;
  const haystack = normalizeSearchText([
    product.title?.ar,
    product.title?.en,
    product.slug,
    product.shortSummary?.ar,
    product.shortSummary?.en,
    ...(product.tags || []),
  ].join(' '));
  return query.split(' ').every((word) => haystack.includes(word));
}

function articleMatchesQuery(article: Article, query: string): boolean {
  if (!query) return false;
  const haystack = normalizeSearchText([
    article.title?.ar,
    article.title?.en,
    article.excerpt?.ar,
    article.excerpt?.en,
  ].join(' '));
  return query.split(' ').every((word) => haystack.includes(word));
}

export function getProductCatalogPage(
  allProducts: Product[],
  allArticles: Article[],
  options: {
    category?: string;
    source?: string;
    query?: string;
    sort?: string;
    maxPrice?: number | null;
    currency?: string;
    cursor?: string | null;
  } = {}
): ProductCatalogPage {
  const normalizedQuery = normalizeSearchText(options.query);
  const filtered = allProducts.filter((product) => {
    if (
      options.category &&
      options.category !== 'all' &&
      product.categorySlug !== options.category &&
      product.categoryId !== options.category
    ) return false;
    if (
      options.source &&
      options.source !== 'all' &&
      product.sourceSlug !== options.source &&
      product.sourceId !== options.source
    ) return false;
    if (!productMatchesQuery(product, normalizedQuery)) return false;
    if (options.maxPrice !== null && options.maxPrice !== undefined && options.maxPrice >= 0) {
      if (product.priceAmount === null || product.priceAmount <= 0) return false;
      const converted = convertCurrencyAmount(
        product.priceAmount,
        product.priceCurrency,
        options.currency || 'USD'
      ).convertedAmount;
      if (converted > options.maxPrice) return false;
    }
    return true;
  });

  const sorted = sortByCursor(filtered, (a, b) => {
    const sort = options.sort || 'newest';
    if (sort === 'price_asc' || sort === 'price_desc') {
      const priceA = a.priceAmount === null || a.priceAmount <= 0
        ? null
        : convertCurrencyAmount(a.priceAmount, a.priceCurrency, options.currency || 'USD').convertedAmount;
      const priceB = b.priceAmount === null || b.priceAmount <= 0
        ? null
        : convertCurrencyAmount(b.priceAmount, b.priceCurrency, options.currency || 'USD').convertedAmount;
      if (priceA === null) return priceB === null ? 0 : 1;
      if (priceB === null) return -1;
      return sort === 'price_asc' ? priceA - priceB : priceB - priceA;
    }
    if (sort === 'rating_desc') {
      return (b.rating ?? b.stars ?? -1) - (a.rating ?? a.stars ?? -1);
    }
    if (sort === 'sold_desc') {
      return (b.soldCount ?? b.salesCount ?? -1) - (a.soldCount ?? a.salesCount ?? -1);
    }
    return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
  });

  const page = paginateByCursor(sorted, options.cursor || null, PRODUCT_PAGE_SIZE);
  const categoryCounts: Record<string, number> = {};
  for (const product of allProducts) {
    const category = product.categorySlug || product.categoryId;
    if (category) categoryCounts[category] = (categoryCounts[category] || 0) + 1;
  }
  const matchedArticles = normalizedQuery
    ? allArticles.filter((article) => articleMatchesQuery(article, normalizedQuery)).slice(0, 3)
    : [];

  return { ...page, categoryCounts, matchedArticles };
}

export function getArticleCatalogPage(
  articles: Article[],
  options: { category?: string; query?: string; cursor?: string | null } = {}
): CursorPage<Article> & { categoryCounts: Record<string, number> } {
  const normalizedQuery = normalizeSearchText(options.query);
  const filtered = articles.filter((article) => {
    if (
      options.category &&
      options.category !== 'all' &&
      article.categorySlug !== options.category &&
      article.categoryId !== options.category
    ) return false;
    return !normalizedQuery || articleMatchesQuery(article, normalizedQuery);
  });
  const sorted = sortByCursor(filtered, (a, b) =>
    String(b.publishedAt || '').localeCompare(String(a.publishedAt || ''))
  );
  const categoryCounts: Record<string, number> = {};
  for (const article of articles) {
    const category = article.categorySlug || article.categoryId;
    if (category) categoryCounts[category] = (categoryCounts[category] || 0) + 1;
  }
  return {
    ...paginateByCursor(sorted, options.cursor || null, ARTICLE_PAGE_SIZE),
    categoryCounts,
  };
}
