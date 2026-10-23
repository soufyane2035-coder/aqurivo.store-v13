'use client';

import React from 'react';
import Link from 'next/link';
import { Mail, MessageCircle } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import { BrandLogo } from '@/components/ui/BrandLogo';
import styles from './SiteFooter.module.css';

const OFFICIAL_EMAIL = 'contact@aqurivo.store';
const SUPPORT_EMAIL = 'support@aqurivo.store';
const OFFICIAL_WHATSAPP_URL = 'https://wa.me/212684063908';

export interface SiteFooterProps {
  productsCount?: number;
}

export function SiteFooter({ productsCount }: SiteFooterProps = {}) {
  const { locale, messages } = useI18n();
  const isAr = locale === 'ar';

  const _displayCount =
    typeof productsCount === 'number' && productsCount > 0
      ? String(productsCount)
      : '500+';

  return (
    <footer className={styles.footer}>
      <div className={`siteContainer ${styles.footerInner}`}>
        <div className={styles.topGrid}>
          {/* Column 1: Brand & Single Small Disclosure */}
          <div className={styles.brandCol}>
            <Link href={`/${locale}`} className={styles.brandLink}>
              <BrandLogo size="md" />
            </Link>
            <p className={styles.amazonDisclosure}>
              {isAr
                ? 'بصفتنا مشاركاً في برنامج Amazon Associates، تكسب AQURIVO من عمليات الشراء المؤهلة.'
                : 'As an Amazon Associate, AQURIVO earns from qualifying purchases.'}
            </p>
          </div>

          {/* Column 2: Explore Links */}
          <div className={styles.linksCol}>
            <h3 className={styles.colHeading}>{messages.footer.quickLinks}</h3>
            <ul className={styles.linkList}>
              <li>
                <Link href={`/${locale}/products`} className={styles.footerLink}>
                  {messages.nav.products}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/guides`} className={styles.footerLink}>
                  {messages.nav.guides}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/tools`} className={styles.footerLink}>
                  {isAr ? 'أدوات AQURIVO المجانية' : 'AQURIVO Free Tools'}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/about`} className={styles.footerLink}>
                  {messages.nav.ourMethod}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/contact`} className={styles.footerLink}>
                  {messages.nav.contact}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/cart`} className={styles.footerLink}>
                  {messages.nav.shoppingList}
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Legal & Transparency */}
          <div className={styles.linksCol}>
            <h3 className={styles.colHeading}>{messages.footer.legalLinks}</h3>
            <ul className={styles.linkList}>
              <li>
                <Link href={`/${locale}/security`} className={styles.footerLink}>
                  {isAr ? 'شهادات الأمان والموثوقية' : 'Security & Trust Certificates'}
                </Link>
              </li>
              <li>
                <Link href="/affiliate-disclosure" className={styles.footerLink}>
                  {messages.footer.affiliateDisclosure}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/privacy-policy`} className={styles.footerLink}>
                  {messages.footer.privacy}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/terms`} className={styles.footerLink}>
                  {messages.footer.terms}
                </Link>
              </li>
              <li>
                <Link href="/how-it-works" className={styles.footerLink}>
                  {messages.howItWorks.heading}
                </Link>
              </li>
              <li>
                <Link href="/cookies" className={styles.footerLink}>
                  {messages.footer.cookieSettings}
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Direct Verified Contact */}
          <div className={styles.contactCol}>
            <h3 className={styles.colHeading}>{messages.footer.contactHeading}</h3>
            <address className={styles.contactAddress}>
              <a href={`mailto:${OFFICIAL_EMAIL}`} className={styles.contactLink}>
                <Mail size={15} aria-hidden="true" />
                <span>{OFFICIAL_EMAIL}</span>
              </a>
              <a href={`mailto:${SUPPORT_EMAIL}`} className={styles.contactLink}>
                <Mail size={15} aria-hidden="true" />
                <span>{SUPPORT_EMAIL}</span>
              </a>
              <a
                href={OFFICIAL_WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.contactLink}
              >
                <MessageCircle size={15} aria-hidden="true" />
                <span dir="ltr" className="tabularNums">
                  WhatsApp: +212 684 063908
                </span>
              </a>
            </address>
          </div>
        </div>

        <div className={styles.bottomBar}>
          <p className={`${styles.copyright} tabularNums`}>
            {isAr
              ? '© 2026 AQURIVO — جميع الحقوق محفوظة'
              : '© 2026 AQURIVO — All rights reserved'}
          </p>
        </div>
      </div>
    </footer>
  );
}
