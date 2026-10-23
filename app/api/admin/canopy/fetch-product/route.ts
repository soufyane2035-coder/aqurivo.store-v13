import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi, verifyCsrfRequest } from '@/server/middleware/security';
import { fetchCanopyProductWithRotation } from '@/server/services/canopy.service';

export async function POST(req: NextRequest) {
  const guard = await requireAdminApi();
  if (!guard.authorized) return guard.response;

  const csrfValid = await verifyCsrfRequest(req);
  if (!csrfValid) {
    return NextResponse.json({ error: 'Invalid security token.' }, { status: 403 });
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
