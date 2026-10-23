'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Check,
  Copy,
  ExternalLink,
  Filter,
  Package,
  RefreshCw,
  ShoppingBag,
} from 'lucide-react';
import type { ReportReason, ReportRecord, ReportStatus, ReportType } from '@/types';
import { useI18n } from '@/i18n/I18nProvider';
import { useSaved } from '@/features/saved/SavedProvider';
import { useToast } from '@/components/ui/Toast';
import { formatCalendarDate } from '@/lib/format';
import {
  getFreshFirebaseIdToken,
  syncAdminDocumentToFirebaseClient,
} from '@/lib/firebase-client';
import shellStyles from './AdminShell.module.css';
import styles from './AdminReportsView.module.css';

interface WarningStats {
  brokenLinkCount: number;
  unavailableCount: number;
  totalCriticalCount: number;
  hasWarning: boolean;
}

function getReasonLabel(reason: ReportReason, isAr: boolean): string {
  switch (reason) {
    case 'broken_link':
      return isAr ? 'الرابط لا يعمل' : 'Link is not working';
    case 'price_mismatch':
      return isAr ? 'السعر مختلف' : 'Price is different';
    case 'wrong_info':
      return isAr ? 'معلومات خاطئة' : 'Incorrect information';
    case 'unavailable':
      return isAr ? 'المنتج غير متوفر' : 'Product is unavailable';
    case 'order_issue':
      return isAr ? 'مشكلة في طلبي' : 'Issue with my order';
    case 'other':
    default:
      return isAr ? 'أخرى' : 'Other';
  }
}

function getStatusLabel(status: ReportStatus, isAr: boolean): string {
  switch (status) {
    case 'new':
      return isAr ? 'جديد' : 'New';
    case 'in_progress':
      return isAr ? 'قيد المراجعة' : 'In Progress';
    case 'resolved':
      return isAr ? 'تم الحل' : 'Resolved';
  }
}

function getNextStatus(current: ReportStatus): ReportStatus {
  if (current === 'new') return 'in_progress';
  if (current === 'in_progress') return 'resolved';
  return 'new';
}

export function AdminReportsView({
  initialReports,
}: {
  initialReports: ReportRecord[];
}) {
  const { locale } = useI18n();
  const { csrfToken } = useSaved();
  const { showToast } = useToast();
  const isAr = locale === 'ar';

  const [reports, setReports] = useState<ReportRecord[]>(initialReports);
  const [typeFilter, setTypeFilter] = useState<'all' | ReportType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | ReportStatus>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Calculate per-product warning counts for "الرابط لا يعمل" (broken_link) or "غير متوفر" (unavailable) >= 3
  const productWarnings = useMemo(() => {
    const map: Record<string, WarningStats> = {};
    for (const r of reports) {
      const key = (r.productSlug || r.productName || '').trim().toLowerCase();
      if (!key) continue;

      if (!map[key]) {
        map[key] = {
          brokenLinkCount: 0,
          unavailableCount: 0,
          totalCriticalCount: 0,
          hasWarning: false,
        };
      }

      if (r.reason === 'broken_link') {
        map[key].brokenLinkCount += 1;
        map[key].totalCriticalCount += 1;
      } else if (r.reason === 'unavailable') {
        map[key].unavailableCount += 1;
        map[key].totalCriticalCount += 1;
      }

      if (
        map[key].brokenLinkCount >= 3 ||
        map[key].unavailableCount >= 3 ||
        map[key].totalCriticalCount >= 3
      ) {
        map[key].hasWarning = true;
      }
    }
    return map;
  }, [reports]);

  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      if (typeFilter !== 'all' && r.type !== typeFilter) return false;
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      return true;
    });
  }, [reports, typeFilter, statusFilter]);

  const newCount = useMemo(
    () => reports.filter((r) => r.status === 'new').length,
    [reports]
  );
  const inProgressCount = useMemo(
    () => reports.filter((r) => r.status === 'in_progress').length,
    [reports]
  );
  const resolvedCount = useMemo(
    () => reports.filter((r) => r.status === 'resolved').length,
    [reports]
  );

  const handleStatusChange = async (
    report: ReportRecord,
    nextStatus: ReportStatus
  ) => {
    if (!csrfToken || busyId === report.id || report.status === nextStatus)
      return;
    setBusyId(report.id);

    try {
      const fbToken = await getFreshFirebaseIdToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-csrf-token': csrfToken,
      };
      if (fbToken) {
        headers['x-firebase-id-token'] = fbToken;
      }

      const res = await fetch('/api/reports', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          reportId: report.id,
          status: nextStatus,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to update status');
      }

      void syncAdminDocumentToFirebaseClient('reports', report.id, {
        ...report,
        status: nextStatus,
      });

      const updatedList = reports.map((item) =>
        item.id === report.id ? { ...item, status: nextStatus } : item
      );
      setReports(updatedList);

      const updatedNewCount = updatedList.filter((r) => r.status === 'new').length;
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('aqurivo-reports-count', {
            detail: { newCount: updatedNewCount },
          })
        );
      }

      showToast(
        isAr ? 'تم تحديث حالة البلاغ بنجاح.' : 'Report status updated.',
        'success'
      );
    } catch {
      showToast(
        isAr ? 'تعذر تحديث حالة البلاغ.' : 'Could not update report status.',
        'error'
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleCopyEmail = async (reportId: string, email: string) => {
    try {
      await navigator.clipboard.writeText(email);
      setCopiedId(reportId);
      setTimeout(() => {
        setCopiedId((prev) => (prev === reportId ? null : prev));
      }, 2000);
      showToast(
        isAr ? 'تم نسخ البريد الإلكتروني.' : 'Email copied to clipboard.',
        'info'
      );
    } catch {
      showToast(isAr ? 'تعذر نسخ البريد.' : 'Failed to copy email.', 'error');
    }
  };

  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchReports = async (showNotification = false) => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/reports');
      if (res.ok) {
        const data = (await res.json()) as { reports?: ReportRecord[] };
        if (Array.isArray(data.reports)) {
          setReports(data.reports);
          if (showNotification) {
            showToast(isAr ? 'تم تحديث قائمة البلاغات بنجاح.' : 'Reports list refreshed.', 'success');
          }
        }
      }
    } catch {
      if (showNotification) {
        showToast(isAr ? 'تعذر تحديث البلاغات.' : 'Failed to refresh reports.', 'error');
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      fetchReports(false);
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      <div className={shellStyles.pageHeader}>
        <div>
          <h1 className={shellStyles.pageTitle}>
            {isAr ? 'بلاغات الزوار والمساعدة' : 'Issue Reports & Assistance'}
          </h1>
          <p className={shellStyles.pageSubtitle}>
            {isAr
              ? 'مراجعة بلاغات المنتجات وطلبات المساعدة مع تتبع الحالات والتنبيهات المتكررة.'
              : 'Review product issue reports and order assistance requests.'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchReports(true)}
          disabled={isRefreshing}
          className={styles.statusBtn}
          style={{ padding: '0.5rem 1rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
        >
          <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} aria-hidden="true" />
          <span>{isAr ? 'تحديث البلاغات' : 'Refresh Reports'}</span>
        </button>
      </div>

      <div className={styles.statsRow}>
        <div className={styles.statBox}>
          <span className={styles.statLabel}>
            {isAr ? 'بلاغات جديدة' : 'New Reports'}
          </span>
          <span className={`${styles.statValue} ${styles.statValueGold}`}>
            {newCount}
          </span>
        </div>
        <div className={styles.statBox}>
          <span className={styles.statLabel}>
            {isAr ? 'قيد المتابعة' : 'In Progress'}
          </span>
          <span className={`${styles.statValue} ${styles.statValueTeal}`}>
            {inProgressCount}
          </span>
        </div>
        <div className={styles.statBox}>
          <span className={styles.statLabel}>
            {isAr ? 'تم الحل' : 'Resolved'}
          </span>
          <span className={styles.statValue}>{resolvedCount}</span>
        </div>
      </div>

      <section className={shellStyles.card}>
        <div className={styles.filterBar}>
          {/* Custom Segmented Filter by Type */}
          <div className={styles.filterSection}>
            <span className={styles.filterSectionLabel}>
              <Filter size={13} aria-hidden="true" />
              <span>{isAr ? 'النوع:' : 'Type:'}</span>
            </span>
            <div className={styles.segmentedGroup} role="group">
              <button
                type="button"
                onClick={() => setTypeFilter('all')}
                className={`${styles.segmentBtn} ${
                  typeFilter === 'all' ? styles.segmentBtnActive : ''
                }`}
              >
                <span>{isAr ? 'الكل' : 'All'}</span>
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('product_issue')}
                className={`${styles.segmentBtn} ${
                  typeFilter === 'product_issue' ? styles.segmentBtnActive : ''
                }`}
              >
                <Package size={13} aria-hidden="true" />
                <span>{isAr ? 'مشكلة منتج' : 'Product Issue'}</span>
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('order_issue')}
                className={`${styles.segmentBtn} ${
                  typeFilter === 'order_issue' ? styles.segmentBtnActiveGold : ''
                }`}
              >
                <ShoppingBag size={13} aria-hidden="true" />
                <span>{isAr ? 'مشكلة في طلبي' : 'Order Issue'}</span>
              </button>
            </div>
          </div>

          {/* Custom Segmented Filter by Status */}
          <div className={styles.filterSection}>
            <span className={styles.filterSectionLabel}>
              <span>{isAr ? 'الحالة:' : 'Status:'}</span>
            </span>
            <div className={styles.segmentedGroup} role="group">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`${styles.segmentBtn} ${
                  statusFilter === 'all' ? styles.segmentBtnActive : ''
                }`}
              >
                <span>{isAr ? 'كل الحالات' : 'All'}</span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('new')}
                className={`${styles.segmentBtn} ${
                  statusFilter === 'new' ? styles.segmentBtnActiveGold : ''
                }`}
              >
                <span>{isAr ? 'جديد' : 'New'}</span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('in_progress')}
                className={`${styles.segmentBtn} ${
                  statusFilter === 'in_progress' ? styles.segmentBtnActive : ''
                }`}
              >
                <span>{isAr ? 'قيد المراجعة' : 'In Progress'}</span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('resolved')}
                className={`${styles.segmentBtn} ${
                  statusFilter === 'resolved' ? styles.segmentBtnActive : ''
                }`}
              >
                <span>{isAr ? 'تم الحل' : 'Resolved'}</span>
              </button>
            </div>
          </div>
        </div>

        {filteredReports.length === 0 ? (
          <p className={shellStyles.pageSubtitle}>
            {isAr
              ? 'لا توجد بلاغات مطابقة للفلتر المحدد حالياً.'
              : 'No reports matching the selected filters.'}
          </p>
        ) : (
          <>
            <div className={`${shellStyles.tableWrap} ${shellStyles.desktopTableOnly}`}>
              <table className={shellStyles.table}>
                <thead>
                  <tr>
                    <th>{isAr ? 'النوع والسبب' : 'Type & Reason'}</th>
                    <th>{isAr ? 'المنتج' : 'Product'}</th>
                    <th>{isAr ? 'البريد الإلكتروني' : 'Email'}</th>
                    <th>{isAr ? 'وصف المشكلة' : 'Description'}</th>
                    <th>{isAr ? 'التاريخ' : 'Date'}</th>
                    <th>{isAr ? 'الحالة' : 'Status'}</th>
                    <th>{isAr ? 'تغيير الحالة' : 'Change Status'}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.map((report) => {
                    const warnKey = (
                      report.productSlug ||
                      report.productName ||
                      ''
                    )
                      .trim()
                      .toLowerCase();
                    const warnStats = warnKey ? productWarnings[warnKey] : undefined;
                    const showWarning = Boolean(warnStats?.hasWarning);
                    const nextStatus = getNextStatus(report.status);

                    return (
                      <tr key={report.id}>
                        <td>
                          <span
                            className={
                              report.type === 'order_issue'
                                ? styles.typeBadgeOrder
                                : styles.typeBadgeProduct
                            }
                          >
                            {report.type === 'order_issue'
                              ? isAr
                                ? 'مشكلة في طلبي'
                                : 'Order Issue'
                              : isAr
                                ? 'مشكلة منتج'
                                : 'Product Issue'}
                          </span>
                          <div className={styles.reasonText}>
                            {getReasonLabel(report.reason, isAr)}
                          </div>
                          {report.orderRef && (
                            <div className={styles.orderRefLine}>
                              {isAr ? 'رقم الطلب: ' : 'Order Ref: '}
                              {report.orderRef}
                            </div>
                          )}
                        </td>

                        <td>
                          <div className={styles.productCell}>
                            <div className={styles.productTitleRow}>
                              <span className={styles.productName}>
                                {report.productName ||
                                  report.productSlug ||
                                  (isAr ? 'بلاغ عام (الفوتر)' : 'General (Footer)')}
                              </span>

                              {showWarning && (
                                <span
                                  className={styles.warningBadge}
                                  title={
                                    isAr
                                      ? `تكرر بلاغ الرابط لا يعمل أو غير متوفر (${warnStats?.totalCriticalCount} مرات)`
                                      : `Repeated broken link or unavailable report (${warnStats?.totalCriticalCount}x)`
                                  }
                                >
                                  <AlertTriangle size={12} aria-hidden="true" />
                                  <span>
                                    {isAr
                                      ? `تحذير (${warnStats?.totalCriticalCount}+ بلاغات)`
                                      : `Warning (${warnStats?.totalCriticalCount}+)`}
                                  </span>
                                </span>
                              )}
                            </div>

                            {report.productSlug && (
                              <Link
                                href={`/${locale}/products/${encodeURIComponent(
                                  report.productSlug
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.productLink}
                              >
                                <span>
                                  {isAr ? 'فتح صفحة المنتج' : 'Open Product Page'}
                                </span>
                                <ExternalLink size={12} aria-hidden="true" />
                              </Link>
                            )}
                          </div>
                        </td>

                        <td>
                          <div className={styles.emailCell}>
                            <span className={styles.emailAddress}>
                              {report.email}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                handleCopyEmail(report.id, report.email)
                              }
                              className={styles.copyBtn}
                            >
                              {copiedId === report.id ? (
                                <>
                                  <Check size={12} aria-hidden="true" />
                                  <span>{isAr ? 'تم النسخ' : 'Copied'}</span>
                                </>
                              ) : (
                                <>
                                  <Copy size={12} aria-hidden="true" />
                                  <span>{isAr ? 'نسخ البريد' : 'Copy Email'}</span>
                                </>
                              )}
                            </button>
                          </div>
                        </td>

                        <td>
                          <p className={styles.messageText}>{report.message}</p>
                        </td>

                        <td className="tabularNums">
                          {formatCalendarDate(report.createdAt, locale)}
                        </td>

                        <td>
                          <div className={styles.statusCell}>
                            <span
                              className={
                                report.status === 'new'
                                  ? styles.statusBadgeNew
                                  : report.status === 'in_progress'
                                    ? styles.statusBadgeProgress
                                    : styles.statusBadgeResolved
                              }
                            >
                              {getStatusLabel(report.status, isAr)}
                            </span>
                          </div>
                        </td>

                        <td>
                          <div className={styles.actionsCell}>
                            <div className={styles.statusSwitchPills}>
                              {(
                                ['new', 'in_progress', 'resolved'] as ReportStatus[]
                              ).map((st) => {
                                const isCurrent = report.status === st;
                                return (
                                  <button
                                    key={st}
                                    type="button"
                                    disabled={busyId === report.id || isCurrent}
                                    onClick={() => handleStatusChange(report, st)}
                                    className={`${styles.statusPillBtn} ${
                                      isCurrent
                                        ? st === 'new'
                                          ? styles.statusPillActiveGold
                                          : styles.statusPillActiveTeal
                                        : ''
                                    }`}
                                  >
                                    {getStatusLabel(st, isAr)}
                                  </button>
                                );
                              })}
                            </div>

                            <button
                              type="button"
                              disabled={busyId === report.id}
                              onClick={() =>
                                handleStatusChange(report, nextStatus)
                              }
                              className={styles.statusBtn}
                            >
                              <RefreshCw size={12} aria-hidden="true" />
                              <span>
                                {isAr ? 'تبديل الحالة' : 'Next Status'}
                              </span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className={shellStyles.mobileAdminCards}>
              {filteredReports.map((report) => {
                const warnKey = (
                  report.productSlug ||
                  report.productName ||
                  ''
                )
                  .trim()
                  .toLowerCase();
                const warnStats = warnKey ? productWarnings[warnKey] : undefined;
                const showWarning = Boolean(warnStats?.hasWarning);
                const nextStatus = getNextStatus(report.status);

                return (
                  <div key={report.id} className={shellStyles.mobileItemCard}>
                    <div className={shellStyles.mobileCardHeaderRow}>
                      <span
                        className={
                          report.type === 'order_issue'
                            ? styles.typeBadgeOrder
                            : styles.typeBadgeProduct
                        }
                      >
                        {report.type === 'order_issue'
                          ? isAr
                            ? 'مشكلة في طلبي'
                            : 'Order Issue'
                          : isAr
                            ? 'مشكلة منتج'
                            : 'Product Issue'}
                      </span>

                      <span
                        className={
                          report.status === 'new'
                            ? styles.statusBadgeNew
                            : report.status === 'in_progress'
                              ? styles.statusBadgeProgress
                              : styles.statusBadgeResolved
                        }
                      >
                        {getStatusLabel(report.status, isAr)}
                      </span>
                    </div>

                    <div className={shellStyles.mobileItemInfo}>
                      <div className={styles.productTitleRow}>
                        <span className={shellStyles.mobileItemTitle}>
                          {report.productName ||
                            report.productSlug ||
                            (isAr ? 'بلاغ عام (الفوتر)' : 'General (Footer)')}
                        </span>
                        {showWarning && (
                          <span className={styles.warningBadge}>
                            <AlertTriangle size={12} aria-hidden="true" />
                            <span>
                              {isAr
                                ? `تحذير (${warnStats?.totalCriticalCount}+ بلاغات)`
                                : `Warning (${warnStats?.totalCriticalCount}+)`}
                            </span>
                          </span>
                        )}
                      </div>

                      {report.productSlug && (
                        <Link
                          href={`/${locale}/products/${encodeURIComponent(
                            report.productSlug
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.productLink}
                        >
                          <span>
                            {isAr ? 'فتح صفحة المنتج' : 'Open Product Page'}
                          </span>
                          <ExternalLink size={12} aria-hidden="true" />
                        </Link>
                      )}
                    </div>

                    <div className={shellStyles.mobileItemInfo}>
                      <span className={styles.reasonText}>
                        {isAr ? 'السبب: ' : 'Reason: '}
                        {getReasonLabel(report.reason, isAr)}
                      </span>
                      {report.orderRef && (
                        <span className={styles.orderRefLine}>
                          {isAr ? 'رقم الطلب: ' : 'Order Ref: '}
                          {report.orderRef}
                        </span>
                      )}
                      {report.message && (
                        <p className={shellStyles.mobileCardBodyText}>
                          {report.message}
                        </p>
                      )}
                    </div>

                    <div className={shellStyles.mobileItemMetaRow}>
                      <div className={shellStyles.mobileCardHeaderRow} style={{ width: '100%' }}>
                        <span className={shellStyles.mobileItemSlug} style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                          {report.email}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyEmail(report.id, report.email)}
                          className={styles.copyBtn}
                        >
                          {copiedId === report.id ? (
                            <>
                              <Check size={12} aria-hidden="true" />
                              <span>{isAr ? 'تم النسخ' : 'Copied'}</span>
                            </>
                          ) : (
                            <>
                              <Copy size={12} aria-hidden="true" />
                              <span>{isAr ? 'نسخ البريد' : 'Copy Email'}</span>
                            </>
                          )}
                        </button>
                      </div>
                      <span className={shellStyles.mobileMetaPill}>
                        <span className={shellStyles.mobileMetaLabel}>
                          {isAr ? 'التاريخ:' : 'Date:'}
                        </span>
                        <span className={`${shellStyles.mobileMetaValue} tabularNums`}>
                          {formatCalendarDate(report.createdAt, locale)}
                        </span>
                      </span>
                    </div>

                    <div className={shellStyles.mobileItemActions}>
                      <div className={styles.statusSwitchPills}>
                        {(
                          ['new', 'in_progress', 'resolved'] as ReportStatus[]
                        ).map((st) => {
                          const isCurrent = report.status === st;
                          return (
                            <button
                              key={st}
                              type="button"
                              disabled={busyId === report.id || isCurrent}
                              onClick={() => handleStatusChange(report, st)}
                              className={`${styles.statusPillBtn} ${
                                isCurrent
                                  ? st === 'new'
                                    ? styles.statusPillActiveGold
                                    : styles.statusPillActiveTeal
                                  : ''
                              }`}
                            >
                              {getStatusLabel(st, isAr)}
                            </button>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        disabled={busyId === report.id}
                        onClick={() => handleStatusChange(report, nextStatus)}
                        className={styles.statusBtn}
                      >
                        <RefreshCw size={12} aria-hidden="true" />
                        <span>{isAr ? 'تبديل الحالة' : 'Next Status'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>
    </>
  );
}
