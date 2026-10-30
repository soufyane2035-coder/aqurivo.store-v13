'use client';

import React, { useEffect, useState } from 'react';
import { Bot, ShieldCheck } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import { useSaved } from '@/features/saved/SavedProvider';
import { getFreshFirebaseIdToken } from '@/lib/firebase-client';
import type { McpWriteControlDashboardState } from '@/server/repositories/mcp-controls.repo';
import styles from './AdminMcpControlsView.module.css';

export function AdminMcpControlsView({
  initialControls,
}: {
  initialControls: McpWriteControlDashboardState;
}) {
  const { locale } = useI18n();
  const { csrfToken } = useSaved();
  const isAr = locale === 'ar';
  const [controls, setControls] = useState(initialControls);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedNotice, setSavedNotice] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setError('');
      try {
        const headers: Record<string, string> = {};
        if (csrfToken) headers['x-csrf-token'] = csrfToken;
        try {
          const idToken = await getFreshFirebaseIdToken();
          if (idToken) headers['x-firebase-id-token'] = idToken;
        } catch {
          // The signed session cookie remains the primary authentication path.
        }
        const response = await fetch('/api/admin/mcp-controls', {
          headers,
          cache: 'no-store',
        });
        const result = (await response.json()) as {
          controls?: McpWriteControlDashboardState;
          error?: string;
        };
        if (!response.ok || !result.controls) {
          throw new Error(result.error || (isAr ? 'تعذر تحميل الإعداد.' : 'Unable to load controls.'));
        }
        if (active) setControls(result.controls);
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : isAr
                ? 'تعذر تحميل صلاحيات MCP.'
                : 'Unable to load MCP permissions.'
          );
        }
      } finally {
        if (active) setLoaded(true);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [csrfToken, isAr, loadAttempt]);

  const save = async (field: 'products' | 'editorial', checked: boolean) => {
    setSaving(true);
    setError('');
    setSavedNotice(false);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (csrfToken) headers['x-csrf-token'] = csrfToken;
      try {
        const idToken = await getFreshFirebaseIdToken();
        if (idToken) headers['x-firebase-id-token'] = idToken;
      } catch {
        // The signed session cookie remains the primary authentication path.
      }

      const response = await fetch('/api/admin/mcp-controls', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ [field]: checked }),
        cache: 'no-store',
      });
      const result = (await response.json()) as {
        controls?: McpWriteControlDashboardState;
        error?: string;
      };
      if (!response.ok || !result.controls) {
        throw new Error(result.error || (isAr ? 'تعذر حفظ الإعداد.' : 'Unable to save controls.'));
      }
      setControls(result.controls);
      setSavedNotice(true);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : isAr
            ? 'حدث خطأ غير متوقع.'
            : 'An unexpected error occurred.'
      );
    } finally {
      setSaving(false);
    }
  };

  const items = [
    {
      key: 'products' as const,
      title: isAr ? 'كتابة المنتجات' : 'Product writes',
      description: isAr
        ? 'السماح لأدوات MCP بإنشاء المنتجات أو تحديثها.'
        : 'Allow MCP tools to create or update product records.',
    },
    {
      key: 'editorial' as const,
      title: isAr ? 'كتابة الأدلة والمحتوى التحريري' : 'Buying guides & editorial writes',
      description: isAr
        ? 'السماح لأدوات MCP بإنشاء أدلة الشراء والمحتوى التحريري أو تحديثها.'
        : 'Allow MCP tools to create or update buying guides and editorial content.',
    },
  ];

  return (
    <div className={styles.page} dir={isAr ? 'rtl' : 'ltr'}>
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <span className={styles.iconBadge} aria-hidden="true">
            <Bot size={22} />
          </span>
          <div>
            <h1 className={styles.title}>
              {isAr ? 'صلاحيات النشر عبر MCP' : 'MCP publishing permissions'}
            </h1>
            <p className={styles.subtitle}>
              {isAr
                ? 'تحكم بشكل مستقل في كتابة المنتجات والمحتوى التحريري من خلال أدوات MCP.'
                : 'Independently control product and editorial writes through MCP tools.'}
            </p>
          </div>
        </div>
        <div className={styles.target}>
          {isAr ? 'الهدف الحالي' : 'Current target'}:{' '}
          <strong>
            {controls.target === 'unconfigured'
              ? isAr
                ? 'بيئة MCP'
                : 'MCP runtime'
              : controls.target}
          </strong>
        </div>
      </header>

      <section className={styles.notice} aria-label={isAr ? 'حالة التحكم' : 'Control status'}>
        <ShieldCheck size={20} aria-hidden="true" />
        <div>
          <strong>
            {!loaded
              ? isAr
                ? 'جارٍ تحميل صلاحيات MCP'
                : 'Loading MCP permissions'
              : controls.configured
              ? isAr
                ? 'تُطبّق إعدادات لوحة الإدارة'
                : 'Dashboard controls are active'
              : isAr
                ? 'يُستخدم نطاق الكتابة الحالي من إعدادات البيئة'
                : 'Existing environment write scopes are in use'}
          </strong>
          <p>
            {isAr
              ? 'تُقرأ التفضيلات عند كل استدعاء لأداة MCP. وتظل بوابات بيئة عملية MCP هي الحدّ الأعلى دون الحاجة لإعادة تشغيل VS Code.'
              : 'Preferences are read on every MCP tool call. The MCP process environment remains the upper bound; VS Code does not need a restart.'}
          </p>
        </div>
      </section>

      <section className={styles.permissionList} aria-label={isAr ? 'صلاحيات الكتابة' : 'Write permissions'}>
        {items.map((item) => {
          const checked = controls[item.key];
          const effective = controls.effective?.[item.key];
          const allowed = controls.allowed[item.key];
          const disabled =
            !loaded || saving || (!allowed && !checked);
          return (
            <article className={styles.permissionCard} key={item.key}>
              <div className={styles.permissionCopy}>
                <h2>{item.title}</h2>
                <p>{item.description}</p>
                <span className={effective ? styles.statusOn : styles.statusOff}>
                  {!loaded
                    ? isAr
                      ? 'جارٍ التحميل'
                      : 'Loading'
                    : effective === null || effective === undefined
                    ? !controls.explicit[item.key]
                      ? isAr
                        ? 'استخدم إعدادات بيئة MCP الحالية'
                        : 'Using the MCP runtime environment default'
                      : isAr
                        ? checked
                          ? 'التفضيل مفعّل؛ بوابات MCP تحدد السماح الفعلي'
                          : 'التفضيل متوقف'
                        : checked
                          ? 'Preference enabled; MCP gates determine effective access'
                          : 'Preference disabled'
                    : effective
                      ? isAr
                        ? 'مسموح حالياً'
                        : 'Currently allowed'
                      : isAr
                        ? 'محظور حالياً'
                        : 'Currently blocked'}
                </span>
                {!allowed && controls.target !== 'unconfigured' && (
                  <p className={styles.limitNote}>
                    {isAr
                      ? 'تمنع إعدادات البيئة تفعيل هذا النطاق. يلزم ضبط بوابات الكتابة المناسبة على الخادم أولاً.'
                      : 'Environment policy blocks enabling this scope. The required server-side write gates must be set first.'}
                  </p>
                )}
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={checked}
                aria-label={item.title}
                disabled={disabled}
                onClick={() => void save(item.key, !checked)}
                className={`${styles.switch} ${checked ? styles.switchOn : ''}`}
              >
                <span className={styles.switchThumb} />
              </button>
            </article>
          );
        })}
      </section>

      {controls.updatedAt && (
        <p className={styles.auditLine}>
          {isAr ? 'آخر تحديث' : 'Last updated'}:{' '}
          <time dateTime={controls.updatedAt}>
            {new Date(controls.updatedAt).toLocaleString(isAr ? 'ar' : 'en')}
          </time>
          {controls.updatedBy ? ` · ${controls.updatedBy}` : ''}
        </p>
      )}
      {error && (
        <div className={styles.errorBlock} role="alert">
          <p className={styles.error}>{error}</p>
          {!loaded || saving ? null : (
            <button
              type="button"
              className={styles.retryButton}
              onClick={() => setLoadAttempt((attempt) => attempt + 1)}
            >
              {isAr ? 'إعادة المحاولة' : 'Retry'}
            </button>
          )}
        </div>
      )}
      {savedNotice && (
        <p className={styles.success} role="status">
          {isAr ? 'تم حفظ صلاحيات MCP.' : 'MCP permissions saved.'}
        </p>
      )}
      <p className={styles.footnote}>
        {isAr
          ? 'تظل بوابات البيئة حدّاً أعلى لهذه الصلاحيات. لا تتحكم هذه الصفحة في الحذف أو الفئات أو إعدادات الموقع.'
          : 'Environment gates remain the upper bound. This page does not control deletion, categories, or site settings.'}
      </p>
    </div>
  );
}
