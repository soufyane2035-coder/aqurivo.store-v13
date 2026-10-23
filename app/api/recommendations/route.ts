import { NextRequest, NextResponse } from 'next/server';
import { listPublishedProducts, getProductBySlug } from '@/server/repositories/products.repo';
import {
  getSmartRecommendations,
  getSessionPersonalizedRecommendations,
  RecommendationType,
  RecommendationIntentVector,
} from '@/server/services/recommendation.service';
import { getFrequentlyBoughtTogether } from '@/server/services/bundleGraph.service';

/**
 * GET /api/recommendations
 * Query Params:
 *  - productId: string (or slug)
 *  - slug: string
 *  - category: string
 *  - type: 'hybrid' | 'substitutes' | 'complementary' | 'personalized' | 'bundle'
 *  - limit: number (default 4, max 20)
 *  - bandit: boolean (default true)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId') || searchParams.get('id');
    const slug = searchParams.get('slug');
    const category = searchParams.get('category') || undefined;
    const typeParam = searchParams.get('type') || 'hybrid';
    const limit = Math.min(20, Math.max(1, parseInt(searchParams.get('limit') || '4', 10)));
    const enableBandit = searchParams.get('bandit') !== 'false';

    const allProducts = await listPublishedProducts();

    let targetProduct = null;
    const targetIdentifier = productId || slug;
    if (targetIdentifier) {
      targetProduct =
        allProducts.find((p) => p.id === targetIdentifier || p.slug === targetIdentifier) ||
        (await getProductBySlug(targetIdentifier));
    }

    // Frequently bought together bundle support
    if (typeParam === 'bundle' && targetProduct) {
      const bundles = getFrequentlyBoughtTogether(targetProduct, allProducts, limit);
      return NextResponse.json(
        {
          bundles,
          count: bundles.length,
          strategy: 'market_basket_cooccurrence_zero_compute',
        },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
          },
        }
      );
    }

    const type = (typeParam === 'bundle' ? 'hybrid' : typeParam) as RecommendationType;

    const recommendations = getSmartRecommendations(targetProduct, allProducts, {
      limit,
      type,
      preferredCategorySlug: category,
      enableBanditExploration: enableBandit,
    });

    return NextResponse.json(
      {
        recommendations,
        count: recommendations.length,
        strategy: targetProduct ? `two_tower_${type}_zero_compute` : 'catalog_affinity_zero_compute',
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    );
  } catch {
    return NextResponse.json(
      { error: 'Failed to compute recommendations.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/recommendations
 * Body:
 *  - viewedProductIds: string[]
 *  - currentProductId?: string
 *  - limit?: number
 *  - type?: RecommendationType | 'bundle'
 *  - intentVector?: RecommendationIntentVector
 *  - bandit?: boolean
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const viewedProductIds: string[] = Array.isArray(body.viewedProductIds)
      ? body.viewedProductIds.filter((id: unknown): id is string => typeof id === 'string' && Boolean(id.trim()))
      : [];
    const currentProductId: string | undefined =
      typeof body.currentProductId === 'string' ? body.currentProductId.trim() : undefined;
    const limit = Math.min(20, Math.max(1, typeof body.limit === 'number' ? body.limit : 4));
    const type = body.type || 'hybrid';
    const intentVector: RecommendationIntentVector | undefined = body.intentVector;
    const enableBandit = body.bandit !== false;

    const allProducts = await listPublishedProducts();

    let targetProduct = null;
    if (currentProductId) {
      targetProduct =
        allProducts.find((p) => p.id === currentProductId || p.slug === currentProductId) || null;
    }

    // Bundle request
    if (type === 'bundle' && targetProduct) {
      const bundles = getFrequentlyBoughtTogether(targetProduct, allProducts, limit);
      return NextResponse.json({
        bundles,
        count: bundles.length,
        strategy: 'market_basket_cooccurrence_zero_compute',
      });
    }

    if (viewedProductIds.length > 0 && !currentProductId) {
      const recommendations = getSessionPersonalizedRecommendations(
        viewedProductIds,
        allProducts,
        limit,
        intentVector
      );
      return NextResponse.json({
        recommendations,
        count: recommendations.length,
        strategy: 'session_bandit_intent_zero_compute',
      });
    }

    const recommendations = getSmartRecommendations(targetProduct, allProducts, {
      limit,
      type: type === 'bundle' ? 'hybrid' : (type as RecommendationType),
      excludeIds: viewedProductIds.filter((id) => id !== currentProductId),
      intentVector,
      enableBanditExploration: enableBandit,
    });

    return NextResponse.json({
      recommendations,
      count: recommendations.length,
      strategy: 'two_tower_hybrid_session_zero_compute',
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to process recommendation request.' },
      { status: 500 }
    );
  }
}
