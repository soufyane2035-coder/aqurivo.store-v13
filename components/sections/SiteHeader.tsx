'use client';

import React, { useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { Globe, LogIn, Menu, Moon, Sun, User } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/components/ui/ThemeProvider';
import { useSaved } from '@/features/saved/SavedProvider';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { Drawer } from '@/components/ui/Drawer';
import styles from './SiteHeader.module.css';

const emptySubscribe = () => () => {};

export function SiteHeader({ savedCount }: { savedCount?: number }) {
  const { locale, setLocale, messages } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const { savedIds, user } = useSaved();
  const cartCount = savedCount ?? savedIds.length;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

  const handleLanguageSwitch = () => {
    setLocale(locale === 'en' ? 'ar' : 'en');
  };

  return (
    <header className={styles.header}>
      <a href="#main-content" className="skipLink">
        {messages.nav.skipToContent}
      </a>

      <div className={`siteContainer ${styles.headerInner}`}>
        {/* Zone 1: Brand Title (Single Link Element) */}
        <Link href={`/${locale}`} prefetch={true} className={styles.brandLink} aria-label={messages.meta.siteName}>
          <BrandLogo size="sm" />
        </Link>

        {/* Zone 2: Clean Text Navigation Links */}
        <nav className={styles.desktopNav} aria-label="Primary">
          <Link href={`/${locale}`} prefetch={true} className={styles.navLink}>
            {messages.nav.home}
          </Link>
          <Link href={`/${locale}/products`} prefetch={true} className={styles.navLink}>
            {messages.nav.products}
          </Link>
          <Link href={`/${locale}/guides`} prefetch={true} className={styles.navLink}>
            {messages.nav.guides}
          </Link>
          <Link href={`/${locale}/tools`} prefetch={true} className={styles.navLink}>
            {locale === 'ar' ? 'الأدوات الذكية' : 'Free Tools'}
          </Link>
          <Link href={`/${locale}/about`} prefetch={true} className={styles.navLink}>
            {messages.nav.ourMethod}
          </Link>
          <Link href={`/${locale}/contact`} prefetch={true} className={styles.navLink}>
            {messages.nav.contact}
          </Link>
          {mounted && user?.role === 'admin' && (
            <Link href="/admin" className={styles.navLink}>
              {messages.nav.adminDashboard}
            </Link>
          )}
        </nav>

        {/* Zone 3: Actions (Language, Theme, Menu) */}
        <div className={styles.actionsZone}>
          <button
            type="button"
            onClick={handleLanguageSwitch}
            className={styles.utilityBtn}
            aria-label={
              locale === 'en' ? messages.nav.switchToArabic : messages.nav.switchToEnglish
            }
          >
            <Globe size={16} aria-hidden="true" />
            <span className={styles.utilityBtnText}>
              {locale === 'en' ? messages.nav.switchToArabic : messages.nav.switchToEnglish}
            </span>
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            className={styles.iconBtn}
            aria-label={mounted && theme === 'dark' ? messages.nav.themeLight : messages.nav.themeDark}
          >
            {mounted && theme === 'dark' ? (
              <Sun size={18} aria-hidden="true" />
            ) : (
              <Moon size={18} aria-hidden="true" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className={styles.mobileMenuBtn}
            aria-label={messages.nav.menu}
          >
            <Menu size={20} aria-hidden="true" />
          </button>
        </div>
      </div>

      <Drawer
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        title={messages.meta.siteName}
        closeLabel={messages.nav.closeMenu}
      >
        <nav className={styles.mobileNavList} aria-label="Mobile Navigation">
          <Link
            href={`/${locale}`}
            className={styles.mobileNavLink}
            onClick={() => setMobileMenuOpen(false)}
          >
            {messages.nav.home}
          </Link>
          <Link
            href={`/${locale}/products`}
            className={styles.mobileNavLink}
            onClick={() => setMobileMenuOpen(false)}
          >
            {messages.nav.products}
          </Link>
          <Link
            href={`/${locale}/cart`}
            className={styles.mobileNavLink}
            onClick={() => setMobileMenuOpen(false)}
          >
            {messages.nav.shoppingList}
            {cartCount > 0 ? ` (${cartCount})` : ''}
          </Link>
          <Link
            href={`/${locale}/guides`}
            className={styles.mobileNavLink}
            onClick={() => setMobileMenuOpen(false)}
          >
            {messages.nav.guides}
          </Link>
          <Link
            href={`/${locale}/tools`}
            className={styles.mobileNavLink}
            onClick={() => setMobileMenuOpen(false)}
          >
            {locale === 'ar' ? 'الأدوات الذكية' : 'Free Tools'}
          </Link>
          <Link
            href={`/${locale}/about`}
            className={styles.mobileNavLink}
            onClick={() => setMobileMenuOpen(false)}
          >
            {messages.nav.ourMethod}
          </Link>
          <Link
            href={`/${locale}/contact`}
            className={styles.mobileNavLink}
            onClick={() => setMobileMenuOpen(false)}
          >
            {messages.nav.contact}
          </Link>
          <Link
            href="/account"
            className={styles.mobileNavLink}
            onClick={() => setMobileMenuOpen(false)}
          >
            {messages.nav.saved}
          </Link>

          <div className={styles.mobileAuthSection}>
            {mounted && user ? (
              <>
                <Link
                  href="/account"
                  className={styles.mobileSignInBtn}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <User size={17} aria-hidden="true" />
                  <span>{messages.nav.account}</span>
                </Link>
                {user.role === 'admin' && (
                  <Link
                    href="/admin"
                    className={styles.mobileNavLink}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span>{messages.nav.adminDashboard}</span>
                  </Link>
                )}
              </>
            ) : (
              <Link
                href="/login"
                className={styles.mobileSignInBtn}
                onClick={() => setMobileMenuOpen(false)}
              >
                <LogIn size={17} aria-hidden="true" />
                <span>{messages.nav.signIn}</span>
              </Link>
            )}
          </div>
        </nav>
      </Drawer>
    </header>
  );
}
