'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  FileText,
  Flag,
  FolderTree,
  Globe,
  Inbox,
  LayoutDashboard,
  Menu,
  Moon,
  Package,
  Settings,
  Store,
  Sun,
  Users,
  X,
} from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/components/ui/ThemeProvider';
import { useSaved } from '@/features/saved/SavedProvider';
import { BrandLogo } from '@/components/ui/BrandLogo';
import styles from './AdminShell.module.css';

export interface AdminShellProps {
  adminEmail: string;
  firebaseAdminReady: boolean;
  cloudinaryReady: boolean;
  initialNewReportsCount?: number;
  children: React.ReactNode;
}

export function AdminShell({
  adminEmail,
  firebaseAdminReady,
  cloudinaryReady,
  initialNewReportsCount = 0,
  children,
}: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { locale, setLocale } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const { user, authLoading } = useSaved();
  const isAr = locale === 'ar';
  const sidebarRef = useRef<HTMLElement>(null);
  const mobileNavToggleRef = useRef<HTMLButtonElement>(null);
  const closeMobileNavigation = () => {
    setMobileNavOpen(false);
    mobileNavToggleRef.current?.focus();
  };

  const [newReportsCount, setNewReportsCount] = useState<number>(
    initialNewReportsCount
  );
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setNewReportsCount(initialNewReportsCount);
  }, [initialNewReportsCount]);

  useEffect(() => {
    const handleReportsCount = (e: Event) => {
      const custom = e as CustomEvent<{ newCount?: number }>;
      if (typeof custom.detail?.newCount === 'number') {
        setNewReportsCount(custom.detail.newCount);
      }
    };
    window.addEventListener('aqurivo-reports-count', handleReportsCount);
    return () => {
      window.removeEventListener('aqurivo-reports-count', handleReportsCount);
    };
  }, []);

  useEffect(() => {
    if (!mobileNavOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMobileNavigation();
        return;
      }

      if (event.key === 'Tab') {
        const focusable = sidebarRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled])'
        );
        if (!focusable?.length) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);
    sidebarRef.current
      ?.querySelector<HTMLElement>('.' + styles.navLinkActive)
      ?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileNavOpen]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  const effectiveEmail = adminEmail || (user?.role === 'admin' ? user.email : '');

  useEffect(() => {
    if (adminEmail) return;
    if (authLoading) return;

    if (!user) {
      router.replace('/login?next=/admin');
    } else if (user.role !== 'admin') {
      router.replace('/account');
    }
  }, [adminEmail, authLoading, user, router]);

  if (!effectiveEmail) {
    return null;
  }

  const navItems: Array<{
    href: string;
    label: string;
    icon: React.ComponentType<{ size?: number; 'aria-hidden'?: boolean | 'true' | 'false' }>;
    exact?: boolean;
    badgeCount?: number;
  }> = [
    {
      href: '/admin',
      label: isAr ? 'لوحة المعلومات' : 'Overview',
      icon: LayoutDashboard,
      exact: true,
    },
    {
      href: '/admin/products',
      label: isAr ? 'المنتجات' : 'Products',
      icon: Package,
    },
    {
      href: '/admin/categories',
      label: isAr ? 'الفئات' : 'Categories',
      icon: FolderTree,
    },
    {
      href: '/admin/amazon',
      label: isAr ? 'استيراد Amazon' : 'Amazon Import',
      icon: Store,
    },
    {
      href: '/admin/sources',
      label: isAr ? 'المصادر الشريكة' : 'Partner Sources',
      icon: Store,
    },
    {
      href: '/admin/articles',
      label: isAr ? 'أدلة الشراء' : 'Buying Guides',
      icon: FileText,
    },
    {
      href: '/admin/reports',
      label: isAr ? 'البلاغات والمساعدة' : 'Issue Reports',
      icon: Flag,
      badgeCount: newReportsCount,
    },
    {
      href: '/admin/messages',
      label: isAr ? 'الرسائل الواردة' : 'Messages',
      icon: Inbox,
    },
    {
      href: '/admin/testimonials',
      label: isAr ? 'شهادات الزوار' : 'Testimonials',
      icon: Inbox,
    },
    {
      href: '/admin/analytics',
      label: isAr ? 'تقارير النقرات' : 'Click Analytics',
      icon: BarChart3,
    },
    {
      href: '/admin/users',
      label: isAr ? 'المستخدمون' : 'Users',
      icon: Users,
    },
    {
      href: '/admin/settings',
      label: isAr ? 'الإعدادات' : 'Settings',
      icon: Settings,
    },
  ];

  return (
    <div className={styles.adminLayout}>
      {mobileNavOpen && (
        <button
          type="button"
          className={styles.mobileNavBackdrop}
          onClick={closeMobileNavigation}
          aria-label={isAr ? 'إغلاق قائمة الإدارة' : 'Close admin navigation'}
        />
      )}

      {/* Operational Sidebar */}
      <aside
        ref={sidebarRef}
        className={`${styles.sidebar} ${mobileNavOpen ? styles.sidebarOpen : ''}`}
        id="admin-navigation"
        aria-label={isAr ? 'قائمة الإدارة' : 'Admin navigation'}
      >
        <div className={styles.sidebarBrand}>
          <div className={styles.brandGroup}>
            <BrandLogo size="sm" />
            <span className={styles.adminBadge}>
              {isAr ? 'الإدارة' : 'Admin'}
            </span>
          </div>
          <div className={styles.sidebarBrandActions}>
            <Link href="/" className={styles.backToSiteTopBtn}>
              {isAr ? (
                <ArrowRight size={15} aria-hidden="true" />
              ) : (
                <ArrowLeft size={15} aria-hidden="true" />
              )}
              <span>{isAr ? 'الرجوع للموقع' : 'Back to Site'}</span>
            </Link>
            <button
              ref={mobileNavToggleRef}
              type="button"
              className={styles.mobileNavClose}
              onClick={closeMobileNavigation}
              aria-label={isAr ? 'إغلاق القائمة' : 'Close navigation'}
            >
              <X size={19} aria-hidden="true" />
            </button>
          </div>
        </div>

        <nav
          className={styles.navMenu}
          aria-label={isAr ? 'أقسام الإدارة' : 'Admin sections'}
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navLink} ${active ? styles.navLinkActive : ''}`}
                aria-current={active ? 'page' : undefined}
                onClick={closeMobileNavigation}
              >
                <Icon size={17} aria-hidden="true" />
                <span>{item.label}</span>
                {typeof item.badgeCount === 'number' && item.badgeCount > 0 && (
                  <span className={styles.navCountBadge}>
                    {item.badgeCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.readinessBlock}>
            <div className={styles.readinessRow}>
              <span
                className={`${styles.statusDot} ${
                  firebaseAdminReady ? styles.dotReady : styles.dotPending
                }`}
              />
              <span>
                {isAr ? 'قاعدة البيانات: ' : 'Database: '}
                <strong>
                  {firebaseAdminReady
                    ? isAr
                      ? 'متصلة'
                      : 'Connected'
                    : isAr
                      ? 'غير مُعدّة بعد'
                      : 'Not set up'}
                </strong>
              </span>
            </div>
            <div className={styles.readinessRow}>
              <span
                className={`${styles.statusDot} ${
                  cloudinaryReady ? styles.dotReady : styles.dotPending
                }`}
              />
              <span>
                {isAr ? 'رفع الصور: ' : 'Image Upload: '}
                <strong>
                  {cloudinaryReady
                    ? isAr
                      ? 'جاهز'
                      : 'Ready'
                    : isAr
                      ? 'غير مُعدّ بعد'
                      : 'Not set up'}
                </strong>
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={styles.workspace}>
        <header className={styles.topBar}>
          <button
            type="button"
            className={styles.mobileNavToggle}
            onClick={() => setMobileNavOpen(true)}
            aria-expanded={mobileNavOpen}
            aria-controls="admin-navigation"
            aria-label={isAr ? 'فتح قائمة الإدارة' : 'Open admin navigation'}
          >
            <Menu size={20} aria-hidden="true" />
          </button>

          <div className={styles.adminIdentity}>
            <span className={styles.identityLabel}>
              {isAr ? 'المدير المسجل:' : 'Signed in as:'}
            </span>
            <strong className={styles.identityEmail}>{effectiveEmail}</strong>
          </div>

          <div className={styles.topBarActions}>
            <button
              type="button"
              onClick={() => setLocale(locale === 'en' ? 'ar' : 'en')}
              className={styles.topBarBtn}
            >
              <Globe size={15} aria-hidden="true" />
              <span>{locale === 'en' ? 'العربية' : 'EN'}</span>
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              className={styles.topBarBtn}
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>

            <Link href="/" className={styles.storefrontLink}>
              {isAr ? (
                <ArrowRight size={15} aria-hidden="true" />
              ) : (
                <ArrowLeft size={15} aria-hidden="true" />
              )}
              <span>{isAr ? 'الرجوع إلى الموقع' : 'Back to Website'}</span>
            </Link>
          </div>
        </header>

        <main className={styles.mainContent}>{children}</main>
      </div>
    </div>
  );
}
