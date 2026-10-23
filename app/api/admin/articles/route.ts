import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi, verifyCsrfRequest } from '@/server/middleware/security';
import { deleteArticleAdmin, listAllArticlesAdmin, upsertArticleAdmin } from '@/server/repositories/articles.repo';
import { sanitizePlainText, ValidationError } from '@/server/validators';

export const dynamic = 'force-dynamic';

export async function GET() {
  const guard = await requireAdminApi();
  if (!guard.authorized) return guard.response;

  try {
    const articles = await listAllArticlesAdmin();
    return NextResponse.json({ articles });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unable to fetch articles.';
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
    const article = await upsertArticleAdmin(body.payload ?? body, existingId);
    return NextResponse.json({ article });
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message, field: err.field }, { status: 400 });
    }
    const msg = err instanceof Error ? err.message : 'Unable to save article.';
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
      return NextResponse.json({ error: 'Article ID is required.' }, { status: 400 });
    }
    await deleteArticleAdmin(id);
    return NextResponse.json({ deleted: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unable to delete article.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
