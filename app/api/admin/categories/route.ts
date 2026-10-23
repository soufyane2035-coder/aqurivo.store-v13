import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi, verifyCsrfRequest } from '@/server/middleware/security';
import {
  deleteCategoryAdmin,
  listAllCategoriesAdmin,
  upsertCategoryAdmin,
} from '@/server/repositories/categories.repo';
import { sanitizePlainText, ValidationError } from '@/server/validators';

export const dynamic = 'force-dynamic';

export async function GET() {
  const guard = await requireAdminApi();
  if (!guard.authorized) return guard.response;

  try {
    const categories = await listAllCategoriesAdmin();
    return NextResponse.json({ categories });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unable to fetch categories.';
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
    const body = await req.json();
    const category = await upsertCategoryAdmin(body);
    return NextResponse.json({ category });
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message, field: err.field }, { status: 400 });
    }
    const msg = err instanceof Error ? err.message : 'Unable to save category.';
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
      return NextResponse.json({ error: 'Category ID is required.' }, { status: 400 });
    }
    await deleteCategoryAdmin(id);
    return NextResponse.json({ deleted: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unable to delete category.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
