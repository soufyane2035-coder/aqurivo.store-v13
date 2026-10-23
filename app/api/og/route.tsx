import React from 'react';
import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';

export const runtime = 'edge';

const ALLOWED_OG_IMAGE_HOSTS = new Set([
  'res.cloudinary.com',
  'm.media-amazon.com',
  'images-na.ssl-images-amazon.com',
  'images-eu.ssl-images-amazon.com',
  'f.nooncdn.com',
  'img.kwcdn.com',
  'aqurivo.store',
  'www.aqurivo.store',
  'aqurivo.com',
  'www.aqurivo.com',
]);

function cleanOgText(input: string | null, maxLen: number, fallback = ''): string {
  if (!input) return fallback;
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .trim()
    .slice(0, maxLen) || fallback;
}

function getSafeOgImageUrl(rawUrl: string | null, requestHost: string): string {
  if (!rawUrl) return '';
  const trimmed = rawUrl.trim();
  if (trimmed.length > 1024) return '';

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:') return '';

    const host = parsed.hostname.toLowerCase();
    // Block localhost, loopback, link-local metadata (169.254.169.254), and private LAN IPs
    if (
      host === 'localhost' ||
      host.endsWith('.local') ||
      host.endsWith('.internal') ||
      /^(127\.|10\.|192\.168\.|169\.254\.|0\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(host) ||
      host.startsWith('[')
    ) {
      return '';
    }

    if (ALLOWED_OG_IMAGE_HOSTS.has(host) || host === requestHost.toLowerCase()) {
      return parsed.toString();
    }
    return '';
  } catch {
    return '';
  }
}

export async function GET(req: NextRequest) {
  const { searchParams, hostname } = new URL(req.url);
  const title = cleanOgText(
    searchParams.get('title'),
    120,
    'AQURIVO | مراجعات المنتجات ومقارنة الأسعار قبل الشراء'
  );
  const price = cleanOgText(searchParams.get('price'), 32);
  const source = cleanOgText(searchParams.get('source'), 40, 'AQURIVO');
  const rating = cleanOgText(searchParams.get('rating'), 10);
  const category = cleanOgText(searchParams.get('category'), 40);
  const subtitle = cleanOgText(searchParams.get('subtitle'), 140);
  const rawImage = getSafeOgImageUrl(searchParams.get('image'), hostname);
  const hasExternalImage = Boolean(rawImage);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '56px 64px',
          backgroundColor: '#101816',
          backgroundImage:
            'radial-gradient(circle at 85% 20%, rgba(17, 94, 73, 0.48), transparent 55%)',
          color: '#F7F6F2',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Top Brand Row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '12px',
                backgroundColor: '#0d1117',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg
                width="56"
                height="56"
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect width="32" height="32" rx="6" fill="#0d1117" />
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M4.5 27.5L12.1 6.4C12.9 4.2 14.3 3.5 16 3.5C17.7 3.5 19.1 4.2 19.9 6.4L27.5 27.5H22.6L17.4 12.1C17.0 10.9 16.5 10.5 16 10.5C15.5 10.5 15.0 10.9 14.6 12.1L9.4 27.5H4.5Z"
                  fill="#F9FAFB"
                />
                <path d="M16 3.5L17.6 7.5L16 9.2L14.4 7.5L16 3.5Z" fill="#2DD4BF" />
                <path d="M16 14.5L20.8 20.5L16 26.5L11.2 20.5L16 14.5Z" fill="#2DD4BF" />
              </svg>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                fontSize: '30px',
                fontWeight: 700,
                letterSpacing: '0.1em',
                color: '#FFFFFF',
              }}
            >
              AQURIVO
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            {category ? (
              <div
                style={{
                  padding: '8px 18px',
                  borderRadius: '999px',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  color: '#D1FAE5',
                  fontSize: '18px',
                  fontWeight: 600,
                }}
              >
                {category}
              </div>
            ) : null}
            <div
              style={{
                padding: '8px 20px',
                borderRadius: '999px',
                backgroundColor: '#115E49',
                color: '#FFFFFF',
                fontSize: '20px',
                fontWeight: 700,
              }}
            >
              {source}
            </div>
          </div>
        </div>

        {/* Center Body with Optional Product Image */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '40px',
            width: '100%',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              maxWidth: hasExternalImage ? '720px' : '1020px',
              flex: 1,
            }}
          >
            <div
              style={{
                fontSize: hasExternalImage ? '44px' : '50px',
                fontWeight: 700,
                lineHeight: 1.22,
                color: '#FFFFFF',
              }}
            >
              {title.length > 88 ? `${title.slice(0, 85)}...` : title}
            </div>

            {subtitle ? (
              <div
                style={{
                  fontSize: '22px',
                  lineHeight: 1.4,
                  color: '#C7D1CE',
                }}
              >
                {subtitle.length > 110 ? `${subtitle.slice(0, 107)}...` : subtitle}
              </div>
            ) : null}

            {price || rating ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                }}
              >
                {price ? (
                  <span
                    style={{
                      padding: '10px 26px',
                      borderRadius: '12px',
                      backgroundColor: '#C87D28',
                      color: '#FFFFFF',
                      fontSize: '30px',
                      fontWeight: 700,
                    }}
                  >
                    {price}
                  </span>
                ) : null}
                {rating ? (
                  <span
                    style={{
                      padding: '10px 20px',
                      borderRadius: '12px',
                      backgroundColor: 'rgba(45, 212, 191, 0.16)',
                      border: '1px solid rgba(45, 212, 191, 0.4)',
                      color: '#5EEAD4',
                      fontSize: '26px',
                      fontWeight: 700,
                    }}
                  >
                    ★ {rating} / 5
                  </span>
                ) : null}
              </div>
            ) : !subtitle ? (
              <div
                style={{
                  fontSize: '24px',
                  color: '#C7D1CE',
                }}
              >
                Amazon · Noon · Temu · ClickBank
              </div>
            ) : null}
          </div>

          {hasExternalImage ? (
            <div
              style={{
                width: '280px',
                height: '280px',
                borderRadius: '24px',
                backgroundColor: '#FFFFFF',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 20px 45px rgba(0, 0, 0, 0.45)',
                flexShrink: 0,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={rawImage}
                alt={title}
                width={248}
                height={248}
                style={{
                  width: '248px',
                  height: '248px',
                  objectFit: 'contain',
                  borderRadius: '14px',
                }}
              />
            </div>
          ) : null}
        </div>

        {/* Bottom Footer Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid rgba(255,255,255,0.16)',
            paddingTop: '22px',
            fontSize: '20px',
            color: '#9BA8A4',
          }}
        >
          <span>aqurivo.store — Choose Smarter. Buy with Confidence.</span>
          <span>اختر بذكاء. واشترِ بثقة.</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        'Cache-Control':
          'public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000',
      },
    }
  );
}
