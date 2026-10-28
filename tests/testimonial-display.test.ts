import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildTestimonialReviewJsonLd,
  getPublicTestimonials,
  type Testimonial,
} from '../lib/testimonial-display';

const approvedVisitorTestimonial: Testimonial = {
  id: 'visitor-1',
  name: 'Visitor',
  rating: 4,
  text: 'Helpful comparison.',
  createdAt: '2026-10-19T13:34:17.804Z',
  approved: true,
  locale: 'en',
  source: 'visitor_submission',
};

test('empty or unverified testimonials produce an empty public state and no schema', () => {
  assert.deepEqual(getPublicTestimonials([]), []);
  assert.deepEqual(
    getPublicTestimonials([
      { ...approvedVisitorTestimonial, id: 'default-1', source: 'unknown' },
      { ...approvedVisitorTestimonial, approved: false },
    ]),
    []
  );
  assert.equal(buildTestimonialReviewJsonLd([]), null);
});

test('only approved visitor submissions contribute reviews and aggregate ratings', () => {
  const schema = buildTestimonialReviewJsonLd([
    approvedVisitorTestimonial,
    { ...approvedVisitorTestimonial, id: 'pending', approved: false, rating: 1 },
    { ...approvedVisitorTestimonial, id: 'legacy', source: 'unknown', rating: 5 },
  ]);

  assert.ok(schema);
  assert.equal(schema.aggregateRating.reviewCount, '1');
  assert.equal(schema.aggregateRating.ratingValue, '4.0');
  assert.equal(schema.review.length, 1);
  assert.equal(schema.review[0].reviewBody, 'Helpful comparison.');
});
