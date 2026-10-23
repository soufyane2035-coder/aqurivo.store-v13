import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import type { Locale, Product } from '@/types';
import { getDictionary, pickLocalizedText } from '@/i18n';
import {
  getProductBySlug,
  listSimilarProductsByCategory,
} from '@/server/repositories/products.repo';
import { getCategoryBySlug } from '@/server/repositories/categories.repo';
import { listPublishedArticles } from '@/server/repositories/articles.repo';
import { formatNumber, formatProductPrice } from '@/lib/format';
import { SiteHeader } from '@/components/sections/SiteHeader';
import { SiteFooter } from '@/components/sections/SiteFooter';
import { ProductGallery } from './ProductGallery';
import { ProductPriceRow } from './ProductPriceRow';
import { ProductDescription } from './ProductDescription';
import { BuyNowButton } from './BuyNowButton';
import { ProductShareButton } from './ProductShareButton';
import { ProductReviews } from '@/components/ProductReviews/ProductReviews';
import { ReportModal } from '@/components/ReportModal/ReportModal';
import { SmartToolPulse } from '@/components/SmartToolPulse/SmartToolPulse';
import { EditorialGuideIcon } from '@/components/ui/AqurivoContextIcons';
import { getReviewsByProductSlug } from '@/server/repositories/reviews.repo';
import { normalizeIsoCurrency, truncateSchemaName } from '@/lib/utils';
import { ProductDwellTracker } from '@/components/ProductDetailTracker/ProductDwellTracker';
import { SimilarProductsAdaptiveGrid } from '@/components/ProductDetailTracker/SimilarProductsAdaptiveGrid';
import styles from './ProductPage.module.css';

export const revalidate = 86400;

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://aqurivo.store';

function resolveLocalizedField(
  val1: unknown,
  val2: unknown,
  locale: Locale
): string {
  const val = (val1 || val2) as Record<string, string> | string | undefined;
  if (!val) return '';
  if (typeof val === 'string') return val.trim();
  if (typeof val === 'object' && val !== null) {
    const direct = val[locale];
    if (typeof direct === 'string' && direct.trim()) return direct.trim();
    const fallback = val.ar || val.en || '';
    if (typeof fallback === 'string') return fallback.trim();
  }
  return '';
}

function resolveAbsoluteImageUrl(rawUrl: string | undefined, fallbackName: string): string {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) {
    return `${BASE_URL}/api/og?title=${encodeURIComponent(fallbackName || 'AQURIVO')}`;
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return `${BASE_URL}${trimmed.startsWith('/') ? trimmed : `/${trimmed}`}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { slug, locale } = await params;
  const safeLocale = locale === 'ar' ? 'ar' : 'en';
  const decodedSlug = decodeURIComponent(slug);
  const product =
    (await getProductBySlug(decodedSlug)) ?? (await getProductBySlug(slug));

  if (!product) {
    return {
      title: 'Product Not Found | AQURIVO',
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const isAr = safeLocale === 'ar';
  const name =
    product.name?.[safeLocale as Locale] ||
    product.name?.en ||
    product.title?.[safeLocale as Locale] ||
    product.title?.en ||
    decodedSlug;

  const seoTitle =
    name.length > 0 && name.length <= 36
      ? isAr
        ? `${name} — المواصفات والمميزات وأفضل سعر | AQURIVO`
        : `${name} — Specs, Pros & Cons & Best Price | AQURIVO`
      : `${name} | AQURIVO`;

  const description =
    product.shortSummary?.[safeLocale as Locale] ||
    product.description?.[safeLocale as Locale] ||
    product.shortSummary?.en ||
    product.description?.en ||
    product.name?.[safeLocale as Locale] ||
    name;

  const dnaSpecs =
    (isAr
      ? product.comparisonDna?.keySpecs?.ar
      : product.comparisonDna?.keySpecs?.en) || [];
  const keywords = Array.from(
    new Set(
      [
        name,
        ...(product.tags || []),
        ...dnaSpecs,
        isAr ? `سعر ${name}` : `${name} price`,
        isAr ? `مراجعة ${name}` : `${name} review`,
        'AQURIVO',
      ].filter(Boolean)
    )
  ).slice(0, 12);

  const rawFirstImage =
    typeof product.images?.[0]?.url === 'string'
      ? product.images[0].url.trim()
      : '';

  const numericPrice =
    typeof product.priceAmount === 'number' &&
    !Number.isNaN(product.priceAmount) &&
    product.priceAmount > 0
      ? product.priceAmount
      : typeof (product as unknown as Record<string, unknown>).price === 'number' &&
          Number((product as unknown as Record<string, unknown>).price) > 0
        ? Number((product as unknown as Record<string, unknown>).price)
        : null;

  const currencyCode =
    typeof product.priceCurrency === 'string' && product.priceCurrency.trim()
      ? product.priceCurrency.trim()
      : 'USD';

  const localizedPriceLabel = resolveLocalizedField(
    product.priceLabel,
    undefined,
    safeLocale as Locale
  );

  const formattedPriceLabel =
    numericPrice !== null
      ? formatProductPrice(numericPrice, currencyCode, safeLocale as Locale)
      : localizedPriceLabel;

  const localizedSourceName = resolveLocalizedField(
    product.sourceName,
    undefined,
    safeLocale as Locale
  );
  const rawSourceSlug =
    typeof product.sourceSlug === 'string' && product.sourceSlug.trim()
      ? product.sourceSlug.trim()
      : typeof product.sourceId === 'string' && product.sourceId.trim()
        ? product.sourceId.trim()
        : '';
  const storeSourceName =
    localizedSourceName ||
    (rawSourceSlug
      ? rawSourceSlug.charAt(0).toUpperCase() + rawSourceSlug.slice(1)
      : 'AQURIVO');

  const rawRating =
    typeof product.rating === 'number' && !Number.isNaN(product.rating) && product.rating > 0
      ? product.rating
      : typeof product.stars === 'number' && !Number.isNaN(product.stars) && product.stars > 0
        ? product.stars
        : null;
  const ratingScore = rawRating !== null ? rawRating.toFixed(1) : '';

  const ogDynamicCardUrl = `${BASE_URL}/api/og?title=${encodeURIComponent(
    name
  )}&price=${encodeURIComponent(formattedPriceLabel)}&source=${encodeURIComponent(
    storeSourceName
  )}${ratingScore ? `&rating=${encodeURIComponent(ratingScore)}` : ''}${
    rawFirstImage ? `&image=${encodeURIComponent(rawFirstImage)}` : ''
  }`;

  const primaryImageUrl = rawFirstImage
    ? resolveAbsoluteImageUrl(rawFirstImage, name)
    : ogDynamicCardUrl;

  const allProductImages =
    Array.isArray(product.images) && product.images.length > 0
      ? [
          ...product.images
            .map((img) => ({
              url: resolveAbsoluteImageUrl(
                typeof img?.url === 'string' ? img.url : undefined,
                name
              ),
              width: img?.width || 1200,
              height: img?.height || 630,
              alt: pickLocalizedText(img?.alt, safeLocale as Locale) || name,
            }))
            .filter((img) => Boolean(img.url)),
          {
            url: ogDynamicCardUrl,
            width: 1200,
            height: 630,
            alt: `${name} — ${storeSourceName}`,
          },
        ]
      : [
          {
            url: ogDynamicCardUrl,
            width: 1200,
            height: 630,
            alt: name,
          },
        ];

  const canonicalSlug = encodeURIComponent(product.slug || decodedSlug);
  const canonicalUrl = `${BASE_URL}/${safeLocale}/products/${canonicalSlug}`;
  const cleanMetaDescription = description.slice(0, 155);

  const productMetaOther: Record<string, string> = {
    thumbnail: primaryImageUrl,
    'og:image:secure_url': primaryImageUrl,
    'og:image:alt': name,
    'product:availability': 'in stock',
    'product:condition': 'new',
    'product:brand': storeSourceName,
    'product:retailer_item_id': product.slug || decodedSlug,
    'twitter:label1': isAr ? 'المتجر' : 'Store',
    'twitter:data1': storeSourceName,
  };

  if (numericPrice !== null) {
    productMetaOther['product:price:amount'] = String(numericPrice);
    productMetaOther['product:price:currency'] = currencyCode;
    productMetaOther['twitter:label1'] = isAr ? 'السعر' : 'Price';
    productMetaOther['twitter:data1'] = formattedPriceLabel;
    productMetaOther['twitter:label2'] = isAr ? 'المتجر والتقييم' : 'Store & Rating';
    productMetaOther['twitter:data2'] = ratingScore
      ? `${storeSourceName} (★ ${ratingScore}/5)`
      : storeSourceName;
  } else if (ratingScore) {
    productMetaOther['twitter:label2'] = isAr ? 'التقييم' : 'Rating';
    productMetaOther['twitter:data2'] = `★ ${ratingScore} / 5`;
  }

  return {
    title: seoTitle,
    description: cleanMetaDescription,
    keywords,
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },
    other: productMetaOther,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        en: `${BASE_URL}/en/products/${canonicalSlug}`,
        ar: `${BASE_URL}/ar/products/${canonicalSlug}`,
        'x-default': `${BASE_URL}/en/products/${canonicalSlug}`,
      },
    },
    openGraph: {
      title: seoTitle,
      description: cleanMetaDescription,
      url: canonicalUrl,
      siteName: 'AQURIVO',
      locale: isAr ? 'ar_SA' : 'en_US',
      alternateLocale: isAr ? ['en_US'] : ['ar_SA'],
      type: 'website',
      images: allProductImages,
    },
    twitter: {
      card: 'summary_large_image',
      site: '@aqurivo',
      creator: '@aqurivo',
      title: seoTitle,
      description: cleanMetaDescription,
      images: allProductImages.map((img) => ({
        url: img.url,
        alt: img.alt,
      })),
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: rawLocale, slug } = await params;
  if (rawLocale !== 'ar' && rawLocale !== 'en') {
    notFound();
  }

  const locale: Locale = rawLocale;
  const isAr = locale === 'ar';
  const decodedSlug = decodeURIComponent(slug);
  const product =
    (await getProductBySlug(decodedSlug)) ?? (await getProductBySlug(slug));

  if (!product) {
    notFound();
  }

  // 1. Fetch similar products, category metadata, reviews, and related editorial buying guides
  const [similarProducts, categoryDoc, reviewsSummary, allArticles] = await Promise.all([
    product.categorySlug
      ? listSimilarProductsByCategory(
          product.categorySlug,
          product.slug,
          product.id,
          4
        )
      : Promise.resolve([]),
    product.categorySlug ? getCategoryBySlug(product.categorySlug) : null,
    getReviewsByProductSlug(product.slug),
    listPublishedArticles(),
  ]);

  // Find guides matching this product or its category
  const relatedGuides = allArticles
    .filter(
      (a) =>
        (a.relatedProductIds && (a.relatedProductIds.includes(product.id) || a.relatedProductIds.includes(product.slug))) ||
        (product.categorySlug && a.categorySlug === product.categorySlug)
    )
    .slice(0, 2);

  // 2. Resolve all Firestore product fields cleanly with fallbacks
  const name =
    resolveLocalizedField(product.name, product.title, locale) ||
    product.slug;

  const shortSummary = resolveLocalizedField(
    product.shortSummary,
    undefined,
    locale
  );

  const whyWeChoseIt = resolveLocalizedField(
    product.whyWeChoseIt,
    product.whyWePickedIt,
    locale
  );

  const thingsToNotice = resolveLocalizedField(
    product.thingsToNotice,
    product.whatToConsider,
    locale
  );

  const detailedDescription = resolveLocalizedField(
    product.detailedDescription,
    product.description,
    locale
  );

  const images =
    Array.isArray(product.images) && product.images.length > 0
      ? product.images
      : [];

  const priceAmount =
    typeof product.priceAmount === 'number' && !Number.isNaN(product.priceAmount)
      ? product.priceAmount
      : null;

  const oldPrice =
    typeof product.oldPrice === 'number' && !Number.isNaN(product.oldPrice)
      ? product.oldPrice
      : null;

  const priceCurrency = product.priceCurrency || 'USD';

  const discount =
    typeof product.discount === 'number' && !Number.isNaN(product.discount)
      ? product.discount
      : typeof product.discountPercent === 'number' &&
          !Number.isNaN(product.discountPercent)
        ? product.discountPercent
        : null;

  const rating =
    typeof product.rating === 'number' && !Number.isNaN(product.rating)
      ? product.rating
      : typeof product.stars === 'number' && !Number.isNaN(product.stars)
        ? product.stars
        : null;

  const effectiveRating =
    reviewsSummary.totalCount > 0
      ? reviewsSummary.averageRating
      : rating;

  const effectiveReviewCount =
    reviewsSummary.totalCount > 0
      ? reviewsSummary.totalCount
      : typeof product.reviewCount === 'number'
        ? product.reviewCount
        : null;

  const salesCount =
    typeof product.salesCount === 'number' &&
    !Number.isNaN(product.salesCount)
      ? product.salesCount
      : typeof product.soldCount === 'number' && !Number.isNaN(product.soldCount)
        ? product.soldCount
        : null;

  const inStock =
    typeof product.inStock === 'boolean'
      ? product.inStock
      : product.status === 'published';

  const affiliateUrl = product.affiliateUrl || `/go/${product.slug}`;
  const categorySlug = product.categorySlug || '';
  const productSlug = product.slug || slug;

  // Formatting helpers
  const formattedPrice =
    priceAmount !== null
      ? formatProductPrice(priceAmount, priceCurrency, locale)
      : isAr
        ? 'تحقق من السعر'
        : 'Check Price';

  const formattedOldPrice =
    oldPrice !== null && priceAmount !== null && oldPrice > priceAmount
      ? formatProductPrice(oldPrice, priceCurrency, locale)
      : null;

  const dictionary = getDictionary(locale);
  const homeLabel = dictionary.nav.home || (isAr ? 'الرئيسية' : 'Home');
  const productsLabel =
    dictionary.nav.products || (isAr ? 'المنتجات' : 'Products');

  const categoryName =
    categoryDoc && categoryDoc.name
      ? pickLocalizedText(categoryDoc.name, locale)
      : product.categoryName
        ? pickLocalizedText(product.categoryName, locale)
        : categorySlug || productsLabel;

  const productUrl = `${BASE_URL}/${locale}/products/${encodeURIComponent(
    productSlug
  )}`;
  const allImageUrls = images
    .map((img) => resolveAbsoluteImageUrl(img.url, name))
    .filter(Boolean);
  const primaryImageUrl =
    allImageUrls[0] || resolveAbsoluteImageUrl(undefined, name);

  const sourceRaw = (product.sourceSlug || product.sourceId || 'Amazon').trim();
  const sourceBrandName =
    sourceRaw.charAt(0).toUpperCase() + sourceRaw.slice(1);

  // Extract positiveNotes (Pros / Key Specs) and negativeNotes (Cons / Things to Notice) for Google Rich Snippets
  const positiveNotesList: string[] = [];
  if (Array.isArray(product.pros) && product.pros.length > 0) {
    for (const p of product.pros) {
      const txt = typeof p === 'string' ? p : pickLocalizedText(p, locale);
      if (txt) positiveNotesList.push(txt);
    }
  }
  const dnaKeySpecs =
    (isAr
      ? product.comparisonDna?.keySpecs?.ar
      : product.comparisonDna?.keySpecs?.en) || [];
  for (const sp of dnaKeySpecs) {
    if (sp && !positiveNotesList.includes(sp)) {
      positiveNotesList.push(sp);
    }
  }
  if (positiveNotesList.length === 0 && whyWeChoseIt) {
    positiveNotesList.push(whyWeChoseIt.slice(0, 120));
  }

  const negativeNotesList: string[] = [];
  if (Array.isArray(product.cons) && product.cons.length > 0) {
    for (const c of product.cons) {
      const txt = typeof c === 'string' ? c : pickLocalizedText(c, locale);
      if (txt) negativeNotesList.push(txt);
    }
  }
  if (negativeNotesList.length === 0 && thingsToNotice) {
    negativeNotesList.push(thingsToNotice.slice(0, 120));
  }

  const hasVerifiedRating = typeof effectiveRating === 'number' && effectiveRating > 0;
  const hasVerifiedReviews = typeof effectiveReviewCount === 'number' && effectiveReviewCount > 0;

  const editorialReviewNode: Record<string, unknown> = {
    '@type': 'Review',
    author: {
      '@type': 'Organization',
      name: 'AQURIVO Editorial Team',
    },
    ...(hasVerifiedRating
      ? {
          reviewRating: {
            '@type': 'Rating',
            ratingValue: Number(effectiveRating.toFixed(1)),
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
    ...(positiveNotesList.length > 0
      ? {
          positiveNotes: {
            '@type': 'ItemList',
            itemListElement: positiveNotesList.slice(0, 5).map((note, idx) => ({
              '@type': 'ListItem',
              position: idx + 1,
              name: note,
            })),
          },
        }
      : {}),
    ...(negativeNotesList.length > 0
      ? {
          negativeNotes: {
            '@type': 'ItemList',
            itemListElement: negativeNotesList.slice(0, 4).map((note, idx) => ({
              '@type': 'ListItem',
              position: idx + 1,
              name: note,
            })),
          },
        }
      : {}),
  };

  const webPageSchemaNode: Record<string, unknown> = {
    '@type': 'WebPage',
    '@id': productUrl,
    url: productUrl,
    name: `${name} | AQURIVO`,
    inLanguage: isAr ? 'ar' : 'en',
    description: (shortSummary || detailedDescription || name).slice(0, 155),
    thumbnailUrl: primaryImageUrl,
    primaryImageOfPage: {
      '@type': 'ImageObject',
      '@id': `${productUrl}#primaryimage`,
      url: primaryImageUrl,
      contentUrl: primaryImageUrl,
      width: 800,
      height: 800,
      caption: name,
    },
    mainEntity: {
      '@id': `${productUrl}#product`,
    },
  };

  // JSON-LD structured data with all real product image URLs, brand, SKU, and Pros/Cons review
  const productSchemaNode: Record<string, unknown> = {
    '@type': 'Product',
    '@id': `${productUrl}#product`,
    mainEntityOfPage: {
      '@id': productUrl,
    },
    name: truncateSchemaName(name, 75),
    sku: product.id || productSlug,
    mpn: productSlug,
    category: categoryName,
    brand: {
      '@type': 'Brand',
      name: sourceBrandName || 'AQURIVO Curated',
    },
    description: (shortSummary || detailedDescription || name).slice(0, 250),
    image: allImageUrls.length > 0 ? allImageUrls : [primaryImageUrl],
    thumbnailUrl: primaryImageUrl,
    url: productUrl,
    ...(positiveNotesList.length > 0 || negativeNotesList.length > 0 || hasVerifiedRating
      ? { review: editorialReviewNode }
      : {}),
    ...(hasVerifiedRating && hasVerifiedReviews
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: Number(effectiveRating.toFixed(1)),
            reviewCount: effectiveReviewCount,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
    ...(priceAmount !== null && priceAmount > 0
      ? {
          offers: {
            '@type': 'Offer',
            price: priceAmount,
            priceCurrency: normalizeIsoCurrency(priceCurrency),
            priceValidUntil: '2027-12-31',
            validFrom: product.createdAt
              ? new Date(product.createdAt).toISOString().split('T')[0]
              : '2026-01-01',
            itemCondition: 'https://schema.org/NewCondition',
            availability: inStock
              ? 'https://schema.org/InStock'
              : 'https://schema.org/OutOfStock',
            url: productUrl,
            seller: {
              '@type': 'Organization',
              name: sourceBrandName || 'AQURIVO',
            },
            hasMerchantReturnPolicy: {
              '@type': 'MerchantReturnPolicy',
              applicableCountry: 'US',
              returnPolicyCategory:
                'https://schema.org/MerchantReturnFiniteReturnWindow',
              merchantReturnDays: 30,
              returnMethod: 'https://schema.org/ReturnByMail',
              returnFees: 'https://schema.org/FreeReturn',
            },
            shippingDetails: {
              '@type': 'OfferShippingDetails',
              shippingRate: {
                '@type': 'MonetaryAmount',
                value: 0,
                currency: normalizeIsoCurrency(priceCurrency),
              },
              shippingDestination: {
                '@type': 'DefinedRegion',
                addressCountry: 'US',
              },
              deliveryTime: {
                '@type': 'ShippingDeliveryTime',
                handlingTime: {
                  '@type': 'QuantitativeValue',
                  minValue: 0,
                  maxValue: 2,
                  unitCode: 'd',
                },
                transitTime: {
                  '@type': 'QuantitativeValue',
                  minValue: 2,
                  maxValue: 5,
                  unitCode: 'd',
                },
              },
            },
          },
        }
      : {}),
  };

  // VideoObject structured data nodes when the product has videos
  const allVideoUrls = Array.from(
    new Set(
      [
        ...(Array.isArray(product.videoUrls) ? product.videoUrls : []),
        ...(product.videoUrl ? [product.videoUrl] : []),
      ]
        .map((u) => (typeof u === 'string' ? u.trim() : ''))
        .filter(Boolean)
    )
  );

  const videoSchemaNodes = allVideoUrls.map((vUrl, idx) => ({
    '@type': 'VideoObject',
    name:
      allVideoUrls.length > 1
        ? `${name} — Video ${idx + 1}`
        : `${name} — Product Video`,
    description: (shortSummary || detailedDescription || name).slice(0, 155),
    thumbnailUrl:
      allImageUrls.length > 0 ? allImageUrls : [primaryImageUrl],
    uploadDate: product.updatedAt || product.createdAt || new Date().toISOString(),
    contentUrl: vUrl,
    embedUrl: vUrl,
  }));

  const breadcrumbSchemaNode = {
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: homeLabel,
        item: `${BASE_URL}/${locale}`,
      },
      ...(categorySlug
        ? [
            {
              '@type': 'ListItem',
              position: 2,
              name: categoryName,
              item: `${BASE_URL}/${locale}/categories/${encodeURIComponent(
                categorySlug
              )}`,
            },
            {
              '@type': 'ListItem',
              position: 3,
              name,
              item: productUrl,
            },
          ]
        : [
            {
              '@type': 'ListItem',
              position: 2,
              name,
              item: productUrl,
            },
          ]),
    ],
  };

  const structuredDataJsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      webPageSchemaNode,
      productSchemaNode,
      breadcrumbSchemaNode,
      ...videoSchemaNodes,
    ],
  };

  return (
    <div
      className={styles.pageWrapper}
      dir={isAr ? 'rtl' : 'ltr'}
      lang={locale}
    >
      {/* Schema.org JSON-LD with real product images */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredDataJsonLd),
        }}
      />

      <SiteHeader />

      <main className={styles.container}>
        {/* Invisible Client Dwell & Deep Intent Signal Tracker */}
        <ProductDwellTracker
          slug={productSlug}
          categorySlug={categorySlug}
          priceUsd={priceAmount || 0}
        />

        {/* Breadcrumb Trail */}
        <nav aria-label="Breadcrumb" className={styles.breadcrumbsNav}>
          <ol className={styles.breadcrumbsList}>
            <li className={styles.breadcrumbItem}>
              <Link href={`/${locale}`} className={styles.breadcrumbLink}>
                {homeLabel}
              </Link>
              <span className={styles.breadcrumbSeparator} aria-hidden="true">
                /
              </span>
            </li>
            {categorySlug && (
              <li className={styles.breadcrumbItem}>
                <Link
                  href={`/${locale}/categories/${categorySlug}`}
                  className={styles.breadcrumbLink}
                >
                  {categoryName}
                </Link>
                <span
                  className={styles.breadcrumbSeparator}
                  aria-hidden="true"
                >
                  /
                </span>
              </li>
            )}
            <li className={styles.breadcrumbItem}>
              <span className={styles.breadcrumbCurrent} aria-current="page">
                {name}
              </span>
            </li>
          </ol>
        </nav>

        {/* Top Product Layout: Single column on mobile, 50/50 on desktop */}
        <div className={styles.productLayout}>
          {/* Section 1: Gallery (images: [{ url, alt }]) */}
          <div className={styles.imageSection}>
            <ProductGallery
              images={images}
              videoUrl={product.videoUrl}
              videoUrls={product.videoUrls}
              videos={product.videos}
              productTitle={name}
              locale={locale}
            />
          </div>

          {/* Section 2: Info & Purchase directly under image on mobile */}
          <div className={styles.infoSection}>
            <h1 className={styles.productTitle}>{name}</h1>

            {shortSummary && shortSummary !== name && (
              <p className={styles.shortSummary}>{shortSummary}</p>
            )}

            {((effectiveRating !== null && effectiveRating > 0) ||
              (salesCount !== null && salesCount > 0)) && (
              <div className={styles.ratingRow}>
                {effectiveRating !== null && effectiveRating > 0 && (
                  <>
                    <div
                      className={styles.starsGroup}
                      aria-label={`${effectiveRating} out of 5 stars`}
                    >
                      {'★'.repeat(
                        Math.min(5, Math.max(1, Math.round(effectiveRating)))
                      )}
                      {'☆'.repeat(
                        Math.max(
                          0,
                          5 - Math.min(5, Math.max(1, Math.round(effectiveRating)))
                        )
                      )}
                    </div>
                    <span className={styles.ratingScore}>
                      {effectiveRating.toFixed(1)}
                    </span>
                  </>
                )}

                {effectiveReviewCount !== null && effectiveReviewCount > 0 && (
                  <span className={styles.reviewCount}>
                    ({formatNumber(effectiveReviewCount, locale as Locale)}{' '}
                    {isAr ? 'تقييم' : 'reviews'})
                  </span>
                )}

                {salesCount !== null && salesCount > 0 && (
                  <span className={styles.salesCount}>
                    <span className={styles.metaSeparator} aria-hidden="true">
                      •
                    </span>
                    {isAr
                      ? `تم بيع +${formatNumber(salesCount, locale as Locale)} قطعة`
                      : `${formatNumber(salesCount, locale as Locale)}+ sold`}
                  </span>
                )}
              </div>
            )}

            <ProductPriceRow
              priceAmount={priceAmount}
              oldPrice={oldPrice}
              priceCurrency={priceCurrency}
              discount={discount}
              inStock={inStock}
              locale={locale}
              productMeta={{
                id: product.id || productSlug,
                slug: productSlug,
                titleAr:
                  resolveLocalizedField(product.name, product.title, 'ar') ||
                  name,
                titleEn:
                  resolveLocalizedField(product.name, product.title, 'en') ||
                  name,
                categorySlug: categorySlug.toLowerCase(),
                imageUrl: allImageUrls[0] || '',
              }}
            />

            <div className={styles.purchaseActions}>
              <BuyNowButton
                href={affiliateUrl}
                label={isAr ? 'اشتري الآن' : 'Buy Now'}
                variant="primary"
                productId={product.id || productSlug}
                categorySlug={categorySlug}
              />

              <p className={styles.redirectNotice}>
                {isAr
                  ? 'سيتم توجيهك للمتجر الرسمي'
                  : "You'll be redirected to the official store"}
              </p>

              <div className={styles.trustBadge}>
                <span className={styles.trustBadgeIcon} aria-hidden="true">
                  ✓
                </span>
                <span>{isAr ? 'شراء آمن ومضمون' : 'Safe & Secure'}</span>
              </div>

              <div className={styles.secondaryActionsRow}>
                <SmartToolPulse
                  productSlug={productSlug}
                  productName={name}
                  priceAmount={priceAmount}
                  priceCurrency={priceCurrency}
                  formattedPrice={priceAmount !== null ? formattedPrice : undefined}
                  categorySlug={categorySlug}
                  categoryName={categoryName}
                  discount={discount}
                  shortSummary={shortSummary}
                  locale={locale}
                />

                <ProductShareButton
                  productSlug={productSlug}
                  productName={name}
                  formattedPrice={priceAmount !== null ? formattedPrice : undefined}
                  discount={discount}
                  shortSummary={shortSummary}
                  locale={locale}
                />

                <ReportModal
                  productSlug={productSlug}
                  productName={name}
                  locale={locale}
                  variant="product"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Editorial Highlights: whyWeChoseIt and thingsToNotice */}
        {(whyWeChoseIt || thingsToNotice) && (
          <div className={styles.editorialSection}>
            {whyWeChoseIt && (
              <div className={styles.editorialCard}>
                <h2 className={styles.editorialHeader}>
                  <span className={styles.editorialIconTeal} aria-hidden="true">
                    ★
                  </span>
                  <span>
                    {isAr ? 'لماذا اخترنا هذا المنتج؟' : 'Why We Chose It'}
                  </span>
                </h2>
                <p className={styles.editorialText}>{whyWeChoseIt}</p>
              </div>
            )}

            {thingsToNotice && (
              <div
                className={`${styles.editorialCard} ${styles.editorialCardNotice}`}
              >
                <h2 className={styles.editorialHeader}>
                  <span
                    className={styles.editorialIconNotice}
                    aria-hidden="true"
                  >
                    ℹ
                  </span>
                  <span>
                    {isAr ? 'نقاط يجب الانتباه لها' : 'Things to Notice'}
                  </span>
                </h2>
                <p className={styles.editorialText}>{thingsToNotice}</p>
              </div>
            )}
          </div>
        )}

        {/* detailedDescription */}
        {detailedDescription && (
          <ProductDescription
            description={detailedDescription}
            locale={locale}
          />
        )}

        {/* Product Reviews & Rating System */}
        <ProductReviews
          productSlug={product.slug}
          locale={locale}
          initialReviews={reviewsSummary.reviews}
          initialAverageRating={reviewsSummary.averageRating}
          initialTotalCount={reviewsSummary.totalCount}
          initialDistribution={reviewsSummary.distribution}
        />

        {/* Related Buying Guides (أدلة شراء ذات صلة بالمنتج) */}
        {relatedGuides.length > 0 && (
          <section className={styles.relatedGuidesSection} aria-labelledby="related-guides-heading">
            <h2 id="related-guides-heading" className={styles.relatedGuidesHeading}>
              <EditorialGuideIcon size={20} />
              <span>
                {isAr ? 'أدلة ومراجعات ذات صلة' : 'Related Buying Guides & Reviews'}
              </span>
            </h2>
            <div className={styles.relatedGuidesGrid}>
              {relatedGuides.map((guide) => (
                <Link
                  key={guide.id}
                  href={`/${locale}/guides/${encodeURIComponent(guide.slug)}`}
                  prefetch={false}
                  className={styles.guideMiniCard}
                >
                  <span className={styles.guideMiniCategory}>
                    {isAr ? guide.categoryName.ar : guide.categoryName.en}
                  </span>
                  <h3 className={styles.guideMiniTitle}>
                    {isAr ? guide.title.ar : guide.title.en}
                  </h3>
                  <p className={styles.guideMiniExcerpt}>
                    {isAr ? guide.excerpt.ar : guide.excerpt.en}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Similar Products */}
        {similarProducts.length > 0 && (
          <section
            className={styles.similarSection}
            aria-labelledby="similar-products-heading"
          >
            <h2 id="similar-products-heading" className={styles.similarHeading}>
              {isAr ? 'منتجات مشابهة' : 'Similar Products'}
            </h2>

            <SimilarProductsAdaptiveGrid
              initialProducts={similarProducts}
              currentProduct={product}
              locale={locale}
            />
          </section>
        )}
      </main>

      {/* Sticky Buy Button for Mobile */}
      <div className={styles.stickyMobileBar} aria-label="Quick Purchase Bar">
        <div className={styles.stickyInfo}>
          <div className={styles.stickyTitle}>{name}</div>
          {priceAmount !== null && (
            <div className={`${styles.stickyPrice} tabularNums`}>
              {formattedPrice}
            </div>
          )}
        </div>
        <BuyNowButton
          href={affiliateUrl}
          label={isAr ? 'اشتري الآن' : 'Buy Now'}
          variant="sticky"
          productId={product.id || productSlug}
          categorySlug={categorySlug}
        />
      </div>

      <SiteFooter />
    </div>
  );
}
