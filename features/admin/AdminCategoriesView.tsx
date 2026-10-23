'use client';

import React, { useState } from 'react';
import { Edit3, FolderPlus, FolderTree, Plus, Trash2 } from 'lucide-react';
import type { Category } from '@/types';
import { useI18n } from '@/i18n/I18nProvider';
import { useSaved } from '@/features/saved/SavedProvider';
import { useToast } from '@/components/ui/Toast';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import styles from './AdminShell.module.css';

interface AdminCategoriesViewProps {
  initialCategories: Category[];
}

const COMMON_EMOJIS = ['📱', '🏠', '⚽', '💄', '🩺', '👕', '⌚', '🎧', '🚗', '📚', '🍳', '🎮'];

export function AdminCategoriesView({ initialCategories }: AdminCategoriesViewProps) {
  const { locale } = useI18n();
  const { csrfToken } = useSaved();
  const { showToast } = useToast();
  const isAr = locale === 'ar';

  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Form Fields
  const [slug, setSlug] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [icon, setIcon] = useState('');
  const [order, setOrder] = useState('0');
  const [isActive, setIsActive] = useState(true);

  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  const resetForm = () => {
    setEditingCategory(null);
    setSlug('');
    setNameEn('');
    setNameAr('');
    setIcon('');
    setOrder(String(categories.length + 1));
    setIsActive(true);
  };

  const handleOpenAddForm = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const handleEditSelect = (cat: Category) => {
    setEditingCategory(cat);
    setSlug(cat.slug);
    setNameEn(cat.name?.en || '');
    setNameAr(cat.name?.ar || '');
    setIcon(cat.icon || '');
    setOrder(String(cat.order ?? cat.sortOrder ?? 0));
    setIsActive(cat.isActive !== false);
    setIsFormOpen(true);
  };

  const autoGenerateSlug = (enName: string) => {
    if (editingCategory) return;
    const generated = enName
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-');
    setSlug(generated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csrfToken) {
      showToast(isAr ? 'انتهت الجلسة، يرجى إعادة تسجيل الدخول.' : 'Session expired, please sign in.', 'error');
      return;
    }

    const cleanNameAr = nameAr.trim();
    const cleanNameEn = nameEn.trim();
    const cleanSlug = slug.trim().toLowerCase() || autoSlug(cleanNameEn || cleanNameAr);

    if (!cleanNameAr && !cleanNameEn) {
      showToast(isAr ? 'يرجى إدخال اسم الفئة بالعربية أو الإنجليزية.' : 'Please enter category name.', 'error');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({
          slug: cleanSlug,
          name: { en: cleanNameEn || cleanNameAr, ar: cleanNameAr || cleanNameEn },
          icon: icon.trim(),
          order: Number(order) || 0,
          sortOrder: Number(order) || 0,
          isActive,
        }),
      });

      const data = (await res.json()) as { category?: Category; error?: string };
      if (!res.ok || !data.category) {
        showToast(data.error || (isAr ? 'فشل حفظ الفئة' : 'Failed to save category'), 'error');
        return;
      }

      const savedCat = data.category;
      setCategories((prev) => {
        const exists = prev.some((c) => c.id === savedCat.id || c.slug === savedCat.slug);
        const nextList = exists
          ? prev.map((c) => (c.id === savedCat.id || c.slug === savedCat.slug ? savedCat : c))
          : [...prev, savedCat];
        return nextList.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      });

      setIsFormOpen(false);
      resetForm();
      showToast(
        isAr
          ? editingCategory
            ? 'تم تحديث الفئة بنجاح.'
            : 'تمت إضافة الفئة الجديدة بنجاح.'
          : 'Category saved successfully.',
        'success'
      );
    } catch {
      showToast(isAr ? 'حدث خطأ أثناء الاتصال بالخادم.' : 'Server connection error.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget || !csrfToken) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/admin/categories?id=${encodeURIComponent(deleteTarget.id || deleteTarget.slug)}`,
        {
          method: 'DELETE',
          headers: { 'x-csrf-token': csrfToken },
        }
      );
      if (res.ok) {
        setCategories((prev) => prev.filter((c) => c.id !== deleteTarget.id && c.slug !== deleteTarget.slug));
        setDeleteTarget(null);
        showToast(isAr ? 'تم حذف الفئة بنجاح.' : 'Category deleted successfully.', 'info');
      } else {
        const data = await res.json();
        showToast(data.error || (isAr ? 'تعذر حذف الفئة.' : 'Failed to delete category.'), 'error');
      }
    } catch {
      showToast(isAr ? 'حدث خطأ أثناء الحذف.' : 'Error while deleting.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>
            {isAr ? 'إدارة الفئات' : 'Manage Categories'}
          </h1>
          <p className={styles.pageSubtitle}>
            {isAr
              ? 'إنشاء وتنظيم فئات المتجر في Firestore وترتيب عرضها وتصنيف المنتجات بها.'
              : 'Create and organize bilingual product categories in Firestore.'}
          </p>
        </div>

        <Button
          type="button"
          onClick={handleOpenAddForm}
          className={styles.actionRow}
        >
          <Plus size={16} aria-hidden="true" />
          <span>{isAr ? 'إضافة فئة جديدة' : 'Add New Category'}</span>
        </Button>
      </div>

      {/* Categories List Section */}
      <section className={styles.card}>
        <div className={styles.headerRow}>
          <h2 className={styles.cardTitle}>
            {isAr ? `قائمة الفئات (${categories.length})` : `Categories List (${categories.length})`}
          </h2>
        </div>

        {categories.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <FolderTree size={40} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
            <p className={styles.pageSubtitle}>
              {isAr
                ? 'لا توجد فئات مسجلة بعد في Firestore.'
                : 'No categories recorded in Firestore yet.'}
            </p>
            <Button
              type="button"
              onClick={handleOpenAddForm}
              style={{ marginTop: '16px' }}
            >
              <Plus size={16} />
              <span>{isAr ? 'إضافة أول فئة' : 'Add First Category'}</span>
            </Button>
          </div>
        ) : (
          <>
            <div className={`${styles.tableWrap} ${styles.desktopTableOnly}`}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th style={{ width: '60px' }}>{isAr ? 'الأيقونة' : 'Icon'}</th>
                    <th>{isAr ? 'اسم الفئة (عربي)' : 'Name (Arabic)'}</th>
                    <th>{isAr ? 'اسم الفئة (إنجليزي)' : 'Name (English)'}</th>
                    <th>Slug</th>
                    <th style={{ width: '80px', textAlign: 'center' }}>{isAr ? 'الترتيب' : 'Order'}</th>
                    <th style={{ width: '90px' }}>{isAr ? 'الحالة' : 'Status'}</th>
                    <th style={{ width: '130px' }}>{isAr ? 'إجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((cat) => (
                    <tr key={cat.id || cat.slug}>
                      <td style={{ fontSize: '22px', textAlign: 'center' }}>
                        {cat.icon || '📁'}
                      </td>
                      <td>
                        <strong>{cat.name?.ar || '—'}</strong>
                      </td>
                      <td>
                        <span>{cat.name?.en || '—'}</span>
                      </td>
                      <td>
                        <code style={{ fontSize: '13px', opacity: 0.85 }}>{cat.slug}</code>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={styles.sectionHeadingCount}>
                          {cat.order ?? cat.sortOrder ?? 0}
                        </span>
                      </td>
                      <td>
                        <span
                          className={cat.isActive !== false ? styles.badgeSuccess : styles.badgeNeutral}
                        >
                          {cat.isActive !== false
                            ? isAr
                              ? 'نشطة'
                              : 'Active'
                            : isAr
                              ? 'مخفية'
                              : 'Hidden'}
                        </span>
                      </td>
                      <td>
                        <div className={styles.actionRow} style={{ gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => handleEditSelect(cat)}
                            className={styles.topBarBtn}
                            title={isAr ? 'تعديل الفئة' : 'Edit Category'}
                          >
                            <Edit3 size={14} />
                            <span>{isAr ? 'تعديل' : 'Edit'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(cat)}
                            className={styles.topBarBtn}
                            style={{ color: '#ef4444' }}
                            title={isAr ? 'حذف الفئة' : 'Delete Category'}
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
              {categories.map((cat) => (
                <div key={cat.id || cat.slug} className={styles.mobileItemCard}>
                  <div className={styles.mobileItemTop}>
                    <div className={styles.mobileCategoryIcon} aria-hidden="true">
                      {cat.icon || '📁'}
                    </div>
                    <div className={styles.mobileItemInfo}>
                      <div className={styles.mobileCardHeaderRow}>
                        <span className={styles.mobileItemTitle}>
                          {cat.name?.ar || cat.name?.en || '—'}
                        </span>
                        <span
                          className={
                            cat.isActive !== false
                              ? styles.badgeSuccess
                              : styles.badgeNeutral
                          }
                        >
                          {cat.isActive !== false
                            ? isAr
                              ? 'نشطة'
                              : 'Active'
                            : isAr
                              ? 'مخفية'
                              : 'Hidden'}
                        </span>
                      </div>
                      <span className={styles.mobileCardBodyText}>
                        {cat.name?.en || '—'}
                      </span>
                    </div>
                  </div>

                  <div className={styles.mobileItemMetaRow}>
                    <span className={styles.mobileMetaPill}>
                      <span className={styles.mobileMetaLabel}>Slug:</span>
                      <code className={styles.mobileMetaValue}>{cat.slug}</code>
                    </span>
                    <span className={styles.mobileMetaPill}>
                      <span className={styles.mobileMetaLabel}>
                        {isAr ? 'الترتيب:' : 'Order:'}
                      </span>
                      <span className={`${styles.mobileMetaValue} tabularNums`}>
                        {cat.order ?? cat.sortOrder ?? 0}
                      </span>
                    </span>
                  </div>

                  <div className={styles.mobileItemActions}>
                    <div className={styles.mobileActionButtonsGroup}>
                      <button
                        type="button"
                        onClick={() => handleEditSelect(cat)}
                        className={styles.topBarBtn}
                      >
                        <Edit3 size={14} />
                        <span>{isAr ? 'تعديل' : 'Edit'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(cat)}
                        className={styles.topBarBtn}
                        style={{ color: '#ef4444' }}
                      >
                        <Trash2 size={14} />
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

      {/* Add / Edit Category Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => {
          if (!saving) {
            setIsFormOpen(false);
            resetForm();
          }
        }}
        title={
          editingCategory
            ? isAr
              ? `تعديل الفئة: ${editingCategory.name?.ar || editingCategory.slug}`
              : `Edit Category: ${editingCategory.name?.en || editingCategory.slug}`
            : isAr
              ? 'إضافة فئة جديدة'
              : 'Add New Category'
        }
      >
        <form onSubmit={handleSubmit} className={styles.formGrid} style={{ gap: '16px' }}>
          {/* Slug */}
          <Input
            label={isAr ? 'المعرّف الفريد (Slug - مثل: electronics, home, sports)' : 'Unique Slug (e.g., electronics, home, sports)'}
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="electronics"
            required
          />

          {/* Name Arabic */}
          <Input
            label={isAr ? 'اسم الفئة بالعربية (مثل: إلكترونيات)' : 'Category Name (Arabic)'}
            value={nameAr}
            onChange={(e) => setNameAr(e.target.value)}
            placeholder="إلكترونيات"
            required
          />

          {/* Name English */}
          <Input
            label={isAr ? 'اسم الفئة بالإنجليزية (مثل: Electronics)' : 'Category Name (English)'}
            value={nameEn}
            onChange={(e) => {
              setNameEn(e.target.value);
              if (!slug) autoGenerateSlug(e.target.value);
            }}
            placeholder="Electronics"
            required
          />

          {/* Icon (Emoji / Text) */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>
              <span>{isAr ? 'الأيقونة (Emoji اختياري)' : 'Icon (Optional Emoji)'}</span>
              {icon && <span style={{ fontSize: '18px' }}>{icon}</span>}
            </label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="text"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="📱"
                maxLength={10}
                className={styles.selectInput}
                style={{ maxWidth: '120px', textAlign: 'center', fontSize: '18px' }}
              />
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {COMMON_EMOJIS.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setIcon(em)}
                    style={{
                      border: '1px solid var(--color-border-hairline, rgba(0,0,0,0.1))',
                      background: icon === em ? 'rgba(45, 212, 191, 0.2)' : 'transparent',
                      borderRadius: '6px',
                      padding: '4px 6px',
                      cursor: 'pointer',
                      fontSize: '16px',
                    }}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Order (Sort Order) */}
          <Input
            type="number"
            min="0"
            label={isAr ? 'ترتيب العرض (Order - رقم أصغر يظهر أولاً)' : 'Display Order (Order - smaller appears first)'}
            value={order}
            onChange={(e) => setOrder(e.target.value)}
            placeholder="1"
          />

          {/* Active toggle */}
          <label className={styles.actionRow} style={{ marginTop: '6px' }}>
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            <span className={styles.fieldLabel}>
              {isAr ? 'فئة نشطة وظاهرة في المتجر' : 'Active and visible on storefront'}
            </span>
          </label>

          <div className={styles.actionRow} style={{ justifyContent: 'flex-end', marginTop: '16px', gap: '10px' }}>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setIsFormOpen(false);
                resetForm();
              }}
              disabled={saving}
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit" isLoading={saving}>
              {editingCategory
                ? isAr
                  ? 'حفظ التعديلات'
                  : 'Update Category'
                : isAr
                  ? 'إضافة الفئة'
                  : 'Create Category'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => {
          if (!deleting) setDeleteTarget(null);
        }}
        title={isAr ? 'تأكيد حذف الفئة' : 'Confirm Category Deletion'}
        footer={
          <div className={styles.actionRow} style={{ justifyContent: 'flex-end', gap: '10px' }}>
            <Button
              variant="ghost"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteConfirm}
              isLoading={deleting}
            >
              {isAr ? 'نعم، احذف الفئة' : 'Delete Category'}
            </Button>
          </div>
        }
      >
        <p style={{ margin: 0, lineHeight: 1.6 }}>
          {isAr
            ? `هل أنت متأكد من حذف الفئة «${deleteTarget?.name?.ar || deleteTarget?.slug}» نهائياً من Firestore؟`
            : `Are you sure you want to permanently delete category "${deleteTarget?.name?.en || deleteTarget?.slug}" from Firestore?`}
        </p>
      </Modal>
    </>
  );
}

function autoSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-');
}
