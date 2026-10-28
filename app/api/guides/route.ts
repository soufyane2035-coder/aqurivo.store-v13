import { NextResponse } from 'next/server';
import { listPublishedArticles } from '@/server/repositories/articles.repo';
import { getArticleCatalogPage } from '@/server/services/catalog-pagination.service';

export const revalidate = 300;

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const page = getArticleCatalogPage(await listPublishedArticles(), {
      category: params.get('category') || 'all',
      query: params.get('q') || '',
      cursor: params.get('cursor'),
    });

    return NextResponse.json(
      page,
      {
        headers: {
          'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=86400',
        },
      }
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes('cursor is no longer valid')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Unable to load buying guides right now.' }, { status: 500 });
  }
}
