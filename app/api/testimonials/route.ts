import { NextRequest, NextResponse } from 'next/server';
import {
  checkRateLimit,
  getClientIpFromHeaders,
  hashClientIpDaily,
} from '@/server/middleware/security';
import {
  createTestimonialServer,
  listApprovedTestimonialsServer,
} from '@/server/repositories/testimonials.repo';
import { sanitizePlainText } from '@/server/validators';

export const dynamic = 'force-dynamic';

type TestimonialLocale = 'ar' | 'en';

export async function GET() {
  const testimonials = await listApprovedTestimonialsServer();
  return NextResponse.json(
    { testimonials },
    {
      headers: {
        'Cache-Control':
          'public, s-maxage=600, stale-while-revalidate=86400',
      },
    }
  );
}

export async function POST(req: NextRequest) {
  let locale: TestimonialLocale = 'ar';
  try {
    const body = (await req.json()) as Record<string, unknown>;
    locale = body?.locale === 'en' ? 'en' : 'ar';

    // 1. Silent Honeypot check
    const honeypotVal =
      (typeof body?.websiteUrl === 'string' ? body.websiteUrl : '') ||
      (typeof body?.honeypot === 'string' ? body.honeypot : '');
    if (honeypotVal.trim().length > 0) {
      return NextResponse.json({ ok: true }, { status: 201 });
    }

    // 2. Strict IP Rate Limiting: max 3 testimonials per 30 minutes per hashed IP
    const rawIp = await getClientIpFromHeaders();
    const ipHash = hashClientIpDaily(rawIp);
    const rate = checkRateLimit(`testimonials_post:${ipHash}`, 3, 30 * 60 * 1000);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          error:
            locale === 'ar'
              ? 'يرجى الانتظار قليلاً قبل إرسال شهادة أخرى.'
              : 'Please wait a little before submitting another review.',
        },
        { status: 429 }
      );
    }

    const created = await createTestimonialServer({
      name: sanitizePlainText(body?.name, 50),
      rating: Number(body?.rating || 5),
      text: sanitizePlainText(body?.text, 300),
      locale: body?.locale === 'en' ? 'en' : 'ar',
    });
    return NextResponse.json({ testimonial: created }, { status: 201 });
  } catch {
    return NextResponse.json(
      {
        error:
          locale === 'ar'
            ? 'تعذر حفظ الشهادة حالياً. يرجى المحاولة لاحقاً.'
            : 'Your review could not be saved right now. Please try again.',
      },
      { status: 400 }
    );
  }
}
