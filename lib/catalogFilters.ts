import type { Product } from '../types';
import { convertCurrencyAmount } from './format';

export interface CatalogProductFilters {
  category: string;
  store: string;
  maxPrice: number | null;
  currency: string;
}

export function filterCatalogProducts(
  products: Product[],
  filters: CatalogProductFilters
): Product[] {
  return products.filter((product) => {
    if (
      filters.category !== 'all' &&
      product.categorySlug !== filters.category &&
      product.categoryId !== filters.category
    ) {
      return false;
    }

    if (
      filters.store !== 'all' &&
      product.sourceSlug !== filters.store &&
      product.sourceId !== filters.store
    ) {
      return false;
    }

    if (
      filters.maxPrice !== null &&
      !Number.isNaN(filters.maxPrice) &&
      filters.maxPrice >= 0
    ) {
      if (product.priceAmount === null || product.priceAmount <= 0) return false;
      const displayedPrice = convertCurrencyAmount(
        product.priceAmount,
        product.priceCurrency,
        filters.currency
      ).convertedAmount;
      if (displayedPrice > filters.maxPrice) return false;
    }

    return true;
  });
}

export function sortCatalogProducts(
  products: Product[],
  sortBy: string,
  currency: string
): Product[] {
  return [...products].sort((a, b) => {
    if (sortBy === 'newest') {
      return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
    }

    if (sortBy === 'price_asc' || sortBy === 'price_desc') {
      const priceA =
        a.priceAmount === null || a.priceAmount <= 0
          ? null
          : convertCurrencyAmount(a.priceAmount, a.priceCurrency, currency)
              .convertedAmount;
      const priceB =
        b.priceAmount === null || b.priceAmount <= 0
          ? null
          : convertCurrencyAmount(b.priceAmount, b.priceCurrency, currency)
              .convertedAmount;
      if (priceA === null) return priceB === null ? 0 : 1;
      if (priceB === null) return -1;
      return sortBy === 'price_asc' ? priceA - priceB : priceB - priceA;
    }

    if (sortBy === 'rating_desc') {
      const ratingA = a.rating ?? a.stars ?? null;
      const ratingB = b.rating ?? b.stars ?? null;
      if (ratingA === null) return ratingB === null ? 0 : 1;
      if (ratingB === null) return -1;
      return ratingB - ratingA;
    }

    if (sortBy === 'sold_desc') {
      const salesA = a.soldCount ?? a.salesCount ?? null;
      const salesB = b.soldCount ?? b.salesCount ?? null;
      if (salesA === null) return salesB === null ? 0 : 1;
      if (salesB === null) return -1;
      return salesB - salesA;
    }

    return 0;
  });
}
