'use client';

import React from 'react';
import type { UserProfileRecord } from '@/server/repositories/users.repo';
import { useI18n } from '@/i18n/I18nProvider';
import { formatCalendarDate } from '@/lib/format';
import styles from './AdminShell.module.css';

export function AdminUsersView({ users }: { users: UserProfileRecord[] }) {
  const { locale } = useI18n();
  const isAr = locale === 'ar';

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>
            {isAr ? 'المستخدمون المسجلون' : 'Registered Users'}
          </h1>
          <p className={styles.pageSubtitle}>
            {isAr
              ? 'عرض الحسابات المسجلة وأدوارها (يُمنح دور المدير حصرياً عبر متغير البيئة ADMIN_EMAILS على الخادم).'
              : 'Security audit view of registered accounts (Admin role is granted strictly via server ADMIN_EMAILS).'}
          </p>
        </div>
      </div>

      <section className={styles.card}>
        {users.length === 0 ? (
          <p className={styles.pageSubtitle}>
            {isAr ? 'لا يوجد مستخدمون مسجلون بعد.' : 'No registered users yet.'}
          </p>
        ) : (
          <>
            <div className={`${styles.tableWrap} ${styles.desktopTableOnly}`}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{isAr ? 'البريد الإلكتروني' : 'Email'}</th>
                    <th>{isAr ? 'الدور' : 'Role'}</th>
                    <th>{isAr ? 'العناصر المحفوظة' : 'Saved Items'}</th>
                    <th>{isAr ? 'آخر دخول' : 'Last Login'}</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.uid}>
                      <td>
                        <strong>{u.email}</strong>
                      </td>
                      <td>
                        <span
                          className={
                            u.role === 'admin' ? styles.badgeSuccess : styles.badgeNeutral
                          }
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="tabularNums">{u.savedProductIds?.length || 0}</td>
                      <td className="tabularNums">
                        {formatCalendarDate(u.lastLoginAt, locale)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={styles.mobileAdminCards}>
              {users.map((u) => (
                <div key={u.uid} className={styles.mobileItemCard}>
                  <div className={styles.mobileCardHeaderRow}>
                    <strong className={styles.mobileItemSlug} style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>
                      {u.email}
                    </strong>
                    <span
                      className={
                        u.role === 'admin' ? styles.badgeSuccess : styles.badgeNeutral
                      }
                    >
                      {u.role}
                    </span>
                  </div>
                  <div className={styles.mobileItemMetaRow}>
                    <span className={styles.mobileMetaPill}>
                      <span className={styles.mobileMetaLabel}>
                        {isAr ? 'العناصر المحفوظة:' : 'Saved Items:'}
                      </span>
                      <span className={`${styles.mobileMetaValue} tabularNums`}>
                        {u.savedProductIds?.length || 0}
                      </span>
                    </span>
                    <span className={styles.mobileMetaPill}>
                      <span className={styles.mobileMetaLabel}>
                        {isAr ? 'آخر دخول:' : 'Last Login:'}
                      </span>
                      <span className={`${styles.mobileMetaValue} tabularNums`}>
                        {formatCalendarDate(u.lastLoginAt, locale)}
                      </span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </>
  );
}
