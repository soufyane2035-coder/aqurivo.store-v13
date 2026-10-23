import type { Product, Article } from '@/types';
import {
  normalizeSearchText,
  computeProductDataQualityScore,
  getVerifiedProductRating,
  deduplicateProducts,
} from '@/lib/productSearch';
import {
  computeProductFingerprint,
  computeHammingDistance,
  hammingToSimilarityScore,
} from '@/lib/compactFingerprint';
import { rankWithBanditExploration } from '@/lib/banditEngine';
import {
  detectProductArchetype,
  detectGuideArchetype,
  areArchetypesSubstitutes,
  areArchetypesComplements,
} from '@/lib/productArchetype';

export type RecommendationType = 'hybrid' | 'substitutes' | 'complementary' | 'personalized';

export interface RecommendationIntentVector {
  categoryAffinities?: Record<string, number>;
  preferredPriceTarget?: number;
  priceMin?: number;
  priceMax?: number;
  totalActiveSeconds?: number;
  topEngagedSlugs?: string[];
}

export interface RecommendationOptions {
  limit?: number;
  type?: RecommendationType;
  excludeIds?: string[];
  sessionViewedIds?: string[];
  preferredCategorySlug?: string;
  intentVector?: RecommendationIntentVector;
  enableBanditExploration?: boolean;
}

export interface ScoredProductRecommendation {
  product: Product;
  score: number;
  matchType: 'substitute' | 'complementary' | 'affinity' | 'trending';
  reason: {
    ar: string;
    en: string;
  };
}

/**
 * Complementary Category Matrix (Cross-Category Ecosystem graph).
 * Maps categories to their logical companion categories for smart cross-selling
 * (e.g. Computers/Laptops -> Keyboards, Mice, Monitors, Cables, Docks).
 */
export const COMPLEMENTARY_CATEGORY_MATRIX: Record<string, string[]> = {
  // Computers, Laptops & Mini PCs
  'computers': ['accessories', 'monitors', 'keyboards-mice', 'audio', 'cables', 'storage', 'office'],
  'mini-pc': ['monitors', 'keyboards-mice', 'accessories', 'audio', 'cables', 'storage'],
  'laptops': ['accessories', 'monitors', 'keyboards-mice', 'audio', 'bags', 'chargers'],
  'gaming': ['keyboards-mice', 'audio', 'monitors', 'accessories', 'chairs'],

  // Electronics & Gadgets
  'electronics': ['accessories', 'cables', 'chargers', 'audio', 'tools'],
  'audio': ['accessories', 'cables', 'electronics', 'smart-home'],
  'headphones': ['accessories', 'cables', 'audio', 'stands'],

  // Smart Home & Wearables
  'smart-home': ['electronics', 'lighting', 'accessories', 'security'],
  'wearables': ['fitness', 'accessories', 'chargers', 'health'],
  'smartwatches': ['accessories', 'fitness', 'chargers', 'health'],

  // Office & Productivity
  'office': ['desk-setup', 'ergonomics', 'accessories', 'electronics'],
  'desk-setup': ['office', 'monitors', 'keyboards-mice', 'lighting', 'accessories'],

  // Tools & Utilities
  'tools': ['electronics', 'accessories', 'hardware'],
};

/** Alias for backward compatibility */
export const COMPLEMENTARY_CATEGORY_GRAPH = COMPLEMENTARY_CATEGORY_MATRIX;

/**
 * Common high-frequency stopwords across Arabic and English to ignore during tokenization.
 */
const STOPWORDS = new Set([
  'and', 'the', 'for', 'with', 'from', 'this', 'that', 'your', 'best', 'pro', 'new', 'top',
  'من', 'في', 'على', 'إلى', 'مع', 'عن', 'هذا', 'هذه', 'أفضل', 'جديد', 'ممتاز', 'جودة', 'عالي'
]);

/**
 * Extracts normalized, weighted semantic tokens from a product's bilingual title,
 * summary, specs, tags, and category names.
 */
function extractProductFeatureTokens(product: Product): Map<string, number> {
  const tokenWeights = new Map<string, number>();

  const addTextTokens = (text: string | undefined | null, weight: number) => {
    if (!text || typeof text !== 'string') return;
    const normalized = normalizeSearchText(text);
    if (!normalized) return;

    const words = normalized.split(/\s+/);
    for (const word of words) {
      if (word.length >= 3 && !STOPWORDS.has(word)) {
        const current = tokenWeights.get(word) || 0;
        tokenWeights.set(word, Math.max(current, weight));
      }
    }
  };

  // 1. Titles carry highest specificity (Weight: 4.0)
  if (typeof product.title === 'string') {
    addTextTokens(product.title, 4.0);
  } else if (product.title) {
    addTextTokens(product.title.ar, 4.0);
    addTextTokens(product.title.en, 4.0);
  }

  // 2. DNA Key Specifications (Weight: 3.5)
  if (product.comparisonDna?.keySpecs) {
    product.comparisonDna.keySpecs.ar?.forEach((s) => addTextTokens(s, 3.5));
    product.comparisonDna.keySpecs.en?.forEach((s) => addTextTokens(s, 3.5));
  }

  // 3. Category & Subcategory (Weight: 3.0)
  if (product.categorySlug) addTextTokens(product.categorySlug.replace(/-/g, ' '), 3.0);
  if (typeof product.categoryName === 'string') {
    addTextTokens(product.categoryName, 3.0);
  } else if (product.categoryName) {
    addTextTokens(product.categoryName.ar, 3.0);
    addTextTokens(product.categoryName.en, 3.0);
  }

  // 4. Tags & Keywords (Weight: 2.5)
  if (Array.isArray(product.tags)) {
    product.tags.forEach((t) => addTextTokens(t, 2.5));
  }

  // 5. Why Picked / Editorial Summary (Weight: 2.0)
  if (product.whyWePickedIt) {
    addTextTokens(product.whyWePickedIt.ar, 2.0);
    addTextTokens(product.whyWePickedIt.en, 2.0);
  }

  return tokenWeights;
}

/**
 * Calculates Cosine Similarity between two weighted token maps.
 * Result ranges from 0.0 (no overlap) to 1.0 (identical vectors).
 */
function computeCosineSimilarity(
  tokensA: Map<string, number>,
  tokensB: Map<string, number>
): number {
  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let dotProduct = 0;
  let normASq = 0;
  let normBSq = 0;

  for (const [, weight] of tokensA) {
    normASq += weight * weight;
  }
  for (const [, weight] of tokensB) {
    normBSq += weight * weight;
  }

  const [smaller, larger] = tokensA.size <= tokensB.size ? [tokensA, tokensB] : [tokensB, tokensA];

  for (const [token, weightA] of smaller) {
    const weightB = larger.get(token);
    if (weightB !== undefined) {
      dotProduct += weightA * weightB;
    }
  }

  if (normASq === 0 || normBSq === 0) return 0;
  return dotProduct / (Math.sqrt(normASq) * Math.sqrt(normBSq));
}

/**
 * Log-Gaussian Price Elasticity Decay.
 * In human shopping psychology, price compatibility is non-linear:
 * - Products within +-30% are highly compatible (Affinity > 0.85).
 * - A 5$ accessory is not a valid substitute for a 500$ PC, but could be a valid complement.
 */
function computePriceElasticityAffinity(
  priceA: number,
  priceB: number,
  isComplementary = false
): number {
  if (priceA <= 0 || priceB <= 0) return 0.5;

  if (isComplementary) {
    // For accessories, the natural price is typically between 5% and 50% of the main product
    const ratio = priceB / priceA;
    if (ratio >= 0.05 && ratio <= 0.6) {
      return 1.0 - Math.abs(ratio - 0.25) * 1.2;
    }
    if (ratio < 0.05) return 0.7; // Ultra cheap accessories (cables, adapters) are fine
    return Math.max(0.2, 1.0 - ratio); // Very expensive accessories are less likely
  }

  // Log-Gaussian curve: sigma = 0.65 gives generous tolerance for budget comparisons
  const logRatio = Math.log(priceA / priceB);
  const sigma = 0.65;
  return Math.exp(-(logRatio * logRatio) / (2 * sigma * sigma));
}

/**
 * Computes the composite Item-to-Item affinity score between two products.
 * Uses a Two-Stage Two-Tower retrieval model:
 * 1. MinHash/SimHash 64-bit Bitwise match (Rapid Candidate Evaluation)
 * 2. Fine-grained Semantic Cosine + Log-Gaussian Price + Bayesian Social Proof
 */
export function computeProductItemAffinity(
  productA: Product,
  productB: Product,
  cachedTokensA?: Map<string, number>
): {
  score: number;
  isSubstitute: boolean;
  isComplement: boolean;
} {
  if (productA.id === productB.id || productA.slug === productB.slug) {
    return { score: 0, isSubstitute: false, isComplement: false };
  }

  const archA = detectProductArchetype(productA);
  const archB = detectProductArchetype(productB);

  const isExactArchetype = archA !== 'general' && archA === archB;
  const isSubstituteArchetype = isExactArchetype || areArchetypesSubstitutes(archA, archB);
  const isComplementaryArchetype = areArchetypesComplements(archA, archB);

  const catA = (productA.categorySlug || productA.categoryId || '').toLowerCase();
  const catB = (productB.categorySlug || productB.categoryId || '').toLowerCase();
  const isSameCategory = Boolean(catA && catB && catA === catB);
  const isComplementaryCategory = Boolean(
    catA && COMPLEMENTARY_CATEGORY_MATRIX[catA]?.includes(catB)
  );

  // 1. Ultra-fast 64-bit Locality Sensitive Hash similarity
  const fpA = computeProductFingerprint(productA);
  const fpB = computeProductFingerprint(productB);
  const dist = computeHammingDistance(fpA, fpB);
  const lshSimilarity = hammingToSimilarityScore(dist);

  // 2. Tokenized Bilingual Semantic Similarity
  const tokensA = cachedTokensA || extractProductFeatureTokens(productA);
  const tokensB = extractProductFeatureTokens(productB);
  const cosineSim = computeCosineSimilarity(tokensA, tokensB);

  // 3. Price Affinity (Non-linear Log-Gaussian elasticity)
  const priceA = typeof productA.priceAmount === 'number' && productA.priceAmount > 0
    ? productA.priceAmount
    : 0;
  const priceB = typeof productB.priceAmount === 'number' && productB.priceAmount > 0
    ? productB.priceAmount
    : 0;
  const priceAffinity = computePriceElasticityAffinity(
    priceA,
    priceB,
    isComplementaryArchetype || isComplementaryCategory
  );

  // 4. Bayesian Social Proof & Editorial Quality Weight
  const verifiedRating = getVerifiedProductRating(productB);
  const dataQualityB = computeProductDataQualityScore(productB);
  const socialProofWeight =
    verifiedRating !== null
      ? Math.min(1.0, verifiedRating / 5.0)
      : Math.min(1.0, dataQualityB / 100);

  // 5. Composite Score Calculation
  let rawScore = 0;

  if (isSubstituteArchetype) {
    // Direct Substitute Formula (Same archetype or direct substitute category):
    // Prioritize feature overlap, price bracket harmony, and verified quality
    rawScore = (
      (isExactArchetype ? 0.15 : 0.05) + // Base bonus for verified archetype match
      (cosineSim * 0.35) +
      (lshSimilarity * 0.15) +
      (priceAffinity * 0.25) +
      (socialProofWeight * 0.10)
    ) * 100;
  } else if (isComplementaryArchetype || isComplementaryCategory) {
    // Cross-Selling Ecosystem Formula:
    // Synergy between complementary domains + natural accessory price ratio
    rawScore = (
      0.45 + // Base bonus for ecosystem companion synergy
      (lshSimilarity * 0.15) +
      (priceAffinity * 0.25) +
      (cosineSim * 0.15)
    ) * 100;
  } else if (isSameCategory && (archA === 'general' || archB === 'general')) {
    // Shared category fallback when archetype is undefined
    rawScore = (
      (cosineSim * 0.40) +
      (lshSimilarity * 0.20) +
      (priceAffinity * 0.25) +
      (socialProofWeight * 0.15)
    ) * 75;
  } else {
    // Disparate archetype and different category: strictly penalize to prevent false recommendations
    rawScore = (
      (cosineSim * 0.50) +
      (lshSimilarity * 0.20)
    ) * 20;
  }

  // Bonus for trending velocity (clicks & sales)
  const clicks = productB.clicksCount ? Number(productB.clicksCount) : 0;
  const trendingBonus = Math.min(6, Math.log1p(clicks));
  rawScore += trendingBonus;

  const finalScore = Math.min(99, Math.max(5, Math.round(rawScore * 10) / 10));

  return {
    score: finalScore,
    isSubstitute: isSubstituteArchetype && finalScore >= 45,
    isComplement: (isComplementaryArchetype || isComplementaryCategory) && finalScore >= 40,
  };
}

/**
 * Returns intelligent product recommendations for a single target product
 * or general catalog browsing.
 */
export function getSmartRecommendations(
  targetProduct: Product | null | undefined,
  allCatalogProducts: Product[],
  options: RecommendationOptions = {}
): ScoredProductRecommendation[] {
  const limit = options.limit || 4;
  const type = options.type || 'hybrid';
  const excludeSet = new Set<string>(options.excludeIds || []);

  if (targetProduct) {
    excludeSet.add(targetProduct.id);
    excludeSet.add(targetProduct.slug);
  }

  // Filter available candidate pool with deduplication
  const cleanCatalog = deduplicateProducts(allCatalogProducts);
  const availablePool = cleanCatalog.filter(
    (p) => !excludeSet.has(p.id) && !excludeSet.has(p.slug)
  );

  if (availablePool.length === 0) {
    return [];
  }

  // Extract tokens once for the target product
  const targetTokens = targetProduct ? extractProductFeatureTokens(targetProduct) : null;
  const intentVector = options.intentVector;

  // Score every candidate
  const scoredItems: ScoredProductRecommendation[] = availablePool.map((candidate) => {
    if (targetProduct && targetTokens) {
      const { score, isSubstitute, isComplement } = computeProductItemAffinity(
        targetProduct,
        candidate,
        targetTokens
      );

      let adjustedScore = score;

      // In-session intent vector boost (Dwell Time & Category Affinity)
      if (intentVector?.categoryAffinities) {
        const cat = (candidate.categorySlug || candidate.categoryId || '').toLowerCase();
        const dwellWeight = intentVector.categoryAffinities[cat] || 0;
        if (dwellWeight > 0) {
          adjustedScore += Math.min(12, dwellWeight * 2);
        }
      }

      // Price target alignment boost
      if (intentVector?.preferredPriceTarget && intentVector.preferredPriceTarget > 0) {
        const candPrice = typeof candidate.priceAmount === 'number' ? candidate.priceAmount : 0;
        if (candPrice > 0) {
          const ratio = Math.abs(candPrice - intentVector.preferredPriceTarget) / intentVector.preferredPriceTarget;
          if (ratio < 0.25) {
            adjustedScore += 5;
          }
        }
      }

      let matchType: ScoredProductRecommendation['matchType'] = 'affinity';
      let reasonAr = 'منتج موصى به بناءً على توافق المواصفات والسعر';
      let reasonEn = 'Recommended based on feature & price alignment';

      if (isSubstitute) {
        matchType = 'substitute';
        reasonAr = 'بديل مباشر مقارب في المواصفات والأداء';
        reasonEn = 'Direct comparable alternative with matching specs';
      } else if (isComplement) {
        matchType = 'complementary';
        reasonAr = 'ملحق تكميلي متوافق ومثالي للاقتناء معاً';
        reasonEn = 'Complementary companion accessory frequently paired together';
      }

      return {
        product: candidate,
        score: Math.min(100, Math.max(0, Math.round(adjustedScore * 10) / 10)),
        matchType,
        reason: { ar: reasonAr, en: reasonEn },
      };
    }

    // Baseline catalog ranking when no target product is provided
    const dataQuality = computeProductDataQualityScore(candidate);
    const verifiedRating = getVerifiedProductRating(candidate);
    let score = 40 + Math.round((dataQuality / 100) * 20);
    if (verifiedRating !== null) {
      score += (verifiedRating - 3.5) * 8;
    }
    const clicks = candidate.clicksCount ? Number(candidate.clicksCount) : 0;
    score += Math.min(15, clicks * 1.5);
    const sold = typeof candidate.soldCount === 'number' && candidate.soldCount > 0
      ? candidate.soldCount
      : 0;
    score += Math.min(15, sold * 0.1);

    if (
      options.preferredCategorySlug &&
      (candidate.categorySlug === options.preferredCategorySlug ||
        candidate.categoryId === options.preferredCategorySlug)
    ) {
      score += 25;
    }

    if (intentVector?.categoryAffinities) {
      const cat = (candidate.categorySlug || candidate.categoryId || '').toLowerCase();
      const dwell = intentVector.categoryAffinities[cat] || 0;
      score += Math.min(15, dwell * 2.5);
    }

    return {
      product: candidate,
      score: Math.min(100, Math.max(0, Math.round(score * 10) / 10)),
      matchType: 'trending',
      reason: {
        ar: 'من المنتجات الأعلى تقييماً وطلباً في المتجر',
        en: 'Top-rated and trending across the store',
      },
    };
  });

  // Apply Thompson Sampling Bandit Exploration (20% exploration) if enabled
  const shouldBandit = options.enableBanditExploration !== false;
  let finalRanked = scoredItems;

  if (shouldBandit && scoredItems.length > 2) {
    const banditInputs = scoredItems.map((item) => ({
      item,
      relevanceScore: item.score / 100,
      clicksCount: typeof item.product.clicksCount === 'number' ? item.product.clicksCount : 0,
      impressionsCount: item.product.impressionsCount,
      affiliateClicksCount: item.product.affiliateClicksCount,
      conversionsCount: item.product.confirmedConversionsCount ?? item.product.salesCount ?? item.product.soldCount ?? 0,
    }));
    const banditOutputs = rankWithBanditExploration(banditInputs, 0.18);
    finalRanked = banditOutputs.map((b) => b.item);
  } else {
    finalRanked.sort((a, b) => b.score - a.score);
  }

  if (type === 'substitutes') {
    const substitutes = finalRanked.filter((s) => s.matchType === 'substitute');
    const fallback = finalRanked.filter((s) => s.matchType !== 'substitute');
    return [...substitutes, ...fallback].slice(0, limit);
  }

  if (type === 'complementary') {
    const complements = finalRanked.filter((s) => s.matchType === 'complementary');
    const fallback = finalRanked.filter((s) => s.matchType !== 'complementary');
    return [...complements, ...fallback].slice(0, limit);
  }

  if (type === 'hybrid' && targetProduct) {
    const substitutes = finalRanked.filter((s) => s.matchType === 'substitute');
    const complements = finalRanked.filter((s) => s.matchType === 'complementary');

    const selected: ScoredProductRecommendation[] = [];
    const selectedIds = new Set<string>();

    for (const item of substitutes) {
      if (selected.length < 2) {
        selected.push(item);
        selectedIds.add(item.product.id);
      }
    }

    for (const item of complements) {
      if (selected.length < limit && !selectedIds.has(item.product.id)) {
        selected.push(item);
        selectedIds.add(item.product.id);
      }
    }

    // Only supplement with other candidates if they have meaningful affinity (score >= 40)
    for (const item of finalRanked) {
      if (
        selected.length < limit &&
        !selectedIds.has(item.product.id) &&
        item.score >= 40
      ) {
        selected.push(item);
        selectedIds.add(item.product.id);
      }
    }

    return selected;
  }

  return finalRanked.slice(0, limit);
}

/**
 * Intelligently retrieves and ranks the most relevant products for a buying guide
 * or editorial article. Prevents irrelevant catalog padding (e.g., heating pads in water bottle guides).
 */
export function getSmartGuideProducts(
  article: Article,
  allCatalogProducts: Product[],
  limit = 4
): Product[] {
  if (!article || !allCatalogProducts || allCatalogProducts.length === 0) {
    return [];
  }

  const selectedProducts: Product[] = [];
  const selectedIds = new Set<string>();

  // 1. Direct explicit products referenced in the article metadata or HTML body
  const htmlCombined = `${article.contentHtml?.ar || ''} ${article.contentHtml?.en || ''}`;
  const htmlSlugMatches = Array.from(
    htmlCombined.matchAll(/\/products\/([^/?#\s"'<>]+)/gi),
    (m) => {
      try {
        return decodeURIComponent(m[1]);
      } catch {
        return m[1];
      }
    }
  );

  const explicitKeys = Array.from(
    new Set(
      [
        article.topPickProductId,
        ...(article.relatedProductIds || []),
        ...htmlSlugMatches,
      ]
        .filter((v): v is string => Boolean(v && v.trim()))
        .map((k) => k.trim())
    )
  );

  for (const key of explicitKeys) {
    const keyLower = key.toLowerCase();
    const matched = allCatalogProducts.find(
      (p) =>
        p.id.toLowerCase() === keyLower ||
        p.slug.toLowerCase() === keyLower
    );
    if (matched && !selectedIds.has(matched.id)) {
      selectedProducts.push(matched);
      selectedIds.add(matched.id);
      if (selectedProducts.length >= limit) return selectedProducts;
    }
  }

  // 2. Detect the guide's target archetype and extract semantic tokens
  const guideArchetype = detectGuideArchetype(article);
  const guideTokens = new Map<string, number>();

  const addGuideTokens = (text: string | undefined | null, weight: number) => {
    if (!text) return;
    const norm = normalizeSearchText(text);
    if (!norm) return;
    for (const w of norm.split(/\s+/)) {
      if (w.length >= 3 && !STOPWORDS.has(w)) {
        guideTokens.set(w, Math.max(guideTokens.get(w) || 0, weight));
      }
    }
  };

  if (typeof article.title === 'string') {
    addGuideTokens(article.title, 5.0);
  } else if (article.title) {
    addGuideTokens(article.title.ar, 5.0);
    addGuideTokens(article.title.en, 5.0);
  }

  if (Array.isArray(article.seoKeywords)) {
    article.seoKeywords.forEach((k) => addGuideTokens(k, 4.0));
  }

  if (typeof article.excerpt === 'string') {
    addGuideTokens(article.excerpt, 3.0);
  } else if (article.excerpt) {
    addGuideTokens(article.excerpt.ar, 3.0);
    addGuideTokens(article.excerpt.en, 3.0);
  }

  if (article.seoTitle) {
    addGuideTokens(
      typeof article.seoTitle === 'string'
        ? article.seoTitle
        : `${article.seoTitle.ar || ''} ${article.seoTitle.en || ''}`,
      4.5
    );
  }
  if (article.seoDescription) {
    addGuideTokens(
      typeof article.seoDescription === 'string'
        ? article.seoDescription
        : `${article.seoDescription.ar || ''} ${article.seoDescription.en || ''}`,
      2.5
    );
  }
  if (article.editorVerdict) {
    addGuideTokens(
      typeof article.editorVerdict === 'string'
        ? article.editorVerdict
        : `${article.editorVerdict.ar || ''} ${article.editorVerdict.en || ''}`,
      3.5
    );
  }
  if (Array.isArray(article.faqItems)) {
    for (const faq of article.faqItems) {
      addGuideTokens(
        `${faq.question?.ar || ''} ${faq.question?.en || ''}`,
        2.5
      );
      addGuideTokens(
        `${faq.answer?.ar || ''} ${faq.answer?.en || ''}`,
        1.5
      );
    }
  }

  const articleBodyText = `${article.contentHtml?.ar || ''} ${article.contentHtml?.en || ''}`
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .slice(0, 12000);
  addGuideTokens(articleBodyText, 1.5);

  if (article.categorySlug) {
    addGuideTokens(article.categorySlug.replace(/-/g, ' '), 2.5);
  }

  // 3. Score candidate products against the guide
  const candidates = allCatalogProducts
    .filter(
      (p) =>
        !selectedIds.has(p.id) &&
        !selectedIds.has(p.slug) &&
        p.inStock !== false
    )
    .map((candidate) => {
      const candArch = detectProductArchetype(candidate);
      const isExactArch = guideArchetype !== 'general' && candArch === guideArchetype;
      const isSubArch = guideArchetype !== 'general' && areArchetypesSubstitutes(guideArchetype, candArch);
      const isCompArch = guideArchetype !== 'general' && areArchetypesComplements(guideArchetype, candArch);

      const candTokens = extractProductFeatureTokens(candidate);
      const cosineSim = computeCosineSimilarity(guideTokens, candTokens);

      let score = 0;

      if (isExactArch) {
        score = 55 + (cosineSim * 30);
      } else if (isSubArch) {
        score = 42 + (cosineSim * 30);
      } else if (isCompArch) {
        score = 25 + (cosineSim * 20);
      } else {
        // Disparate archetype: only qualifies if it has high semantic cosine overlap
        score = cosineSim * 60;
      }

      const candidateCategory = (
        candidate.categorySlug ||
        candidate.categoryId ||
        ''
      ).toLowerCase();
      const guideCategory = (
        article.categorySlug ||
        article.categoryId ||
        ''
      ).toLowerCase();
      if (candidateCategory && guideCategory && candidateCategory === guideCategory) {
        score += 12;
      } else if (
        guideCategory &&
        COMPLEMENTARY_CATEGORY_MATRIX[guideCategory]?.includes(candidateCategory)
      ) {
        score += 5;
      }

      // Bonus for real product photos
      if (candidate.images?.[0]?.url) {
        score += 5;
      }

      // Bonus for documented high ratings or comprehensive editorial completeness
      const verifiedRating = getVerifiedProductRating(candidate);
      const dataQuality = computeProductDataQualityScore(candidate);
      if (verifiedRating !== null) {
        score += Math.max(0, Math.min(5, (verifiedRating - 3.5) * 3));
      } else {
        score += Math.min(5, (dataQuality / 100) * 4);
      }
      return {
        product: candidate,
        score: Math.round(score * 10) / 10,
        isExactArch,
        isSubArch,
        isCompArch,
      };
    })
    .filter((c) => c.score >= 42) // Strict relevancy threshold
    .sort((a, b) => b.score - a.score);

  // 4. Fill remaining slots with qualifying candidates
  for (const cand of candidates) {
    if (selectedProducts.length >= limit) break;
    if (!selectedIds.has(cand.product.id)) {
      selectedProducts.push(cand.product);
      selectedIds.add(cand.product.id);
    }
  }

  return selectedProducts;
}

/**
 * Generates personalized session recommendations based on multiple viewed products.
 * Uses temporal exponential decay for session recency and in-browser intent signals.
 */
export function getSessionPersonalizedRecommendations(
  viewedProductIds: string[],
  allCatalogProducts: Product[],
  limit = 4,
  intentVector?: RecommendationIntentVector
): ScoredProductRecommendation[] {
  if (!viewedProductIds || viewedProductIds.length === 0 || allCatalogProducts.length === 0) {
    return getSmartRecommendations(null, allCatalogProducts, {
      limit,
      type: 'personalized',
      intentVector,
    });
  }

  const viewedProducts = viewedProductIds
    .map((vId) => allCatalogProducts.find((p) => p.id === vId || p.slug === vId))
    .filter(Boolean) as Product[];

  if (viewedProducts.length === 0) {
    return getSmartRecommendations(null, allCatalogProducts, {
      limit,
      type: 'personalized',
      intentVector,
    });
  }

  const viewedIdsSet = new Set<string>(viewedProducts.map((p) => p.id));
  const candidatePool = allCatalogProducts.filter((p) => !viewedIdsSet.has(p.id));

  const scoredCandidates: ScoredProductRecommendation[] = candidatePool.map((candidate) => {
    let aggregateScore = 0;
    let totalWeight = 0;

    for (let i = 0; i < viewedProducts.length; i += 1) {
      const viewed = viewedProducts[i];
      const recencyWeight = Math.pow(0.75, i);
      const { score } = computeProductItemAffinity(viewed, candidate);
      aggregateScore += score * recencyWeight;
      totalWeight += recencyWeight;
    }

    let finalScore = totalWeight > 0 ? Math.round((aggregateScore / totalWeight) * 10) / 10 : 0;

    // Intent vector adjustment
    if (intentVector?.categoryAffinities) {
      const cat = (candidate.categorySlug || candidate.categoryId || '').toLowerCase();
      const dwell = intentVector.categoryAffinities[cat] || 0;
      finalScore += Math.min(10, dwell * 2);
    }

    return {
      product: candidate,
      score: Math.min(100, Math.max(0, finalScore)),
      matchType: 'affinity',
      reason: {
        ar: 'موصى به خصيصاً بناءً على اهتمامات تصفحك في الجلسة الحالية',
        en: 'Personalized based on your active session interests',
      },
    };
  });

  // Apply Bandit Exploration
  const banditInputs = scoredCandidates.map((c) => ({
    item: c,
    relevanceScore: c.score / 100,
    clicksCount: typeof c.product.clicksCount === 'number' ? c.product.clicksCount : 0,
    impressionsCount: c.product.impressionsCount,
    affiliateClicksCount: c.product.affiliateClicksCount,
    conversionsCount: c.product.confirmedConversionsCount ?? c.product.salesCount ?? c.product.soldCount ?? 0,
  }));
  const ranked = rankWithBanditExploration(banditInputs, 0.20).map((b) => b.item);

  return ranked.slice(0, limit);
}
