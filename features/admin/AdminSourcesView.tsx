'use client';

import React, { useState } from 'react';
import { Edit3, Trash2 } from 'lucide-react';
import type { PartnerSource, PriceDisplayPolicy } from '@/types';
import { useI18n } from '@/i18n/I18nProvider';
import { useSaved } from '@/features/saved/SavedProvider';
import { useToast } from '@/components/ui/Toast';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import styles from './AdminShell.module.css';

export function AdminSourcesView({
  initialSources,
}: {
  initialSources: PartnerSource[];
}) {
  const { locale, t } = useI18n();
  const { csrfToken } = useSaved();
  const { showToast } = useToast();
  const isAr = locale === 'ar';

  const [sources, setSources] = useState(initialSources);
  const [slug, setSlug] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('https://');
  const [disclosureEn, setDisclosureEn] = useState('');
  const [disclosureAr, setDisclosureAr] = useState('');
  const [defaultPricePolicy, setDefaultPricePolicy] =
    useState<PriceDisplayPolicy>('show_with_timestamp');
  const [isActive, setIsActive] = useState(true);

  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PartnerSource | null>(null);

  const handleEdit = (s: PartnerSource) => {
    setSlug(s.slug);
    setNameEn(s.name.en);
    setNameAr(s.name.ar);
    setWebsiteUrl(s.websiteUrl);
    setDisclosureEn(s.disclosureText.en);
    setDisclosureAr(s.disclosureText.ar);
    setDefaultPricePolicy(s.defaultPricePolicy);
    setIsActive(s.isActive);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csrfToken) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/sources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({
          slug: slug.trim().toLowerCase(),
          name: { en: nameEn, ar: nameAr },
          websiteUrl: websiteUrl.trim(),
          disclosureText: { en: disclosureEn, ar: disclosureAr },
          defaultPricePolicy,
          isActive,
        }),
      });
      const data = (await res.json()) as { source?: PartnerSource; error?: string };
      if (!res.ok || !data.source) {
        showToast(data.error || 'Error saving partner source', 'error');
        return;
      }
      const saved = data.source;
      setSources((prev) => {
        const exists = prev.some((item) => item.id === saved.id);
        return exists
          ? prev.map((item) => (item.id === saved.id ? saved : item))
          : [...prev, saved];
      });
      setSlug('');
      setNameEn('');
      setNameAr('');
      setWebsiteUrl('https://');
      setDisclosureEn('');
      setDisclosureAr('');
      showToast(
        isAr ? 'تم حفظ المتجر الشريك بنجاح.' : 'Partner source saved.',
        'success'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget || !csrfToken) return;
    const res = await fetch(
      `/api/admin/sources?id=${encodeURIComponent(deleteTarget.id)}`,
      {
        method: 'DELETE',
        headers: { 'x-csrf-token': csrfToken },
      }
    );
    if (res.ok) {
      setSources((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      setDeleteTarget(null);
      showToast(isAr ? 'تم حذف المصدر.' : 'Partner source deleted.', 'info');
    }
  };

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>
            {isAr ? 'إدارة المتاجر والمصادر الشريكة' : 'Manage Partner Store Sources'}
          </h1>
          <p className={styles.pageSubtitle}>
            {isAr
              ? 'إدارة Amazon وNoon وTemu وClickBank، أو إضافة أي متجر عمولة جديد دون تعديل الكود.'
              : 'Configure Amazon, Noon, Temu, ClickBank, or add any new affiliate store dynamically.'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className={styles.card}>
        <h2 className={styles.cardTitle}>
          {isAr ? 'إضافة أو تحديث متجر شريك' : 'Add or Update Partner Store'}
        </h2>
        <div className={styles.formGrid}>
          <Input
            label={isAr ? 'معرّف المتجر (Slug - اختياري)' : 'Store Slug (Optional)'}
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="amazon"
          />
          <Input
            label={isAr ? 'الموقع الرسمي (HTTPS)' : 'Store Website URL (HTTPS)'}
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            required
          />
          <Input
            label={isAr ? 'اسم المتجر (بالإنجليزية)' : 'Store Name (English)'}
            value={nameEn}
            onChange={(e) => setNameEn(e.target.value)}
          />
          <Input
            label={isAr ? 'اسم المتجر (بالعربية)' : 'Store Name (Arabic)'}
            value={nameAr}
            onChange={(e) => setNameAr(e.target.value)}
          />
          <Input
            label={isAr ? 'نص إفصاح العمولة (بالإنجليزية - اختياري)' : 'Affiliate Disclosure (English - Optional)'}
            value={disclosureEn}
            onChange={(e) => setDisclosureEn(e.target.value)}
          />
          <Input
            label={isAr ? 'نص إفصاح العمولة (بالعربية - اختياري)' : 'Affiliate Disclosure (Arabic - Optional)'}
            value={disclosureAr}
            onChange={(e) => setDisclosureAr(e.target.value)}
          />
        </div>

        <div className={styles.formGrid}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>
              {isAr ? 'السياسة الافتراضية لعرض السعر' : 'Default Price Policy'}
            </label>
            <select
              value={defaultPricePolicy}
              onChange={(e) =>
                setDefaultPricePolicy(e.target.value as PriceDisplayPolicy)
              }
              className={styles.selectInput}
            >
              <option value="show_with_timestamp">
                {isAr ? 'عرض السعر مع تاريخ التحقق' : 'Show Price With Timestamp'}
              </option>
              <option value="hide_price_check_store">
                {isAr ? 'فحص السعر الحي في المتجر' : 'Hide Price — Check Live on Store'}
              </option>
            </select>
          </div>

          <label className={styles.actionRow}>
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            <span className={styles.fieldLabel}>
              {isAr ? 'متجر نشط' : 'Active Store'}
            </span>
          </label>
        </div>

        <div className={styles.actionRow}>
          <Button type="submit" isLoading={saving}>
            {isAr ? 'حفظ المتجر الشريك' : 'Save Partner Store'}
          </Button>
        </div>
      </form>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>
          {isAr ? 'المتاجر الشريكة المعتمدة' : 'Configured Partner Stores'}
        </h2>
        <div className={`${styles.tableWrap} ${styles.desktopTableOnly}`}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{isAr ? 'المتجر' : 'Store'}</th>
                <th>{isAr ? 'نص الإفصاح' : 'Disclosure'}</th>
                <th>{isAr ? 'سياسة السعر' : 'Price Policy'}</th>
                <th>{isAr ? 'إجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((s) => (
                <tr key={s.id}>
                  <td>
                    <strong>{t(s.name)}</strong>
                    <div className={styles.kpiLabel}>{s.websiteUrl}</div>
                  </td>
                  <td>{t(s.disclosureText)}</td>
                  <td>{s.defaultPricePolicy}</td>
                  <td>
                    <div className={styles.actionRow}>
                      <button
                        type="button"
                        onClick={() => handleEdit(s)}
                        className={styles.topBarBtn}
                      >
                        <Edit3 size={14} />
                        <span>{isAr ? 'تعديل' : 'Edit'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(s)}
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

        <div className={styles.mobileAdminCards}>
          {sources.map((s) => (
            <div key={s.id} className={styles.mobileItemCard}>
              <div className={styles.mobileCardHeaderRow}>
                <div className={styles.mobileItemInfo}>
                  <span className={styles.mobileItemTitle}>{t(s.name)}</span>
                  <span className={styles.mobileItemSlug}>{s.websiteUrl}</span>
                </div>
                <span
                  className={
                    s.isActive !== false ? styles.badgeSuccess : styles.badgeNeutral
                  }
                >
                  {s.isActive !== false
                    ? isAr
                      ? 'نشط'
                      : 'Active'
                    : isAr
                      ? 'غير نشط'
                      : 'Inactive'}
                </span>
              </div>

              {t(s.disclosureText) && (
                <p className={styles.mobileCardBodyText}>{t(s.disclosureText)}</p>
              )}

              <div className={styles.mobileItemMetaRow}>
                <span className={styles.mobileMetaPill}>
                  <span className={styles.mobileMetaLabel}>
                    {isAr ? 'سياسة السعر:' : 'Price Policy:'}
                  </span>
                  <span className={styles.mobileMetaValue}>
                    {s.defaultPricePolicy === 'show_with_timestamp'
                      ? isAr
                        ? 'عرض السعر مع التاريخ'
                        : 'Show With Timestamp'
                      : isAr
                        ? 'فحص السعر الحي'
                        : 'Check Live on Store'}
                  </span>
                </span>
              </div>

              <div className={styles.mobileItemActions}>
                <div className={styles.mobileActionButtonsGroup}>
                  <button
                    type="button"
                    onClick={() => handleEdit(s)}
                    className={styles.topBarBtn}
                  >
                    <Edit3 size={14} />
                    <span>{isAr ? 'تعديل' : 'Edit'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(s)}
                    className={styles.topBarBtn}
                  >
                    <Trash2 size={14} />
                    <span>{isAr ? 'حذف' : 'Delete'}</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title={isAr ? 'تأكيد حذف المصدر' : 'Confirm Source Deletion'}
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
            ? `هل تريد حذف المتجر الشريك «${deleteTarget ? t(deleteTarget.name) : ''}»؟`
            : `Delete partner store "${deleteTarget ? t(deleteTarget.name) : ''}"?`}
        </p>
      </Modal>
    </>
  );
}
