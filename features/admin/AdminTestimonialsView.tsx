'use client';

import React, { useEffect, useState } from 'react';
import { Check, Trash2 } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import { useSaved } from '@/features/saved/SavedProvider';
import { useToast } from '@/components/ui/Toast';
import { formatCalendarDate } from '@/lib/format';
import {
  approveTestimonial,
  deleteTestimonial,
  getTestimonials,
  type Testimonial,
} from '@/lib/testimonials';
import styles from './AdminShell.module.css';

export function AdminTestimonialsView({
  initialTestimonials,
}: {
  initialTestimonials: Testimonial[];
}) {
  const { locale } = useI18n();
  const { user, authLoading, csrfToken } = useSaved();
  const { showToast } = useToast();
  const isAr = locale === 'ar';

  const [testimonials, setTestimonials] = useState<Testimonial[]>(initialTestimonials);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getTestimonials(false)
      .then((items) => {
        if (active && items.length > 0) {
          setTestimonials(items);
        }
      })
      .catch(() => {
        // Keep initial server list
      });
    return () => {
      active = false;
    };
  }, []);

  if (authLoading) {
    return null;
  }

  if (user && user.role !== 'admin') {
    return null;
  }

  const handleApprove = async (item: Testimonial) => {
    setBusyId(item.id);
    try {
      await approveTestimonial(item.id, csrfToken || undefined);
      setTestimonials((prev) =>
        prev.map((t) => (t.id === item.id ? { ...t, approved: true } : t))
      );
      showToast(
        isAr ? 'تمت الموافقة على الشهادة ونشرها.' : 'Testimonial approved and published.',
        'success'
      );
    } catch {
      showToast(
        isAr ? 'تعذرت الموافقة على الشهادة.' : 'Could not approve testimonial.',
        'error'
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (item: Testimonial) => {
    setBusyId(item.id);
    try {
      await deleteTestimonial(item.id, csrfToken || undefined);
      setTestimonials((prev) => prev.filter((t) => t.id !== item.id));
      showToast(isAr ? 'تم حذف الشهادة.' : 'Testimonial deleted.', 'info');
    } catch {
      showToast(
        isAr ? 'تعذر حذف الشهادة.' : 'Could not delete testimonial.',
        'error'
      );
    } finally {
      setBusyId(null);
    }
  };

  const pendingList = testimonials.filter((t) => !t.approved);
  const approvedList = testimonials.filter((t) => t.approved);

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>
            {isAr ? 'مراجعة شهادات الزوار' : 'Visitor Testimonials Moderation'}
          </h1>
          <p className={styles.pageSubtitle}>
            {isAr
              ? 'الشهادات الجديدة المرسلة من الموقع تحتاج لموافقتك (✓) قبل ظهورها للزوار.'
              : 'New reviews submitted by visitors require your approval (✓) before going live.'}
          </p>
        </div>
      </div>

      {/* Pending Testimonials (approved: false) */}
      <section className={styles.card}>
        <h2 className={styles.sectionTitle}>
          {isAr
            ? `شهادات بانتظار المراجعة (${pendingList.length})`
            : `Pending Approval (${pendingList.length})`}
        </h2>

        {pendingList.length === 0 ? (
          <p className={styles.pageSubtitle}>
            {isAr
              ? 'لا توجد شهادات معلقة بانتظار المراجعة حالياً.'
              : 'No pending testimonials waiting for review.'}
          </p>
        ) : (
          <>
            <div className={`${styles.tableWrap} ${styles.desktopTableOnly}`}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{isAr ? 'الاسم' : 'Name'}</th>
                    <th>{isAr ? 'التقييم' : 'Rating'}</th>
                    <th>{isAr ? 'نص الشهادة' : 'Review Text'}</th>
                    <th>{isAr ? 'التاريخ' : 'Date'}</th>
                    <th>{isAr ? 'إجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingList.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.name}</strong>
                      </td>
                      <td>
                        <span style={{ color: '#F5A623', fontWeight: 700 }}>
                          {'★'.repeat(item.rating)}
                          {'☆'.repeat(Math.max(0, 5 - item.rating))}
                        </span>
                      </td>
                      <td>{item.text}</td>
                      <td className="tabularNums">
                        {formatCalendarDate(item.createdAt, locale)}
                      </td>
                      <td>
                        <div className={styles.rowActions}>
                          <button
                            type="button"
                            disabled={busyId === item.id}
                            onClick={() => handleApprove(item)}
                            className={`${styles.iconBtn} ${styles.statusPublished}`}
                            title={isAr ? 'موافقة ونشر (✓)' : 'Approve (✓)'}
                            aria-label={isAr ? 'موافقة ونشر' : 'Approve'}
                          >
                            <Check size={16} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            disabled={busyId === item.id}
                            onClick={() => handleDelete(item)}
                            className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                            title={isAr ? 'حذف (✗)' : 'Delete (✗)'}
                            aria-label={isAr ? 'حذف' : 'Delete'}
                          >
                            <Trash2 size={16} aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={styles.mobileAdminCards}>
              {pendingList.map((item) => (
                <div key={item.id} className={styles.mobileItemCard}>
                  <div className={styles.mobileCardHeaderRow}>
                    <span className={styles.mobileItemTitle}>{item.name}</span>
                    <span style={{ color: '#F5A623', fontWeight: 700 }}>
                      {'★'.repeat(item.rating)}
                      {'☆'.repeat(Math.max(0, 5 - item.rating))}
                    </span>
                  </div>
                  <p className={styles.mobileCardBodyText}>{item.text}</p>
                  <div className={styles.mobileItemMetaRow}>
                    <span className={styles.mobileMetaPill}>
                      <span className={styles.mobileMetaLabel}>
                        {isAr ? 'التاريخ:' : 'Date:'}
                      </span>
                      <span className={`${styles.mobileMetaValue} tabularNums`}>
                        {formatCalendarDate(item.createdAt, locale)}
                      </span>
                    </span>
                  </div>
                  <div className={styles.mobileItemActions}>
                    <div className={styles.mobileActionButtonsGroup}>
                      <button
                        type="button"
                        disabled={busyId === item.id}
                        onClick={() => handleApprove(item)}
                        className={styles.topBarBtn}
                      >
                        <Check size={15} aria-hidden="true" />
                        <span>{isAr ? 'موافقة ونشر' : 'Approve'}</span>
                      </button>
                      <button
                        type="button"
                        disabled={busyId === item.id}
                        onClick={() => handleDelete(item)}
                        className={styles.topBarBtn}
                      >
                        <Trash2 size={15} aria-hidden="true" />
                        <span>{isAr ? 'حذف' : 'Delete'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Approved Testimonials */}
      {approvedList.length > 0 && (
        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>
            {isAr
              ? `الشهادات المنشورة (${approvedList.length})`
              : `Approved Testimonials (${approvedList.length})`}
          </h2>
          <div className={`${styles.tableWrap} ${styles.desktopTableOnly}`}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{isAr ? 'الاسم' : 'Name'}</th>
                  <th>{isAr ? 'التقييم' : 'Rating'}</th>
                  <th>{isAr ? 'نص الشهادة' : 'Review Text'}</th>
                  <th>{isAr ? 'التاريخ' : 'Date'}</th>
                  <th>{isAr ? 'حذف' : 'Delete'}</th>
                </tr>
              </thead>
              <tbody>
                {approvedList.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.name}</strong>
                    </td>
                    <td>
                      <span style={{ color: '#F5A623', fontWeight: 700 }}>
                        {'★'.repeat(item.rating)}
                      </span>
                    </td>
                    <td>{item.text}</td>
                    <td className="tabularNums">
                      {formatCalendarDate(item.createdAt, locale)}
                    </td>
                    <td>
                      <button
                        type="button"
                        disabled={busyId === item.id}
                        onClick={() => handleDelete(item)}
                        className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                        title={isAr ? 'حذف (✗)' : 'Delete (✗)'}
                        aria-label={isAr ? 'حذف' : 'Delete'}
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.mobileAdminCards}>
            {approvedList.map((item) => (
              <div key={item.id} className={styles.mobileItemCard}>
                <div className={styles.mobileCardHeaderRow}>
                  <span className={styles.mobileItemTitle}>{item.name}</span>
                  <span style={{ color: '#F5A623', fontWeight: 700 }}>
                    {'★'.repeat(item.rating)}
                  </span>
                </div>
                <p className={styles.mobileCardBodyText}>{item.text}</p>
                <div className={styles.mobileItemMetaRow}>
                  <span className={styles.mobileMetaPill}>
                    <span className={styles.mobileMetaLabel}>
                      {isAr ? 'التاريخ:' : 'Date:'}
                    </span>
                    <span className={`${styles.mobileMetaValue} tabularNums`}>
                      {formatCalendarDate(item.createdAt, locale)}
                    </span>
                  </span>
                </div>
                <div className={styles.mobileItemActions}>
                  <button
                    type="button"
                    disabled={busyId === item.id}
                    onClick={() => handleDelete(item)}
                    className={styles.topBarBtn}
                  >
                    <Trash2 size={15} aria-hidden="true" />
                    <span>{isAr ? 'حذف الشهادة' : 'Delete'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
