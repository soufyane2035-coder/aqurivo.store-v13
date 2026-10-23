'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Edit3, Plus, Trash2 } from 'lucide-react';
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
}: {
  initialArticles: Article[];
}) {
  const { locale, t } = useI18n();
  const { csrfToken } = useSaved();
  const { showToast } = useToast();
  const isAr = locale === 'ar';

  const [articles, setArticles] = useState(initialArticles);
  const [deleteTarget, setDeleteTarget] = useState<Article | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  React.useEffect(() => {
    if (initialArticles && initialArticles.length > 0) {
      setArticles(initialArticles);
    }
    fetch('/api/admin/articles')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.articles;
        if (Array.isArray(list) && list.length > 0) {
          setArticles(list);
        }
      })
      .catch(() => undefined);
  }, [initialArticles]);

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
          prev.map((a) => (a.id === article.id ? { ...a, status: nextStatus } : a))
        );
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
      setDeleteTarget(null);
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
