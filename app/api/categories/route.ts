import { NextResponse } from 'next/server';
import { listActiveCategories } from '@/server/repositories/categories.repo';

export const revalidate = 600;

export async function GET() {
  try {
    const categories = await listActiveCategories();
    return NextResponse.json(
      { categories },
      {
        headers: {
          'Cache-Control':
            'public, s-maxage=600, stale-while-revalidate=86400',
        },
      }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unable to fetch categories.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
