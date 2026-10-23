'use client';

import React, { useState } from 'react';
import { FirstReviewStarBubbleIcon } from '@/components/ui/AqurivoContextIcons';
import styles from './ProductReviews.module.css';

export interface ReviewItem {
  id: string;
  productSlug: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
  approved: boolean;
}

export interface ReviewDistribution {
  5: number;
  4: number;
  3: number;
  2: number;
  1: number;
}

interface ProductReviewsProps {
  productSlug: string;
  locale: string;
  initialReviews?: ReviewItem[];
  initialAverageRating?: number;
  initialTotalCount?: number;
  initialDistribution?: ReviewDistribution;
}

function formatRelativeTime(dateInput: string | number | Date, isAr: boolean): string {
  try {
    const d = new Date(dateInput);
    if (Number.isNaN(d.getTime())) return isAr ? 'مؤخراً' : 'Recently';
    const now = Date.now();
    const diffMs = now - d.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);

    if (diffDays <= 0) {
      if (diffMin < 2) return isAr ? 'الآن' : 'Just now';
      if (diffHours < 1) return isAr ? `منذ ${diffMin} دقيقة` : `${diffMin} minutes ago`;
      return isAr ? `منذ ${diffHours} ساعة` : `${diffHours} hours ago`;
    }
    if (diffDays === 1) return isAr ? 'أمس' : 'Yesterday';
    if (diffDays === 2) return isAr ? 'منذ يومين' : '2 days ago';
    if (diffDays >= 3 && diffDays <= 10) return isAr ? `منذ ${diffDays} أيام` : `${diffDays} days ago`;
    if (diffDays > 10 && diffDays < 30) {
      if (diffWeeks >= 1 && diffWeeks <= 4) {
        if (diffWeeks === 1) return isAr ? 'منذ أسبوع' : '1 week ago';
        if (diffWeeks === 2) return isAr ? 'منذ أسبوعين' : '2 weeks ago';
        return isAr ? `منذ ${diffWeeks} أسابيع` : `${diffWeeks} weeks ago`;
      }
      return isAr ? `منذ ${diffDays} يوماً` : `${diffDays} days ago`;
    }
    if (diffMonths === 1) return isAr ? 'منذ شهر' : '1 month ago';
    if (diffMonths >= 2 && diffMonths <= 10) return isAr ? `منذ ${diffMonths} أشهر` : `${diffMonths} months ago`;
    return isAr ? 'منذ سنة' : '1 year ago';
  } catch {
    return isAr ? 'مؤخراً' : 'Recently';
  }
}

export function ProductReviews({
  productSlug,
  locale,
  initialReviews = [],
  initialAverageRating = 0,
  initialTotalCount = 0,
  initialDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
}: ProductReviewsProps) {
  const isAr = locale === 'ar';

  const [reviews, setReviews] = useState<ReviewItem[]>(initialReviews);
  const [averageRating, setAverageRating] = useState<number>(initialAverageRating);
  const [totalCount, setTotalCount] = useState<number>(initialTotalCount);
  const [distribution, setDistribution] = useState<ReviewDistribution>(initialDistribution);

  // Form State
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [userName, setUserName] = useState<string>('');
  const [comment, setComment] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<boolean>(false);

  const activeStarRating = hoverRating > 0 ? hoverRating : rating;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const trimmedName = userName.trim();
    if (!trimmedName) {
      setErrorMsg(isAr ? 'يرجى إدخال اسمك الكريم' : 'Please enter your name');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productSlug,
          userName: trimmedName,
          rating,
          comment: comment.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || (isAr ? 'تعذر إرسال التقييم' : 'Failed to submit review'));
      }

      // Create new review item for optimistic UI update
      const newReview: ReviewItem = {
        id: data.id || `local-${Date.now()}`,
        productSlug,
        userName: trimmedName,
        rating,
        comment: comment.trim(),
        createdAt: new Date().toISOString(),
        approved: true,
      };

      const updatedReviews = [newReview, ...reviews];
      const newTotal = totalCount + 1;
      const newSum = reviews.reduce((acc, r) => acc + r.rating, 0) + rating;
      const newAvg = Number((newSum / newTotal).toFixed(1));
      const newDist: ReviewDistribution = {
        ...distribution,
        [rating as 1 | 2 | 3 | 4 | 5]: (distribution[rating as 1 | 2 | 3 | 4 | 5] || 0) + 1,
      };

      setReviews(updatedReviews);
      setTotalCount(newTotal);
      setAverageRating(newAvg);
      setDistribution(newDist);

      // Form reset & success state
      setUserName('');
      setComment('');
      setRating(5);
      setHoverRating(0);
      setSuccessMsg(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : isAr ? 'حدث خطأ أثناء الإرسال' : 'Submission error';
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className={styles.reviewsSection} aria-label={isAr ? 'تقييمات المنتج' : 'Product Reviews'}>
      <h2 className={styles.sectionHeading}>
        <span>{isAr ? 'تقييمات وآراء المشترين' : 'Customer Reviews'}</span>
        {totalCount > 0 && <span className={styles.sectionHeadingCount}>({totalCount})</span>}
      </h2>

      {/* Part 1: Reviews Summary */}
      <div className={styles.summaryContainer}>
        <div className={styles.summaryScoreBlock}>
          <span className={styles.largeScore}>
            {totalCount > 0 ? averageRating.toFixed(1) : '5.0'}
          </span>

          <div className={styles.starsRow} aria-label={`${averageRating} out of 5 stars`}>
            {[1, 2, 3, 4, 5].map((starIdx) => {
              const effectiveScore = totalCount > 0 ? averageRating : 5;
              const isFilled = starIdx <= Math.round(effectiveScore);
              return (
                <span
                  key={starIdx}
                  className={isFilled ? styles.starFilled : styles.starEmpty}
                  aria-hidden="true"
                >
                  ★
                </span>
              );
            })}
          </div>

          <span className={styles.totalCountLabel}>
            {totalCount === 0
              ? isAr
                ? 'لا توجد تقييمات بعد'
                : 'No reviews yet'
              : isAr
                ? `مبني على ${totalCount} تقييم`
                : `Based on ${totalCount} review${totalCount > 1 ? 's' : ''}`}
          </span>
        </div>

        {/* Rating Bars (5★ to 1★) */}
        <div className={styles.barsBlock} role="group" aria-label="Rating breakdown">
          {([5, 4, 3, 2, 1] as const).map((starNum) => {
            const count = distribution[starNum] || 0;
            const percentage = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;

            return (
              <div key={starNum} className={styles.barRow}>
                <span className={styles.barLabel}>
                  <span>{starNum}</span>
                  <span className={styles.barStarIcon} aria-hidden="true">
                    ★
                  </span>
                </span>

                <div className={styles.barTrack}>
                  <div
                    className={styles.barFill}
                    style={{ width: `${percentage}%` }}
                    role="progressbar"
                    aria-valuenow={percentage}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  />
                </div>

                <span className={styles.barCount}>{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Part 2: Add Review Form */}
      <div className={styles.formSection}>
        <h3 className={styles.formHeading}>
          {isAr ? 'شارك رأيك' : 'Share Your Review'}
        </h3>

        {successMsg && (
          <div className={styles.successAlert} role="status">
            <span aria-hidden="true">✓</span>
            <span>
              {isAr
                ? 'شكراً لك! تم إضافة تقييمك بنجاح.'
                : 'Thank you! Your review has been submitted successfully.'}
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.reviewForm}>
          {/* 5 Interactive Stars */}
          <div className={styles.starsInputGroup}>
            <label className={styles.starsInputLabel}>
              {isAr ? 'تقييمك للمنتج:' : 'Your Rating:'}
            </label>
            <div className={styles.interactiveStarsRow} role="radiogroup" aria-label="Rating selection">
              {[1, 2, 3, 4, 5].map((starIdx) => {
                const isActive = starIdx <= activeStarRating;
                return (
                  <button
                    key={starIdx}
                    type="button"
                    role="radio"
                    aria-checked={starIdx === rating}
                    aria-label={`${starIdx} star${starIdx > 1 ? 's' : ''}`}
                    className={`${styles.interactiveStarBtn} ${
                      isActive ? styles.interactiveStarBtnActive : ''
                    }`}
                    onMouseEnter={() => setHoverRating(starIdx)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => {
                      setRating(starIdx);
                      setSuccessMsg(false);
                    }}
                  >
                    ★
                  </button>
                );
              })}
            </div>
          </div>

          {/* User Name Field */}
          <div className={styles.fieldGroup}>
            <label htmlFor="review-user-name" className={styles.fieldLabel}>
              <span>
                {isAr ? 'اسمك' : 'Your Name'}
                <span className={styles.requiredMark}>*</span>
              </span>
            </label>
            <input
              id="review-user-name"
              type="text"
              required
              maxLength={80}
              value={userName}
              onChange={(e) => {
                setUserName(e.target.value);
                setSuccessMsg(false);
              }}
              placeholder={isAr ? 'أدخل اسمك الكريم' : 'Enter your name'}
              className={styles.textInput}
            />
          </div>

          {/* Comment Field (Optional, max 300 chars) */}
          <div className={styles.fieldGroup}>
            <label htmlFor="review-comment" className={styles.fieldLabel}>
              <span>{isAr ? 'رأيك بالمنتج (اختياري)' : 'Your Review (Optional)'}</span>
              <span className={styles.charCount}>{comment.length} / 300</span>
            </label>
            <textarea
              id="review-comment"
              maxLength={300}
              value={comment}
              onChange={(e) => {
                setComment(e.target.value);
                setSuccessMsg(false);
              }}
              placeholder={
                isAr
                  ? 'شاركنا تجربتك وملاحظاتك حول المنتج...'
                  : 'Share your experience and thoughts about the product...'
              }
              className={styles.textareaInput}
            />
          </div>

          {errorMsg && (
            <div className={styles.errorAlert} role="alert">
              {errorMsg}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className={styles.submitBtn}
          >
            {submitting ? (
              <span>{isAr ? 'جاري الإرسال...' : 'Submitting...'}</span>
            ) : (
              <span>{isAr ? 'إرسال التقييم' : 'Submit Review'}</span>
            )}
          </button>
        </form>
      </div>

      {/* Part 3: Reviews List */}
      <div className={styles.listSection}>
        <h3 className={styles.listHeading}>
          {isAr ? 'كل الآراء والتقييمات' : 'All Reviews'}
        </h3>

        {reviews.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyStateIcon} aria-hidden="true">
              <FirstReviewStarBubbleIcon size={28} />
            </span>
            <p>{isAr ? 'كن أول من يقيّم هذا المنتج!' : 'Be the first to review this product!'}</p>
          </div>
        ) : (
          <div className={styles.reviewsList}>
            {reviews.map((rev) => {
              const firstLetter = (rev.userName || 'U').trim().charAt(0).toUpperCase();

              return (
                <div key={rev.id} className={styles.reviewItem}>
                  {/* Teal Circular Initial Avatar */}
                  <div className={styles.avatar} aria-hidden="true">
                    {firstLetter}
                  </div>

                  <div className={styles.reviewContent}>
                    <div className={styles.reviewHeader}>
                      <div className={styles.reviewUserAndStars}>
                        <span className={styles.reviewUserName}>{rev.userName}</span>
                        <span
                          className={styles.reviewStars}
                          aria-label={`${rev.rating} out of 5 stars`}
                        >
                          {'★'.repeat(rev.rating)}
                          {'☆'.repeat(5 - rev.rating)}
                        </span>
                      </div>

                      <span className={styles.reviewDate}>
                        {formatRelativeTime(rev.createdAt, isAr)}
                      </span>
                    </div>

                    {rev.comment && (
                      <p className={styles.reviewComment}>{rev.comment}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
