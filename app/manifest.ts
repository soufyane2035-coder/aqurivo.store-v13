import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'AQURIVO — Discover Top Curated Products',
    short_name: 'AQURIVO',
    description:
      'Independent product curation and price comparison across trusted global stores.',
    start_url: '/en',
    display: 'standalone',
    background_color: '#F7F6F2',
    theme_color: '#115E49',
    icons: [
      {
        src: '/favicon.ico',
        sizes: '48x48',
        type: 'image/png',
      },
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
      {
        src: '/icon',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  };
}
