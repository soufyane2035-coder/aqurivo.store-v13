'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Heart, Info } from 'lucide-react';
import type { Locale, Product } from '@/types';
import { useI18n } from '@/i18n/I18nProvider';
import { getDictionary, pickLocalizedText } from '@/i18n';
import { useSaved } from '@/features/saved/SavedProvider';
import { formatNumber, formatProductPrice } from '@/lib/format';
import { SiteHeader } from '@/components/sections/SiteHeader';
import { SiteFooter } from '@/components/sections/SiteFooter';
import { SignatureMotif } from '@/components/ui/SignatureMotif';
import { ProductArtwork } from '@/components/ui/ProductArtwork';
import { ProductCard } from '@/components/ui/ProductCard';
import { ProductVideo } from '@/components/ProductVideo/ProductVideo';
import styles from './ProductDetailView.module.css';

interface ProductDetailViewProps {
  product: Product;
  relatedProducts?: Product[];
  pageLocale?: Locale;
  locale?: string;
}

export function ProductDetailView({
  product,
  relatedProducts = [],
  pageLocale,
  locale: propLocale,
}: ProductDetailViewProps) {
  const { locale: contextLocale, messages: contextMessages, t: contextT } = useI18n();
  const activeLocale = ((propLocale || pageLocale || contextLocale) as Locale) || 'ar';
  const messages = getDictionary(activeLocale) || contextMessages;
  const locale = activeLocale;
  const t = (val: unknown) => pickLocalizedText(val as any, activeLocale) || contextT(val as any);
  const { isSaved, toggleSave, recordProductView } = useSaved();
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const isAr = locale === 'ar';

  useEffect(() => {
    recordProductView(product.id, product.priceAmount);
  }, [product.id, product.priceAmount, recordProductView]);

  const title = t(product.title).trim();
  const rawWhyWePicked = t(product.whyWePickedIt).trim();
  const rawWhatToConsider = t(product.whatToConsider).trim();
  const rawDescription = t(product.description).trim();

  // Only show optional editorial sections when they actually exist and don't just repeat the title
  const whyWePicked =
    rawWhyWePicked && rawWhyWePicked !== title ? rawWhyWePicked : '';
  const whatToConsider =
    rawWhatToConsider && rawWhatToConsider !== title ? rawWhatToConsider : '';
  const description =
    rawDescription && rawDescription !== title ? rawDescription : '';

  const categoryName = t(product.categoryName);

  const showPrice =
    product.priceDisplayPolicy === 'show_with_timestamp' &&
    product.priceAmount !== null &&
    product.priceAmount > 0;

  const formattedPrice = showPrice
    ? formatProductPrice(product.priceAmount, product.priceCurrency, locale)
    : '';

  const hasOldPrice =
    showPrice &&
    product.oldPrice !== undefined &&
    product.oldPrice !== null &&
    product.oldPrice > (product.priceAmount ?? 0);

  const formattedOldPrice = hasOldPrice
    ? formatProductPrice(product.oldPrice!, product.priceCurrency, locale)
    : '';

  const rawDiscount = product.discountPercent ?? product.discount ?? 0;
  const computedDiscount =
    rawDiscount > 0
      ? Math.round(rawDiscount)
      : hasOldPrice && product.oldPrice && product.priceAmount
        ? Math.round(
            ((product.oldPrice - product.priceAmount) / product.oldPrice) * 100
          )
        : 0;

  const starsValue =
    product.stars !== undefined && product.stars !== null && product.stars > 0
      ? Number(product.stars)
      : 0;
  const soldCountValue =
    product.soldCount !== undefined &&
    product.soldCount !== null &&
    product.soldCount > 0
      ? Number(product.soldCount)
      : 0;

  const outboundHref = `/go/${encodeURIComponent(product.slug)}?ref=product_detail`;
  const saved = isSaved(product.id);
  const sliderRef = React.useRef<HTMLDivElement | null>(null);
  const imagesList =
    product.images && product.images.length > 0 ? product.images : [];
  const totalSlides = imagesList.length;

  const isDraggingRef = React.useRef(false);
  const dragStartXRef = React.useRef(0);
  const dragScrollLeftRef = React.useRef(0);
  const [isMouseDragging, setIsMouseDragging] = React.useState(false);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || !sliderRef.current) return;
    isDraggingRef.current = true;
    dragStartXRef.current = e.clientX;
    dragScrollLeftRef.current = sliderRef.current.scrollLeft;
    setIsMouseDragging(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || !sliderRef.current) return;
    const deltaX = e.clientX - dragStartXRef.current;
    sliderRef.current.scrollLeft = dragScrollLeftRef.current - deltaX;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsMouseDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    // Snap to nearest slide smoothly
    if (sliderRef.current) {
      const el = sliderRef.current;
      const index = Math.round(Math.abs(el.scrollLeft) / (el.clientWidth || 1));
      const clamped = Math.max(0, Math.min(totalSlides - 1, index));
      scrollToSlide(clamped);
    }
  };

  const handleSliderScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (!el.clientWidth) return;
    const rawScroll = Math.abs(el.scrollLeft);
    const index = Math.round(rawScroll / el.clientWidth);
    const clamped = Math.max(0, Math.min(totalSlides - 1, index));
    if (clamped !== activeImageIndex) {
      setActiveImageIndex(clamped);
    }
  };

  const scrollToSlide = (idx: number) => {
    setActiveImageIndex(idx);
    const el = sliderRef.current;
    if (!el) return;
    const isRtl = document.documentElement.dir === 'rtl';
    const targetLeft = idx * el.clientWidth * (isRtl ? -1 : 1);
    el.scrollTo({ left: targetLeft, behavior: 'smooth' });
  };

  const hasEditorialSections = Boolean(
    whyWePicked || whatToConsider || description
  );

  return (
    <div className={styles.pageShell}>
      <SiteHeader />

      <main id="main-content" className={`siteContainer ${styles.main}`}>
        {/* Compact Breadcrumb preserving locale */}
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href={`/${locale}`} className={styles.breadcrumbLink}>
            {messages.nav.home}
          </Link>
          <span aria-hidden="true">/</span>
          <Link href={`/${locale}/products`} className={styles.breadcrumbLink}>
            {messages.nav.products}
          </Link>
          <span aria-hidden="true">/</span>
          <Link
            href={`/categories/${encodeURIComponent(product.categorySlug)}`}
            className={styles.breadcrumbLink}
          >
            {categoryName}
          </Link>
        </nav>

        {/* Primary Purchase Split */}
        <section className={`${styles.pdpGrid} revealUp`}>
          {/* 1. Swiper الصور (kept intact) */}
          <div className={styles.galleryColumn}>
            <div className={styles.primaryMediaFrame}>
              {totalSlides > 0 ? (
                <>
                  <div
                    ref={sliderRef}
                    onScroll={handleSliderScroll}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    className={styles.slider}
                    style={{
                      cursor: isMouseDragging ? 'grabbing' : 'grab',
                      userSelect: 'none',
                    }}
                  >
                    {imagesList.map((img, idx) => (
                      <div
                        key={`${img.url.slice(0, 40)}-${idx}`}
                        className={styles.slide}
                      >
                        <img
                          src={img.url}
                          alt={
                            t(img.alt) || `${title} (${idx + 1}/${totalSlides})`
                          }
                          width={img.width || 900}
                          height={img.height || 675}
                          className={styles.primaryImage}
                          referrerPolicy="no-referrer"
                          draggable={false}
                        />
                      </div>
                    ))}
                  </div>

                  {totalSlides > 1 && (
                    <span className={`${styles.slideCounterBadge} tabularNums`}>
                      {activeImageIndex + 1}/{totalSlides}
                    </span>
                  )}
                </>
              ) : (
                <ProductArtwork
                  title={title}
                  categoryLabel={categoryName}
                  noteText={messages.product.temporaryArtworkNote}
                />
              )}
            </div>

            {totalSlides > 1 && (
              <div
                className={styles.dotsRow}
                role="tablist"
                aria-label={isAr ? 'صور المنتج' : 'Product images'}
              >
                {imagesList.map((img, idx) => (
                  <button
                    key={`dot-${img.url.slice(0, 24)}-${idx}`}
                    type="button"
                    role="tab"
                    aria-selected={idx === activeImageIndex}
                    aria-label={`${idx + 1} / ${totalSlides}`}
                    onClick={() => scrollToSlide(idx)}
                    className={`${styles.dotBtn} ${
                      idx === activeImageIndex ? styles.dotBtnActive : ''
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Purchase Module following exact 1..7 hierarchy */}
          <div className={styles.purchaseModule}>
            {/* 2. شارة الفئة فقط بدون ذكر اسم المتجر الخارجي */}
            {categoryName && (
              <div className={styles.badgesRow}>
                <span className={styles.breadcrumbLink}>{categoryName}</span>
              </div>
            )}

            {/* 3. اسم المنتج — مرة واحدة فقط، حجم h1 مناسب */}
            <h1 className={styles.productTitle}>{title}</h1>

            {/* 4. النجوم + عدد المبيعات في صف واحد */}
            {(starsValue > 0 || soldCountValue > 0) && (
              <div className={styles.ratingSalesRow}>
                {starsValue > 0 && (
                  <span className={styles.starsInline}>
                    <span className={styles.starsGolden} aria-hidden="true">
                      {'★'.repeat(Math.round(starsValue))}
                    </span>
                    <span className={`${styles.starsNumeric} tabularNums`}>
                      {starsValue.toFixed(1)}
                    </span>
                  </span>
                )}

                {starsValue > 0 && soldCountValue > 0 && (
                  <span className={styles.metaDot} aria-hidden="true">
                    •
                  </span>
                )}

                {soldCountValue > 0 && (
                  <span className={`${styles.soldCountInline} tabularNums`}>
                    {isAr
                      ? `${formatNumber(soldCountValue, locale)}+ تم بيعه`
                      : `${formatNumber(soldCountValue, locale)}+ sold`}
                  </span>
                )}
              </div>
            )}

            {/* 5. السعر الجديد كبير + السعر القديم مشطوب + شارة الخصم */}
            <div className={styles.priceCard}>
              {showPrice && (
                <div className={styles.priceHeadline}>
                  <span className={`${styles.priceAmount} tabularNums`}>
                    {formattedPrice}
                  </span>

                  {hasOldPrice && (
                    <span className={`${styles.oldPriceStrikethrough} tabularNums`}>
                      {formattedOldPrice}
                    </span>
                  )}

                  {computedDiscount > 0 && (
                    <span className={`${styles.discountBadge} tabularNums`}>
                      -{computedDiscount}%
                    </span>
                  )}
                </div>
              )}

              {/* 6. سطر واحد صغير: "السعر قد يتغير في المتجر الأصلي" */}
              <p className={styles.priceDisclaimer}>
                {messages.product.priceMayVary}
              </p>

              {/* 7. صف واحد متناسق: زر الشراء الكبير + زر القلب المربع (50x50px) بجانبه */}
              <div className={styles.ctaRow}>
                <a
                  href={product.affiliateUrl || outboundHref}
                  target="_blank"
                  rel="sponsored noopener noreferrer"
                  className={styles.primaryBuyButton}
                >
                  <span>{messages.product.buyNow}</span>
                </a>

                <button
                  type="button"
                  onClick={() => toggleSave(product.id)}
                  className={`${styles.saveIconBtn} ${
                    saved ? styles.saveIconBtnActive : ''
                  }`}
                  aria-pressed={saved}
                  aria-label={
                    saved
                      ? isAr
                        ? 'إزالة من المحفوظات'
                        : 'Remove from saved'
                      : isAr
                        ? 'حفظ في المفضلة'
                        : 'Save to favorites'
                  }
                  title={
                    saved
                      ? isAr
                        ? 'محفوظ في المفضلة'
                        : 'Saved in favorites'
                      : isAr
                        ? 'حفظ في المفضلة'
                        : 'Save to favorites'
                  }
                >
                  <Heart
                    size={21}
                    fill={saved ? '#e53935' : 'none'}
                    aria-hidden="true"
                  />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* فيديو المنتج (إذا كان videoUrl أو videos أو videoUrls موجوداً) */}
        {(product.videoUrl ||
          (Array.isArray(product.videos) && product.videos.length > 0) ||
          (Array.isArray(product.videoUrls) && product.videoUrls.length > 0)) && (
          <ProductVideo
            videoUrl={product.videoUrl}
            videoUrls={[
              ...(Array.isArray(product.videos)
                ? product.videos.map((v) => (typeof v === 'string' ? v : v?.url)).filter((u): u is string => Boolean(u))
                : []),
              ...(Array.isArray(product.videoUrls) ? product.videoUrls : []),
            ]}
            title={title}
          />
        )}

        {/* 8, 9, 10: الأقسام التحريرية الاختيارية (تظهر فقط إذا كانت موجودة) */}
        {hasEditorialSections && (
          <section className={styles.editorialSection}>
            {(whyWePicked || whatToConsider) && (
              <div className={styles.verdictGrid}>
                {/* 8. قسم "لماذا اخترناه" — إذا موجود */}
                {whyWePicked && (
                  <div className={styles.verdictCard}>
                    <h2 className={styles.verdictHeading}>
                      <CheckCircle2
                        size={18}
                        className={styles.iconPositive}
                        aria-hidden="true"
                      />
                      <span>{messages.product.whyWePicked}</span>
                    </h2>
                    <p className={styles.verdictBody}>{whyWePicked}</p>
                  </div>
                )}

                {/* 9. قسم "ما يجب الانتباه له" — إذا موجود */}
                {whatToConsider && (
                  <div className={styles.verdictCard}>
                    <h2 className={styles.verdictHeading}>
                      <Info
                        size={18}
                        className={styles.iconNeutral}
                        aria-hidden="true"
                      />
                      <span>{messages.product.whatToConsider}</span>
                    </h2>
                    <p className={styles.verdictBody}>{whatToConsider}</p>
                  </div>
                )}
              </div>
            )}

            {/* 10. الوصف التفصيلي — إذا موجود */}
            {description && (
              <div className={styles.fullDescriptionBlock}>
                <h2 className={styles.subHeading}>
                  {messages.product.detailedDescription}
                </h2>
                <p className={styles.descriptionProse}>{description}</p>
              </div>
            )}
          </section>
        )}

        {/* Similar Products (max 4 from same category) */}
        {relatedProducts.length > 0 && (
          <section className={styles.relatedSection}>
            <SignatureMotif
              index="02"
              label={messages.product.similarProducts}
            />
            <div className={styles.relatedGrid}>
              {relatedProducts.slice(0, 4).map((rel) => (
                <ProductCard
                  key={rel.id}
                  product={rel}
                  isSaved={isSaved(rel.id)}
                  onToggleSave={toggleSave}
                  refContext="product_related"
                />
              ))}
            </div>
          </section>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
