import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi, verifyCsrfRequest } from '@/server/middleware/security';
import { sanitizePlainText } from '@/server/validators';
import {
  isAmazonPaapiConfigured,
  searchAmazonPaapiItems,
} from '@/server/services/amazonPaapi.service';

export async function POST(req: NextRequest) {
  const guard = await requireAdminApi();
  if (!guard.authorized) return guard.response;

  const csrfValid = await verifyCsrfRequest(req);
  if (!csrfValid) {
    return NextResponse.json({ error: 'Invalid security token.' }, { status: 403 });
  }

  if (!isAmazonPaapiConfigured()) {
    return NextResponse.json(
      {
        error:
          'مفاتيح Amazon PA-API 5.0 غير مضبوطة بعد في الخادم (AMAZON_ACCESS_KEY, AMAZON_SECRET_KEY, AMAZON_ASSOCIATE_TAG).',
        notConfigured: true,
        items: [],
      },
      { status: 503 }
    );
  }

  try {
    const body = (await req.json()) as { keyword?: string; category?: string };
    const keyword = sanitizePlainText(body.keyword, 140);
    const category = sanitizePlainText(body.category || 'all', 80);

    if (!keyword) {
      return NextResponse.json(
        { error: 'يرجى إدخال كلمة مفتاحية للبحث في Amazon.' },
        { status: 400 }
      );
    }

    const items = await searchAmazonPaapiItems({ keyword, category });
    return NextResponse.json({ items });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'تعذر الاتصال بواجهة Amazon PA-API 5.0.';
    return NextResponse.json({ error: message, items: [] }, { status: 500 });
  }
}
