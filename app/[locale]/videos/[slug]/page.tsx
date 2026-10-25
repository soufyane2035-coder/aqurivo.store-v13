import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Locale } from '@/types';
import { getProductVideoSources } from '@/lib/product-video';
import { getProductBySlug, listPublishedProducts } from '@/server/repositories/products.repo';
import styles from './VideoWatchPage.module.css';

export const revalidate = 86400;

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://aqurivo.store';
const LOCALES: Locale[] = ['ar', 'en'];

async function getWatchPageData(locale: Locale, slug: string) {
  const decodedSlug = decodeURIComponent(slug);
  const product =
    (await getProductBySlug(decodedSlug)) ?? (await getProductBySlug(slug));
  if (!product) return null;

  const video = getProductVideoSources(product, locale, BASE_URL)[0];
  if (!video) return null;

  const title =
    product.name?.[locale] ||
    product.title?.[locale] ||
    product.name?.en ||
    product.title?.en ||
    product.slug;
  const description =
    product.shortSummary?.[locale] ||
    product.description?.[locale] ||
    product.shortSummary?.en ||
    product.description?.en ||
    title;
  const productUrl = `${BASE_URL}/${locale}/products/${encodeURIComponent(product.slug)}`;
  const pageUrl = `${BASE_URL}/${locale}/videos/${encodeURIComponent(product.slug)}`;

  return { product, video, title, description, productUrl, pageUrl };
}

export async function generateStaticParams() {
  const products = await listPublishedProducts();
  return products.flatMap((product) =>
    getProductVideoSources(product, 'en', BASE_URL).length > 0
      ? LOCALES.map((locale) => ({ locale, slug: product.slug }))
      : []
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  if (rawLocale !== 'ar' && rawLocale !== 'en') return {};
  const locale = rawLocale as Locale;
  const data = await getWatchPageData(locale, slug);
  if (!data) {
    return {
      title: 'Video Not Found | AQURIVO',
      robots: { index: false, follow: false },
    };
  }

  return {
    title: `${data.video.title} | AQURIVO`,
    description: data.description.slice(0, 155),
    alternates: {
      canonical: data.pageUrl,
      languages: {
        ar: `${BASE_URL}/ar/videos/${encodeURIComponent(data.product.slug)}`,
        en: `${BASE_URL}/en/videos/${encodeURIComponent(data.product.slug)}`,
        'x-default': `${BASE_URL}/en/videos/${encodeURIComponent(data.product.slug)}`,
      },
    },
    openGraph: {
      title: data.video.title,
      description: data.description.slice(0, 155),
      url: data.pageUrl,
      type: 'website',
      images: data.video.thumbnailUrl ? [data.video.thumbnailUrl] : [],
    },
    robots: { index: true, follow: true },
  };
}

export default async function VideoWatchPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: rawLocale, slug } = await params;
  if (rawLocale !== 'ar' && rawLocale !== 'en') notFound();
  const locale = rawLocale as Locale;
  const data = await getWatchPageData(locale, slug);
  if (!data) notFound();

  const isArabic = locale === 'ar';
  const videoObject = {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: data.video.title,
    description: data.description.slice(0, 300),
    thumbnailUrl: data.video.thumbnailUrl,
    ...(data.video.kind === 'file'
      ? { contentUrl: data.video.url }
      : { embedUrl: data.video.embedUrl }),
    mainEntityOfPage: data.pageUrl,
  };

  return (
    <main className={styles.page} dir={isArabic ? 'rtl' : 'ltr'} lang={locale}>
      <div className={styles.content}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(videoObject).replace(/</g, '\\u003c'),
          }}
        />
        <h1 className={styles.heading}>{data.video.title}</h1>
        <p className={styles.description}>{data.description}</p>
        {data.video.kind === 'file' ? (
          <video
            className={styles.player}
            controls
            playsInline
            preload="metadata"
            poster={data.video.thumbnailUrl || undefined}
            src={data.video.url}
          >
            {isArabic
              ? 'متصفحك لا يدعم تشغيل الفيديو.'
              : 'Your browser does not support video playback.'}
          </video>
        ) : (
          <iframe
            className={styles.player}
            src={data.video.embedUrl}
            title={data.video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        )}
        <Link className={styles.productLink} href={data.productUrl}>
          {isArabic ? 'العودة إلى تفاصيل المنتج' : 'View product details'}
        </Link>
      </div>
    </main>
  );
}
