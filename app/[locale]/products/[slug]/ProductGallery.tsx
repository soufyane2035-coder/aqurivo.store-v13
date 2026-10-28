'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { sanitizeMediaUrl, getCanonicalImageFingerprint } from '@/lib/magicContentParser';
import { getProductHeroTransitionName } from '@/lib/productHeroTransition';
import styles from './ProductPage.module.css';

interface GalleryImage {
  url: string;
  alt?: { ar?: string; en?: string } | string;
}

interface GalleryVideoItem {
  url: string;
  title?: { ar?: string; en?: string } | string;
  thumbnailUrl?: string;
}

interface ProductGalleryProps {
  images: GalleryImage[];
  videoUrl?: string;
  videoUrls?: string[];
  videos?: GalleryVideoItem[];
  productTitle: string;
  locale?: 'ar' | 'en';
  heroTransitionId?: string | null;
}

function isHlsVideoStreamUrl(rawUrl: string): boolean {
  const withoutQuery = rawUrl.trim().split(/[?#]/)[0] || '';
  return /\.m3u8(\b|$)/i.test(withoutQuery);
}

function isDirectVideoFileUrl(rawUrl: string): boolean {
  const trimmed = rawUrl.trim();
  const withoutQuery = trimmed.split(/[?#]/)[0] || '';
  if (/\.(mp4|webm|mov|m4v|ogv|m3u8)(\b|$)/i.test(withoutQuery)) {
    return true;
  }
  if (/vse-vms-transcoding-artifact|\/images\/s\/vse-vms-/i.test(trimmed)) {
    return true;
  }
  return false;
}

function DirectOrHlsVideoPlayer({
  src,
  poster,
  className,
}: {
  src: string;
  poster?: string;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl || !src) return;

    let hlsInstance: { destroy: () => void } | null = null;
    let isCancelled = false;

    if (isHlsVideoStreamUrl(src)) {
      if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
        videoEl.src = src;
        videoEl.play().catch(() => {
          // Autoplay may require user interaction
        });
      } else {
        import('hls.js')
          .then((mod) => {
            if (isCancelled || !videoRef.current) return;
            const Hls = mod.default;
            if (Hls && Hls.isSupported()) {
              const hls = new Hls({ enableWorker: true });
              hlsInstance = hls;
              hls.loadSource(src);
              hls.attachMedia(videoRef.current);
              hls.on(Hls.Events.MANIFEST_PARSED, () => {
                videoRef.current?.play().catch(() => {
                  // Autoplay may require user interaction
                });
              });
            } else {
              videoRef.current.src = src;
            }
          })
          .catch(() => {
            if (videoRef.current) {
              videoRef.current.src = src;
            }
          });
      }
    } else {
      videoEl.src = src;
      videoEl.play().catch(() => {
        // Autoplay may require user interaction
      });
    }

    return () => {
      isCancelled = true;
      if (hlsInstance) {
        hlsInstance.destroy();
      }
    };
  }, [src]);

  return (
    <video
      ref={videoRef}
      poster={poster || undefined}
      controls
      autoPlay
      playsInline
      className={className}
    />
  );
}

function extractYouTubeThumbnailUrl(rawUrl: string): string | null {
  if (!rawUrl) return null;
  const trimmed = rawUrl.trim();
  const match =
    trimmed.match(/(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]+)/i) ||
    trimmed.match(
      /(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/watch\?(?:.*&)?v=([a-zA-Z0-9_-]+)/i
    ) ||
    trimmed.match(
      /(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/i
    ) ||
    trimmed.match(
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]+)/i
    );
  if (match && match[1]) {
    return `https://i.ytimg.com/vi/${match[1]}/hqdefault.jpg`;
  }
  return null;
}

function formatVideoEmbedUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  const trimmed = rawUrl.trim();

  try {
    // 1. YouTube short links: youtu.be/ID
    const youtuBeMatch = trimmed.match(
      /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]+)/i
    );
    if (youtuBeMatch && youtuBeMatch[1]) {
      return `https://www.youtube.com/embed/${youtuBeMatch[1]}?autoplay=1`;
    }

    // 2. YouTube standard links: youtube.com/watch?v=ID
    const ytWatchMatch = trimmed.match(
      /(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/watch\?(?:.*&)?v=([a-zA-Z0-9_-]+)/i
    );
    if (ytWatchMatch && ytWatchMatch[1]) {
      return `https://www.youtube.com/embed/${ytWatchMatch[1]}?autoplay=1`;
    }

    // 3. YouTube Shorts: youtube.com/shorts/ID
    const ytShortsMatch = trimmed.match(
      /(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/i
    );
    if (ytShortsMatch && ytShortsMatch[1]) {
      return `https://www.youtube.com/embed/${ytShortsMatch[1]}?autoplay=1`;
    }

    // 4. Already an embed link: youtube.com/embed/ID
    const ytEmbedMatch = trimmed.match(
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]+)/i
    );
    if (ytEmbedMatch && ytEmbedMatch[1]) {
      return `https://www.youtube.com/embed/${ytEmbedMatch[1]}?autoplay=1`;
    }

    // 5. TikTok links: tiktok.com/@user/video/ID -> embed
    const tiktokMatch = trimmed.match(
      /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@[^/]+\/video\/(\d+)/i
    );
    if (tiktokMatch && tiktokMatch[1]) {
      return `https://www.tiktok.com/embed/v2/${tiktokMatch[1]}`;
    }

    // 6. Vimeo links: vimeo.com/ID -> player.vimeo.com/video/ID
    const vimeoMatch = trimmed.match(
      /(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(\d+)/i
    );
    if (vimeoMatch && vimeoMatch[1]) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`;
    }

    // 7. Direct video or other services
    return trimmed;
  } catch {
    return trimmed;
  }
}

interface GallerySlide {
  id: string;
  type: 'image' | 'video';
  url: string;
  altText: string;
  videoIndex?: number;
  videoCover?: string | null;
  videoTitle?: string;
  isDirectVideo?: boolean;
  embedUrl?: string;
}

export function ProductGallery({
  images,
  videoUrl,
  videoUrls,
  videos,
  productTitle,
  locale = 'ar',
  heroTransitionId,
}: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [playingVideoSlideId, setPlayingVideoSlideId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const isPointerDownRef = useRef<boolean>(false);
  const hasDraggedRef = useRef<boolean>(false);
  const startXRef = useRef<number>(0);
  const startYRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  const thumbnailsRef = useRef<HTMLDivElement | null>(null);
  const isThumbDraggingRef = useRef<boolean>(false);
  const thumbStartXRef = useRef<number>(0);
  const thumbStartScrollRef = useRef<number>(0);
  const thumbMovedRef = useRef<boolean>(false);
  const [isThumbDragging, setIsThumbDragging] = useState<boolean>(false);

  const [failedCoverMap, setFailedCoverMap] = useState<Record<string, boolean>>({});
  const [failedImageMap, setFailedImageMap] = useState<Record<string, boolean>>({});

  // 1. Sanitize and deduplicate images
  const cleanedImages: GalleryImage[] = [];
  const seenImgFp = new Set<string>();
  if (Array.isArray(images)) {
    for (const img of images) {
      const cleanUrl = sanitizeMediaUrl(img?.url || '');
      if (cleanUrl && !failedImageMap[cleanUrl]) {
        const fp = getCanonicalImageFingerprint(cleanUrl) || cleanUrl;
        if (!seenImgFp.has(fp)) {
          seenImgFp.add(fp);
          cleanedImages.push({ ...img, url: cleanUrl });
        }
      }
    }
  }

  const safeImages = cleanedImages.length > 0 ? cleanedImages : [{ url: '' }];

  // 2. Combine videoUrls, videos[].url, and legacy videoUrl
  const allVideos: string[] = [];
  const videoCoverByUrl: Record<string, string> = {};

  if (Array.isArray(videos)) {
    for (const vObj of videos) {
      const cleanV = typeof vObj?.url === 'string' ? sanitizeMediaUrl(vObj.url) : '';
      if (cleanV) {
        if (!allVideos.includes(cleanV)) {
          allVideos.push(cleanV);
        }
        const cleanThumb =
          typeof vObj.thumbnailUrl === 'string' ? sanitizeMediaUrl(vObj.thumbnailUrl) : '';
        if (cleanThumb) {
          videoCoverByUrl[cleanV] = cleanThumb;
        }
      }
    }
  }
  if (Array.isArray(videoUrls)) {
    for (const v of videoUrls) {
      const cleanV = v ? sanitizeMediaUrl(v) : '';
      if (cleanV && !allVideos.includes(cleanV)) {
        allVideos.push(cleanV);
      }
    }
  }
  if (videoUrl && videoUrl.trim()) {
    const cleanV = sanitizeMediaUrl(videoUrl);
    if (cleanV && !allVideos.includes(cleanV)) {
      allVideos.unshift(cleanV);
    }
  }

  const getVideoCoverUrl = (rawVideoUrl: string): string | null => {
    if (failedCoverMap[rawVideoUrl]) return null;
    if (videoCoverByUrl[rawVideoUrl]) return videoCoverByUrl[rawVideoUrl];
    const ytThumb = extractYouTubeThumbnailUrl(rawVideoUrl);
    if (ytThumb) return ytThumb;
    return null;
  };

  const getAltText = (img: GalleryImage, idx: number): string => {
    if (!img) return productTitle;
    if (typeof img.alt === 'string' && img.alt.trim()) return img.alt.trim();
    if (typeof img.alt === 'object' && img.alt) {
      const preferred = locale === 'en' ? img.alt.en || img.alt.ar : img.alt.ar || img.alt.en;
      if (preferred && preferred.trim()) {
        return preferred.trim();
      }
    }
    return `${productTitle} - ${idx + 1}`;
  };

  // 3. Build unified slides list: all images followed by all videos
  const allSlides: GallerySlide[] = [];

  for (let idx = 0; idx < safeImages.length; idx++) {
    const img = safeImages[idx];
    if (img.url) {
      allSlides.push({
        id: `img-${idx}`,
        type: 'image',
        url: img.url,
        altText: getAltText(img, idx),
      });
    }
  }

  for (let vIdx = 0; vIdx < allVideos.length; vIdx++) {
    const vUrl = allVideos[vIdx];
    const explicitCover = getVideoCoverUrl(vUrl);
    const fallbackImageCover = safeImages[0]?.url || null;
    const cover = explicitCover || fallbackImageCover;
    const isDirect = isDirectVideoFileUrl(vUrl);
    const embedUrl = formatVideoEmbedUrl(vUrl);
    const vidTitle =
      allVideos.length > 1
        ? locale === 'en'
          ? `${productTitle} - Video ${vIdx + 1}`
          : `${productTitle} - فيديو ${vIdx + 1}`
        : locale === 'en'
          ? `${productTitle} - Video`
          : `${productTitle} - فيديو`;

    allSlides.push({
      id: `vid-${vIdx}`,
      type: 'video',
      url: vUrl,
      videoIndex: vIdx,
      videoCover: cover,
      videoTitle: vidTitle,
      isDirectVideo: isDirect,
      embedUrl,
      altText: vidTitle,
    });
  }

  if (allSlides.length === 0) {
    allSlides.push({
      id: 'placeholder-0',
      type: 'image',
      url: '',
      altText: productTitle,
    });
  }

  const totalSlides = allSlides.length;
  const clampedIndex = Math.max(0, Math.min(totalSlides - 1, activeIndex));

  // Navigation handlers
  const goToNext = () => {
    if (playingVideoSlideId) {
      setPlayingVideoSlideId(null);
    }
    setActiveIndex((prev) => (prev < totalSlides - 1 ? prev + 1 : 0));
  };

  const goToPrev = () => {
    if (playingVideoSlideId) {
      setPlayingVideoSlideId(null);
    }
    setActiveIndex((prev) => (prev > 0 ? prev - 1 : totalSlides - 1));
  };

  const handleSelectSlide = (targetIdx: number) => {
    if (playingVideoSlideId) {
      setPlayingVideoSlideId(null);
    }
    setActiveIndex(targetIdx);
  };

  // Pointer Drag Handlers (Mouse & Touch unified)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (
      e.button !== 0 ||
      (e.target instanceof Element && e.target.closest('button'))
    ) {
      return;
    }
    isPointerDownRef.current = true;
    hasDraggedRef.current = false;
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    startTimeRef.current = performance.now();

    setDragOffset(0);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPointerDownRef.current) return;
    const deltaX = e.clientX - startXRef.current;
    const deltaY = e.clientY - startYRef.current;

    // Check if user is scrolling vertically before locking horizontal drag
    if (!hasDraggedRef.current && Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 8) {
      isPointerDownRef.current = false;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore
      }
      return;
    }

    if (Math.abs(deltaX) > 4) {
      if (!hasDraggedRef.current) {
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // Ignore if pointer capture fails
        }
      }
      hasDraggedRef.current = true;
      if (!isDragging) {
        setIsDragging(true);
      }

      // Elastic resistance at carousel boundaries
      let effectiveOffset = deltaX;
      if (clampedIndex === 0 && deltaX > 0) {
        effectiveOffset = deltaX * 0.35;
      } else if (clampedIndex === totalSlides - 1 && deltaX < 0) {
        effectiveOffset = deltaX * 0.35;
      }

      setDragOffset(effectiveOffset);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPointerDownRef.current) return;
    isPointerDownRef.current = false;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }

    if (hasDraggedRef.current) {
      const elapsed = Math.max(1, performance.now() - startTimeRef.current);
      const velocity = Math.abs(dragOffset) / elapsed;
      const threshold = 40; // px

      if (dragOffset < -threshold || (dragOffset < -15 && velocity > 0.3)) {
        goToNext();
      } else if (dragOffset > threshold || (dragOffset > 15 && velocity > 0.3)) {
        goToPrev();
      } else {
        setDragOffset(0);
      }

      setIsDragging(false);
      setDragOffset(0);
    } else {
      // Simple click without drag
      setIsDragging(false);
      setDragOffset(0);
      const clickedSlide = allSlides[clampedIndex];
      if (clickedSlide && clickedSlide.type === 'video') {
        setPlayingVideoSlideId(clickedSlide.id);
      }
    }
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    isPointerDownRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
    setIsDragging(false);
    setDragOffset(0);
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') {
      goToNext();
    } else if (e.key === 'ArrowLeft') {
      goToPrev();
    }
  };

  // Thumbnails row drag-to-scroll & mouse wheel handlers
  const handleThumbPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!thumbnailsRef.current || e.button !== 0) return;
    isThumbDraggingRef.current = true;
    thumbStartXRef.current = e.clientX;
    thumbStartScrollRef.current = thumbnailsRef.current.scrollLeft;
    thumbMovedRef.current = false;
    setIsThumbDragging(true);
  };

  const handleThumbPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isThumbDraggingRef.current || !thumbnailsRef.current) return;
    const deltaX = e.clientX - thumbStartXRef.current;
    if (Math.abs(deltaX) > 4) {
      if (!thumbMovedRef.current) {
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // Ignore
        }
      }
      thumbMovedRef.current = true;
    }
    thumbnailsRef.current.scrollLeft = thumbStartScrollRef.current - deltaX;
  };

  const handleThumbPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isThumbDraggingRef.current = false;
    setIsThumbDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
    if (thumbMovedRef.current) {
      window.setTimeout(() => {
        thumbMovedRef.current = false;
      }, 0);
    }
  };

  const handleThumbWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!thumbnailsRef.current) return;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      thumbnailsRef.current.scrollLeft += e.deltaY;
    }
  };

  const handleThumbClick = (targetIdx: number) => {
    if (thumbMovedRef.current) {
      thumbMovedRef.current = false;
      return;
    }
    handleSelectSlide(targetIdx);
  };

  // Center active thumbnail into view smoothly
  useEffect(() => {
    if (!thumbnailsRef.current) return;
    const activeEl = thumbnailsRef.current.querySelector<HTMLElement>(
      `.${styles.thumbnailActive}`
    );
    if (activeEl) {
      activeEl.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [clampedIndex]);

  const showThumbnails = totalSlides > 1;
  const currentSlide = allSlides[clampedIndex];
  const heroTransitionName = getProductHeroTransitionName(heroTransitionId);

  return (
    <div
      className={styles.imageGallery}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      aria-label={locale === 'ar' ? 'معرض صور وفيديوهات المنتج' : 'Product media gallery'}
    >
      {/* 1. Main Continuous Carousel Viewport & Slider Track */}
      <div
        className={`${styles.mainImageWrapper} ${
          isDragging ? styles.mainImageWrapperDragging : ''
        }`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        {/* Track containing all images and videos side-by-side with 1:1 real-time drag */}
        <div
          className={styles.sliderTrack}
          style={{
            transform: `translateX(calc(-${clampedIndex * 100}% + ${dragOffset}px))`,
            transition: isDragging ? 'none' : 'transform 0.32s cubic-bezier(0.2, 0.9, 0.3, 1)',
            direction: 'ltr',
          }}
        >
          {allSlides.map((slide, sIdx) => {
            const isSlidePlaying = slide.type === 'video' && playingVideoSlideId === slide.id;
            const isPrimaryHeroImage =
              slide.type === 'image' &&
              sIdx === 0 &&
              Boolean(heroTransitionName) &&
              Boolean(slide.url);

            return (
              <div
                key={slide.id}
                className={`${styles.slideItem} ${isDragging ? styles.slideItemDragging : ''}`}
                aria-hidden={sIdx !== clampedIndex}
              >
                {slide.type === 'video' ? (
                  isSlidePlaying ? (
                    <div className={styles.videoPlayerWrapper} style={{ width: '100%', height: '100%', borderRadius: 0 }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPlayingVideoSlideId(null);
                        }}
                        className={styles.videoCloseBtn}
                        aria-label={locale === 'ar' ? 'إغلاق الفيديو' : 'Close Video'}
                      >
                        <span aria-hidden="true">✕</span>
                        <span>{locale === 'ar' ? 'إغلاق الفيديو' : 'Close Video'}</span>
                      </button>
                      {slide.isDirectVideo ? (
                        <DirectOrHlsVideoPlayer
                          key={slide.url}
                          src={slide.url}
                          poster={slide.videoCover || undefined}
                          className={styles.videoIframe}
                        />
                      ) : slide.embedUrl ? (
                        <iframe
                          key={slide.embedUrl}
                          src={slide.embedUrl}
                          title={slide.videoTitle || 'Product Video'}
                          className={styles.videoIframe}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                        />
                      ) : null}
                    </div>
                  ) : (
                    <div
                      className={styles.videoSlideCover}
                      onClick={(e) => {
                        e.stopPropagation();
                        setPlayingVideoSlideId(slide.id);
                      }}
                      title={locale === 'ar' ? 'انقر لتشغيل الفيديو' : 'Click to play video'}
                    >
                      {slide.videoCover ? (
                        <img
                          src={slide.videoCover}
                          alt={slide.videoTitle || 'Video Cover'}
                          className={styles.videoSlideCoverMedia}
                          draggable={false}
                          onError={() => {
                            setFailedCoverMap((prev) => ({ ...prev, [slide.url]: true }));
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '100%',
                            height: '100%',
                            backgroundColor: '#0f172a',
                          }}
                        />
                      )}
                      <div className={styles.videoSlidePlayCenter}>
                        <div className={styles.videoSlidePlayCircle} aria-hidden="true">
                          <span style={{ fontSize: '24px', marginInlineStart: '3px' }}>▶</span>
                        </div>
                        <span className={styles.videoSlideBadge}>
                          {slide.videoTitle || (locale === 'ar' ? 'فيديو المنتج' : 'Product Video')}
                        </span>
                      </div>
                    </div>
                  )
                ) : slide.url ? (
                  <img
                    src={slide.url}
                    alt={slide.altText}
                    width={800}
                    height={800}
                    itemProp="image"
                    fetchPriority={sIdx === 0 ? 'high' : 'auto'}
                    decoding="sync"
                    className={styles.mainImage}
                    style={
                      isPrimaryHeroImage
                        ? {
                            viewTransitionName: heroTransitionName || undefined,
                            contain: 'layout paint',
                          }
                        : undefined
                    }
                    referrerPolicy="no-referrer"
                    loading={sIdx === 0 ? 'eager' : 'lazy'}
                    draggable={false}
                    onError={() => {
                      setFailedImageMap((prev) => ({ ...prev, [slide.url]: true }));
                    }}
                  />
                ) : (
                  <div className={`${styles.mainImage} ${styles.imageFallback}`}>
                    <span>{productTitle.slice(0, 1)}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Floating Desktop Navigation Arrows (‹ / ›) */}
        {totalSlides > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goToPrev();
              }}
              className={`${styles.galleryNavBtn} ${styles.galleryNavPrev}`}
              aria-label={locale === 'ar' ? 'السابق' : 'Previous'}
            >
              <ChevronLeft size={22} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goToNext();
              }}
              className={`${styles.galleryNavBtn} ${styles.galleryNavNext}`}
              aria-label={locale === 'ar' ? 'التالي' : 'Next'}
            >
              <ChevronRight size={22} aria-hidden="true" />
            </button>
          </>
        )}

        {/* Slide Counter Badge (e.g. 1/6) */}
        {totalSlides > 1 && (
          <span className={`${styles.slideCounterBadge} tabularNums`}>
            {currentSlide?.type === 'video'
              ? locale === 'ar'
                ? `فيديو ${clampedIndex + 1}/${totalSlides}`
                : `Video ${clampedIndex + 1}/${totalSlides}`
              : `${clampedIndex + 1}/${totalSlides}`}
          </span>
        )}
      </div>

      {/* Dots indicator under the image showing current slide */}
      {totalSlides > 1 && (
        <div
          className={styles.dotsIndicator}
          role="tablist"
          aria-label="مؤشر الشرائح"
        >
          {allSlides.map((_, idx) => (
            <button
              key={idx}
              type="button"
              role="tab"
              aria-selected={idx === clampedIndex}
              aria-label={`Slide ${idx + 1} of ${totalSlides}`}
              className={`${styles.dot} ${idx === clampedIndex ? styles.dotActive : ''}`}
              onClick={() => handleSelectSlide(idx)}
            />
          ))}
        </div>
      )}

      {/* 2. Thumbnails Row: Scrollable & Draggable with mouse on desktop */}
      {showThumbnails && (
        <div
          ref={thumbnailsRef}
          className={`${styles.thumbnailsRow} ${
            isThumbDragging ? styles.thumbnailsRowDragging : ''
          }`}
          role="tablist"
          aria-label="معرض الوسائط"
          onPointerDown={handleThumbPointerDown}
          onPointerMove={handleThumbPointerMove}
          onPointerUp={handleThumbPointerUp}
          onPointerCancel={handleThumbPointerUp}
          onWheel={handleThumbWheel}
        >
          {allSlides.map((slide, sIdx) => {
            const isSelected = sIdx === clampedIndex;

            if (slide.type === 'video') {
              return (
                <button
                  key={slide.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  aria-label={slide.videoTitle || 'Video thumbnail'}
                  title={slide.videoTitle}
                  onClick={() => handleThumbClick(sIdx)}
                  className={`${styles.videoThumbnailButton} ${
                    isSelected ? styles.thumbnailActive : ''
                  }`}
                >
                  {slide.videoCover ? (
                    <img
                      src={slide.videoCover}
                      alt={slide.videoTitle || 'Video Cover'}
                      width={80}
                      height={80}
                      loading="lazy"
                      decoding="async"
                      className={styles.videoThumbnailMedia}
                      referrerPolicy="no-referrer"
                      onError={() =>
                        setFailedCoverMap((prev) => ({ ...prev, [slide.url]: true }))
                      }
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', backgroundColor: '#0f172a' }} />
                  )}
                  <span className={styles.videoThumbnailOverlay} aria-hidden="true">
                    <span className={styles.videoThumbnailPlayBadge}>
                      <span className={styles.videoThumbnailPlayIcon}>▶</span>
                    </span>
                  </span>
                </button>
              );
            }

            return (
              <button
                key={slide.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                aria-label={`${productTitle} thumbnail ${sIdx + 1}`}
                onClick={() => handleThumbClick(sIdx)}
                className={`${styles.thumbnailButton} ${
                  isSelected ? styles.thumbnailActive : ''
                }`}
              >
                {slide.url ? (
                  <img
                    src={slide.url}
                    alt={slide.altText}
                    width={80}
                    height={80}
                    loading="lazy"
                    decoding="async"
                    className={styles.thumbnailImg}
                    referrerPolicy="no-referrer"
                    onError={() =>
                      setFailedImageMap((prev) => ({ ...prev, [slide.url]: true }))
                    }
                  />
                ) : (
                  <span className={styles.thumbnailFallback}>{sIdx + 1}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
