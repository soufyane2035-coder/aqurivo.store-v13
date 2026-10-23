'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/i18n/I18nProvider';
import { getFirebaseClientAnalytics } from '@/lib/firebase-client';
import { COOKIE_CONSENT_STORAGE_KEY } from '@/features/legal/LegalPageView';
import styles from './CookieBanner.module.css';

export function CookieBanner() {
  const { messages } = useI18n();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const checkConsent = () => {
      try {
        const stored = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
        if (stored === 'accepted') {
          void getFirebaseClientAnalytics();
        }
        setVisible(stored !== 'accepted' && stored !== 'essential_only');
      } catch {
        setVisible(false);
      }
    };

    checkConsent();
    window.addEventListener('soufshop-cookie-updated', checkConsent);
    return () => {
      window.removeEventListener('soufshop-cookie-updated', checkConsent);
    };
  }, []);

  const handleChoice = (choice: 'accepted' | 'essential_only') => {
    try {
      window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, choice);
      document.cookie = `${COOKIE_CONSENT_STORAGE_KEY}=${choice}; path=/; max-age=31536000; SameSite=Lax`;
      if (choice === 'accepted') {
        void getFirebaseClientAnalytics();
      }
    } catch {
      // Ignore storage write errors
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <aside
      className={styles.banner}
      role="region"
      aria-label={messages.cookies.bannerTitle}
    >
      <div className={`siteContainer ${styles.bannerInner}`}>
        <div className={styles.textBlock}>
          <strong className={styles.title}>{messages.cookies.bannerTitle}</strong>
          <p className={styles.description}>
            {messages.cookies.bannerText}{' '}
            <Link href="/cookies" className={styles.prefLink}>
              {messages.cookies.customize}
            </Link>
          </p>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            onClick={() => handleChoice('essential_only')}
            className={styles.secondaryBtn}
          >
            {messages.cookies.essentialOnly}
          </button>
          <button
            type="button"
            onClick={() => handleChoice('accepted')}
            className={styles.primaryBtn}
          >
            {messages.cookies.acceptAll}
          </button>
        </div>
      </div>
    </aside>
  );
}
