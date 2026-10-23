import { NextRequest, NextResponse } from 'next/server';
import {
  getClientIpFromHeaders,
  requireAdminApi,
  verifyCsrfRequest,
} from '@/server/middleware/security';
import { requestAllProductsPurge } from '@/server/services/product-purge.service';

export async function POST(req: NextRequest) {
  const guard = await requireAdminApi();
  if (!guard.authorized) return guard.response;

  const csrfValid = await verifyCsrfRequest(req);
  if (!csrfValid) {
    return NextResponse.json({ error: 'رمز الحماية (CSRF) غير صالح.' }, { status: 403 });
  }

  try {
    const rawIp = await getClientIpFromHeaders();
    const result = await requestAllProductsPurge({
      adminEmail: guard.email || 'aqurivo@gmail.com',
      requestIp: rawIp,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'فشل إرسال طلب الحذف.' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      adminEmail: result.adminEmail,
      productsCount: result.productsCount,
      expiresAt: result.expiresAt,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'تعذر إرسال طلب التحقق من الحذف.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
