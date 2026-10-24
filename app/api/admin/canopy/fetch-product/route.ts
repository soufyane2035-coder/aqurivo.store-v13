import { NextRequest, NextResponse } from 'next/server';
import {
  checkRateLimit,
  getClientIpFromHeaders,
  hashClientIpDaily,
  rateLimitResponseHeaders,
  requireAdminApi,
  verifyCsrfRequest,
} from '@/server/middleware/security';
import { rejectVerifiedBot } from '@/server/middleware/botid';
import { fetchCanopyProductWithRotation } from '@/server/services/canopy.service';

export async function POST(req: NextRequest) {
  const botResponse = await rejectVerifiedBot();
  if (botResponse) return botResponse;

  const guard = await requireAdminApi();
  if (!guard.authorized) return guard.response;

  const csrfValid = await verifyCsrfRequest(req);
  if (!csrfValid) {
    return NextResponse.json({ error: 'Invalid security token.' }, { status: 403 });
  }

  const rawIp = await getClientIpFromHeaders();
  const ipHash = hashClientIpDaily(rawIp);
  const rate = await checkRateLimit(`canopy_fetch:${ipHash}`, 20, 60 * 60 * 1000);
  if (rate.unavailable) {
    return NextResponse.json(
      { error: 'Product lookup is temporarily unavailable.' },
      { status: 503, headers: rateLimitResponseHeaders(rate) }
    );
  }
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Too many product lookups. Please try again later.' },
      { status: 429, headers: rateLimitResponseHeaders(rate) }
    );
  }

  try {
    const body = (await req.json()) as { urlOrAsin?: string };
    const urlOrAsin = String(body.urlOrAsin || '').trim();

    if (!urlOrAsin) {
      return NextResponse.json(
        { error: 'يرجى إدخال رابط المنتج من Amazon أو رقم ASIN أولاً.' },
        { status: 400 }
      );
    }

    const result = await fetchCanopyProductWithRotation(urlOrAsin);
    return NextResponse.json(result);
  } catch (err) {
    const msg =
      err instanceof Error
        ? err.message
        : 'تعذر جلب بيانات المنتج عبر Canopy API.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
