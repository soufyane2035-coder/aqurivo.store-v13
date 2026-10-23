'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { LogOut, Trash2, TrendingDown, UserCheck } from 'lucide-react';
import type { Product } from '@/types';
import { useI18n } from '@/i18n/I18nProvider';
import { useSaved } from '@/features/saved/SavedProvider';
import { useToast } from '@/components/ui/Toast';
import { formatProductPrice } from '@/lib/format';
import { SiteHeader } from '@/components/sections/SiteHeader';
import { SiteFooter } from '@/components/sections/SiteFooter';
import { SignatureMotif } from '@/components/ui/SignatureMotif';
import { ProductCard } from '@/components/ui/ProductCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import styles from './AccountView.module.css';

interface AccountViewProps {
  allProducts: Product[];
}

export function AccountView({ allProducts }: AccountViewProps) {
  const { locale, messages, t } = useI18n();
  const {
    savedIds,
    recentlyViewedIds,
    priceHistoryMap,
    isSaved,
    toggleSave,
    authenticatedEmail,
    user,
    csrfToken,
    refreshSession,
    signOutUser,
  } = useSaved();
  const { showToast } = useToast();

  const [signingOut, setSigningOut] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const savedProducts = allProducts.filter((p) => savedIds.includes(p.id));
  const recentlyViewedProducts = recentlyViewedIds
    .map((id) => allProducts.find((p) => p.id === id))
    .filter((p): p is Product => Boolean(p))
    .slice(0, 6);

  const priceChanges = savedProducts.filter((product) => {
    const previous = priceHistoryMap[product.id];
    return (
      typeof previous === 'number' &&
      product.priceAmount !== null &&
      product.priceAmount !== previous
    );
  });

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOutUser();
      showToast(
        locale === 'ar' ? 'تم تسجيل الخروج بنجاح.' : 'Signed out successfully.',
        'info'
      );
    } finally {
      setSigningOut(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!csrfToken) return;
    setDeletingAccount(true);
    try {
      const res = await fetch('/api/user/saved', {
        method: 'DELETE',
        headers: {
          'x-csrf-token': csrfToken,
        },
      });
      if (res.ok) {
        setDeleteModalOpen(false);
        await refreshSession();
        showToast(
          locale === 'ar'
            ? 'تم حذف حسابك وبياناتك السحابية بنجاح.'
            : 'Your account and cloud data have been deleted.',
          'info'
        );
      } else {
        showToast(
          locale === 'ar'
            ? 'تعذّر حذف الحساب حالياً. حاول مرة أخرى.'
            : 'Unable to delete account right now. Please try again.',
          'error'
        );
      }
    } finally {
      setDeletingAccount(false);
    }
  };

  return (
    <div className={styles.pageShell}>
      <SiteHeader />

      <main id="main-content" className={`siteContainer ${styles.main}`}>
        <header className={styles.header}>
          <SignatureMotif index="01" label={messages.nav.saved} />
          <div className={styles.headerRow}>
            <div>
              <h1 className={styles.title}>
                {locale === 'ar'
                  ? 'مختاراتك المحفوظة وحسابك'
                  : 'Your Saved Picks & Account'}
              </h1>
              <p className={styles.subtitle}>
                {locale === 'ar'
                  ? 'تُحفظ منتجاتك المفضلة تلقائياً على هذا الجهاز، ويمكنك تسجيل الدخول اختيارياً لمزامنتها عبر جميع أجهزتك.'
                  : 'Your saved items are kept automatically on this device. Sign in optionally anytime to sync them across all your devices.'}
              </p>
            </div>

            <div className={styles.accountCard}>
              {authenticatedEmail ? (
                <div className={styles.signedInBox}>
                  <span className={styles.emailBadge}>
                    <UserCheck size={16} aria-hidden="true" />
                    <span>{authenticatedEmail}</span>
                  </span>
                  <div className={styles.accountActionsRow}>
                    {user?.role === 'admin' && (
                      <Link href="/admin" className={styles.signInLink}>
                        {locale === 'ar' ? 'لوحة الإدارة' : 'Admin Dashboard'}
                      </Link>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSignOut}
                      isLoading={signingOut}
                    >
                      <LogOut size={14} aria-hidden="true" />
                      <span>{locale === 'ar' ? 'تسجيل الخروج' : 'Sign Out'}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteModalOpen(true)}
                    >
                      <Trash2 size={14} aria-hidden="true" />
                      <span>{locale === 'ar' ? 'حذف الحساب' : 'Delete Account'}</span>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className={styles.guestBox}>
                  <span className={styles.guestNote}>
                    {locale === 'ar'
                      ? 'هل ترغب في حفظ قائمتك سحابياً؟'
                      : 'Want to sync your list across devices?'}
                  </span>
                  <div className={styles.guestActions}>
                    <Link href="/login" className={styles.signInLink}>
                      {locale === 'ar' ? 'تسجيل الدخول' : 'Sign In'}
                    </Link>
                    <Link href="/register" className={styles.registerLink}>
                      {locale === 'ar' ? 'إنشاء حساب' : 'Create Account'}
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Price Change Notices on Saved Items */}
        {priceChanges.length > 0 && (
          <section className={styles.priceNoticeBanner} aria-live="polite">
            <div className={styles.priceNoticeHeader}>
              <TrendingDown size={18} aria-hidden="true" />
              <strong>
                {locale === 'ar'
                  ? 'تحديثات في أسعار منتجاتك المحفوظة منذ زيارتك السابقة'
                  : 'Price updates on your saved items since your last visit'}
              </strong>
            </div>
            <ul className={styles.priceNoticeList}>
              {priceChanges.map((item) => {
                const prev = priceHistoryMap[item.id];
                return (
                  <li key={item.id}>
                    <Link href={`/products/${encodeURIComponent(item.slug)}`}>
                      {t(item.title)}
                    </Link>
                    {': '}
                    <span className="tabularNums">
                      {formatProductPrice(prev, item.priceCurrency, locale)} →{' '}
                      {formatProductPrice(item.priceAmount, item.priceCurrency, locale)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* Saved Items Section */}
        <section className={styles.savedSection}>
          <SignatureMotif
            index="02"
            label={
              locale === 'ar'
                ? `العناصر المحفوظة (${savedProducts.length})`
                : `Saved Items (${savedProducts.length})`
            }
          />

          {savedProducts.length > 0 ? (
            <div className={styles.grid}>
              {savedProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  isSaved={isSaved(product.id)}
                  onToggleSave={toggleSave}
                  refContext="saved_list"
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title={messages.empty.savedEmptyTitle}
              description={messages.empty.savedEmptyDescription}
              primaryActionLabel={messages.nav.products}
              primaryActionHref="/products"
            />
          )}
        </section>

        {/* Recently Viewed Section */}
        {recentlyViewedProducts.length > 0 && (
          <section className={styles.savedSection}>
            <SignatureMotif
              index="03"
              label={
                locale === 'ar'
                  ? 'المنتجات التي شاهدتها مؤخراً'
                  : 'Recently Viewed Products'
              }
            />
            <div className={styles.grid}>
              {recentlyViewedProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  isSaved={isSaved(product.id)}
                  onToggleSave={toggleSave}
                  refContext="recently_viewed"
                />
              ))}
            </div>
          </section>
        )}
      </main>

      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title={locale === 'ar' ? 'تأكيد حذف الحساب' : 'Confirm Account Deletion'}
        closeLabel={messages.common.close}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteModalOpen(false)}>
              {messages.common.cancel}
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteAccount}
              isLoading={deletingAccount}
            >
              {locale === 'ar' ? 'حذف الحساب نهائياً' : 'Delete Permanently'}
            </Button>
          </>
        }
      >
        <p className={styles.modalText}>
          {locale === 'ar'
            ? 'سيؤدي هذا الإجراء إلى حذف حسابك وقائمة محفوظاتك السحابية نهائياً. ستبقى العناصر المحفوظة على هذا الجهاز متاحة محلياً.'
            : 'This will permanently delete your account and cloud-synced saved list. Items saved locally on this device will remain available.'}
        </p>
      </Modal>

      <SiteFooter />
    </div>
  );
}
