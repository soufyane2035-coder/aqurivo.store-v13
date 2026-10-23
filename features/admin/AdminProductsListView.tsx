'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  CheckCircle2,
  Edit3,
  Mail,
  Plus,
  RefreshCw,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import type { PartnerSource, Product, ProductStatus } from '@/types';
import { useI18n } from '@/i18n/I18nProvider';
import { useSaved } from '@/features/saved/SavedProvider';
import { useToast } from '@/components/ui/Toast';
import {
  deleteAdminDocumentFromFirebaseClient,
  fetchAdminCollectionFromFirebaseClient,
  getFreshFirebaseIdToken,
  syncAdminDocumentToFirebaseClient,
} from '@/lib/firebase-client';
import { formatCalendarDate, formatProductPrice } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import styles from './AdminShell.module.css';

interface ProductWarningInfo {
  brokenLinkCount: number;
  unavailableCount: number;
  totalCriticalCount: number;
  hasWarning: boolean;
}

interface AdminProductsListViewProps {
  initialProducts: Product[];
  sources: PartnerSource[];
  productWarnings?: Record<string, ProductWarningInfo>;
}

function mergeProductLists(primary: Product[], secondary: Product[]): Product[] {
  const byId = new Map<string, Product>();
  for (const item of secondary) {
    if (item && item.id) byId.set(item.id, item);
  }
  for (const item of primary) {
    if (!item || !item.id) continue;
    const existing = byId.get(item.id);
    if (!existing) {
      byId.set(item.id, item);
    } else {
      const tNew = item.updatedAt ? new Date(item.updatedAt).getTime() : 0;
      const tOld = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
      byId.set(item.id, tNew >= tOld ? item : existing);
    }
  }
  return Array.from(byId.values()).sort((a, b) =>
    (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || '')
  );
}

export function AdminProductsListView({
  initialProducts,
  sources,
  productWarnings = {},
}: AdminProductsListViewProps) {
  const { locale, t } = useI18n();
  const { csrfToken } = useSaved();
  const { showToast } = useToast();
  const isAr = locale === 'ar';

  const [products, setProducts] = useState(initialProducts);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Bulk Purge States
  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState(false);
  const [purgeStage, setPurgeStage] = useState<'confirm' | 'code' | 'success'>('confirm');
  const [purgeCode, setPurgeCode] = useState('');
  const [isRequestingPurge, setIsRequestingPurge] = useState(false);
  const [isExecutingPurge, setIsExecutingPurge] = useState(false);
  const [purgeError, setPurgeError] = useState<string | null>(null);
  const [purgeTargetEmail, setPurgeTargetEmail] = useState<string | null>(null);
  const [purgedCount, setPurgedCount] = useState(0);

  // Sync state whenever server props refresh
  useEffect(() => {
    setProducts((prev) => mergeProductLists(initialProducts, prev));
  }, [initialProducts]);

  // Automatically fetch latest products from server & Cloud Firestore on mount
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const fbToken = await getFreshFirebaseIdToken();
        const headers: Record<string, string> = {};
        if (fbToken) headers['x-firebase-id-token'] = fbToken;

        const apiRes = await fetch('/api/admin/products', {
          headers,
          cache: 'no-store',
        })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null);

        let productsList: Product[] | null = null;
        if (apiRes && Array.isArray(apiRes.products) && apiRes.products.length > 0) {
          productsList = apiRes.products as Product[];
        } else {
          // Fallback to direct client fetch only if API route failed or returned empty
          const cloudItems = await fetchAdminCollectionFromFirebaseClient<Product>('products');
          if (Array.isArray(cloudItems) && cloudItems.length > 0) {
            productsList = cloudItems;
          }
        }

        if (!active || !productsList) return;

        setProducts((prev) => mergeProductLists(productsList!, prev));
      } catch {
        // Ignore background refresh error
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Catch email confirmation redirects (?purged=true or ?purge_error=...)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const purged = urlParams.get('purged');
    const count = urlParams.get('count');
    const err = urlParams.get('purge_error');

    if (purged === 'true') {
      const c = count ? parseInt(count, 10) : 0;
      setProducts([]);
      setPurgedCount(c);
      showToast(
        isAr
          ? `تم حذف جميع المنتجات (${c} منتج) بنجاح وتفريغ الكتالوج بالكامل.`
          : `All products (${c}) successfully purged. Catalog is now empty.`,
        'success'
      );
      window.history.replaceState({}, '', window.location.pathname);
    } else if (err) {
      showToast(
        isAr
          ? `تعذر تأكيد الحذف: ${decodeURIComponent(err)}`
          : `Purge confirmation failed: ${decodeURIComponent(err)}`,
        'error'
      );
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [isAr, showToast]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (sourceFilter !== 'all' && p.sourceSlug !== sourceFilter) return false;
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (q) {
        const hay = `${p.title.en} ${p.title.ar} ${p.slug}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [products, search, sourceFilter, statusFilter]);

  const handleStatusChange = async (productId: string, nextStatus: ProductStatus) => {
    if (!csrfToken) return;
    const fbToken = await getFreshFirebaseIdToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken,
    };
    if (fbToken) headers['x-firebase-id-token'] = fbToken;

    const res = await fetch('/api/admin/products', {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        productId,
        action: 'toggle_status',
        status: nextStatus,
      }),
    });
    if (res.ok) {
      const updatedAt = new Date().toISOString();
      const target = products.find((p) => p.id === productId);
      if (target) {
        void syncAdminDocumentToFirebaseClient('products', productId, {
          ...target,
          status: nextStatus,
          updatedAt,
        });
      }
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, status: nextStatus, updatedAt } : p))
      );
      showToast(
        isAr ? 'تم تحديث حالة نشر المنتج.' : 'Product status updated.',
        'success'
      );
    }
  };

  const handleConfirmPriceToday = async (productId: string) => {
    if (!csrfToken) return;
    const fbToken = await getFreshFirebaseIdToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken,
    };
    if (fbToken) headers['x-firebase-id-token'] = fbToken;

    const res = await fetch('/api/admin/products', {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        productId,
        action: 'refresh_price_timestamp',
      }),
    });
    if (res.ok) {
      const nowIso = new Date().toISOString();
      const target = products.find((p) => p.id === productId);
      if (target) {
        void syncAdminDocumentToFirebaseClient('products', productId, {
          ...target,
          priceUpdatedAt: nowIso,
          updatedAt: nowIso,
        });
      }
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, priceUpdatedAt: nowIso } : p))
      );
      showToast(
        isAr ? 'تم تأكيد صحة السعر بتاريخ اليوم.' : 'Price check timestamp refreshed.',
        'success'
      );
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget || !csrfToken) return;
    setIsDeleting(true);
    try {
      const targetId = deleteTarget.id;
      const fbToken = await getFreshFirebaseIdToken();
      const headers: Record<string, string> = { 'x-csrf-token': csrfToken };
      if (fbToken) headers['x-firebase-id-token'] = fbToken;

      // Delete from Cloud Firestore & RTDB via authenticated client SDK first
      await deleteAdminDocumentFromFirebaseClient('products', targetId);

      // Then delete from server mirror & revalidate all storefront routes
      const res = await fetch(
        `/api/admin/products?id=${encodeURIComponent(targetId)}`,
        {
          method: 'DELETE',
          headers,
        }
      );
      if (res.ok) {
        setProducts((prev) => prev.filter((p) => p.id !== targetId));
        setDeleteTarget(null);
        showToast(
          isAr ? 'تم حذف المنتج بنجاح من جميع الأجهزة.' : 'Product deleted.',
          'info'
        );
      } else {
        const data = (await res.json()) as { error?: string };
        showToast(data.error || 'Error deleting product', 'error');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRequestPurge = async () => {
    if (!csrfToken) return;
    setIsRequestingPurge(true);
    setPurgeError(null);
    try {
      const fbToken = await getFreshFirebaseIdToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-csrf-token': csrfToken,
      };
      if (fbToken) headers['x-firebase-id-token'] = fbToken;

      const res = await fetch('/api/admin/products/purge/request', {
        method: 'POST',
        headers,
      });

      const data = (await res.json()) as {
        success?: boolean;
        error?: string;
        adminEmail?: string;
        expiresAt?: number;
      };

      if (!res.ok || !data.success) {
        setPurgeError(data.error || 'فشل إرسال طلب رمز التحقق.');
        showToast(data.error || 'Error requesting purge code', 'error');
        return;
      }

      setPurgeTargetEmail(data.adminEmail || null);
      setPurgeStage('code');
      showToast(
        isAr
          ? 'تم إرسال رمز التحقق السري ورابط التأكيد إلى بريدك الإلكتروني.'
          : 'Purge verification OTP dispatched to your admin email.',
        'success'
      );
    } catch {
      setPurgeError(
        isAr
          ? 'حدث خطأ في الاتصال بالخادم أثناء طلب رمز الحذف.'
          : 'Network error requesting purge OTP.'
      );
    } finally {
      setIsRequestingPurge(false);
    }
  };

  const handleExecutePurge = async () => {
    const code = purgeCode.trim().replace(/\D/g, '');
    if (!code || code.length < 6) {
      setPurgeError(
        isAr
          ? 'يرجى إدخال رمز التحقق المكون من 6 أرقام.'
          : 'Please enter the 6-digit verification code.'
      );
      return;
    }
    if (!csrfToken) return;

    setIsExecutingPurge(true);
    setPurgeError(null);
    try {
      const fbToken = await getFreshFirebaseIdToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-csrf-token': csrfToken,
      };
      if (fbToken) headers['x-firebase-id-token'] = fbToken;

      const res = await fetch('/api/admin/products/purge/confirm', {
        method: 'POST',
        headers,
        body: JSON.stringify({ code }),
      });

      const data = (await res.json()) as {
        success?: boolean;
        error?: string;
        purgedCount?: number;
      };

      if (!res.ok || !data.success) {
        setPurgeError(data.error || 'رمز التحقق غير صحيح أو منتهي الصلاحية.');
        showToast(data.error || 'Invalid purge code', 'error');
        return;
      }

      const count = data.purgedCount || products.length;
      setProducts([]);
      setPurgedCount(count);
      setPurgeStage('success');
      showToast(
        isAr
          ? `تم إفراغ الكتالوج وحذف جميع المنتجات (${count} منتج) بنجاح.`
          : `Catalog emptied. All ${count} products permanently removed.`,
        'success'
      );
    } catch {
      setPurgeError(
        isAr
          ? 'تعذر تنفيذ الحذف بسبب انقطاع الاتصال.'
          : 'Network error executing purge.'
      );
    } finally {
      setIsExecutingPurge(false);
    }
  };

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>
            {isAr ? 'إدارة المنتجات' : 'Manage Products'}
          </h1>
          <p className={styles.pageSubtitle}>
            {isAr
              ? 'إضافة وتعديل المنتجات، تحديث أختام الأسعار، والتحكم في حالة النشر.'
              : 'Create, edit, refresh price timestamps, and control publication status.'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          {products.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setPurgeStage('confirm');
                setPurgeCode('');
                setPurgeError(null);
                setIsPurgeModalOpen(true);
              }}
              className={styles.purgeAllBtn}
              title={isAr ? 'حذف جميع المنتجات وتفريغ الكتالوج' : 'Purge All Products'}
            >
              <Trash2 size={14} aria-hidden="true" />
              <span>{isAr ? 'حذف جميع المنتجات' : 'Purge All Products'}</span>
            </button>
          )}

          <Link href="/admin/products/new" className={styles.storefrontLink}>
            <Plus size={16} aria-hidden="true" />
            <span>{isAr ? 'إضافة منتج جديد' : 'Add New Product'}</span>
          </Link>
        </div>
      </div>

      <section className={styles.card}>
        <div className={styles.filterToolbar}>
          <div className={styles.filterSearchInput}>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isAr ? 'بحث بالاسم أو المعرّف...' : 'Search by title or slug...'}
              className={styles.selectInput}
            />
          </div>

          <div className={styles.filterSelectGroup}>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className={styles.selectInput}
            >
              <option value="all">{isAr ? 'كل المتاجر' : 'All Stores'}</option>
              {sources.map((s) => (
                <option key={s.id} value={s.slug}>
                  {t(s.name)}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={styles.selectInput}
            >
              <option value="all">{isAr ? 'كل الحالات' : 'All Statuses'}</option>
              <option value="published">{isAr ? 'منشور' : 'Published'}</option>
              <option value="draft">{isAr ? 'مسودة' : 'Draft'}</option>
              <option value="archived">{isAr ? 'مؤرشف' : 'Archived'}</option>
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className={styles.pageSubtitle}>
            {isAr ? 'لا توجد منتجات مطابقة حالياً.' : 'No matching products found.'}
          </p>
        ) : (
          <>
            {/* Desktop Table View (>= 768px) */}
            <div className={`${styles.tableWrap} ${styles.desktopTableOnly}`}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{isAr ? 'المنتج' : 'Product'}</th>
                    <th>{isAr ? 'المتجر' : 'Store'}</th>
                    <th>{isAr ? 'السعر' : 'Price'}</th>
                    <th>{isAr ? 'تحديث السعر' : 'Price Checked'}</th>
                    <th>{isAr ? 'الحالة' : 'Status'}</th>
                    <th>{isAr ? 'النقرات' : 'Clicks'}</th>
                    <th>{isAr ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => {
                    const warnStats =
                      productWarnings[item.slug.trim().toLowerCase()] ||
                      productWarnings[item.title.ar.trim().toLowerCase()] ||
                      productWarnings[item.title.en.trim().toLowerCase()];
                    return (
                      <tr key={item.id}>
                        <td className={styles.tableTitleCell}>
                          <strong>{t(item.title)}</strong>
                          <div className={styles.kpiLabel}>/{item.slug}</div>
                          {warnStats?.hasWarning && (
                            <div className={styles.productWarningBadge}>
                              <AlertTriangle size={12} aria-hidden="true" />
                              <span>
                                {isAr
                                  ? `تحذير: ${warnStats.totalCriticalCount} بلاغات (رابط/توفر)`
                                  : `Warning: ${warnStats.totalCriticalCount} reports (link/stock)`}
                              </span>
                            </div>
                          )}
                        </td>
                        <td>{t(item.sourceName)}</td>
                        <td className="tabularNums">
                          {item.priceDisplayPolicy === 'show_with_timestamp' && item.priceAmount
                            ? formatProductPrice(item.priceAmount, item.priceCurrency, locale)
                            : isAr
                              ? 'يُفحص في المتجر'
                              : 'Live at store'}
                        </td>
                        <td className="tabularNums">
                          {formatCalendarDate(item.priceUpdatedAt, locale)}
                        </td>
                        <td>
                          <select
                            value={item.status}
                            onChange={(e) =>
                              handleStatusChange(item.id, e.target.value as ProductStatus)
                            }
                            className={styles.topBarBtn}
                          >
                            <option value="published">{isAr ? 'منشور' : 'Published'}</option>
                            <option value="draft">{isAr ? 'مسودة' : 'Draft'}</option>
                            <option value="archived">{isAr ? 'مؤرشف' : 'Archived'}</option>
                          </select>
                        </td>
                        <td className="tabularNums">{item.clicksCount || 0}</td>
                        <td>
                          <div className={styles.actionRow}>
                            <Link
                              href={`/admin/products/${encodeURIComponent(item.id)}`}
                              className={styles.topBarBtn}
                            >
                              <Edit3 size={14} aria-hidden="true" />
                              <span>{isAr ? 'تعديل' : 'Edit'}</span>
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleConfirmPriceToday(item.id)}
                              className={styles.topBarBtn}
                              title={isAr ? 'تأكيد صحة السعر اليوم' : 'Confirm price today'}
                            >
                              <RefreshCw size={14} aria-hidden="true" />
                              <span>{isAr ? 'تحديث الختم' : 'Stamp Today'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(item)}
                              className={styles.topBarBtn}
                            >
                              <Trash2 size={14} aria-hidden="true" />
                              <span>{isAr ? 'حذف' : 'Delete'}</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View (< 768px) */}
            <div className={styles.mobileAdminCards}>
              {filtered.map((item) => {
                const warnStats =
                  productWarnings[item.slug.trim().toLowerCase()] ||
                  productWarnings[item.title.ar.trim().toLowerCase()] ||
                  productWarnings[item.title.en.trim().toLowerCase()];
                const priceText =
                  item.priceDisplayPolicy === 'show_with_timestamp' && item.priceAmount
                    ? formatProductPrice(item.priceAmount, item.priceCurrency, locale)
                    : isAr
                      ? 'يُفحص في المتجر'
                      : 'Live at store';

                return (
                  <article key={item.id} className={styles.mobileItemCard}>
                    <div className={styles.mobileItemTop}>
                      {item.primaryImage ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={item.primaryImage}
                          alt={t(item.title)}
                          className={styles.mobileItemThumb}
                          loading="lazy"
                        />
                      ) : null}
                      <div className={styles.mobileItemInfo}>
                        <div className={styles.mobileItemTitle}>{t(item.title)}</div>
                        <div className={styles.mobileItemSlug}>/{item.slug}</div>
                        {warnStats?.hasWarning && (
                          <div className={styles.productWarningBadge}>
                            <AlertTriangle size={12} aria-hidden="true" />
                            <span>
                              {isAr
                                ? `تحذير: ${warnStats.totalCriticalCount} بلاغات (رابط/توفر)`
                                : `Warning: ${warnStats.totalCriticalCount} reports (link/stock)`}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className={styles.mobileItemMetaRow}>
                      <span className={styles.mobileMetaPill}>
                        <span className={styles.mobileMetaLabel}>
                          {isAr ? 'المتجر:' : 'Store:'}
                        </span>
                        <span className={styles.mobileMetaValue}>{t(item.sourceName)}</span>
                      </span>

                      <span className={styles.mobileMetaPill}>
                        <span className={styles.mobileMetaLabel}>
                          {isAr ? 'السعر:' : 'Price:'}
                        </span>
                        <span className={`${styles.mobileMetaValue} tabularNums`}>
                          {priceText}
                        </span>
                      </span>

                      <span className={styles.mobileMetaPill}>
                        <span className={styles.mobileMetaLabel}>
                          {isAr ? 'التحديث:' : 'Checked:'}
                        </span>
                        <span className={`${styles.mobileMetaValue} tabularNums`}>
                          {formatCalendarDate(item.priceUpdatedAt, locale)}
                        </span>
                      </span>

                      <span className={styles.mobileMetaPill}>
                        <span className={styles.mobileMetaLabel}>
                          {isAr ? 'النقرات:' : 'Clicks:'}
                        </span>
                        <span className={`${styles.mobileMetaValue} tabularNums`}>
                          {item.clicksCount || 0}
                        </span>
                      </span>
                    </div>

                    <div className={styles.mobileItemActions}>
                      <select
                        value={item.status}
                        onChange={(e) =>
                          handleStatusChange(item.id, e.target.value as ProductStatus)
                        }
                        className={styles.topBarBtn}
                        aria-label={isAr ? 'حالة نشر المنتج' : 'Product publication status'}
                      >
                        <option value="published">{isAr ? 'منشور' : 'Published'}</option>
                        <option value="draft">{isAr ? 'مسودة' : 'Draft'}</option>
                        <option value="archived">{isAr ? 'مؤرشف' : 'Archived'}</option>
                      </select>

                      <div className={styles.mobileActionButtonsGroup}>
                        <Link
                          href={`/admin/products/${encodeURIComponent(item.id)}`}
                          className={styles.topBarBtn}
                        >
                          <Edit3 size={14} aria-hidden="true" />
                          <span>{isAr ? 'تعديل' : 'Edit'}</span>
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleConfirmPriceToday(item.id)}
                          className={styles.topBarBtn}
                          title={isAr ? 'تأكيد صحة السعر اليوم' : 'Confirm price today'}
                        >
                          <RefreshCw size={14} aria-hidden="true" />
                          <span>{isAr ? 'تحديث الختم' : 'Stamp Today'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(item)}
                          className={styles.topBarBtn}
                        >
                          <Trash2 size={14} aria-hidden="true" />
                          <span>{isAr ? 'حذف' : 'Delete'}</span>
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </section>

      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title={isAr ? 'تأكيد حذف المنتج' : 'Confirm Product Deletion'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteConfirm}
              isLoading={isDeleting}
            >
              {isAr ? 'حذف نهائي' : 'Delete Permanently'}
            </Button>
          </>
        }
      >
        <p>
          {isAr
            ? `هل أنت متأكد من حذف المنتج «${deleteTarget ? t(deleteTarget.title) : ''}»؟`
            : `Are you sure you want to permanently delete "${
                deleteTarget ? t(deleteTarget.title) : ''
              }"?`}
        </p>
      </Modal>

      {/* Bulk Purge Modal */}
      <Modal
        isOpen={isPurgeModalOpen}
        onClose={() => {
          if (!isExecutingPurge && !isRequestingPurge) {
            setIsPurgeModalOpen(false);
          }
        }}
        title={
          purgeStage === 'success'
            ? isAr
              ? 'تم تفريغ الكتالوج'
              : 'Catalog Emptied'
            : purgeStage === 'code'
              ? isAr
                ? 'تأكيد الحذف النهائي بالرمز السري'
                : 'Confirm Deletion with OTP Code'
              : isAr
                ? 'حذف جميع المنتجات نهائياً (تفريغ الكتالوج)'
                : 'Purge All Products (Empty Catalog)'
        }
        footer={
          purgeStage === 'confirm' ? (
            <>
              <Button
                variant="ghost"
                onClick={() => setIsPurgeModalOpen(false)}
                disabled={isRequestingPurge}
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button
                variant="danger"
                onClick={handleRequestPurge}
                isLoading={isRequestingPurge}
              >
                {isAr ? 'إرسال رمز التحقق إلى بريدي' : 'Send Verification OTP to Email'}
              </Button>
            </>
          ) : purgeStage === 'code' ? (
            <>
              <Button
                variant="ghost"
                onClick={() => setIsPurgeModalOpen(false)}
                disabled={isExecutingPurge}
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button
                variant="danger"
                onClick={handleExecutePurge}
                isLoading={isExecutingPurge}
                disabled={purgeCode.trim().length < 6}
              >
                {isAr ? 'تأكيد الحذف النهائي بالرمز' : 'Confirm Permanent Deletion'}
              </Button>
            </>
          ) : (
            <Button
              variant="primary"
              onClick={() => {
                setIsPurgeModalOpen(false);
                setPurgeStage('confirm');
                setPurgeCode('');
              }}
            >
              {isAr ? 'حسناً، إغلاق' : 'Done, Close'}
            </Button>
          )
        }
      >
        {purgeStage === 'confirm' ? (
          <div className={styles.purgeModalBody}>
            <div className={styles.purgeWarnCard}>
              <div className={styles.purgeWarnCardHeader}>
                <ShieldAlert size={18} aria-hidden="true" />
                <span>{isAr ? 'تحذير أمني حرج وغير قابل للتراجع:' : 'Critical Security Warning:'}</span>
              </div>
              <p>
                {isAr
                  ? `أنت على وشك حذف جميع المنتجات المسجلة في المتجر (${products.length} منتج) نهائياً من قاعدة البيانات والتخزين السحابي.`
                  : `You are about to permanently delete all ${products.length} products from the database and storage.`}
              </p>
            </div>

            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
              {isAr
                ? 'لحماية المتجر من الحذف العرضي أو غير المصرح به، قمنا بفرض تأكيد أمني بخطوتين. عند الضغط على الزر أدناه، سنرسل رمز تحقق سرياً (OTP) ورابط تأكيد مباشر إلى بريد الإدارة المعتمد.'
                : 'To prevent accidental or unauthorized bulk deletion, two-factor authentication is required. We will send a 6-digit OTP code and direct verification link to the authorized admin email.'}
            </p>

            {purgeError && (
              <div style={{ color: '#dc2626', fontSize: 'var(--text-xs)', fontWeight: 600 }}>
                {purgeError}
              </div>
            )}
          </div>
        ) : purgeStage === 'code' ? (
          <div className={styles.purgeModalBody}>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
              {isAr
                ? 'تم إرسال رمز التحقق ورابط التأكيد المباشر إلى البريد المعتمد للإدارة:'
                : 'A 6-digit verification code and instant link have been dispatched to:'}
            </p>

            <div className={styles.purgeEmailPill}>
              <Mail size={16} aria-hidden="true" />
              <span dir="ltr">{purgeTargetEmail || 'الإدارة المعتمدة'}</span>
            </div>

            <div>
              <label
                htmlFor="purgeOtpCode"
                style={{
                  display: 'block',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 700,
                  color: 'var(--color-text-secondary)',
                  marginBlockEnd: 'var(--space-2)',
                }}
              >
                {isAr ? 'أدخل رمز التحقق (6 أرقام):' : 'Enter 6-digit verification code:'}
              </label>
              <input
                id="purgeOtpCode"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={purgeCode}
                onChange={(e) => setPurgeCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className={styles.purgeCodeInput}
                dir="ltr"
              />
            </div>

            {purgeError && (
              <div style={{ color: '#dc2626', fontSize: 'var(--text-xs)', fontWeight: 600 }}>
                {purgeError}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                onClick={handleRequestPurge}
                disabled={isRequestingPurge}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-accent-primary)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: 0,
                }}
              >
                {isAr ? 'إعادة إرسال الرمز' : 'Resend Code'}
              </button>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                {isAr ? 'صلاحية الرمز: 15 دقيقة' : 'Valid for 15 minutes'}
              </span>
            </div>
          </div>
        ) : (
          <div className={styles.purgeSuccessBox}>
            <CheckCircle2 size={48} aria-hidden="true" />
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              {isAr ? 'تم حذف جميع المنتجات بالكامل' : 'All Products Permanently Removed'}
            </h3>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
              {isAr
                ? `تم مسح ${purgedCount} منتج بنجاح من قاعدة البيانات وذاكرة الموقع. الكتالوج فارغ الآن وجاهز للاستيراد النظيف.`
                : `Successfully purged ${purgedCount} products. The catalog is now clean and ready for fresh imports.`}
            </p>
          </div>
        )}
      </Modal>
    </>
  );
}
