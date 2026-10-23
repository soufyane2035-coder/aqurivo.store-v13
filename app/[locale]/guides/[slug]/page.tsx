import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { Product } from '@/types';
import { getPublishedArticleBySlug } from '@/server/repositories/articles.repo';
import {
  getProductBySlug,
  listPublishedProducts,
} from '@/server/repositories/products.repo';
import { getSmartGuideProducts } from '@/server/services/recommendation.service';
import { GuideDetailView } from './GuideDetailView';

export const revalidate = 86400;

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://aqurivo.store';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const article =
    (await getPublishedArticleBySlug(decodedSlug)) ??
    (await getPublishedArticleBySlug(slug));

  if (!article) {
    return { title: 'Guide Not Found | AQURIVO' };
  }

  const isAr = locale === 'ar';
  const seoTitle = isAr ? article.seoTitle?.ar : article.seoTitle?.en;
  const rawTitle =
    seoTitle ||
    (isAr ? article.title.ar : article.title.en) ||
    article.title.ar ||
    article.title.en ||
    'Guide';

  const seoDescription = isAr
    ? article.seoDescription?.ar
    : article.seoDescription?.en;
  const description =
    seoDescription ||
    (isAr ? article.excerpt.ar : article.excerpt.en) ||
    article.excerpt.ar ||
    article.excerpt.en ||
    '';

  const canonicalUrl = `${BASE_URL}/${locale}/guides/${encodeURIComponent(
    article.slug || slug
  )}`;
  const ogFallbackCardUrl = `${BASE_URL}/api/og?title=${encodeURIComponent(
    rawTitle
  )}&subtitle=${encodeURIComponent(description.slice(0, 110))}&category=${encodeURIComponent(
    isAr ? 'دليل شراء ومراجعة' : 'Buying Guide & Review'
  )}&source=AQURIVO`;

  const coverImage = article.coverImage
    ? article.coverImage.startsWith('http')
      ? article.coverImage
      : `${BASE_URL}${article.coverImage}`
    : ogFallbackCardUrl;

  const authorName = article.authorName || 'AQURIVO Editorial Team';
  const readingTimeMin = article.readingTimeMinutes || 5;

  return {
    title: rawTitle.includes('AQURIVO') ? rawTitle : `${rawTitle} | AQURIVO`,
    description: description.slice(0, 155),
    ...(article.seoKeywords && article.seoKeywords.length > 0
      ? { keywords: article.seoKeywords.join(', ') }
      : {}),
    authors: [{ name: authorName }],
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
    other: {
      thumbnail: coverImage,
      'og:image:secure_url': coverImage,
      'og:image:alt': rawTitle,
      'twitter:label1': isAr ? 'الكاتب' : 'Written by',
      'twitter:data1': authorName,
      'twitter:label2': isAr ? 'وقت القراءة' : 'Reading Time',
      'twitter:data2': isAr ? `${readingTimeMin} دقائق` : `${readingTimeMin} min read`,
    },
    alternates: {
      canonical: canonicalUrl,
      languages: {
        ar: `${BASE_URL}/ar/guides/${encodeURIComponent(article.slug || slug)}`,
        en: `${BASE_URL}/en/guides/${encodeURIComponent(article.slug || slug)}`,
        'x-default': `${BASE_URL}/en/guides/${encodeURIComponent(
          article.slug || slug
        )}`,
      },
    },
    openGraph: {
      title: rawTitle,
      description: description.slice(0, 155),
      url: canonicalUrl,
      siteName: 'AQURIVO',
      locale: isAr ? 'ar_SA' : 'en_US',
      alternateLocale: isAr ? ['en_US'] : ['ar_SA'],
      type: 'article',
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt,
      authors: [authorName],
      section: article.categorySlug || (isAr ? 'أدلة الشراء' : 'Buying Guides'),
      tags: article.seoKeywords || [],
      images: [
        {
          url: coverImage,
          secureUrl: coverImage,
          width: 1200,
          height: 630,
          alt: rawTitle,
        },
        ...(coverImage !== ogFallbackCardUrl
          ? [
              {
                url: ogFallbackCardUrl,
                width: 1200,
                height: 630,
                alt: `${rawTitle} | AQURIVO`,
              },
            ]
          : []),
      ],
    },
    twitter: {
      card: 'summary_large_image',
      site: '@aqurivo',
      creator: '@aqurivo',
      title: rawTitle,
      description: description.slice(0, 155),
      images: [
        {
          url: coverImage,
          alt: rawTitle,
        },
      ],
    },
  };
}

export default async function GuideDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (locale !== 'ar' && locale !== 'en') {
    notFound();
  }

  const decodedSlug = decodeURIComponent(slug);
  const article =
    (await getPublishedArticleBySlug(decodedSlug)) ??
    (await getPublishedArticleBySlug(slug));

  if (!article) {
    notFound();
  }

  // Extract any product slugs referenced inside the article HTML body
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

  const normalizeKey = (raw: string): string => {
    const trimmed = raw.trim();
    const urlMatch = trimmed.match(/\/products\/([^/?#\s"'<>]+)/i);
    const extracted = urlMatch ? urlMatch[1] : trimmed;
    try {
      return decodeURIComponent(extracted).trim();
    } catch {
      return extracted.trim();
    }
  };

  // Fetch all related products server-side (including topPickProductId and inline HTML links)
  const productLookupKeys = Array.from(
    new Set(
      [
        article.topPickProductId,
        ...(article.relatedProductIds || []),
        ...htmlSlugMatches,
      ]
        .filter((val): val is string => Boolean(val && val.trim()))
        .map(normalizeKey)
        .filter(Boolean)
    )
  );

  const relatedProductPromises = productLookupKeys.map((idOrSlug) =>
    getProductBySlug(idOrSlug)
  );
  const directProducts = (await Promise.all(relatedProductPromises)).filter(
    (p): p is Product => p !== null
  );

  const allPublished = await listPublishedProducts();
  const resolvedProducts = getSmartGuideProducts(article, allPublished, 4);

  const isAr = locale === 'ar';
  const articleTitle = isAr ? article.title.ar : article.title.en;
  const articleExcerpt =
    (isAr ? article.seoDescription?.ar : article.seoDescription?.en) ||
    (isAr ? article.excerpt.ar : article.excerpt.en);
  const articleUrl = `${BASE_URL}/${locale}/guides/${encodeURIComponent(
    article.slug
  )}`;
  const rawCover =
    article.coverImage || resolvedProducts[0]?.images?.[0]?.url || '/images/hero-desktop.jpg';
  const coverImage = rawCover.startsWith('http')
    ? rawCover
    : `${BASE_URL}${rawCover.startsWith('/') ? rawCover : `/${rawCover}`}`;
  const authorName = article.authorName || 'AQURIVO Editorial Team';

  const faqItems = article.faqItems || [];
  const faqSchemaNode =
    faqItems.length > 0
      ? {
          '@type': 'FAQPage',
          mainEntity: faqItems.map((faq) => ({
            '@type': 'Question',
            name: isAr
              ? faq.question.ar || faq.question.en
              : faq.question.en || faq.question.ar,
            acceptedAnswer: {
              '@type': 'Answer',
              text: isAr
                ? faq.answer.ar || faq.answer.en
                : faq.answer.en || faq.answer.ar,
            },
          })),
        }
      : null;

  const comparedProductsItemListNode =
    resolvedProducts.length > 0
      ? {
          '@type': 'ItemList',
          name: isAr
            ? `المنتجات المقارنة والموصى بها في: ${articleTitle}`
            : `Compared & Recommended Products in: ${articleTitle}`,
          numberOfItems: resolvedProducts.length,
          itemListElement: resolvedProducts.map((prod, idx) => {
            const prodSlug = encodeURIComponent(prod.slug || prod.id);
            const prodUrl = `${BASE_URL}/${locale}/products/${prodSlug}`;
            const prodName = isAr
              ? prod.title?.ar || prod.title?.en || prod.name?.ar || prod.slug
              : prod.title?.en || prod.title?.ar || prod.name?.en || prod.slug;
            const rawImg = prod.images?.[0]?.url?.trim() || '';
            const prodImg = rawImg
              ? rawImg.startsWith('http')
                ? rawImg
                : `${BASE_URL}${rawImg.startsWith('/') ? rawImg : `/${rawImg}`}`
              : `${BASE_URL}/api/og?title=${encodeURIComponent(prodName)}`;

            return {
              '@type': 'ListItem',
              position: idx + 1,
              url: prodUrl,
              name: prodName,
              image: prodImg,
              item: {
                '@type': 'Product',
                '@id': `${prodUrl}#product`,
                mainEntityOfPage: prodUrl,
                url: prodUrl,
                name: prodName,
                image: [prodImg],
                thumbnailUrl: prodImg,
              },
            };
          }),
        }
      : null;

  const structuredDataJsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        headline: articleTitle,
        description: articleExcerpt.slice(0, 155),
        inLanguage: isAr ? 'ar' : 'en',
        image: [coverImage],
        thumbnailUrl: coverImage,
        datePublished: article.publishedAt,
        dateModified: article.updatedAt || article.publishedAt,
        ...(article.seoKeywords && article.seoKeywords.length > 0
          ? { keywords: article.seoKeywords.join(', ') }
          : {}),
        ...(resolvedProducts.length > 0
          ? {
              mentions: resolvedProducts.map((prod) => {
                const prodSlug = encodeURIComponent(prod.slug || prod.id);
                const prodUrl = `${BASE_URL}/${locale}/products/${prodSlug}`;
                const prodName = isAr
                  ? prod.title?.ar || prod.title?.en || prod.slug
                  : prod.title?.en || prod.title?.ar || prod.slug;
                const rawImg = prod.images?.[0]?.url?.trim() || '';
                const prodImg = rawImg
                  ? rawImg.startsWith('http')
                    ? rawImg
                    : `${BASE_URL}${rawImg.startsWith('/') ? rawImg : `/${rawImg}`}`
                  : `${BASE_URL}/api/og?title=${encodeURIComponent(prodName)}`;
                return {
                  '@type': 'Product',
                  '@id': `${prodUrl}#product`,
                  mainEntityOfPage: prodUrl,
                  name: prodName,
                  url: prodUrl,
                  image: [prodImg],
                };
              }),
            }
          : {}),
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': articleUrl,
        },
        author: {
          '@type': 'Organization',
          name: authorName,
          url: BASE_URL,
        },
        publisher: {
          '@type': 'Organization',
          name: 'AQURIVO',
          logo: {
            '@type': 'ImageObject',
            url: `${BASE_URL}/api/logo?size=512`,
          },
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: isAr ? 'الرئيسية' : 'Home',
            item: `${BASE_URL}/${locale}`,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: isAr ? 'أدلة الشراء' : 'Buying Guides',
            item: `${BASE_URL}/${locale}/guides`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: articleTitle,
            item: articleUrl,
          },
        ],
      },
      ...(comparedProductsItemListNode ? [comparedProductsItemListNode] : []),
      ...(faqSchemaNode ? [faqSchemaNode] : []),
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredDataJsonLd),
        }}
      />
      <GuideDetailView article={article} relatedProducts={resolvedProducts} />
    </>
  );
}
