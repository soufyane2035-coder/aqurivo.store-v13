'use client';

import React, { useRef, useState } from 'react';
import { CheckCircle2, Info, Send, X } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import {
  addTestimonial,
  TestimonialSubmissionError,
} from '@/lib/testimonials';
import styles from './AddTestimonialForm.module.css';

export interface AddTestimonialFormProps {
  onClose?: () => void;
}

export function AddTestimonialForm({ onClose }: AddTestimonialFormProps) {
  const { locale } = useI18n();
  const isAr = locale === 'ar';

  const [name, setName] = useState('');
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const ratingButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanName = name.trim();
    const cleanText = text.trim();

    if (!cleanName) {
      setErrorMsg(isAr ? 'يرجى إدخال الاسم.' : 'Please enter your name.');
      return;
    }
    if (!cleanText) {
      setErrorMsg(
        isAr ? 'يرجى كتابة نص الشهادة.' : 'Please write your review text.'
      );
      return;
    }

    setSubmitting(true);
    try {
      await addTestimonial({
        name: cleanName.slice(0, 50),
        rating,
        text: cleanText.slice(0, 300),
        locale: isAr ? 'ar' : 'en',
      });
      setSubmitted(true);
      setName('');
      setText('');
      setRating(5);
    } catch (error) {
      setErrorMsg(
        error instanceof TestimonialSubmissionError
          ? error.message
          : isAr
            ? 'تعذر إرسال شهادتك حالياً. يرجى المحاولة مرة أخرى.'
            : 'Could not submit your review right now. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className={styles.formWrapper} role="status" aria-live="polite">
        <div className={styles.successBox}>
          <span className={styles.successIconBadge} aria-hidden="true">
            <CheckCircle2 size={24} />
          </span>
          <p className={styles.successText}>
            {isAr
              ? 'شكراً لك! تم حفظ شهادتك بنجاح وهي قيد المراجعة لتظهر قريباً.'
              : 'Thank you! Your review was successfully saved and is pending review.'}
          </p>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className={styles.submitBtn}
            >
              {isAr ? 'إغلاق' : 'Close'}
            </button>
          )}
        </div>
      </div>
    );
  }

  const displayStarCount = hoverRating || rating;

  return (
    <div
      id="testimonial-form"
      className={styles.formWrapper}
      dir={isAr ? 'rtl' : 'ltr'}
    >
      <div className={styles.formHeader}>
        <div>
          <h3 className={styles.formTitle}>
            {isAr ? 'أضف شهادتك حول AQURIVO' : 'Share Your AQURIVO Experience'}
          </h3>
          <p className={styles.formDescription}>
            {isAr
              ? 'أخبر الزوار كيف ساعدتك AQURIVO في البحث عن المنتجات أو مقارنة الأسعار.'
              : 'Tell visitors how AQURIVO helped you find products or compare prices.'}
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className={styles.closeBtn}
            aria-label={isAr ? 'إغلاق' : 'Close'}
          >
            <X size={16} aria-hidden="true" />
          </button>
        )}
      </div>

      <div className={styles.reviewNotice}>
        <Info size={17} aria-hidden="true" />
        <p>
          {isAr
            ? 'يمكنك استخدام اسم مختصر. ستُراجع الشهادة قبل نشرها.'
            : 'You can use a shortened name. Reviews are checked before publishing.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className={styles.formBody} noValidate>
        <div className={styles.fieldGroup}>
          <div className={styles.labelRow}>
            <label htmlFor="testimonial-name" className={styles.fieldLabel}>
              {isAr ? 'الاسم *' : 'Your Name *'}
            </label>
            <span className={`${styles.charCounter} tabularNums`}>
              {name.length} / 50
            </span>
          </div>
          <input
            id="testimonial-name"
            type="text"
            required
            aria-required="true"
            autoFocus
            autoComplete="name"
            maxLength={50}
            value={name}
            onChange={(e) => {
              setName(e.target.value.slice(0, 50));
              setErrorMsg(null);
            }}
            placeholder={isAr ? 'مثال: اسم مختصر' : 'e.g. Your name'}
            className={styles.textInput}
          />
        </div>

        <div className={styles.fieldGroup}>
          <span className={styles.fieldLabel}>
            {isAr ? 'التقييم *' : 'Rating *'}
          </span>
          <div
            className={styles.starsInputRow}
            role="radiogroup"
            aria-required="true"
            aria-label={isAr ? 'التقييم بالنجوم' : 'Star rating'}
            onKeyDown={(event) => {
              const step = isAr ? -1 : 1;
              const nextRating =
                event.key === 'ArrowRight'
                  ? rating + step
                  : event.key === 'ArrowLeft'
                    ? rating - step
                    : event.key === 'Home'
                      ? 1
                      : event.key === 'End'
                        ? 5
                        : null;

              if (nextRating !== null && nextRating >= 1 && nextRating <= 5) {
                event.preventDefault();
                setRating(nextRating);
                ratingButtonRefs.current[nextRating - 1]?.focus();
              }
            }}
          >
            {[1, 2, 3, 4, 5].map((starValue) => {
              const active = starValue <= displayStarCount;
              return (
                <button
                  key={starValue}
                  ref={(element) => {
                    ratingButtonRefs.current[starValue - 1] = element;
                  }}
                  type="button"
                  role="radio"
                  aria-checked={rating === starValue}
                  aria-label={`${starValue} / 5`}
                  tabIndex={rating === starValue ? 0 : -1}
                  onClick={() => {
                    setRating(starValue);
                    setErrorMsg(null);
                  }}
                  onMouseEnter={() => setHoverRating(starValue)}
                  onMouseLeave={() => setHoverRating(0)}
                  className={`${styles.starBtn} ${
                    active ? styles.starBtnActive : ''
                  }`}
                >
                  ★
                </button>
              );
            })}
            <span className={`${styles.ratingHint} tabularNums`}>
              ({rating} / 5)
            </span>
          </div>
        </div>

        <div className={styles.fieldGroup}>
          <div className={styles.labelRow}>
            <label htmlFor="testimonial-text" className={styles.fieldLabel}>
              {isAr ? 'نص الشهادة *' : 'Your Review *'}
            </label>
            <span className={`${styles.charCounter} tabularNums`}>
              {text.length} / 300
            </span>
          </div>
          <textarea
            id="testimonial-text"
            required
            aria-required="true"
            maxLength={300}
            value={text}
            onChange={(e) => {
              setText(e.target.value.slice(0, 300));
              setErrorMsg(null);
            }}
            placeholder={
              isAr
                ? 'شاركنا رأيك في سهولة البحث ومقارنة الأسعار عبر AQURIVO...'
                : 'Tell visitors how AQURIVO helped you find or compare products...'
            }
            className={styles.textArea}
          />
        </div>

        {errorMsg && (
          <p className={styles.errorBanner} role="alert">
            {errorMsg}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className={styles.submitBtn}
        >
          <Send size={15} aria-hidden="true" />
          <span>
            {submitting
              ? isAr
                ? 'جاري الإرسال...'
                : 'Submitting...'
              : isAr
                ? 'إرسال الشهادة'
                : 'Submit Review'}
          </span>
        </button>
      </form>
    </div>
  );
}
