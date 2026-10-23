import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getToolBySlug, TOOLS_DATA } from '@/lib/tools-data';
import { getToolSeoBySlug } from '@/lib/tools-seo-content';
import { listPublishedArticles } from '@/server/repositories/articles.repo';
import { SiteHeader } from '@/components/sections/SiteHeader';
import { SiteFooter } from '@/components/sections/SiteFooter';
import { IsItWorthBuying } from '@/components/tools/IsItWorthBuying';
import { WorthBuyingLogo } from '@/components/tools/WorthBuyingLogo';
import { HiddenInterestCalculator } from '@/components/tools/HiddenInterestCalculator';
import { HiddenInterestLogo } from '@/components/tools/HiddenInterestLogo';
import { CostOfLivingCompare } from '@/components/tools/CostOfLivingCompare';
import { CostOfLivingLogo } from '@/components/tools/CostOfLivingLogo';
import { RealSalaryCalculator } from '@/components/tools/RealSalaryCalculator';
import { RealSalaryLogo } from '@/components/tools/RealSalaryLogo';
import { SavingsGoalCalculator } from '@/components/tools/SavingsGoalCalculator';
import { SavingsGoalLogo } from '@/components/tools/SavingsGoalLogo';
import { WorkTimeValueCalculator } from '@/components/tools/WorkTimeValueCalculator';
import { WorkTimeValueLogo } from '@/components/tools/WorkTimeValueLogo';
import { FreelancePriceChecker } from '@/components/tools/FreelancePriceChecker';
import { FreelancePriceLogo } from '@/components/tools/FreelancePriceLogo';
import { LoanComparison } from '@/components/tools/LoanComparison';
import { LoanComparisonLogo } from '@/components/tools/LoanComparisonLogo';
import { CarbonFootprintCalculator } from '@/components/tools/CarbonFootprintCalculator';
import { CarbonFootprintLogo } from '@/components/tools/CarbonFootprintLogo';
import { InvestmentGrowthCalculator } from '@/components/tools/InvestmentGrowthCalculator';
import { InvestmentGrowthLogo } from '@/components/tools/InvestmentGrowthLogo';
import { CodeToImage } from '@/components/tools/CodeToImage';
import { CodeToImageLogo } from '@/components/tools/CodeToImageLogo';
import { SmartToolChain } from '@/components/SmartToolPulse/SmartToolChain';
import styles from './toolDetail.module.css';

const SITE_URL = 'https://aqurivo.store';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const tool = getToolBySlug(slug);
  if (!tool || (locale !== 'ar' && locale !== 'en')) {
    return {
      title: 'Tool Not Found | AQURIVO',
      robots: 'noindex, nofollow',
    };
  }

  const isAr = locale === 'ar';
  const seo = getToolSeoBySlug(tool.slug);

  const title = seo
    ? isAr
      ? seo.titleAr
      : seo.titleEn
    : isAr
      ? `${tool.nameAr} | AQURIVO`
      : `${tool.nameEn} | AQURIVO`;

  const description = seo
    ? isAr
      ? seo.descriptionAr
      : seo.descriptionEn
    : isAr
      ? tool.descriptionAr
      : tool.descriptionEn;

  const keywords = seo
    ? isAr
      ? seo.keywordsAr
      : seo.keywordsEn
    : isAr
      ? tool.keywordsAr
      : tool.keywordsEn;

  const canonical = `${SITE_URL}/${locale}/tools/${tool.slug}`;
  const ogImageUrl = `${SITE_URL}${seo?.ogImagePath || `/api/og/tools/${tool.slug}`}?locale=${locale}`;
  const toolCategoryLabel = isAr ? 'أداة ذكية تفاعلية مجانية' : 'Free Interactive Smart Tool';
  const toolBadgeLabel = isAr ? tool.badgeAr : tool.badgeEn;

  return {
    title,
    description,
    keywords,
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
    other: {
      thumbnail: ogImageUrl,
      'og:image:secure_url': ogImageUrl,
      'og:image:type': 'image/png',
      'og:image:alt': title,
      'twitter:label1': isAr ? 'نوع الأداة' : 'Tool Type',
      'twitter:data1': toolBadgeLabel || toolCategoryLabel,
      'twitter:label2': isAr ? 'التكلفة' : 'Access',
      'twitter:data2': isAr ? 'مجانية 100% بدون تسجيل' : '100% Free — No Sign-Up',
    },
    alternates: {
      canonical,
      languages: {
        ar: `${SITE_URL}/ar/tools/${tool.slug}`,
        en: `${SITE_URL}/en/tools/${tool.slug}`,
        'x-default': `${SITE_URL}/en/tools/${tool.slug}`,
      },
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: 'AQURIVO',
      locale: isAr ? 'ar_SA' : 'en_US',
      alternateLocale: isAr ? ['en_US'] : ['ar_SA'],
      type: 'website',
      images: [
        {
          url: ogImageUrl,
          secureUrl: ogImageUrl,
          width: 1200,
          height: 630,
          type: 'image/png',
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      site: '@aqurivo',
      creator: '@aqurivo',
      title,
      description,
      images: [
        {
          url: ogImageUrl,
          alt: title,
        },
      ],
    },
  };
}

export default async function ToolDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{
    price?: string;
    productSlug?: string;
    productName?: string;
  }>;
}) {
  const { locale, slug } = await params;
  if (locale !== 'ar' && locale !== 'en') {
    notFound();
  }

  const tool = getToolBySlug(slug);
  if (!tool) {
    notFound();
  }

  const resolvedSearch = await searchParams;
  const initialPrice = resolvedSearch.price ? Number(resolvedSearch.price) : undefined;
  const initialProductSlug =
    typeof resolvedSearch.productSlug === 'string'
      ? resolvedSearch.productSlug
      : undefined;
  const initialProductName =
    typeof resolvedSearch.productName === 'string'
      ? resolvedSearch.productName
      : undefined;
  const isAr = locale === 'ar';
  const seo = getToolSeoBySlug(tool.slug);
  const allGuides = await listPublishedArticles();
  const featuredGuides = allGuides.slice(0, 3);

  const resolveApplicationCategory = (slugName: string): string => {
    if (slugName === 'code-to-image') return 'DeveloperApplication';
    if (slugName === 'freelance-price-checker') return 'BusinessApplication';
    if (slugName === 'carbon-footprint-calculator') return 'LifestyleApplication';
    if (
      slugName === 'is-it-worth-buying' ||
      slugName === 'work-time-value-calculator'
    ) {
      return 'ShoppingApplication';
    }
    return 'FinanceApplication';
  };

  const faqList = seo ? (isAr ? seo.faqsAr : seo.faqsEn) : [];
  const howToSteps = seo ? (isAr ? seo.howToStepsAr : seo.howToStepsEn) : [];
  const whyNeedText = seo ? (isAr ? seo.whyNeedAr : seo.whyNeedEn) : '';
  const toolDisplayName = isAr ? tool.nameAr : tool.nameEn;
  const toolKeywords = seo
    ? isAr
      ? seo.keywordsAr
      : seo.keywordsEn
    : isAr
      ? tool.keywordsAr
      : tool.keywordsEn;

  const webAppJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: toolDisplayName,
    url: `${SITE_URL}/${locale}/tools/${tool.slug}`,
    applicationCategory: resolveApplicationCategory(tool.slug),
    operatingSystem: 'All',
    browserRequirements: 'Requires JavaScript. HTML5.',
    isAccessibleForFree: true,
    inLanguage: isAr ? 'ar' : 'en',
    featureList: toolKeywords.slice(0, 6),
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    description: seo
      ? isAr
        ? seo.descriptionAr
        : seo.descriptionEn
      : isAr
        ? tool.descriptionAr
        : tool.descriptionEn,
  };

  const howToJsonLd =
    howToSteps.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'HowTo',
          name: isAr
            ? `كيف تستخدم ${tool.nameAr}؟`
            : `How to Use ${tool.nameEn}?`,
          description: seo
            ? isAr
              ? seo.descriptionAr
              : seo.descriptionEn
            : isAr
              ? tool.descriptionAr
              : tool.descriptionEn,
          inLanguage: isAr ? 'ar' : 'en',
          step: howToSteps.map((stepText, idx) => ({
            '@type': 'HowToStep',
            position: idx + 1,
            name: isAr ? `الخطوة ${idx + 1}` : `Step ${idx + 1}`,
            text: stepText,
          })),
        }
      : null;

  const faqPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqList.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: isAr ? 'الرئيسية' : 'Home',
        item: `${SITE_URL}/${locale}`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: isAr ? 'الأدوات الذكية' : 'Tools',
        item: `${SITE_URL}/${locale}/tools`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: toolDisplayName,
        item: `${SITE_URL}/${locale}/tools/${tool.slug}`,
      },
    ],
  };

  const relatedTools = TOOLS_DATA.filter((item) => item.slug !== tool.slug).slice(0, 3);

  const renderToolComponent = () => {
    switch (tool.component) {
      case 'IsItWorthBuying':
        return <IsItWorthBuying locale={locale} initialPrice={initialPrice} />;
      case 'HiddenInterestCalculator':
        return <HiddenInterestCalculator locale={locale} initialPrice={initialPrice} />;
      case 'CostOfLivingCompare':
        return <CostOfLivingCompare locale={locale} />;
      case 'RealSalaryCalculator':
        return <RealSalaryCalculator locale={locale} />;
      case 'SavingsGoalCalculator':
        return <SavingsGoalCalculator locale={locale} />;
      case 'WorkTimeValueCalculator':
        return <WorkTimeValueCalculator locale={locale} initialPrice={initialPrice} />;
      case 'FreelancePriceChecker':
        return <FreelancePriceChecker locale={locale} />;
      case 'LoanComparison':
        return <LoanComparison locale={locale} />;
      case 'CarbonFootprintCalculator':
        return <CarbonFootprintCalculator locale={locale} />;
      case 'InvestmentGrowthCalculator':
        return <InvestmentGrowthCalculator locale={locale} />;
      case 'CodeToImage':
        return <CodeToImage locale={locale} />;
      default:
        return null;
    }
  };

  return (
    <div className={styles.pageShell} dir={isAr ? 'rtl' : 'ltr'}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }}
      />
      {howToJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }}
        />
      )}
      {faqList.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPageJsonLd) }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <SiteHeader />

      <main id="main-content" className={styles.main}>
        <nav className={styles.breadcrumbRow} aria-label="Breadcrumb">
          <Link href={`/${locale}/tools`} className={styles.backLink}>
            {isAr ? '→ العودة إلى جميع الأدوات (11 أداة)' : '← Back to All Free Tools'}
          </Link>
        </nav>

        <header className={styles.heroBanner}>
          {tool.slug === 'is-it-worth-buying' ? (
            <WorthBuyingLogo
              size="lg"
              showWordmark
              locale={locale}
              asHeading
            />
          ) : tool.slug === 'hidden-interest-calculator' ? (
            <HiddenInterestLogo
              size="lg"
              showWordmark
              locale={locale}
              asHeading
            />
          ) : tool.slug === 'work-time-value-calculator' ? (
            <WorkTimeValueLogo
              size="lg"
              showWordmark
              locale={locale}
              asHeading
            />
          ) : tool.slug === 'cost-of-living-compare' ? (
            <CostOfLivingLogo
              size="lg"
              showWordmark
              locale={locale}
              asHeading
            />
          ) : tool.slug === 'real-salary-calculator' ? (
            <RealSalaryLogo
              size="lg"
              showWordmark
              locale={locale}
              asHeading
            />
          ) : tool.slug === 'savings-goal-calculator' ? (
            <SavingsGoalLogo
              size="lg"
              showWordmark
              locale={locale}
              asHeading
            />
          ) : tool.slug === 'freelance-price-checker' ? (
            <FreelancePriceLogo
              size="lg"
              showWordmark
              locale={locale}
              asHeading
            />
          ) : tool.slug === 'loan-comparison' ? (
            <LoanComparisonLogo
              size="lg"
              showWordmark
              locale={locale}
              asHeading
            />
          ) : tool.slug === 'investment-growth-calculator' ? (
            <InvestmentGrowthLogo
              size="lg"
              showWordmark
              locale={locale}
              asHeading
            />
          ) : tool.slug === 'carbon-footprint-calculator' ? (
            <CarbonFootprintLogo
              size="lg"
              showWordmark
              locale={locale}
              asHeading
            />
          ) : tool.slug === 'code-to-image' ? (
            <CodeToImageLogo
              size="lg"
              showWordmark
              locale={locale}
              asHeading
            />
          ) : (
            <div className={styles.heroTopRow}>
              <div className={styles.iconBox} aria-hidden="true">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d={tool.icon} />
                </svg>
              </div>
              <h1 className={styles.title}>{isAr ? tool.nameAr : tool.nameEn}</h1>
            </div>
          )}
          <p className={styles.description}>
            {isAr ? tool.descriptionAr : tool.descriptionEn}
          </p>
        </header>

        <section aria-label={isAr ? tool.nameAr : tool.nameEn}>
          {renderToolComponent()}
        </section>

        <SmartToolChain
          currentToolSlug={tool.slug}
          locale={locale}
          initialPrice={initialPrice}
          initialProductSlug={initialProductSlug}
          initialProductName={initialProductName}
          variant="quickBar"
        />

        {seo && (
          <article className={styles.seoArticleSection}>
            <div className={styles.seoArticleGrid}>
              <section className={styles.seoCard}>
                <h2 className={styles.seoHeading}>
                  {isAr
                    ? `كيف تستخدم ${tool.nameAr}؟`
                    : `How to Use ${tool.nameEn}?`}
                </h2>
                <ol className={styles.seoStepsList}>
                  {howToSteps.map((step, index) => (
                    <li key={index} className={styles.seoStepItem}>
                      <span className={styles.seoStepBadge}>{index + 1}</span>
                      <span className={styles.seoStepText}>{step}</span>
                    </li>
                  ))}
                </ol>
              </section>

              <section className={styles.seoCard}>
                <h2 className={styles.seoHeading}>
                  {isAr
                    ? `لماذا تحتاج ${tool.nameAr}؟`
                    : `Why Do You Need ${tool.nameEn}?`}
                </h2>
                <p className={styles.seoBodyParagraph}>{whyNeedText}</p>
              </section>
            </div>

            <section className={styles.seoFaqSection}>
              <h2 className={styles.seoHeading}>
                {isAr ? 'أسئلة شائعة' : 'Frequently Asked Questions'}
              </h2>
              <div className={styles.seoFaqList}>
                {faqList.map((faq, index) => (
                  <div key={index} className={styles.seoFaqItem}>
                    <h3 className={styles.seoFaqQuestion}>{faq.question}</h3>
                    <p className={styles.seoFaqAnswer}>{faq.answer}</p>
                  </div>
                ))}
              </div>
            </section>

            {featuredGuides.length > 0 && tool.category !== 'work' && (
              <section
                className={styles.seoFaqSection}
                style={{ marginTop: '1.25rem' }}
                aria-label={
                  isAr
                    ? 'أدلة الشراء والمراجعات الموصى بها'
                    : 'Recommended Buying Guides & Reviews'
                }
              >
                <h2 className={styles.seoHeading}>
                  {isAr
                    ? 'أدلة الشراء والمقارنات الشاملة قبل اتخاذ قرارك'
                    : 'In-Depth Buying Guides & Product Comparisons'}
                </h2>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: '0.85rem',
                  }}
                >
                  {featuredGuides.map((guide) => (
                    <Link
                      key={guide.id}
                      href={`/${locale}/guides/${encodeURIComponent(guide.slug)}`}
                      className={styles.seoFaqItem}
                      style={{
                        textDecoration: 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '0.5rem',
                      }}
                    >
                      <h3
                        className={styles.seoFaqQuestion}
                        style={{ color: 'var(--color-accent-primary)' }}
                      >
                        {isAr
                          ? guide.title.ar || guide.title.en
                          : guide.title.en || guide.title.ar}
                      </h3>
                      <p className={styles.seoFaqAnswer}>
                        {(isAr
                          ? guide.excerpt.ar || guide.excerpt.en
                          : guide.excerpt.en || guide.excerpt.ar
                        ).slice(0, 115)}
                        ...
                      </p>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </article>
        )}

        <SmartToolChain
          currentToolSlug={tool.slug}
          locale={locale}
          initialPrice={initialPrice}
          initialProductSlug={initialProductSlug}
          initialProductName={initialProductName}
          variant="affinityGrid"
        />
      </main>

      <SiteFooter />
    </div>
  );
}
