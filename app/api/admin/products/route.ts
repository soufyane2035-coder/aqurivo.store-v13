import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getAdminDb } from '@/server/config/firebase-admin';
import { requireAdminApi, verifyCsrfRequest } from '@/server/middleware/security';
import {
  createOrUpdateProductAdmin,
  deleteProductAdmin,
  listAllProductsAdmin,
  refreshProductPriceTimestampAdmin,
  invalidateProductsCache,
} from '@/server/repositories/products.repo';
import { sanitizePlainText, ValidationError } from '@/server/validators';

export const dynamic = 'force-dynamic';

function revalidateAllProductSurfaces(slug?: string) {
  revalidatePath('/', 'layout');
  revalidatePath('/');
  revalidatePath('/ar');
  revalidatePath('/en');
  revalidatePath('/products');
  revalidatePath('/ar/products');
  revalidatePath('/en/products');
  revalidatePath('/categories');
  revalidatePath('/deals');
  revalidatePath('/admin');
  revalidatePath('/admin/products');
  if (slug) {
    revalidatePath(`/products/${slug}`);
    revalidatePath(`/ar/products/${slug}`);
    revalidatePath(`/en/products/${slug}`);
  }
}

export async function GET() {
  const guard = await requireAdminApi();
  if (!guard.authorized) return guard.response;

  try {
    const products = await listAllProductsAdmin();
    return NextResponse.json(
      { products },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unable to fetch products.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireAdminApi();
  if (!guard.authorized) return guard.response;

  const csrfValid = await verifyCsrfRequest(req);
  if (!csrfValid) {
    return NextResponse.json({ error: 'Invalid security token.' }, { status: 403 });
  }

  try {
    const body = (await req.json()) as { existingId?: string; payload?: unknown };
    const existingId = body.existingId ? sanitizePlainText(body.existingId, 128) : undefined;
    const saved = await createOrUpdateProductAdmin(body.payload ?? body, existingId);
    revalidateAllProductSurfaces(saved.slug);
    return NextResponse.json({ product: saved });
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message, field: err.field }, { status: 400 });
    }
    const msg = err instanceof Error ? err.message : 'Unable to save product.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const guard = await requireAdminApi();
  if (!guard.authorized) return guard.response;

  const csrfValid = await verifyCsrfRequest(req);
  if (!csrfValid) {
    return NextResponse.json({ error: 'Invalid security token.' }, { status: 403 });
  }

  try {
    const body = (await req.json()) as {
      productId?: string;
      action?: 'refresh_price_timestamp' | 'toggle_status';
      status?: 'published' | 'draft' | 'archived';
    };
    const productId = sanitizePlainText(body.productId, 128);
    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required.' }, { status: 400 });
    }

    if (body.action === 'refresh_price_timestamp') {
      await refreshProductPriceTimestampAdmin(productId);
      revalidateAllProductSurfaces(productId);
      return NextResponse.json({ updated: true, priceUpdatedAt: new Date().toISOString() });
    }

    if (body.action === 'toggle_status' && body.status) {
      const db = getAdminDb();
      if (!db) {
        return NextResponse.json({ error: 'Database is not configured yet.' }, { status: 503 });
      }
      const nextStatus =
        body.status === 'published' || body.status === 'archived' ? body.status : 'draft';
      await db.collection('products').doc(productId).update({
        status: nextStatus,
        updatedAt: new Date().toISOString(),
      });
      invalidateProductsCache();
      revalidateAllProductSurfaces(productId);
      return NextResponse.json({ updated: true, status: nextStatus });
    }

    return NextResponse.json({ error: 'Unsupported action.' }, { status: 400 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unable to update product.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const guard = await requireAdminApi();
  if (!guard.authorized) return guard.response;

  const csrfValid = await verifyCsrfRequest(req);
  if (!csrfValid) {
    return NextResponse.json({ error: 'Invalid security token.' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = sanitizePlainText(searchParams.get('id'), 128);
    if (!id) {
      return NextResponse.json({ error: 'Product ID is required.' }, { status: 400 });
    }
    await deleteProductAdmin(id);
    revalidateAllProductSurfaces(id);
    return NextResponse.json({ deleted: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unable to delete product.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
