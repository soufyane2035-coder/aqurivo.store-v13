import { NextRequest, NextResponse } from 'next/server';
import { getToolBySlug } from '@/lib/tools-data';
import { getToolSeoBySlug } from '@/lib/tools-seo-content';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const locale = req.nextUrl.searchParams.get('locale') === 'ar' ? 'ar' : 'en';
  const tool = getToolBySlug(slug);
  const seo = getToolSeoBySlug(slug);

  const title = seo
    ? locale === 'ar'
      ? seo.titleAr.replace(' | AQURIVO', '')
      : seo.titleEn.replace(' | AQURIVO', '')
    : tool
      ? locale === 'ar'
        ? tool.nameAr
        : tool.nameEn
      : 'AQURIVO Smart Tool';

  const subtitle = seo
    ? locale === 'ar'
      ? seo.primaryKeywordAr
      : seo.primaryKeywordEn
    : 'AQURIVO Free Decision Studio';

  const safeTitle = title
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const safeSub = subtitle
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const svg = `<svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1200" y2="630" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#07111E"/>
        <stop offset="55%" stop-color="#0C1F33"/>
        <stop offset="100%" stop-color="#061814"/>
      </linearGradient>
      <linearGradient id="accent" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#10B981"/>
        <stop offset="100%" stop-color="#F59E0B"/>
      </linearGradient>
    </defs>
    <rect width="1200" height="630" fill="url(#bg)"/>
    <rect x="44" y="44" width="1112" height="542" rx="28" fill="rgba(15, 23, 42, 0.72)" stroke="rgba(16, 185, 129, 0.38)" stroke-width="2"/>
    <circle cx="1040" cy="140" r="180" fill="rgba(16, 185, 129, 0.08)"/>
    <circle cx="160" cy="500" r="210" fill="rgba(245, 158, 11, 0.06)"/>
    <text x="96" y="130" fill="#10B981" font-family="system-ui, sans-serif" font-size="22" font-weight="800" letter-spacing="4">AQURIVO SMART TOOLS STUDIO</text>
    <text x="96" y="290" fill="#F8FAFC" font-family="system-ui, sans-serif" font-size="54" font-weight="900">${safeTitle}</text>
    <text x="96" y="365" fill="#94A3B8" font-family="system-ui, sans-serif" font-size="28" font-weight="600">${safeSub}</text>
    <rect x="96" y="455" width="320" height="58" rx="14" fill="rgba(16, 185, 129, 0.16)" stroke="#10B981" stroke-width="1.5"/>
    <text x="256" y="492" text-anchor="middle" fill="#34D399" font-family="monospace, sans-serif" font-size="22" font-weight="800">aqurivo.store/${locale}/tools</text>
  </svg>`;

  return new NextResponse(svg, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}
