export type TestimonialSource = 'visitor_submission' | 'unknown';

export interface Testimonial {
  id: string;
  name: string;
  rating: number;
  text: string;
  createdAt: string;
  approved: boolean;
  locale: 'ar' | 'en';
  source: TestimonialSource;
}

export function getPublicTestimonials(
  testimonials: readonly Testimonial[]
): Testimonial[] {
  return testimonials.filter(
    (testimonial) =>
      testimonial.approved === true &&
      testimonial.source === 'visitor_submission'
  );
}

export function buildTestimonialReviewJsonLd(
  testimonials: readonly Testimonial[]
) {
  const publicTestimonials = getPublicTestimonials(testimonials);
  if (publicTestimonials.length === 0) return null;

  const reviews = publicTestimonials.map((item) => ({
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
  const averageRating = (
    publicTestimonials.reduce((sum, item) => sum + item.rating, 0) /
    publicTestimonials.length
  ).toFixed(1);

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'AQURIVO',
    url: 'https://aqurivo.store',
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: averageRating,
      reviewCount: String(publicTestimonials.length),
      bestRating: '5',
      worstRating: '1',
    },
    review: reviews,
  };
}
