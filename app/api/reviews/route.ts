import { NextRequest, NextResponse } from 'next/server';
import {
  checkRateLimit,
  getClientIpFromHeaders,
  hashClientIpDaily,
} from '@/server/middleware/security';
import {
  getReviewsByProductSlug,
  createReview,
} from '@/server/repositories/reviews.repo';
import { sanitizePlainText } from '@/server/validators';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawSlug = searchParams.get('slug') || searchParams.get('productSlug') || '';
    const slug = sanitizePlainText(rawSlug, 140);

    if (!slug) {
      return NextResponse.json(
        { reviews: [], averageRating: 0, totalCount: 0, distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } },
        { status: 200 }
      );
    }

    const data = await getReviewsByProductSlug(slug);
    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=86400',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Unable to load product reviews right now.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;

    // 1. Silent Honeypot check against automated bots
    const honeypotVal =
      (typeof body?.websiteUrl === 'string' ? body.websiteUrl : '') ||
      (typeof body?.honeypot === 'string' ? body.honeypot : '');
    if (honeypotVal.trim().length > 0) {
      return NextResponse.json({ success: true, id: 'filtered' }, { status: 201 });
    }

    // 2. Strict IP Rate Limiting: max 5 reviews per 15 minutes per hashed IP
    const rawIp = await getClientIpFromHeaders();
    const ipHash = hashClientIpDaily(rawIp);
    const rate = checkRateLimit(`reviews_post:${ipHash}`, 5, 15 * 60 * 1000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'لقد أرسلت عدة تقييمات مؤخراً. يرجى الانتظار قليلاً قبل المحاولة مجدداً.' },
        { status: 429 }
      );
    }

    const productSlug = sanitizePlainText(body?.productSlug, 140);
    const userName = sanitizePlainText(body?.userName, 80);
    const comment = sanitizePlainText(body?.comment, 300);

    if (!productSlug) {
      return NextResponse.json(
        { error: 'productSlug is required' },
        { status: 400 }
      );
    }

    if (!userName) {
      return NextResponse.json(
        { error: 'userName is required' },
        { status: 400 }
      );
    }

    const numRating = Number(body?.rating);
    if (!Number.isFinite(numRating) || numRating < 1 || numRating > 5) {
      return NextResponse.json(
        { error: 'rating must be an integer between 1 and 5' },
        { status: 400 }
      );
    }

    const id = await createReview({
      productSlug,
      userName,
      rating: Math.round(numRating),
      comment,
    });

    return NextResponse.json({ success: true, id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Unable to submit review right now.' }, { status: 500 });
  }
}
