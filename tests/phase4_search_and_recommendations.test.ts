import { describe, it } from 'node:test';
import assert from 'node:assert';
import type { Article, Product } from '../types';
import {
  normalizeSearchText,
  stripArabicPrefixes,
  getInflectionVariants,
  toPhoneticSkeleton,
  scoreProductMatch,
  deduplicateProducts,
  applyCategoryAndStoreDiversity,
  computeProductDataQualityScore,
  getVerifiedProductRating,
  computeUnifiedRankingScore,
  computeExplicitIntentBoost,
  searchAndRankProducts,
  isNewVisitor,
  COMPLEMENTARY_CATEGORY_MATRIX,
  getOrInitVisitorProfile,
  recordVisitorInteraction,
} from '../lib/productSearch';
import {
  filterCatalogProducts,
  sortCatalogProducts,
} from '../lib/catalogFilters';
import {
  computeProductItemAffinity,
  getSmartGuideProducts,
  getSmartRecommendations,
} from '../server/services/recommendation.service';

const createMockProduct = (overrides: Partial<Product> = {}): Product => {
  const id = overrides.id || 'prod-1';
  const cleanOverrides = Object.fromEntries(
    Object.entries(overrides).filter(([_, v]) => v !== undefined)
  );
  return {
    id,
    slug: id,
    title: { ar: 'منتج تجريبي ممتاز', en: 'Premium Test Product' },
    name: { ar: 'منتج تجريبي ممتاز', en: 'Premium Test Product' },
    shortSummary: { ar: 'ملخص قصير تجريبي', en: 'Short test summary' },
    whyWePickedIt: {
      ar: 'اخترنا هذا المنتج لكفاءته العالية وتصميمه المتقن وسعره العادل.',
      en: 'Selected for superior performance, balanced ergonomics and value.',
    },
    whatToConsider: {
      ar: 'يرجى مراعاة أبعاد الجهاز والتوافق مع منافذ مكتبك.',
      en: 'Check desktop dimensions and port compatibility.',
    },
    description: { ar: 'وصف تجريبي', en: 'Test description' },
    priceAmount: 100,
    priceCurrency: 'USD',
    priceDisplayPolicy: 'show_with_timestamp',
    priceUpdatedAt: new Date().toISOString(),
    images: [
      { url: 'https://images.example.com/p1.jpg', alt: { ar: 'صورة 1', en: 'Test Photo 1' }, width: 800, height: 800 },
      { url: 'https://images.example.com/p2.jpg', alt: { ar: 'صورة 2', en: 'Test Photo 2' }, width: 800, height: 800 },
      { url: 'https://images.example.com/p3.jpg', alt: { ar: 'صورة 3', en: 'Test Photo 3' }, width: 800, height: 800 },
    ],
    affiliateUrl: 'https://example.com/buy',
    sourceId: 'src-1',
    sourceSlug: 'amazon',
    sourceName: { ar: 'أمازون', en: 'Amazon' },
    sourceDisclosure: { ar: 'إفصاح الشريك', en: 'Affiliate disclosure' },
    categoryId: 'cat-1',
    categorySlug: 'electronics',
    categoryName: { ar: 'إلكترونيات', en: 'Electronics' },
    tags: ['test'],
    isFeatured: true,
    status: 'published',
    clicksCount: 10,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    specs: [
      { label: 'القدرة', value: '100W' },
      { label: 'الوزن', value: '250g' },
      { label: 'المنافذ', value: '3x USB-C' },
    ],
    pros: ['ميزة أولى موثقة', 'ميزة ثانية موثقة'],
    cons: ['نقطة انتباه أولى موثقة'],
    comparisonDna: {
      keySpecs: {
        ar: ['قدرة 100 واط', 'منفذ USB-C'],
        en: ['100W Power', 'USB-C Port'],
      },
    },
    ...cleanOverrides,
  };

};

const createMockArticle = (overrides: Partial<Article> = {}): Article => ({
  id: 'guide-1',
  slug: 'best-coffee-grinder',
  title: { ar: 'أفضل مطحنة قهوة للإسبريسو', en: 'Best Coffee Grinder for Espresso' },
  excerpt: {
    ar: 'دليل لاختيار مطحنة قهوة مناسبة للإسبريسو.',
    en: 'A guide to choosing a coffee grinder for espresso.',
  },
  contentHtml: {
    ar: '<p>نقارن المطاحن من حيث الطحن المتجانس وإعدادات الإسبريسو.</p>',
    en: '<p>Compare grinders for consistent espresso grind and adjustment range.</p>',
  },
  categoryId: 'coffee-grinders',
  categorySlug: 'coffee-grinders',
  categoryName: { ar: 'مطاحن القهوة', en: 'Coffee Grinders' },
  relatedProductIds: [],
  readingTimeMinutes: 6,
  status: 'published',
  publishedAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('Phase 4: Arabic and English Search, Normalization & Stemming', () => {
  it('normalizes Arabic text: diacritics, alef forms, hamza, and ta marbuta', () => {
    // Diacritics
    assert.strictEqual(normalizeSearchText('سَمَّاعَاتٌ'), 'سماعات');
    // Alef variants
    assert.strictEqual(normalizeSearchText('أفضل إلكترونيات آمنة'), 'افضل الكترونيات امنه');
    // Tatweel
    assert.strictEqual(normalizeSearchText('شـــــاحـن'), 'شاحن');
    // Hamza on waw and ya
    assert.strictEqual(normalizeSearchText('مؤثر بيئة رائع'), 'موثر بييه رايع');
  });

  it('strips Arabic prefixes accurately (الـ, بالـ, كالـ, فالـ, ولـ, للـ, وللـ)', () => {
    assert.ok(stripArabicPrefixes('السماعات').includes('سماعات'));
    assert.ok(stripArabicPrefixes('بالشاحن').includes('شاحن'));
    assert.ok(stripArabicPrefixes('كالمصباح').includes('مصباح'));
    assert.ok(stripArabicPrefixes('وللحاسوب').includes('حاسوب'));
    assert.ok(stripArabicPrefixes('فالماوس').includes('ماوس'));
  });

  it('generates inflection variants for common Arabic plurals and forms', () => {
    const variants = getInflectionVariants('سماعات');
    assert.ok(variants.includes('سماعه'), 'Plural سماعات should include singular سماعه');

    const chargerVariants = getInflectionVariants('شواحن');
    assert.ok(chargerVariants.includes('شاحن'), 'Broken plural شواحن should include singular شاحن');

    const reverseVariants = getInflectionVariants('شاحن');
    assert.ok(reverseVariants.includes('شواحن'), 'Singular شاحن should expand to plural شواحن');

    const lampVariants = getInflectionVariants('مصابيح');
    assert.ok(lampVariants.includes('مصباح'), 'Broken plural مصابيح should include singular مصباح');
  });

  it('matches bilingual synonyms and concept groups', () => {
    const mugProduct = createMockProduct({
      id: 'contigo-mug-1',
      title: { ar: 'كوب حراري ستانلس ستيل للمكتب والسفر', en: 'Contigo Byron Vacuum Insulated Travel Mug' },
      tags: ['mug', 'travel', 'thermos'],
    });

    // Query in Arabic: "ترمس" (thermos) or "مج" or "كوب حراري"
    const scoreArabic1 = scoreProductMatch(mugProduct, 'ترمس حراري');
    assert.ok(scoreArabic1 > 0, 'Should match ترمس with travel mug concept');

    const scoreArabic2 = scoreProductMatch(mugProduct, 'مج حراري');
    assert.ok(scoreArabic2 > 0, 'Should match مج with travel mug concept');

    // Query in English
    const scoreEng = scoreProductMatch(mugProduct, 'travel tumbler');
    assert.ok(scoreEng > 0, 'Should match travel tumbler');
  });

  it('handles typos and spelling errors through phonetic skeleton matching', () => {
    const headphoneProduct = createMockProduct({
      id: 'anker-soundcore-1',
      title: { ar: 'سماعات انكر ساوند كور اللاسلكية', en: 'Anker Soundcore Wireless Headphones' },
      categorySlug: 'audio',
    });

    // Typo with repeated letters and slightly misspelled: "سسماعةة"
    const scoreTypo = scoreProductMatch(headphoneProduct, 'سسماعةة');
    assert.ok(scoreTypo > 0, 'Phonetic matching should match duplicate-letter typo');

    // English typo: "headfone" instead of "headphone"
    assert.strictEqual(toPhoneticSkeleton('headfone'), toPhoneticSkeleton('headphone'));
    const scoreEngTypo = scoreProductMatch(headphoneProduct, 'headfone');
    assert.ok(scoreEngTypo > 0, 'Phonetic skeleton should match headfone to headphone');
  });
});

describe('Phase 4: Unified Multi-Objective Ranking Formulation', () => {
  it('matches buying-guide recommendations to guide intent and excludes unrelated catalog items', () => {
    const guide = createMockArticle({
      topPickProductId: 'editor-choice',
      relatedProductIds: ['editor-choice'],
      editorVerdict: {
        ar: 'اختيار المحرر لطحن متجانس للإسبريسو.',
        en: 'Editors pick for consistent espresso grinding.',
      },
      faqItems: [
        {
          question: {
            ar: 'ما مطحنة القهوة المناسبة للإسبريسو؟',
            en: 'Which coffee grinder is suitable for espresso?',
          },
          answer: {
            ar: 'مطحنة توفر إعدادات طحن دقيقة.',
            en: 'A grinder with fine adjustment settings.',
          },
        },
      ],
    });
    const editorPick = createMockProduct({
      id: 'editor-choice',
      slug: 'editor-choice',
      title: { ar: 'مطحنة قهوة يدوية', en: 'Manual Coffee Grinder' },
      categoryId: 'coffee-grinders',
      categorySlug: 'coffee-grinders',
    });
    const relevantAlternative = createMockProduct({
      id: 'espresso-grinder',
      slug: 'espresso-grinder',
      title: {
        ar: 'مطحنة قهوة كهربائية للإسبريسو',
        en: 'Electric Burr Coffee Grinder for Espresso',
      },
      categoryId: 'coffee-grinders',
      categorySlug: 'coffee-grinders',
      tags: ['burr grinder', 'espresso'],
    });
    const unrelatedProduct = createMockProduct({
      id: 'air-fryer',
      slug: 'air-fryer',
      title: { ar: 'قلاية هوائية', en: 'Air Fryer' },
      categoryId: 'kitchen-appliances',
      categorySlug: 'kitchen-appliances',
      tags: ['air fryer'],
    });
    const outOfStockGrinder = createMockProduct({
      id: 'out-of-stock-grinder',
      slug: 'out-of-stock-grinder',
      title: { ar: 'مطحنة قهوة للإسبريسو', en: 'Espresso Coffee Grinder' },
      categoryId: 'coffee-grinders',
      categorySlug: 'coffee-grinders',
      inStock: false,
    });

    const recommended = getSmartGuideProducts(
      guide,
      [unrelatedProduct, outOfStockGrinder, relevantAlternative, editorPick],
      4
    );

    assert.strictEqual(recommended[0].id, 'editor-choice');
    assert.ok(
      recommended.some((product) => product.id === 'espresso-grinder'),
      'Guide intent from its body and FAQ should surface a relevant alternative'
    );
    assert.ok(
      !recommended.some((product) => product.id === 'air-fryer'),
      'Unrelated catalog products should not pad a buying guide'
    );
    assert.ok(
      !recommended.some((product) => product.id === 'out-of-stock-grinder'),
      'Unavailable products should not be selected as automatic recommendations'
    );
  });

  it('persists saves and outbound clicks as distinct local intent signals', () => {
    const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
    const storage = new Map<string, string>();
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        localStorage: {
          getItem: (key: string) => storage.get(key) ?? null,
          setItem: (key: string, value: string) => storage.set(key, value),
        },
      },
    });

    try {
      recordVisitorInteraction({
        productId: 'product-1',
        action: 'save',
      });
      recordVisitorInteraction({
        productId: 'product-2',
        categorySlug: 'electronics',
        action: 'outbound',
      });
      recordVisitorInteraction({
        productId: 'product-1',
        action: 'unsave',
      });

      const profile = getOrInitVisitorProfile();
      assert.deepStrictEqual(profile.savedProductIds, []);
      assert.deepStrictEqual(profile.outboundClickedProductIds, ['product-2']);
      assert.ok(profile.outboundClickTimestamps['product-2'] > 0);
      assert.deepStrictEqual(profile.viewedProductIds, ['product-2']);
      assert.deepStrictEqual(profile.categories, ['electronics']);
    } finally {
      if (originalWindow) {
        Object.defineProperty(globalThis, 'window', originalWindow);
      } else {
        Reflect.deleteProperty(globalThis, 'window');
      }
    }
  });

  it('combines relevance, category, price, engagement, and data quality into composite score', () => {
    const product = createMockProduct({
      priceAmount: 89,
      clicksCount: 120,
      impressionsCount: 2000,
      affiliateClicksCount: 15,
      confirmedConversionsCount: 3,
    });

    const ranking = computeUnifiedRankingScore(product, {
      rawQuery: 'منتج تجريبي',
      targetCategorySlug: 'electronics',
      preferredPriceTarget: 85,
    });

    assert.ok(ranking.relevance > 0, 'Relevance should be positive');
    assert.strictEqual(ranking.categoryAffinity, 100, 'Exact category should yield 100');
    assert.ok(ranking.priceAlignment > 70, 'Price within 10% should have high alignment');
    assert.ok(ranking.engagement > 0, 'Engagement should reflect real CTR & conversions');
    assert.ok(ranking.dataQuality > 50, 'Data quality should reflect specs, pros, cons');
    assert.ok(ranking.compositeScore > 0, 'Composite score should be positive');
  });

  it('does not invent fake star ratings or reviews when absent', () => {
    const productWithoutRating = createMockProduct({
      rating: undefined,
      stars: undefined,
      reviewCount: 0,
    });

    // Must return null, not an arbitrary 4.3 or 4.5
    const verifiedRating = getVerifiedProductRating(productWithoutRating);
    assert.strictEqual(verifiedRating, null, 'Unverified rating must return null');

    // Data quality score reflects actual editorial completeness
    const dataQuality = computeProductDataQualityScore(productWithoutRating);
    assert.ok(dataQuality >= 40 && dataQuality <= 100, 'Quality score must be based on documented attributes');
  });

  it('verifies ratings only when documented and backed by authentic reviews', () => {
    const productWithRating = createMockProduct({
      rating: 4.6,
      reviewCount: 250,
    });

    const verified = getVerifiedProductRating(productWithRating);
    assert.strictEqual(verified, 4.6, 'Authentic verified rating should be extracted');
  });

  it('rewards complementary categories in the ecosystem graph', () => {
    const pcProduct = createMockProduct({
      id: 'pc-1',
      categorySlug: 'computers',
    });
    const keyboardProduct = createMockProduct({
      id: 'kb-1',
      categorySlug: 'keyboards-mice',
      priceAmount: 45,
    });

    // Check complementary matrix definition
    assert.ok(
      COMPLEMENTARY_CATEGORY_MATRIX['computers'].includes('keyboards-mice'),
      'Computers should complement keyboards-mice'
    );

    const affinity = computeProductItemAffinity(pcProduct, keyboardProduct);
    assert.ok(affinity.score >= 40, 'Cross-category complementary score should be strong');
    assert.ok(affinity.isComplement, 'Should be flagged as complementary companion');
  });

  it('weights outbound purchase intent more strongly than saves and related-item similarity', () => {
    const intentProduct = createMockProduct({
      id: 'intent-product',
      slug: 'intent-product',
      categorySlug: 'electronics',
    });
    const relatedProduct = createMockProduct({
      id: 'related-product',
      slug: 'related-product',
      categorySlug: 'electronics',
    });

    const savedDirectBoost = computeExplicitIntentBoost(
      intentProduct,
      [intentProduct],
      []
    );
    const outboundDirectBoost = computeExplicitIntentBoost(
      intentProduct,
      [],
      [intentProduct]
    );
    const relatedBoost = computeExplicitIntentBoost(
      relatedProduct,
      [],
      [intentProduct]
    );
    const staleOutboundBoost = computeExplicitIntentBoost(
      intentProduct,
      [],
      [intentProduct],
      { 'intent-product': Date.now() - 14 * 24 * 60 * 60 * 1000 }
    );

    assert.strictEqual(savedDirectBoost, 90);
    assert.strictEqual(outboundDirectBoost, 120);
    assert.ok(relatedBoost > 0, 'A related product should inherit some purchase intent');
    assert.ok(
      staleOutboundBoost < outboundDirectBoost,
      'Older store clicks should lose influence over time'
    );
    assert.ok(
      relatedBoost < savedDirectBoost,
      'Related products should not outrank the exact item the visitor saved'
    );
  });
});

describe('Phase 4: Deduplication and Diversity', () => {
  it('deduplicates products by id, slug, and canonical title', () => {
    const products: Product[] = [
      createMockProduct({ id: 'p1', slug: 'anker-charger', title: { ar: 'شاحن انكر', en: 'Anker Charger' } }),
      createMockProduct({ id: 'p1', slug: 'anker-charger-dup', title: { ar: 'شاحن انكر آخر', en: 'Anker Charger 2' } }), // Duplicate ID
      createMockProduct({ id: 'p2', slug: 'anker-charger', title: { ar: 'شاحن انكر ثالث', en: 'Anker Charger 3' } }), // Duplicate slug
      createMockProduct({ id: 'p3', slug: 'anker-charger-clean', title: { ar: 'شاحن انكر', en: 'Anker Charger' } }), // Duplicate title
      createMockProduct({ id: 'p4', slug: 'unique-headphones', title: { ar: 'سماعات رأس فريدة', en: 'Unique Headphones' } }),
    ];

    const deduped = deduplicateProducts(products);
    assert.strictEqual(deduped.length, 2, 'Should leave only 2 distinct products');
    assert.strictEqual(deduped[0].id, 'p1');
    assert.strictEqual(deduped[1].id, 'p4');
  });

  describe('Catalog filters and sorting', () => {
    it('keeps impossible store and price filters empty instead of showing unrelated products', () => {
      const products = [
        createMockProduct({
          id: 'amazon-item',
          sourceSlug: 'amazon',
          priceAmount: 10,
          priceCurrency: 'USD',
        }),
        createMockProduct({
          id: 'noon-item',
          sourceSlug: 'noon',
          priceAmount: 20,
          priceCurrency: 'USD',
        }),
        createMockProduct({
          id: 'unknown-price',
          sourceSlug: 'noon',
          priceAmount: null,
        }),
      ];

      assert.deepStrictEqual(
        filterCatalogProducts(products, {
          category: 'all',
          store: 'missing-store',
          maxPrice: null,
          currency: 'MAD',
        }),
        []
      );
      assert.deepStrictEqual(
        filterCatalogProducts(products, {
          category: 'all',
          store: 'noon',
          maxPrice: 100,
          currency: 'MAD',
        }),
        []
      );
      assert.deepStrictEqual(
        filterCatalogProducts(products, {
          category: 'all',
          store: 'noon',
          maxPrice: 250,
          currency: 'MAD',
        }).map((product) => product.id),
        ['noon-item']
      );
    });

    it('sorts prices in the visitor currency and leaves unknown values last', () => {
      const products = [
        createMockProduct({
          id: 'unknown-price',
          priceAmount: null,
        }),
        createMockProduct({
          id: 'unavailable-price',
          priceAmount: 0,
        }),
        createMockProduct({
          id: 'mad-price',
          priceAmount: 100,
          priceCurrency: 'MAD',
        }),
        createMockProduct({
          id: 'usd-price',
          priceAmount: 5,
          priceCurrency: 'USD',
        }),
      ];

      assert.deepStrictEqual(
        sortCatalogProducts(products, 'price_asc', 'MAD').map((product) => product.id),
        ['usd-price', 'mad-price', 'unknown-price', 'unavailable-price']
      );
      assert.deepStrictEqual(
        sortCatalogProducts(products, 'price_desc', 'MAD').map((product) => product.id),
        ['mad-price', 'usd-price', 'unknown-price', 'unavailable-price']
      );
    });

    it('does not invent ratings or sales when sorting', () => {
      const products = [
        createMockProduct({ id: 'no-rating', rating: null, stars: null }),
        createMockProduct({ id: 'rated', rating: 4.8, stars: null }),
        createMockProduct({ id: 'no-sales', soldCount: null, salesCount: null }),
        createMockProduct({ id: 'sold', soldCount: 12, salesCount: null }),
      ];

      assert.deepStrictEqual(
        sortCatalogProducts(products.slice(0, 2), 'rating_desc', 'USD').map(
          (product) => product.id
        ),
        ['rated', 'no-rating']
      );
      assert.deepStrictEqual(
        sortCatalogProducts(products.slice(2), 'sold_desc', 'USD').map(
          (product) => product.id
        ),
        ['sold', 'no-sales']
      );
    });
  });

  it('prevents single category or store from monopolizing consecutive positions', () => {
    const products: Product[] = [
      createMockProduct({ id: 'e1', categorySlug: 'electronics', sourceSlug: 'amazon' }),
      createMockProduct({ id: 'e2', categorySlug: 'electronics', sourceSlug: 'amazon' }),
      createMockProduct({ id: 'e3', categorySlug: 'electronics', sourceSlug: 'amazon' }),
      createMockProduct({ id: 'a1', categorySlug: 'audio', sourceSlug: 'noon' }),
      createMockProduct({ id: 'c1', categorySlug: 'computers', sourceSlug: 'aliexpress' }),
    ];

    const diversified = applyCategoryAndStoreDiversity(products, {
      maxConsecutivePerCategory: 2,
      maxConsecutivePerStore: 2,
    });

    assert.strictEqual(diversified.length, products.length);

    // Verify no 3 consecutive electronics
    for (let i = 0; i < diversified.length - 2; i += 1) {
      const triplet = [
        diversified[i].categorySlug,
        diversified[i + 1].categorySlug,
        diversified[i + 2].categorySlug,
      ];
      assert.ok(
        !(triplet[0] === 'electronics' && triplet[1] === 'electronics' && triplet[2] === 'electronics'),
        'Should not have 3 consecutive electronics'
      );
    }
  });

  it('handles cold-start new visitors with editorial data quality ranking', () => {
    const isNew = isNewVisitor({
      queries: [],
      categories: [],
      viewedProductIds: [],
      savedProductIds: [],
      outboundClickedProductIds: [],
      outboundClickTimestamps: {},
      preferredPriceMin: null,
      preferredPriceMax: null,
      seed: 42,
    });
    assert.strictEqual(isNew, true, 'Clean profile should be recognized as new visitor');

    const products: Product[] = [
      createMockProduct({
        id: 'sparse-1',
        slug: 'sparse-1',
        title: { ar: 'منتج أولي ناقص التوثيق', en: 'Incomplete Sparse Product' },
        name: { ar: 'منتج أولي ناقص التوثيق', en: 'Incomplete Sparse Product' },
        images: [],
        whyWePickedIt: undefined,
        whatToConsider: undefined,
        specs: [],
        pros: [],
        cons: [],
        comparisonDna: undefined,
        priceAmount: 0,
      }),
      createMockProduct({
        id: 'complete-1',
        slug: 'complete-1',
        title: { ar: 'منتج متكامل موثق بالمواصفات', en: 'Complete Verified Product with Specs' },
        name: { ar: 'منتج متكامل موثق بالمواصفات', en: 'Complete Verified Product with Specs' },
        pros: ['ميزة 1', 'ميزة 2'],
        cons: ['نقطة 1'],
        comparisonDna: { keySpecs: { ar: ['مواصفة 1', 'مواصفة 2', 'مواصفة 3'], en: ['Spec 1', 'Spec 2', 'Spec 3'] } },
        priceAmount: 99,
      }),
    ];

    const ranked = searchAndRankProducts(products, '', undefined, { isNewVisitor: true });
    assert.strictEqual(ranked[0].id, 'complete-1', 'Editorial complete product must lead for new visitor');
  });
});
