import type { Product, Locale } from '@/types';
import { normalizeIsoCurrency, truncateSchemaName } from '@/lib/utils';

export interface BuildProductSchemaOptions {
  product: Product;
  locale: Locale;
  siteUrl: string;
}

export function buildProductSchemaJson({
  product,
  locale,
  siteUrl,
}: BuildProductSchemaOptions) {
  const isAr = locale === 'ar';
  const prodSlug = encodeURIComponent(product.slug || product.id);
  const prodUrl = `${siteUrl}/${locale}/products/${prodSlug}`;

  const rawName = isAr
    ? product.title?.ar || product.title?.en || product.name?.ar || product.slug
    : product.title?.en || product.title?.ar || product.name?.en || product.slug;

  const shortName = truncateSchemaName(rawName, 75);

  const rawDesc = isAr
    ? product.shortSummary?.ar || product.description?.ar || rawName
    : product.shortSummary?.en || product.description?.en || rawName;
  const description = rawDesc.slice(0, 250);

  const rawImg = product.images?.[0]?.url?.trim() || '';
  const prodImg = rawImg
    ? rawImg.startsWith('http')
      ? rawImg
      : `${siteUrl}${rawImg.startsWith('/') ? rawImg : `/${rawImg}`}`
    : `${siteUrl}/api/og?title=${encodeURIComponent(shortName)}`;

  const allImages =
    Array.isArray(product.images) && product.images.length > 0
      ? product.images
          .map((img) => {
            const u = img?.url?.trim();
            if (!u) return null;
            return u.startsWith('http') ? u : `${siteUrl}${u.startsWith('/') ? u : `/${u}`}`;
          })
          .filter((u): u is string => Boolean(u))
      : [prodImg];

  const currencyCode = normalizeIsoCurrency(product.priceCurrency);
  const hasRealPrice = typeof product.priceAmount === 'number' && product.priceAmount > 0;
  const price = hasRealPrice ? product.priceAmount : null;

  const sourceRaw = (product.sourceSlug || product.sourceId || 'Amazon').trim();
  const brandName =
    (isAr ? product.sourceName?.ar : product.sourceName?.en) ||
    (sourceRaw.charAt(0).toUpperCase() + sourceRaw.slice(1));

  const realRating =
    typeof product.rating === 'number' && product.rating > 0
      ? product.rating
      : typeof product.stars === 'number' && product.stars > 0
        ? product.stars
        : null;

  const realReviews =
    typeof product.reviewCount === 'number' && product.reviewCount > 0
      ? product.reviewCount
      : null;

  const validFromDate = product.createdAt
    ? new Date(product.createdAt).toISOString().split('T')[0]
    : '2026-01-01';

  return {
    '@type': 'Product',
    '@id': `${prodUrl}#product`,
    mainEntityOfPage: prodUrl,
    url: prodUrl,
    name: shortName,
    description,
    sku: product.id || product.slug,
    mpn: product.slug,
    image: allImages,
    thumbnailUrl: prodImg,
    brand: {
      '@type': 'Brand',
      name: brandName,
    },
    category: isAr
      ? product.categoryName?.ar || 'عام'
      : product.categoryName?.en || 'General',
    ...(realRating !== null && realReviews !== null
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: Number(realRating.toFixed(1)),
            reviewCount: realReviews,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
    ...(realRating !== null
      ? {
          review: {
            '@type': 'Review',
            author: {
              '@type': 'Organization',
              name: 'AQURIVO Editorial Team',
            },
            reviewRating: {
              '@type': 'Rating',
              ratingValue: Number(realRating.toFixed(1)),
              bestRating: 5,
              worstRating: 1,
            },
          },
        }
      : {}),
    ...(hasRealPrice && price !== null
      ? {
          offers: {
            '@type': 'Offer',
            url: prodUrl,
            price: price,
            priceCurrency: currencyCode,
            priceValidUntil: '2027-12-31',
            validFrom: validFromDate,
            itemCondition: 'https://schema.org/NewCondition',
            availability:
              product.inStock !== false
                ? 'https://schema.org/InStock'
                : 'https://schema.org/OutOfStock',
            seller: {
              '@type': 'Organization',
              name: brandName,
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
          currency: currencyCode,
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
}
