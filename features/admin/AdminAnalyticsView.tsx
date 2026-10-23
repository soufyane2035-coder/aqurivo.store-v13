'use client';

import React, { useMemo, useState } from 'react';
import type { PartnerSource, Product } from '@/types';
import type { OutboundClickRecord } from '@/server/repositories/clicks.repo';
import { useI18n } from '@/i18n/I18nProvider';
import { formatCalendarDate } from '@/lib/format';
import styles from './AdminShell.module.css';

interface AdminAnalyticsViewProps {
  clicks: OutboundClickRecord[];
  products: Product[];
  sources: PartnerSource[];
}

export function AdminAnalyticsView({
  clicks,
  products,
  sources,
}: AdminAnalyticsViewProps) {
  const { locale, t } = useI18n();
  const isAr = locale === 'ar';

  const [daysWindow, setDaysWindow] = useState<'7' | '30' | 'all'>('30');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [nowMs] = useState(() => Date.now());

  const filteredClicks = useMemo(() => {
    const dayMs = 24 * 60 * 60 * 1000;

    return clicks.filter((c) => {
      if (sourceFilter !== 'all' && c.sourceSlug !== sourceFilter) return false;
      if (daysWindow !== 'all') {
        const days = Number(daysWindow);
        const createdMs = new Date(c.createdAt).getTime();
        if (nowMs - createdMs > days * dayMs) return false;
      }
      return true;
    });
  }, [clicks, daysWindow, sourceFilter, nowMs]);

  const bySource = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of filteredClicks) {
      map.set(c.sourceSlug, (map.get(c.sourceSlug) || 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [filteredClicks]);

  const byDevice = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of filteredClicks) {
      map.set(c.deviceType, (map.get(c.deviceType) || 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [filteredClicks]);

  const byProduct = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of filteredClicks) {
      map.set(c.productSlug, (map.get(c.productSlug) || 0) + 1);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [filteredClicks]);

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>
            {isAr ? 'تقارير وتحليلات النقرات (/go/[slug])' : 'Outbound Click Analytics'}
          </h1>
          <p className={styles.pageSubtitle}>
            {isAr
              ? 'إحصائيات النقرات الفعلية المفلترة من الروبوتات، مصنفة حسب المتجر والجهاز والمنتج.'
              : 'Privacy-preserving outbound click analytics filtered for bots, broken down by store, device, and product.'}
          </p>
        </div>

        <div className={styles.actionRow}>
          <select
            value={daysWindow}
            onChange={(e) => setDaysWindow(e.target.value as '7' | '30' | 'all')}
            className={styles.selectInput}
          >
            <option value="7">{isAr ? 'آخر 7 أيام' : 'Last 7 Days'}</option>
            <option value="30">{isAr ? 'آخر 30 يوماً' : 'Last 30 Days'}</option>
            <option value="all">{isAr ? 'كل الأوقات' : 'All Time'}</option>
          </select>

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className={styles.selectInput}
          >
            <option value="all">{isAr ? 'جميع المتاجر' : 'All Stores'}</option>
            {sources.map((s) => (
              <option key={s.id} value={s.slug}>
                {t(s.name)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Breakdown Cards */}
      <div className={styles.formGrid}>
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>
            {isAr ? 'النقرات حسب المتجر الشريك' : 'Clicks by Partner Store'}
          </h2>
          {bySource.length === 0 ? (
            <p className={styles.pageSubtitle}>
              {isAr ? 'لا توجد نقرات مسجلة في هذه الفترة.' : 'No clicks recorded in this period.'}
            </p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={`${styles.table} ${styles.compactTable}`}>
                <thead>
                  <tr>
                    <th>{isAr ? 'المتجر' : 'Store'}</th>
                    <th>{isAr ? 'عدد النقرات' : 'Clicks'}</th>
                  </tr>
                </thead>
                <tbody>
                  {bySource.map(([slugKey, count]) => (
                    <tr key={slugKey}>
                      <td>
                        <strong>{slugKey}</strong>
                      </td>
                      <td className="tabularNums">
                        <span className={styles.badgeSuccess}>{count}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>
            {isAr ? 'النقرات حسب نوع الجهاز' : 'Clicks by Device Type'}
          </h2>
          {byDevice.length === 0 ? (
            <p className={styles.pageSubtitle}>
              {isAr ? 'لا توجد بيانات بعد.' : 'No device data yet.'}
            </p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={`${styles.table} ${styles.compactTable}`}>
                <thead>
                  <tr>
                    <th>{isAr ? 'الجهاز' : 'Device'}</th>
                    <th>{isAr ? 'عدد النقرات' : 'Clicks'}</th>
                  </tr>
                </thead>
                <tbody>
                  {byDevice.map(([device, count]) => (
                    <tr key={device}>
                      <td>
                        <strong>{device}</strong>
                      </td>
                      <td className="tabularNums">
                        <span className={styles.badgeNeutral}>{count}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Top Products in Selected Window */}
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>
          {isAr ? 'أكثر المنتجات نقراً في الفترة المحددة' : 'Top Clicked Products in Period'}
        </h2>
        {byProduct.length === 0 ? (
          <p className={styles.pageSubtitle}>
            {isAr ? 'لا توجد نقرات مسجلة بعد.' : 'No product clicks recorded yet.'}
          </p>
        ) : (
          <>
            <div className={`${styles.tableWrap} ${styles.desktopTableOnly}`}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{isAr ? 'المنتج' : 'Product'}</th>
                    <th>{isAr ? 'النقرات' : 'Clicks'}</th>
                  </tr>
                </thead>
                <tbody>
                  {byProduct.map(([prodSlug, count]) => {
                    const matched = products.find((p) => p.slug === prodSlug);
                    return (
                      <tr key={prodSlug}>
                        <td>{matched ? t(matched.title) : prodSlug}</td>
                        <td className="tabularNums">
                          <strong>{count}</strong>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className={styles.mobileAdminCards}>
              {byProduct.map(([prodSlug, count]) => {
                const matched = products.find((p) => p.slug === prodSlug);
                return (
                  <div key={prodSlug} className={styles.mobileItemCard}>
                    <div className={styles.mobileItemTitle}>
                      {matched ? t(matched.title) : prodSlug}
                    </div>
                    <div className={styles.mobileCardHeaderRow}>
                      <span className={styles.mobileItemSlug}>/{prodSlug}</span>
                      <span className={`${styles.badgeSuccess} tabularNums`}>
                        {isAr ? `${count} نقرة` : `${count} clicks`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      {/* Recent Click Log */}
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>
          {isAr ? 'سجل أحدث النقرات' : 'Recent Outbound Click Log'}
        </h2>
        {filteredClicks.length === 0 ? (
          <p className={styles.pageSubtitle}>
            {isAr ? 'لا توجد سجلات لعرضها.' : 'No recent click events.'}
          </p>
        ) : (
          <>
            <div className={`${styles.tableWrap} ${styles.desktopTableOnly}`}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{isAr ? 'المنتج' : 'Product'}</th>
                    <th>{isAr ? 'المتجر' : 'Store'}</th>
                    <th>{isAr ? 'المصدر الداخلي' : 'Context'}</th>
                    <th>{isAr ? 'الجهاز / الدولة' : 'Device / Country'}</th>
                    <th>{isAr ? 'الوقت' : 'Timestamp'}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClicks.slice(0, 50).map((c) => (
                    <tr key={c.id}>
                      <td>/{c.productSlug}</td>
                      <td>{c.sourceSlug}</td>
                      <td>{c.refContext}</td>
                      <td>
                        {c.deviceType} · {c.countryCode}
                      </td>
                      <td className="tabularNums">
                        {formatCalendarDate(c.createdAt, locale)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={styles.mobileAdminCards}>
              {filteredClicks.slice(0, 50).map((c) => (
                <div key={c.id} className={styles.mobileItemCard}>
                  <div className={styles.mobileCardHeaderRow}>
                    <strong className={styles.mobileItemSlug} style={{ fontSize: '13px', color: 'var(--color-text-primary)' }}>
                      /{c.productSlug}
                    </strong>
                    <span className={styles.badgeSuccess}>{c.sourceSlug}</span>
                  </div>
                  <div className={styles.mobileItemMetaRow}>
                    <span className={styles.mobileMetaPill}>
                      <span className={styles.mobileMetaLabel}>{isAr ? 'الجهاز:' : 'Device:'}</span>
                      <span className={styles.mobileMetaValue}>{c.deviceType} · {c.countryCode}</span>
                    </span>
                    <span className={styles.mobileMetaPill}>
                      <span className={styles.mobileMetaLabel}>{isAr ? 'التاريخ:' : 'Date:'}</span>
                      <span className={`${styles.mobileMetaValue} tabularNums`}>
                        {formatCalendarDate(c.createdAt, locale)}
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
