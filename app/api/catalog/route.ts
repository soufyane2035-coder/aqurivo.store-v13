import { NextResponse } from 'next/server';
import { listPublishedProducts } from '@/server/repositories/products.repo';
import { listActiveCategories } from '@/server/repositories/categories.repo';
import { listActiveSources } from '@/server/repositories/sources.repo';
import { listPublishedArticles } from '@/server/repositories/articles.repo';
import { getProductCatalogPage } from '@/server/services/catalog-pagination.service';

export const revalidate = 300;

export async function GET(request: Request) {
  try {
    const [allProducts, categories, sources, articles] = await Promise.all([
      listPublishedProducts(),
      listActiveCategories(),
      listActiveSources(),
      listPublishedArticles(),
    ]);
    const params = new URL(request.url).searchParams;
    const maxPriceParam = params.get('maxPrice');
    const maxPrice = maxPriceParam === null ? null : Number(maxPriceParam);
    if (maxPrice !== null && (!Number.isFinite(maxPrice) || maxPrice < 0)) {
      return NextResponse.json({ error: 'Invalid maxPrice filter.' }, { status: 400 });
    }

    const page = getProductCatalogPage(allProducts, articles, {
      category: params.get('category') || 'all',
      source: params.get('source') || 'all',
      query: params.get('q') || '',
      sort: params.get('sort') || 'newest',
      maxPrice,
      currency: params.get('currency') || 'USD',
      cursor: params.get('cursor'),
    });

    return NextResponse.json(
      {
        products: page.items,
        total: page.total,
        hasMore: page.hasMore,
        nextCursor: page.nextCursor,
        previousCursor: page.previousCursor,
        categoryCounts: page.categoryCounts,
        matchedArticles: page.matchedArticles,
        categories,
        sources,
      },
      {
        headers: {
          'Cache-Control':
            'public, max-age=300, s-maxage=300, stale-while-revalidate=86400',
        },
      }
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes('cursor is no longer valid')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Unable to load catalog data right now.' },
      { status: 500 }
    );
  }
}
