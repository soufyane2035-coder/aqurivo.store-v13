import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import {
  requireAdminApi,
  verifyCsrfRequest,
} from '@/server/middleware/security';
import { executeAllProductsPurge } from '@/server/services/product-purge.service';

function revalidateAllStorefrontPaths() {
  revalidatePath('/', 'layout');
  revalidatePath('/products');
  revalidatePath('/ar/products');
  revalidatePath('/en/products');
  revalidatePath('/categories');
  revalidatePath('/admin/products');
}

export async function POST(req: NextRequest) {
  const guard = await requireAdminApi();
  if (!guard.authorized) return guard.response;

  const csrfValid = await verifyCsrfRequest(req);
  if (!csrfValid) {
    return NextResponse.json({ error: 'رمز الحماية (CSRF) غير صالح.' }, { status: 403 });
  }

  try {
    const body = (await req.json()) as { token?: string; code?: string };
    const token = typeof body.token === 'string' ? body.token.trim() : '';
    const code = typeof body.code === 'string' ? body.code.trim() : '';

    if (!token && !code) {
      return NextResponse.json(
        { error: 'يرجى تقديم رمز التحقق (OTP) أو رمز الرابط السري.' },
        { status: 400 }
      );
    }

    const result = await executeAllProductsPurge({ token, code });

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'فشل تأكيد الحذف.' }, { status: 400 });
    }

    revalidateAllStorefrontPaths();

    return NextResponse.json({
      success: true,
      purgedCount: result.purgedCount,
      message: `تم حذف جميع المنتجات (${result.purgedCount} منتج) بنجاح وإفراغ المتجر بالكامل.`,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'تعذر إتمام عملية الحذف.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  // CRITICAL SECURITY: Never execute destructive mutations via HTTP GET!
  // Mail crawlers, antivirus bots, or link previewers fetching this URL must never trigger data deletion.
  // Instead, redirect to the admin UI where the administrator can review and confirm via authenticated POST.
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token') || '';
  const code = searchParams.get('code') || '';

  const redirectUrl = new URL('/admin/products', req.url);
  if (token) redirectUrl.searchParams.set('confirm_purge_token', token);
  if (code) redirectUrl.searchParams.set('confirm_purge_code', code);
  return NextResponse.redirect(redirectUrl);
}
