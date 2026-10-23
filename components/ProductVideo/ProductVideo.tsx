'use client';

import React, { useState } from 'react';
import { Play } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import styles from './ProductVideo.module.css';

export interface ProductVideoProps {
  videoUrl?: string;
  videoUrls?: string[];
  title?: string;
}

function extractYouTubeId(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();

    if (host.includes('youtu.be')) {
      const id = parsed.pathname.split('/').filter(Boolean)[0];
      return id || null;
    }

    if (host.includes('youtube.com')) {
      const vParam = parsed.searchParams.get('v');
      if (vParam) return vParam;

      const segments = parsed.pathname.split('/').filter(Boolean);
      const markerIdx = segments.findIndex(
        (s) => s === 'embed' || s === 'shorts' || s === 'v'
      );
      if (markerIdx !== -1 && segments[markerIdx + 1]) {
        return segments[markerIdx + 1];
      }
    }
  } catch {
    // Fallback regex
  }

  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/i
  );
  return match ? match[1] : null;
}

function extractVimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(?:video\/|channels\/[^/]+\/)?(\d+)/i);
  return match ? match[1] : null;
}

function isDirectVideoFile(url: string): boolean {
  if (url.startsWith('data:video/') || url.startsWith('blob:')) {
    return true;
  }
  const cleanPath = url.split('?')[0].split('#')[0].toLowerCase();
  return (
    cleanPath.endsWith('.mp4') ||
    cleanPath.endsWith('.webm') ||
    cleanPath.endsWith('.ogg') ||
    cleanPath.endsWith('.mov') ||
    cleanPath.endsWith('.m4v') ||
    cleanPath.includes('/video/upload/')
  );
}

function normalizeVideoSourceUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';
  if (
    trimmed.startsWith('data:video/') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('/') ||
    /^https?:\/\//i.test(trimmed)
  ) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

function SingleVideoContainer({
  rawUrl,
  title,
  isAr,
  index,
}: {
  rawUrl: string;
  title?: string;
  isAr: boolean;
  index: number;
}) {
  const [videoFailed, setVideoFailed] = useState(false);
  const normalizedUrl = normalizeVideoSourceUrl(rawUrl);
  const lowerUrl = normalizedUrl.toLowerCase();

  const isYouTube =
    lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be');
  const isVimeo = lowerUrl.includes('vimeo.com');
  const isDirectVideo = isDirectVideoFile(normalizedUrl);
  const isTikTok = lowerUrl.includes('tiktok.com');
  const isInstagram = lowerUrl.includes('instagram.com');

  const youtubeId = isYouTube ? extractYouTubeId(normalizedUrl) : null;
  const vimeoId = isVimeo ? extractVimeoId(normalizedUrl) : null;

  let externalLabel = isAr ? 'شاهد الفيديو ↗' : 'Watch Video ↗';
  if (isTikTok) {
    externalLabel = isAr ? 'شاهد على TikTok ↗' : 'Watch on TikTok ↗';
  } else if (isInstagram) {
    externalLabel = isAr ? 'شاهد على Instagram ↗' : 'Watch on Instagram ↗';
  }

  const baseTitle = title || (isAr ? 'شاهد المنتج' : 'Watch Product');
  const effectiveTitle = index > 0 ? `${baseTitle} (${index + 1})` : baseTitle;

  return (
    <div className={styles.aspectContainer}>
      {youtubeId ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(
            youtubeId
          )}?rel=0`}
          title={effectiveTitle}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
          className={styles.mediaEmbed}
        />
      ) : vimeoId ? (
        <iframe
          src={`https://player.vimeo.com/video/${encodeURIComponent(vimeoId)}`}
          title={effectiveTitle}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          loading="lazy"
          className={styles.mediaEmbed}
        />
      ) : isDirectVideo && !videoFailed ? (
        <video
          src={normalizedUrl}
          controls
          playsInline
          preload="metadata"
          className={styles.mediaEmbed}
          onError={() => setVideoFailed(true)}
        >
          <source src={normalizedUrl} />
          {isAr
            ? 'متصفحك لا يدعم تشغيل الفيديو المباشر.'
            : 'Your browser does not support embedded video playback.'}
        </video>
      ) : (
        <div className={styles.externalCard}>
          <span className={styles.playCircle} aria-hidden="true">
            <Play size={24} />
          </span>
          <a
            href={normalizedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.externalBtn}
          >
            {externalLabel}
          </a>
        </div>
      )}
    </div>
  );
}

export function ProductVideo({ videoUrl, videoUrls, title }: ProductVideoProps) {
  const { locale } = useI18n();
  const isAr = locale === 'ar';

  const allUrls = Array.from(
    new Set(
      [
        ...(Array.isArray(videoUrls) ? videoUrls : []),
        ...(typeof videoUrl === 'string' ? [videoUrl] : []),
      ]
        .map((u) => (typeof u === 'string' ? u.trim() : ''))
        .filter(Boolean)
    )
  );

  if (allUrls.length === 0) {
    return null;
  }

  return (
    <section
      className={styles.videoSection}
      aria-labelledby="product-video-heading"
    >
      <h2 id="product-video-heading" className={styles.sectionHeading}>
        <Play size={18} className={styles.headingIcon} aria-hidden="true" />
        <span>{isAr ? 'شاهد المنتج' : 'Watch Product'}</span>
      </h2>

      {allUrls.map((url, idx) => (
        <SingleVideoContainer
          key={`${url}-${idx}`}
          rawUrl={url}
          title={title}
          isAr={isAr}
          index={idx}
        />
      ))}
    </section>
  );
}
