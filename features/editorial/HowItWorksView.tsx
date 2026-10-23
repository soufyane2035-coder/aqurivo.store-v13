'use client';

import React from 'react';
import Link from 'next/link';
import { CheckCircle2, Search, ShoppingCart } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import { SiteHeader } from '@/components/sections/SiteHeader';
import { SiteFooter } from '@/components/sections/SiteFooter';
import { SignatureMotif } from '@/components/ui/SignatureMotif';
import styles from './HowItWorksView.module.css';

export function HowItWorksView() {
  const { messages } = useI18n();

  return (
    <div className={styles.pageShell}>
      <SiteHeader />

      <main id="main-content" className={`siteContainer ${styles.main}`}>
        <header className={`${styles.header} revealUp`}>
          <SignatureMotif index="01" label={messages.howItWorks.heading} />
          <h1 className={styles.title}>{messages.howItWorks.heading}</h1>
          <p className={styles.lead}>{messages.hero.subtitle}</p>
        </header>

        <div className={styles.stepsStream}>
          <section className={styles.stepRow}>
            <div className={styles.stepMarker}>
              <span className={`${styles.stepNumber} tabularNums`}>1</span>
              <Search size={20} className={styles.stepIcon} aria-hidden="true" />
            </div>
            <div className={styles.stepBody}>
              <h2 className={styles.stepTitle}>{messages.howItWorks.step1Title}</h2>
              <p className={styles.stepText}>{messages.howItWorks.step1Text}</p>
            </div>
          </section>

          <section className={styles.stepRow}>
            <div className={styles.stepMarker}>
              <span className={`${styles.stepNumber} tabularNums`}>2</span>
              <CheckCircle2 size={20} className={styles.stepIcon} aria-hidden="true" />
            </div>
            <div className={styles.stepBody}>
              <h2 className={styles.stepTitle}>{messages.howItWorks.step2Title}</h2>
              <p className={styles.stepText}>{messages.howItWorks.step2Text}</p>
            </div>
          </section>

          <section className={styles.stepRow}>
            <div className={styles.stepMarker}>
              <span className={`${styles.stepNumber} tabularNums`}>3</span>
              <ShoppingCart size={20} className={styles.stepIcon} aria-hidden="true" />
            </div>
            <div className={styles.stepBody}>
              <h2 className={styles.stepTitle}>{messages.howItWorks.step3Title}</h2>
              <p className={styles.stepText}>{messages.howItWorks.step3Text}</p>
            </div>
          </section>
        </div>

        <div className={styles.footerCtaRow}>
          <Link href="/products" className={styles.exploreLink}>
            {messages.hero.primaryCta}
          </Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
