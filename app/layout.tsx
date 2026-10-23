import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import './globals.css';
import { ThemeProvider } from '@/components/ui/ThemeProvider';
import { I18nProvider } from '@/i18n/I18nProvider';
import { ToastProvider } from '@/components/ui/Toast';
import { SavedProvider } from '@/features/saved/SavedProvider';
import { CookieBanner } from '@/components/sections/CookieBanner';
import { Analytics } from '@vercel/analytics/next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://aqurivo.store';
const siteUrlCom = process.env.NEXT_PUBLIC_SITE_URL_COM || 'https://aqurivo.com';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0d1117' },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'AQURIVO | مراجعات المنتجات ومقارنة الأسعار قبل الشراء',
  authors: [{ name: 'AQURIVO Editorial Team' }],
  publisher: 'AQURIVO',
  other: {
    author: 'AQURIVO Editorial Team',
    thumbnail: `${siteUrl}/images/hero-desktop.jpg`,
    'og:image:secure_url': `${siteUrl}/images/hero-desktop.jpg`,
    'og:image:type': 'image/jpeg',
  },
  description:
    'اكتشف مراجعات المنتجات وأدلة الشراء، وقارن الأسعار والمميزات والعيوب قبل اتخاذ قرارك. يساعدك AQURIVO على اختيار ما يناسب احتياجاتك وميزانيتك.',
  keywords:
    'AQURIVO، مراجعات المنتجات، مقارنة الأسعار، أدلة الشراء، تسوق ذكي، المميزات والعيوب، أفضل أسعار',
  openGraph: {
    title: 'AQURIVO | مراجعات المنتجات ومقارنة الأسعار قبل الشراء',
    description:
      'اكتشف مراجعات المنتجات وأدلة الشراء، وقارن الأسعار والمميزات والعيوب قبل اتخاذ قرارك. يساعدك AQURIVO على اختيار ما يناسب احتياجاتك وميزانيتك.',
    url: siteUrl,
    siteName: 'AQURIVO',
    images: [
      {
        url: `${siteUrl}/images/hero-desktop.jpg`,
        secureUrl: `${siteUrl}/images/hero-desktop.jpg`,
        width: 1200,
        height: 675,
        type: 'image/jpeg',
        alt: 'AQURIVO | مراجعات المنتجات ومقارنة الأسعار قبل الشراء',
      },
    ],
    locale: 'ar_SA',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AQURIVO | مراجعات المنتجات ومقارنة الأسعار قبل الشراء',
    description:
      'اكتشف مراجعات المنتجات وأدلة الشراء، وقارن الأسعار والمميزات والعيوب قبل اتخاذ قرارك. يساعدك AQURIVO على اختيار ما يناسب احتياجاتك وميزانيتك.',
    images: [`${siteUrl}/images/hero-desktop.jpg`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '48x48' },
      { url: '/icon.svg', type: 'image/svg+xml', sizes: 'any' },
      { url: '/icon', sizes: '192x192', type: 'image/png' },
    ],
    shortcut: ['/favicon.ico'],
    apple: [{ url: '/apple-icon', sizes: '180x180', type: 'image/png' }],
  },
  manifest: '/manifest.webmanifest',
  verification: {
    google: 'oS_3HRPs49irqAH5Ey9SwCB9vrNxeshh61SYJSfZP2E',
  },
};

const organizationAndWebsiteJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${siteUrl}/#organization`,
      name: 'AQURIVO',
      alternateName: ['أكوريفو', 'AQURIVO Online'],
      url: siteUrl,
      email: 'contact@aqurivo.store',
      telephone: '+212684063908',
      contactPoint: [
        {
          '@type': 'ContactPoint',
          telephone: '+212684063908',
          email: 'contact@aqurivo.store',
          contactType: 'customer service',
          url: `${siteUrl}/en/contact`,
          availableLanguage: ['English', 'Arabic'],
        },
        {
          '@type': 'ContactPoint',
          telephone: '+212684063908',
          email: 'support@aqurivo.store',
          contactType: 'technical support',
          url: `${siteUrl}/en/contact`,
          availableLanguage: ['English', 'Arabic'],
        },
        {
          '@type': 'ContactPoint',
          telephone: '+212684063908',
          email: 'legal@aqurivo.store',
          contactType: 'legal inquiries',
          url: `${siteUrl}/en/terms`,
          availableLanguage: ['English', 'Arabic'],
        },
        {
          '@type': 'ContactPoint',
          telephone: '+212684063908',
          email: 'privacy@aqurivo.store',
          contactType: 'privacy & data protection',
          url: `${siteUrl}/en/privacy-policy`,
          availableLanguage: ['English', 'Arabic'],
        },
      ],
      publishingPrinciples: `${siteUrl}/en/about`,
      privacyPolicy: `${siteUrl}/en/privacy-policy`,
      termsOfService: `${siteUrl}/en/terms`,
      sameAs: [siteUrl, siteUrlCom],
      logo: {
        '@type': 'ImageObject',
        url: `${siteUrl}/icon`,
        contentUrl: `${siteUrl}/icon.svg`,
        width: 192,
        height: 192,
      },
      image: `${siteUrl}/images/hero-desktop.jpg`,
    },
    {
      '@type': 'WebSite',
      '@id': `${siteUrl}/#website`,
      url: siteUrl,
      name: 'AQURIVO',
      alternateName: ['أكوريفو', 'AQURIVO'],
      image: `${siteUrl}/images/hero-desktop.jpg`,
      thumbnailUrl: `${siteUrl}/images/hero-desktop.jpg`,
      primaryImageOfPage: {
        '@type': 'ImageObject',
        url: `${siteUrl}/images/hero-desktop.jpg`,
        contentUrl: `${siteUrl}/images/hero-desktop.jpg`,
        width: 1200,
        height: 675,
      },
      publisher: {
        '@id': `${siteUrl}/#organization`,
      },
      potentialAction: {
        '@type': 'SearchAction',
        target: `${siteUrl}/en/products?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      dir="ltr"
      data-theme="light"
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&family=Fraunces:opsz,wght@9..144,600&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          rel="preload"
          as="image"
          href="/images/hero-desktop.webp"
          media="(min-width: 768px)"
          type="image/webp"
        />
        <link
          rel="preload"
          as="image"
          href="/images/hero-mobile.webp"
          media="(max-width: 767px)"
          type="image/webp"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('aqurivo_theme')||localStorage.getItem('soufshop_theme');var d=s==='dark'||(!s&&window.matchMedia('(prefers-color-scheme: dark)').matches);var c=d?'dark':'light';document.documentElement.classList.add(c);document.documentElement.setAttribute('data-theme',c);}catch(e){}})();`,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationAndWebsiteJsonLd),
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <ThemeProvider>
          <I18nProvider>
            <ToastProvider>
              <SavedProvider>
                {children}
                <CookieBanner />
                <Analytics />
              </SavedProvider>
            </ToastProvider>
          </I18nProvider>
        </ThemeProvider>
        <Script
          id="trustedsite-verification"
          src="https://cdn.ywxi.net/js/1.js"
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}
