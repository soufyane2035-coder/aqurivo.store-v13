'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bot, Edit3, Plus, Trash2 } from 'lucide-react';
import type { Article } from '@/types';
import { useI18n } from '@/i18n/I18nProvider';
import { useSaved } from '@/features/saved/SavedProvider';
import { useToast } from '@/components/ui/Toast';
import { formatCalendarDate } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import styles from './AdminShell.module.css';

export function AdminArticlesListView({
  initialArticles,
  initialTotal,
  initialHasMore,
  initialNextCursor,
}: {
  initialArticles: Article[];
  initialTotal: number;
  initialHasMore: boolean;
  initialNextCursor: string | null;
}) {
  const { locale, t } = useI18n();
  const { csrfToken } = useSaved();
  const { showToast } = useToast();
  const isAr = locale === 'ar';

  const [articles, setArticles] = useState(initialArticles);
  const [total, setTotal] = useState(initialTotal);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [cursorHistory, setCursorHistory] = useState<(string | null)[]>([null]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoadingPage, setIsLoadingPage] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Article | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const initialFilterSignature = useRef(JSON.stringify(['', 'all']));
  const filterSignature = JSON.stringify([search, statusFilter]);
  const activeListRequest = useRef<AbortController | null>(null);

  const loadPage = useCallback(async (cursor: string | null) => {
    activeListRequest.current?.abort();
    const controller = new AbortController();
    activeListRequest.current = controller;
    setIsLoadingPage(true);
    setListError(null);
    try {
      const params = new URLSearchParams({ q: search.trim(), status: statusFilter });
      if (cursor) params.set('cursor', cursor);
      const res = await fetch(`/api/admin/articles?${params.toString()}`, {
        cache: 'no-store',
        signal: controller.signal,
      });
      if (!res.ok) throw new Error('Unable to load articles from the server.');
      const data = (await res.json()) as {
        articles: Article[];
        total: number;
        hasMore: boolean;
        nextCursor: string | null;
      };
      if (!controller.signal.aborted) {
        setArticles(data.articles);
        setTotal(data.total);
        setHasMore(data.hasMore);
        setNextCursor(data.nextCursor);
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        setListError(error instanceof Error ? error.message : 'Unable to load articles.');
      }
    } finally {
      if (!controller.signal.aborted) setIsLoadingPage(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    if (initialFilterSignature.current === filterSignature) {
      initialFilterSignature.current = '';
      return;
    }
    setCursorHistory([null]);
    const timer = window.setTimeout(() => void loadPage(null), search.trim() ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [filterSignature, loadPage, search]);

  const handleToggleStatus = async (article: Article) => {
    if (!csrfToken || togglingId) return;
    const nextStatus: 'published' | 'draft' =
      article.status === 'published' ? 'draft' : 'published';
    setTogglingId(article.id);
    try {
      const res = await fetch('/api/admin/articles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({
          existingId: article.id,
          payload: {
            ...article,
            status: nextStatus,
          },
        }),
      });
      if (res.ok) {
        setArticles((prev) =>
          statusFilter !== 'all' && statusFilter !== nextStatus
            ? prev.filter((a) => a.id !== article.id)
            : prev.map((a) => (a.id === article.id ? { ...a, status: nextStatus } : a))
        );
        if (statusFilter !== 'all' && statusFilter !== nextStatus) {
          setTotal((prev) => Math.max(0, prev - 1));
        }
        setCursorHistory([null]);
        void loadPage(null);
        showToast(
          isAr
            ? nextStatus === 'published'
              ? 'تم نشر المقال.'
              : 'تم تحويل المقال إلى مسودة.'
            : `Article marked as ${nextStatus}.`,
          'success'
        );
      }
    } finally {
      setTogglingId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget || !csrfToken) return;
    const res = await fetch(
      `/api/admin/articles?id=${encodeURIComponent(deleteTarget.id)}`,
      {
        method: 'DELETE',
        headers: { 'x-csrf-token': csrfToken },
      }
    );
    if (res.ok) {
      setArticles((prev) => prev.filter((a) => a.id !== deleteTarget.id));
      setTotal((prev) => Math.max(0, prev - 1));
      setDeleteTarget(null);
      setCursorHistory([null]);
      void loadPage(null);
      showToast(isAr ? 'تم حذف المقال.' : 'Article deleted.', 'info');
    }
  };

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>
            {isAr ? 'إدارة أدلة الشراء والمقالات' : 'Manage Buying Guides & Articles'}
          </h1>
          <p className={styles.pageSubtitle}>
            {isAr
              ? 'كتابة وتحديث أدلة الشراء التحريرية وربطها بالمنتجات المختارة.'
              : 'Write and manage bilingual editorial guides with linked products.'}
          </p>
        </div>

        <Link href="/admin/articles/new" className={styles.storefrontLink}>
          <Plus size={16} aria-hidden="true" />
          <span>{isAr ? 'كتابة دليل جديد' : 'Write New Guide'}</span>
        </Link>
      </div>

      <section className={styles.card}>
        <div className={styles.filterToolbar}>
          <div className={styles.filterSearchInput}>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={isAr ? 'بحث بالعنوان أو المعرّف...' : 'Search by title or slug...'}
              className={styles.selectInput}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className={styles.selectInput}
            aria-label={isAr ? 'تصفية حسب الحالة' : 'Filter by status'}
          >
            <option value="all">{isAr ? 'كل الحالات' : 'All statuses'}</option>
            <option value="published">{isAr ? 'منشور' : 'Published'}</option>
            <option value="draft">{isAr ? 'مسودة' : 'Draft'}</option>
          </select>
        </div>
        {listError && <p role="alert">{listError}</p>}
        {isLoadingPage && <p role="status">{isAr ? 'جارٍ تحميل المقالات...' : 'Loading articles...'}</p>}
        {articles.length === 0 ? (
          <p className={styles.pageSubtitle}>
            {isAr ? 'لا توجد مقالات مسجلة بعد.' : 'No articles created yet.'}
          </p>
        ) : (
          <>
            {/* Desktop Table View (>= 768px) */}
            <div className={`${styles.tableWrap} ${styles.desktopTableOnly}`}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{isAr ? 'العنوان' : 'Title'}</th>
                    <th>{isAr ? 'الفئة' : 'Category'}</th>
                    <th>{isAr ? 'الحالة' : 'Status'}</th>
                    <th>{isAr ? 'تاريخ التحديث' : 'Updated'}</th>
                    <th>{isAr ? 'إجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {articles.map((article) => (
                    <tr key={article.id}>
                      <td className={styles.tableTitleCell}>
                        <strong>{t(article.title)}</strong>
                        <div className={styles.kpiLabel}>/{article.slug}</div>
                      </td>
                      <td>{t(article.categoryName)}</td>
                      <td>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(article)}
                          disabled={togglingId === article.id}
                          className={
                            article.status === 'published'
                              ? styles.badgeSuccess
                              : styles.badgeNeutral
                          }
                          style={{ cursor: 'pointer', border: 'none' }}
                          title={
                            isAr
                              ? 'اضغط للتبديل بين منشور ومسودة'
                              : 'Click to toggle between Published and Draft'
                          }
                        >
                          {article.status === 'published'
                            ? isAr
                              ? 'منشور (اضغط للإخفاء)'
                              : 'Published'
                            : isAr
                              ? 'مسودة (اضغط للنشر)'
                              : 'Draft'}
                        </button>
                      </td>
                      <td className="tabularNums">
                        {formatCalendarDate(article.updatedAt, locale)}
                      </td>
                      <td>
                        <div className={styles.actionRow}>
                          <Link
                            href={`/admin/editorial-agent?kind=guide&sourceUrl=${encodeURIComponent(`https://aqurivo.store/${locale}/guides/${article.slug}`)}`}
                            className={styles.topBarBtn}
                          >
                            <Bot size={14} aria-hidden="true" />
                            <span>{isAr ? 'مراجعة بالوكيل' : 'Review with agent'}</span>
                          </Link>
                          <Link
                            href={`/admin/articles/${encodeURIComponent(article.id)}`}
                            className={styles.topBarBtn}
                          >
                            <Edit3 size={14} />
                            <span>{isAr ? 'تعديل' : 'Edit'}</span>
                          </Link>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(article)}
                            className={styles.topBarBtn}
                          >
                            <Trash2 size={14} />
                            <span>{isAr ? 'حذف' : 'Delete'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View (< 768px) */}
            <div className={styles.mobileAdminCards}>
              {articles.map((article) => (
                <article key={article.id} className={styles.mobileItemCard}>
                  <div className={styles.mobileItemTop}>
                    {article.coverImage ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={article.coverImage}
                        alt={t(article.title)}
                        className={styles.mobileItemThumb}
                        loading="lazy"
                      />
                    ) : null}
                    <div className={styles.mobileItemInfo}>
                      <div className={styles.mobileItemTitle}>{t(article.title)}</div>
                      <div className={styles.mobileItemSlug}>/{article.slug}</div>
                    </div>
                  </div>

                  <div className={styles.mobileItemMetaRow}>
                    <span className={styles.mobileMetaPill}>
                      <span className={styles.mobileMetaLabel}>
                        {isAr ? 'الفئة:' : 'Category:'}
                      </span>
                      <span className={styles.mobileMetaValue}>
                        {t(article.categoryName)}
                      </span>
                    </span>

                    <span className={styles.mobileMetaPill}>
                      <span className={styles.mobileMetaLabel}>
                        {isAr ? 'التحديث:' : 'Updated:'}
                      </span>
                      <span className={`${styles.mobileMetaValue} tabularNums`}>
                        {formatCalendarDate(article.updatedAt, locale)}
                      </span>
                    </span>
                  </div>

                  <div className={styles.mobileItemActions}>
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(article)}
                      disabled={togglingId === article.id}
                      className={
                        article.status === 'published'
                          ? styles.badgeSuccess
                          : styles.badgeNeutral
                      }
                      style={{ cursor: 'pointer', border: 'none', paddingBlock: '6px' }}
                    >
                      {article.status === 'published'
                        ? isAr
                          ? 'منشور (اضغط للإخفاء)'
                          : 'Published'
                        : isAr
                          ? 'مسودة (اضغط للنشر)'
                          : 'Draft'}
                    </button>

                    <div className={styles.mobileActionButtonsGroup}>
                      <Link
                        href={`/admin/editorial-agent?kind=guide&sourceUrl=${encodeURIComponent(`https://aqurivo.store/${locale}/guides/${article.slug}`)}`}
                        className={styles.topBarBtn}
                      >
                        <Bot size={14} aria-hidden="true" />
                        <span>{isAr ? 'مراجعة بالوكيل' : 'Review with agent'}</span>
                      </Link>
                      <Link
                        href={`/admin/articles/${encodeURIComponent(article.id)}`}
                        className={styles.topBarBtn}
                      >
                        <Edit3 size={14} />
                        <span>{isAr ? 'تعديل' : 'Edit'}</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(article)}
                        className={styles.topBarBtn}
                      >
                        <Trash2 size={14} />
                        <span>{isAr ? 'حذف' : 'Delete'}</span>
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
        {total > 0 && (
          <nav className={styles.pagination} aria-label={isAr ? 'صفحات المقالات' : 'Article pages'}>
            <button
              type="button"
              onClick={() => {
                const cursor = cursorHistory[cursorHistory.length - 2] || null;
                setCursorHistory((previous) => previous.slice(0, -1));
                void loadPage(cursor);
              }}
              disabled={cursorHistory.length <= 1 || isLoadingPage}
            >
              {isAr ? 'السابق' : 'Previous'}
            </button>
            <span aria-live="polite">
              {isAr ? `عرض ${articles.length} من ${total}` : `Showing ${articles.length} of ${total}`}
            </span>
            <button
              type="button"
              onClick={() => {
                if (!nextCursor) return;
                setCursorHistory((previous) => [...previous, nextCursor]);
                void loadPage(nextCursor);
              }}
              disabled={!hasMore || isLoadingPage}
            >
              {isAr ? 'التالي' : 'Next'}
            </button>
          </nav>
        )}
      </section>

      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title={isAr ? 'تأكيد حذف المقال' : 'Confirm Article Deletion'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button variant="danger" onClick={handleDeleteConfirm}>
              {isAr ? 'حذف' : 'Delete'}
            </Button>
          </>
        }
      >
        <p>
          {isAr
            ? `هل أنت متأكد من حذف «${deleteTarget ? t(deleteTarget.title) : ''}»؟`
            : `Delete "${deleteTarget ? t(deleteTarget.title) : ''}"?`}
        </p>
      </Modal>
    </>
  );
}
