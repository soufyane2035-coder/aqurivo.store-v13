'use client';

import React, { useEffect, useState } from 'react';
import { MessageSquarePlus } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import { SignatureMotif } from '@/components/ui/SignatureMotif';
import {
  FALLBACK_TESTIMONIALS,
  getTestimonials,
  type Testimonial,
} from '@/lib/testimonials';
import { AddTestimonialForm } from './AddTestimonialForm';
import styles from './Testimonials.module.css';

export interface TestimonialsProps {
  initialTestimonials?: Testimonial[];
  sectionIndex?: string;
}

function formatTestimonialDate(iso: string, locale: 'ar' | 'en'): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-MA' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    }).format(d);
  } catch {
    return '';
  }
}

export function Testimonials({
  initialTestimonials,
  sectionIndex = '03',
}: TestimonialsProps) {
  const { locale } = useI18n();
  const isAr = locale === 'ar';

  const [testimonials, setTestimonials] = useState<Testimonial[]>(
    initialTestimonials && initialTestimonials.length > 0
      ? initialTestimonials
      : []
  );
  const [showForm, setShowForm] = useState(false);

  const reviewList = testimonials.map((item) => ({
    '@type': 'Review',
    author: {
      '@type': 'Person',
      name: item.name,
    },
    datePublished: item.createdAt.split('T')[0],
    reviewBody: item.text,
    inLanguage: item.locale,
    reviewRating: {
      '@type': 'Rating',
      ratingValue: item.rating,
      bestRating: 5,
      worstRating: 1,
    },
  }));

  const averageRating =
    reviewList.length > 0
      ? (
          reviewList.reduce(
            (sum, r) => sum + Number(r.reviewRating.ratingValue || 5),
            0
          ) / reviewList.length
        ).toFixed(1)
      : null;

  const reviewSchemaJsonLd =
    reviewList.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: 'AQURIVO',
          url: 'https://aqurivo.store',
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: String(averageRating),
            reviewCount: String(reviewList.length),
            bestRating: '5',
            worstRating: '1',
          },
          review: reviewList,
        }
      : null;

  return (
    <section
      className={styles.section}
      aria-labelledby="visitor-testimonials-heading"
    >
      {reviewSchemaJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(reviewSchemaJsonLd),
          }}
        />
      )}

      <div className={styles.headerRow}>
        <div className={styles.headingBlock}>
          <SignatureMotif
            index={sectionIndex}
            label={isAr ? 'شهادات الزوار' : 'Visitor Testimonials'}
          />
          <h2 id="visitor-testimonials-heading" className={styles.heading}>
            {isAr ? 'ماذا يقول زوارنا' : 'What Our Visitors Say'}
          </h2>
          <p className={styles.subheading}>
            {isAr
              ? 'تجارب حقيقية من متسوقين قارنوا الأسعار والعروض عبر AQURIVO'
              : 'Real experiences from shoppers comparing deals and prices on AQURIVO'}
          </p>
        </div>
      </div>

      {/* Horizontal Scroll-Snap Carousel on Mobile / 3-Col Grid on Desktop OR Clean Empty State */}
      {testimonials.length > 0 ? (
        <div className={styles.cardsTrack}>
        {testimonials.map((item) => {
          const formattedDate = formatTestimonialDate(item.createdAt, locale);
          return (
            <article
              key={item.id}
              className={styles.card}
              itemScope
              itemType="https://schema.org/Review"
            >
              <div
                itemProp="itemReviewed"
                itemScope
                itemType="https://schema.org/Organization"
              >
                <meta itemProp="name" content="AQURIVO" />
              </div>

              <div className={styles.cardTop}>
                <div
                  className={styles.starsRow}
                  aria-label={`${item.rating} / 5`}
                  itemProp="reviewRating"
                  itemScope
                  itemType="https://schema.org/Rating"
                >
                  <meta itemProp="ratingValue" content={String(item.rating)} />
                  <meta itemProp="bestRating" content="5" />
                  <meta itemProp="worstRating" content="1" />
                  {[1, 2, 3, 4, 5].map((starIndex) => (
                    <span
                      key={starIndex}
                      className={
                        starIndex <= item.rating
                          ? styles.starFilled
                          : styles.starEmpty
                      }
                      aria-hidden="true"
                    >
                      ★
                    </span>
                  ))}
                </div>

                <blockquote
                  className={styles.quoteText}
                  dir={item.locale === 'ar' ? 'rtl' : 'ltr'}
                  itemProp="reviewBody"
                >
                  &ldquo;{item.text}&rdquo;
                </blockquote>
              </div>

              <footer className={styles.cardFooter}>
                <p
                  className={styles.authorName}
                  dir={item.locale === 'ar' ? 'rtl' : 'ltr'}
                  itemProp="author"
                  itemScope
                  itemType="https://schema.org/Person"
                >
                  <span itemProp="name">{item.name}</span>
                </p>

                {formattedDate && (
                  <time
                    dateTime={item.createdAt}
                    itemProp="datePublished"
                    className={`${styles.dateLabel} tabularNums`}
                  >
                    {formattedDate}
                  </time>
                )}
              </footer>
            </article>
          );
        })}
        </div>
      ) : (
        <div className={styles.emptyTestimonialsState}>
          <p className={styles.emptyTestimonialsText}>
            {isAr
              ? 'لم تُنشر أي مراجعات من الزوار بعد. شاركنا تجربتك الأولى في مقارنة العروض عبر AQURIVO.'
              : 'No community reviews published yet. Be the first to share your experience using AQURIVO.'}
          </p>
        </div>
      )}

      {/* "أضف شهادتك" Button & Expandable Form */}
      <div className={styles.actionRow}>
        {!showForm ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className={styles.addBtn}
          >
            <MessageSquarePlus size={17} aria-hidden="true" />
            <span>{isAr ? 'أضف شهادتك' : 'Add Your Review'}</span>
          </button>
        ) : (
          <AddTestimonialForm onClose={() => setShowForm(false)} />
        )}
      </div>
    </section>
  );
}
