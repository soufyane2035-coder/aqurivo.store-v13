import type { Locale, Product, ProductVideo } from '@/types';

export interface ProductVideoSource {
  url: string;
  title: string;
  thumbnailUrl: string;
  kind: 'file' | 'youtube' | 'vimeo';
  embedUrl?: string;
}

type VideoMetadata = Pick<ProductVideo, 'title' | 'thumbnailUrl'>;

function localizedVideoTitle(
  value: VideoMetadata['title'],
  locale: Locale
): string {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value === 'object') {
    const localized = value[locale] || value.en || value.ar;
    if (typeof localized === 'string') return localized.trim();
  }
  return '';
}

function getYouTubeId(url: URL): string | null {
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  if (host === 'youtu.be') {
    return url.pathname.split('/').filter(Boolean)[0] || null;
  }
  if (host !== 'youtube.com' && !host.endsWith('.youtube.com')) return null;

  const videoId = url.searchParams.get('v');
  if (videoId) return videoId;
  const segments = url.pathname.split('/').filter(Boolean);
  const markerIndex = segments.findIndex((segment) =>
    ['embed', 'shorts', 'live', 'v'].includes(segment)
  );
  return markerIndex >= 0 ? segments[markerIndex + 1] || null : null;
}

function getVimeoId(url: URL): string | null {
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  if (host !== 'vimeo.com' && !host.endsWith('.vimeo.com')) return null;
  return url.pathname.split('/').filter(Boolean).find((part) => /^\d+$/.test(part)) || null;
}

function getVideoKind(url: URL): ProductVideoSource['kind'] | null {
  if (getYouTubeId(url)) return 'youtube';
  if (getVimeoId(url)) return 'vimeo';

  const pathname = url.pathname.toLowerCase();
  if (
    /\.(mp4|webm|ogg|mov|m4v|m3u8)$/.test(pathname) ||
    pathname.includes('/video/upload/') ||
    pathname.includes('vse-vms-transcoding-artifact')
  ) {
    return 'file';
  }
  return null;
}

function resolveImageUrl(rawUrl: string | undefined, baseUrl: string): string {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) return '';
  try {
    return new URL(trimmed, baseUrl).toString();
  } catch {
    return '';
  }
}

export function getProductVideoSources(
  product: Pick<Product, 'videoUrl' | 'videoUrls' | 'videos' | 'images' | 'name' | 'title'>,
  locale: Locale,
  baseUrl = 'https://aqurivo.store'
): ProductVideoSource[] {
  const metadataByUrl = new Map<string, VideoMetadata>();
  for (const video of product.videos || []) {
    if (video?.url) {
      metadataByUrl.set(video.url.trim(), {
        title: video.title,
        thumbnailUrl: video.thumbnailUrl,
      });
    }
  }

  const candidateUrls = [
    product.videoUrl,
    ...(product.videoUrls || []),
    ...(product.videos || []).map((video) => video?.url),
  ];
  const seen = new Set<string>();
  const productTitle =
    product.name?.[locale] ||
    product.title?.[locale] ||
    product.name?.en ||
    product.title?.en ||
    'AQURIVO';
  const fallbackThumbnail = resolveImageUrl(product.images?.[0]?.url, baseUrl);
  const sources: ProductVideoSource[] = [];

  for (const candidate of candidateUrls) {
    if (typeof candidate !== 'string') continue;
    const rawUrl = candidate.trim();
    if (!rawUrl || seen.has(rawUrl)) continue;
    seen.add(rawUrl);

    try {
      const parsedUrl = new URL(rawUrl);
      if (parsedUrl.protocol !== 'https:') continue;
      const kind = getVideoKind(parsedUrl);
      if (!kind) continue;

      const videoId = kind === 'youtube' ? getYouTubeId(parsedUrl) : null;
      const videoTitle =
        localizedVideoTitle(metadataByUrl.get(rawUrl)?.title, locale) ||
        (locale === 'ar' ? `فيديو ${productTitle}` : `${productTitle} Video`);
      const thumbnailUrl =
        resolveImageUrl(metadataByUrl.get(rawUrl)?.thumbnailUrl, baseUrl) ||
        (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : '') ||
        fallbackThumbnail;

      sources.push({
        url: parsedUrl.toString(),
        title: videoTitle,
        thumbnailUrl,
        kind,
        ...(kind === 'youtube' && videoId
          ? { embedUrl: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}` }
          : kind === 'vimeo'
            ? {
                embedUrl: `https://player.vimeo.com/video/${encodeURIComponent(
                  getVimeoId(parsedUrl) || ''
                )}`,
              }
            : {}),
      });
    } catch {
      continue;
    }
  }

  return sources;
}
