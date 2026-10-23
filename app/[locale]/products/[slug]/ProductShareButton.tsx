'use client';

import React, { useEffect, useState } from 'react';
import { Check, Copy, MessageCircle, Send, Share2, Smartphone, X } from 'lucide-react';
import type { Locale } from '@/types';
import { useToast } from '@/components/ui/Toast';
import styles from './ProductPage.module.css';

interface ProductShareButtonProps {
  productSlug: string;
  productName: string;
  formattedPrice?: string;
  discount?: number | null;
  shortSummary?: string;
  locale: Locale;
}

export function ProductShareButton({
  productSlug,
  productName,
  formattedPrice,
  discount,
  shortSummary,
  locale,
}: ProductShareButtonProps) {
  const isAr = locale === 'ar';
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      setCanNativeShare(true);
    }
  }, []);

  const getProductPageUrl = (): string => {
    const cleanSlug = encodeURIComponent(productSlug.trim());
    if (typeof window !== 'undefined' && window.location?.origin) {
      return `${window.location.origin}/${locale}/products/${cleanSlug}`;
    }
    const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://aqurivo.store';
    return `${base.replace(/\/+$/, '')}/${locale}/products/${cleanSlug}`;
  };

  const buildShareText = (url: string): string => {
    const pricePart = formattedPrice
      ? isAr
        ? ` — السعر: ${formattedPrice}`
        : ` — Price: ${formattedPrice}`
      : '';
    const discountPart =
      discount && discount > 0
        ? isAr
          ? ` (خصم ${discount}%)`
          : ` (${discount}% OFF)`
        : '';

    if (isAr) {
      return `شاهد هذا المنتج المميز على AQURIVO:\n${productName}${pricePart}${discountPart}\n${url}`;
    }
    return `Check out this curated pick on AQURIVO:\n${productName}${pricePart}${discountPart}\n${url}`;
  };

  const handlePrimaryButtonClick = () => {
    setIsOpen((prev) => !prev);
  };

  const handleNativeShare = async () => {
    const url = getProductPageUrl();
    const text = buildShareText(url);
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: `${productName} | AQURIVO`,
          text: shortSummary ? `${productName} — ${shortSummary}` : text,
          url,
        });
      } catch {
        // User canceled native share sheet
      }
    }
  };

  const handleCopyLink = async () => {
    const url = getProductPageUrl();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      showToast(
        isAr
          ? '✓ تم نسخ رابط المنتج! شاركه مع صديقك ليفتح صفحة المنتج مباشرة.'
          : '✓ Product link copied! Share it with your friend to open this product page.',
        'success'
      );
      setTimeout(() => setCopied(false), 2500);
    } catch {
      showToast(
        isAr ? 'تعذر نسخ الرابط تلقائياً.' : 'Could not copy link automatically.',
        'error'
      );
    }
  };

  const productUrl = getProductPageUrl();
  const shareMessage = buildShareText(productUrl);
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
  const telegramHref = `https://t.me/share/url?url=${encodeURIComponent(productUrl)}&text=${encodeURIComponent(
    `${productName}${formattedPrice ? ` (${formattedPrice})` : ''}`
  )}`;

  return (
    <>
      <button
        type="button"
        onClick={handlePrimaryButtonClick}
        aria-expanded={isOpen}
        className={`${styles.shareTriggerBtn} ${isOpen ? styles.shareTriggerBtnActive : ''}`}
      >
        <span className={styles.shareIconBadge} aria-hidden="true">
          <Share2 size={14} />
        </span>
        <span>{isAr ? 'مشاركة مع صديق' : 'Share with a Friend'}</span>
      </button>

      {isOpen && (
        <div
          className={styles.shareInlinePanel}
          role="region"
          aria-label={isAr ? 'خيارات مشاركة المنتج' : 'Product sharing options'}
        >
          <div className={styles.shareInlineHeader}>
            <span className={styles.shareInlineTitle}>
              {isAr ? 'شارك المنتج مع صديقك' : 'Share Product with a Friend'}
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className={styles.shareInlineClose}
              aria-label={isAr ? 'إغلاق' : 'Close'}
            >
              <X size={14} />
            </button>
          </div>

          <div className={styles.shareActionsGrid}>
            <button
              type="button"
              onClick={handleCopyLink}
              className={`${styles.shareOptionBtn} ${copied ? styles.shareOptionCopied : ''}`}
            >
              {copied ? <Check size={15} /> : <Copy size={15} />}
              <span>
                {copied
                  ? isAr
                    ? 'تم نسخ الرابط!'
                    : 'Link Copied!'
                  : isAr
                    ? 'نسخ رابط المنتج'
                    : 'Copy Product Link'}
              </span>
            </button>

            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className={`${styles.shareOptionBtn} ${styles.shareOptionWhatsapp}`}
            >
              <MessageCircle size={15} />
              <span>{isAr ? 'إرسال عبر واتساب' : 'WhatsApp'}</span>
            </a>

            <a
              href={telegramHref}
              target="_blank"
              rel="noopener noreferrer"
              className={`${styles.shareOptionBtn} ${styles.shareOptionTelegram}`}
            >
              <Send size={15} />
              <span>{isAr ? 'إرسال عبر تلغرام' : 'Telegram'}</span>
            </a>

            {canNativeShare && (
              <button
                type="button"
                onClick={handleNativeShare}
                className={styles.shareOptionBtn}
              >
                <Smartphone size={15} />
                <span>
                  {isAr ? 'تطبيقات أخرى...' : 'More Apps...'}
                </span>
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}

