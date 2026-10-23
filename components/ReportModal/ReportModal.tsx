'use client';

import React, { useEffect, useId, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  FileWarning,
  HeartHandshake,
  Link2Off,
  Loader2,
  MessageSquarePlus,
  PackageX,
  ShieldCheck,
  ShoppingBag,
  Tag,
} from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import type { Locale, ReportReason, ReportType } from '@/types';
import { CareShieldBadgeIcon } from '@/components/ui/AqurivoContextIcons';
import { ReportCareEmblem } from './ReportCareEmblem';
import styles from './ReportModal.module.css';

export interface ReportModalProps {
  productSlug?: string;
  productName?: string;
  locale?: Locale;
  variant?: 'product' | 'footer';
  triggerLabel?: string;
  mode?: 'trigger' | 'page';
}

interface CombinedOption {
  value: string;
  type: ReportType;
  reason: ReportReason;
  labelAr: string;
  labelEn: string;
  descAr: string;
  descEn: string;
  badgeAr: string;
  badgeEn: string;
  accent: 'teal' | 'gold';
}

const PRODUCT_ISSUE_OPTIONS: CombinedOption[] = [
  {
    value: 'product_issue:broken_link',
    type: 'product_issue',
    reason: 'broken_link',
    labelAr: 'الرابط لا يعمل',
    labelEn: 'Link is not working',
    descAr: 'رابط الشراء لا يفتح أو يوجه إلى صفحة غير صحيحة',
    descEn: 'The purchase link does not open or leads to an invalid page',
    badgeAr: 'مشكلة في المنتج',
    badgeEn: 'Product Issue',
    accent: 'teal',
  },
  {
    value: 'product_issue:price_mismatch',
    type: 'product_issue',
    reason: 'price_mismatch',
    labelAr: 'السعر مختلف',
    labelEn: 'Price is different',
    descAr: 'السعر المعروض في الصفحة يختلف عن السعر الفعلي عند الشراء',
    descEn: 'The displayed price differs from the actual checkout price',
    badgeAr: 'مشكلة في المنتج',
    badgeEn: 'Product Issue',
    accent: 'teal',
  },
  {
    value: 'product_issue:wrong_info',
    type: 'product_issue',
    reason: 'wrong_info',
    labelAr: 'معلومات خاطئة',
    labelEn: 'Incorrect information',
    descAr: 'المواصفات أو الصور أو التفاصيل المعروضة تحتاج إلى تصحيح',
    descEn: 'Specifications, images, or details shown need correction',
    badgeAr: 'مشكلة في المنتج',
    badgeEn: 'Product Issue',
    accent: 'teal',
  },
  {
    value: 'product_issue:unavailable',
    type: 'product_issue',
    reason: 'unavailable',
    labelAr: 'المنتج غير متوفر',
    labelEn: 'Product is unavailable',
    descAr: 'نفدت الكمية أو لم يعد هذا المنتج متاحاً للطلب حالياً',
    descEn: 'Out of stock or no longer available for purchase',
    badgeAr: 'مشكلة في المنتج',
    badgeEn: 'Product Issue',
    accent: 'teal',
  },
  {
    value: 'product_issue:other',
    type: 'product_issue',
    reason: 'other',
    labelAr: 'أخرى',
    labelEn: 'Other',
    descAr: 'ملاحظة أو مشكلة أخرى تتعلق بصفحة هذا المنتج',
    descEn: 'Another note or issue related to this product page',
    badgeAr: 'مشكلة في المنتج',
    badgeEn: 'Product Issue',
    accent: 'teal',
  },
];

const ORDER_ISSUE_OPTION: CombinedOption = {
  value: 'order_issue:order_issue',
  type: 'order_issue',
  reason: 'order_issue',
  labelAr: 'مشكلة في طلبي',
  labelEn: 'Issue with my order',
  descAr: 'طلب مساعدة وإرشاد بخطوات المتابعة لطلب قمت بشرائه (رد خلال 48 ساعة)',
  descEn: 'Request guidance and follow-up steps for your purchase (48h reply)',
  badgeAr: 'مساعدة في الطلب',
  badgeEn: 'Order Assistance',
  accent: 'gold',
};

const ALL_OPTIONS: CombinedOption[] = [
  ...PRODUCT_ISSUE_OPTIONS,
  ORDER_ISSUE_OPTION,
];

function renderOptionIcon(reason: ReportReason, size = 19) {
  switch (reason) {
    case 'broken_link':
      return <Link2Off size={size} aria-hidden="true" />;
    case 'price_mismatch':
      return <Tag size={size} aria-hidden="true" />;
    case 'wrong_info':
      return <FileWarning size={size} aria-hidden="true" />;
    case 'unavailable':
      return <PackageX size={size} aria-hidden="true" />;
    case 'order_issue':
      return <ShoppingBag size={size} aria-hidden="true" />;
    case 'other':
    default:
      return <MessageSquarePlus size={size} aria-hidden="true" />;
  }
}

export function ReportModal({
  productSlug = '',
  productName = '',
  locale: propLocale,
  variant = 'product',
  triggerLabel,
  mode = 'trigger',
}: ReportModalProps) {
  const i18n = useI18n();
  const activeLocale: Locale = propLocale || i18n.locale || 'ar';
  const isAr = activeLocale === 'ar';
  const dropdownUid = useId();

  const [selectedOption, setSelectedOption] = useState<string>(
    'product_issue:broken_link'
  );
  const [productInput, setProductInput] = useState<string>(productName);
  const [email, setEmail] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [orderRef, setOrderRef] = useState<string>('');
  const [websiteUrl, setWebsiteUrl] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submittedType, setSubmittedType] = useState<ReportType | null>(null);

  useEffect(() => {
    setProductInput(productName || '');
  }, [productName]);

  // If mode === 'trigger', render a dedicated navigation button to /[locale]/report
  if (mode === 'trigger') {
    const query = new URLSearchParams();
    if (productSlug.trim()) {
      query.set('productSlug', productSlug.trim());
    }
    if (productName.trim()) {
      query.set('productName', productName.trim());
    }
    const qs = query.toString();
    const targetHref = `/${activeLocale}/report${qs ? `?${qs}` : ''}`;
    const defaultTriggerText =
      triggerLabel || (isAr ? 'أبلغ عن مشكلة' : 'Report an issue');

    return (
      <Link
        href={targetHref}
        className={`${styles.triggerButton} ${
          variant === 'footer' ? styles.triggerFooter : styles.triggerProduct
        }`}
      >
        <ReportCareEmblem size="sm" />
        <span>{defaultTriggerText}</span>
      </Link>
    );
  }

  // Dedicated Page Mode (mode === 'page')
  const currentSelection =
    ALL_OPTIONS.find((opt) => opt.value === selectedOption) ||
    PRODUCT_ISSUE_OPTIONS[0];

  const isOrderIssue = currentSelection.type === 'order_issue';
  const trimmedLen = message.trim().length;

  const validateClient = (): string | null => {
    const cleanEmail = email.trim();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return isAr
        ? 'يرجى إدخال بريد إلكتروني صحيح للتواصل.'
        : 'Please enter a valid email address.';
    }
    const cleanMessage = message.trim();
    if (cleanMessage.length < 10) {
      return isAr
        ? 'يرجى كتابة وصف للمشكلة لا يقل عن 10 أحرف.'
        : 'Please describe the issue in at least 10 characters.';
    }
    if (cleanMessage.length > 1000) {
      return isAr
        ? 'وصف المشكلة يجب ألا يتجاوز 1000 حرف.'
        : 'Description must not exceed 1000 characters.';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setErrorMsg(null);
    const validationErr = validateClient();
    if (validationErr) {
      setErrorMsg(validationErr);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: currentSelection.type,
          reason: currentSelection.reason,
          productSlug: productSlug.trim(),
          productName: productInput.trim(),
          email: email.trim(),
          message: message.trim(),
          orderRef: isOrderIssue ? orderRef.trim() : '',
          locale: activeLocale,
          client_hp_verify: websiteUrl,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };

      if (!response.ok) {
        setErrorMsg(
          data.error ||
            (isAr
              ? 'تعذر إرسال البلاغ حالياً. يرجى المحاولة مرة أخرى.'
              : 'Could not submit your report right now. Please try again.')
        );
        return;
      }

      setSubmittedType(currentSelection.type);
    } catch {
      setErrorMsg(
        isAr
          ? 'حدث خطأ في الاتصال. يرجى التحقق من الشبكة والمحاولة مجدداً.'
          : 'Network error occurred. Please check your connection and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setSubmittedType(null);
    setErrorMsg(null);
    setMessage('');
    setOrderRef('');
  };

  const backHref = productSlug.trim()
    ? `/${activeLocale}/products/${encodeURIComponent(productSlug.trim())}`
    : `/${activeLocale}`;

  return (
    <section className={styles.pageSection} dir={isAr ? 'rtl' : 'ltr'}>
      <div className={styles.pageContainer}>
        {/* Top Back Navigation */}
        <div className={styles.topNavRow}>
          <Link href={backHref} className={styles.backLink}>
            {isAr ? (
              <ArrowRight size={15} aria-hidden="true" />
            ) : (
              <ArrowLeft size={15} aria-hidden="true" />
            )}
            <span>
              {productSlug.trim()
                ? isAr
                  ? 'العودة إلى صفحة المنتج'
                  : 'Back to Product Page'
                : isAr
                  ? 'العودة إلى الرئيسية'
                  : 'Back to Home'}
            </span>
          </Link>
        </div>

        {/* Hero Care Header with Custom Signature Emblem */}
        <div className={styles.heroCard}>
          <div className={styles.heroTop}>
            <ReportCareEmblem size="lg" />

            <div className={styles.heroCopy}>
              <span className={styles.careBadge}>
                <CareShieldBadgeIcon size={15} />
                <span>
                  {isAr
                    ? 'مركز العناية بالزوار وحل المشكلات'
                    : 'Visitor Care & Issue Resolution'}
                </span>
              </span>

              <h1 className={styles.heroTitle}>
                {isAr
                  ? 'صوتك مسموع.. ومشكلتك أولويتنا'
                  : 'Your Voice Matters — Your Issue Is Our Priority'}
              </h1>

              <p className={styles.heroSubtitle}>
                {isAr
                  ? 'نحن في AQURIVO نقدّر وقتك وثقتك بنا. كل ملاحظة أو مشكلة تشاركها هنا يراجعها فريقنا شخصياً وباهتمام كامل لضمان حصولك على أفضل تجربة ممكنة.'
                  : 'At AQURIVO, we deeply value your time and trust. Every issue or note you share here is personally reviewed by our team with full care.'}
              </p>
            </div>
          </div>

          <div className={styles.pillarsGrid}>
            <div className={styles.pillarItem}>
              <span className={styles.pillarIconTeal}>
                <HeartHandshake size={17} aria-hidden="true" />
              </span>
              <div className={styles.pillarTextWrap}>
                <span className={styles.pillarTitle}>
                  {isAr ? 'تقدير واهتمام شخصي' : 'Personal Human Review'}
                </span>
                <span className={styles.pillarDesc}>
                  {isAr
                    ? 'فريقنا يقرأ كل بلاغ بعناية ويتابع معك خطوة بخطوة.'
                    : 'Every submission is carefully read and followed up by our team.'}
                </span>
              </div>
            </div>

            <div className={styles.pillarItem}>
              <span className={styles.pillarIconGold}>
                <Clock size={17} aria-hidden="true" />
              </span>
              <div className={styles.pillarTextWrap}>
                <span className={styles.pillarTitle}>
                  {isAr ? 'استجابة واضحة وسريعة' : 'Prompt & Clear Response'}
                </span>
                <span className={styles.pillarDesc}>
                  {isAr
                    ? 'نراجع بلاغات المنتجات فوراً ونرد على استفسارات الطلبات خلال 48 ساعة.'
                    : 'Immediate product checks and email follow-up within 48 hours.'}
                </span>
              </div>
            </div>

            <div className={styles.pillarItem}>
              <span className={styles.pillarIconTeal}>
                <ShieldCheck size={17} aria-hidden="true" />
              </span>
              <div className={styles.pillarTextWrap}>
                <span className={styles.pillarTitle}>
                  {isAr ? 'خصوصية وأمان تام' : 'Complete Privacy'}
                </span>
                <span className={styles.pillarDesc}>
                  {isAr
                    ? 'بريدك يُستخدم للتواصل معك حول بلاغك فقط دون أي رسائل دعائية.'
                    : 'Your email is strictly used to assist you with your report.'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Form or Success Card */}
        <div className={styles.formCard}>
          {submittedType ? (
            <div className={styles.successCard} role="status">
              <ReportCareEmblem size="lg" />
              <h2 className={styles.successTitle}>
                {isAr
                  ? 'نشكرك على تواصلك معنا'
                  : 'Thank You for Reaching Out'}
              </h2>
              <p className={styles.successText}>
                {submittedType === 'order_issue'
                  ? 'وصلنا طلبك وسنرد عليك بالبريد خلال 48 ساعة بخطوات المتابعة مع الجهة التي أتممت عندها الشراء.'
                  : 'شكراً، وصل بلاغك وسنراجعه.'}
              </p>
              <div className={styles.successActions}>
                <Link href={backHref} className={styles.primaryLinkBtn}>
                  {productSlug.trim()
                    ? isAr
                      ? 'العودة إلى صفحة المنتج'
                      : 'Back to Product Page'
                    : isAr
                      ? 'العودة إلى الرئيسية'
                      : 'Back to Home'}
                </Link>
                <button
                  type="button"
                  onClick={handleResetForm}
                  className={styles.secondaryBtn}
                >
                  {isAr ? 'إرسال بلاغ آخر' : 'Submit Another Report'}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className={styles.form} noValidate>
              {errorMsg && (
                <div className={styles.errorBanner} role="alert">
                  {errorMsg}
                </div>
              )}

              {/* 1. اختيار نوع المشكلة بهوية AQURIVO */}
              <div className={styles.sectionBlock}>
                <div className={styles.labelRow}>
                  <label
                    id={`report-type-label-${dropdownUid}`}
                    className={styles.label}
                  >
                    {isAr
                      ? 'حدد نوع المشكلة أو المساعدة المطلوبة'
                      : 'Select the Type of Issue or Assistance'}
                    <span className={styles.requiredMark}>*</span>
                  </label>
                  <span className={styles.selectorHelperBadge}>
                    {isOrderIssue
                      ? isAr
                        ? 'متابعة الطلبات'
                        : 'Order Support'
                      : isAr
                        ? 'فحص صفحة المنتج'
                        : 'Product Check'}
                  </span>
                </div>

                <input
                  type="hidden"
                  name="issueSelection"
                  value={selectedOption}
                />

                <div
                  className={styles.quickCardsGrid}
                  role="radiogroup"
                  aria-labelledby={`report-type-label-${dropdownUid}`}
                >
                  {ALL_OPTIONS.map((opt) => {
                    const active = selectedOption === opt.value;
                    const isGold = opt.accent === 'gold';
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        disabled={isSubmitting}
                        onClick={() => setSelectedOption(opt.value)}
                        className={`${styles.quickCardBtn} ${
                          active
                            ? isGold
                              ? styles.quickCardActiveGold
                              : styles.quickCardActiveTeal
                            : ''
                        }`}
                      >
                        <span
                          className={`${styles.quickCardIcon} ${
                            isGold ? styles.quickCardIconGold : ''
                          }`}
                        >
                          {renderOptionIcon(opt.reason, 17)}
                        </span>

                        <div className={styles.quickCardText}>
                          <span className={styles.quickCardTitle}>
                            {isAr ? opt.labelAr : opt.labelEn}
                          </span>
                          <span className={styles.quickCardCategory}>
                            {isAr ? opt.badgeAr : opt.badgeEn}
                          </span>
                        </div>

                        <span
                          className={`${styles.quickCardIndicator} ${
                            active
                              ? isGold
                                ? styles.quickCardIndicatorGold
                                : styles.quickCardIndicatorTeal
                              : ''
                          }`}
                        >
                          {active && <Check size={12} aria-hidden="true" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. حقل المنتج (يُملأ تلقائياً من الصفحة ويمكن تركه فارغاً من الفوتر) */}
              <div className={styles.sectionBlock}>
                <div className={styles.labelRow}>
                  <label htmlFor="report-product-input" className={styles.label}>
                    {isAr ? 'المنتج' : 'Product'}
                  </label>
                  {!productName && (
                    <span className={styles.optionalTag}>
                      {isAr ? 'اختياري' : 'Optional'}
                    </span>
                  )}
                </div>
                <input
                  id="report-product-input"
                  type="text"
                  value={productInput}
                  onChange={(e) => setProductInput(e.target.value)}
                  placeholder={
                    isAr
                      ? 'اسم المنتج أو اتركه فارغاً للبلاغات العامة...'
                      : 'Product name (or leave blank for general reports)...'
                  }
                  className={`${styles.input} ${
                    productName ? styles.inputAutoFilled : ''
                  }`}
                  maxLength={220}
                  disabled={isSubmitting}
                />
              </div>

              {/* 3. رقم الطلب (يظهر فقط عند order_issue، اختياري) */}
              {isOrderIssue && (
                <div className={styles.sectionBlock}>
                  <div className={styles.labelRow}>
                    <label htmlFor="report-order-ref" className={styles.label}>
                      {isAr ? 'رقم الطلب' : 'Order Reference'}
                    </label>
                    <span className={styles.optionalTag}>
                      {isAr ? 'اختياري' : 'Optional'}
                    </span>
                  </div>
                  <input
                    id="report-order-ref"
                    type="text"
                    value={orderRef}
                    onChange={(e) => setOrderRef(e.target.value)}
                    placeholder={
                      isAr
                        ? 'أدخل رقم الطلب إن وُجد لتسهيل المتابعة'
                        : 'Enter order reference if available'
                    }
                    className={styles.input}
                    maxLength={120}
                    disabled={isSubmitting}
                  />
                </div>
              )}

              {/* 4. البريد الإلكتروني (إجباري) */}
              <div className={styles.sectionBlock}>
                <div className={styles.labelRow}>
                  <label htmlFor="report-email-input" className={styles.label}>
                    {isAr ? 'البريد الإلكتروني' : 'Email Address'}
                    <span className={styles.requiredMark}>*</span>
                  </label>
                </div>
                <input
                  id="report-email-input"
                  type="email"
                  required
                  dir="ltr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className={styles.input}
                  maxLength={160}
                  disabled={isSubmitting}
                />
                <p className={styles.fieldHint}>
                  {isAr
                    ? 'سنستخدم هذا البريد فقط للرد عليك بخصوص بلاغك.'
                    : 'We will only use this email to reply regarding your report.'}
                </p>
              </div>

              {/* 5. وصف المشكلة (10 إلى 1000 حرف) */}
              <div className={styles.sectionBlock}>
                <div className={styles.labelRow}>
                  <label htmlFor="report-message-input" className={styles.label}>
                    {isAr ? 'وصف المشكلة' : 'Issue Description'}
                    <span className={styles.requiredMark}>*</span>
                  </label>
                  <span
                    className={`${styles.charCounter} ${
                      trimmedLen >= 10 && trimmedLen <= 1000
                        ? styles.charCounterValid
                        : ''
                    }`}
                  >
                    {trimmedLen} / 1000
                  </span>
                </div>
                <textarea
                  id="report-message-input"
                  required
                  minLength={10}
                  maxLength={1000}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={
                    isAr
                      ? 'اكتب تفاصيل المشكلة بكل راحة (من 10 إلى 1000 حرف) — نحن نقرأ كل كلمة باهتمام...'
                      : 'Share the details of your issue (10 to 1000 characters) — we read every word with care...'
                  }
                  className={styles.textarea}
                  disabled={isSubmitting}
                />
              </div>

              {/* حقل حماية من البوتات مخفي تماماً */}
              <div className={styles.honeypotWrap} aria-hidden="true">
                <label htmlFor="report-hp-verify">Verification</label>
                <input
                  id="report-hp-verify"
                  type="text"
                  name="client_hp_verify"
                  tabIndex={-1}
                  autoComplete="new-password"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                />
              </div>

              <div className={styles.actionsRow}>
                <span className={styles.reassuranceNote}>
                  <ShieldCheck size={16} aria-hidden="true" />
                  <span>
                    {isAr
                      ? 'بلاغك يصل مباشرة لفريق المراجعة في AQURIVO'
                      : 'Your report goes directly to the AQURIVO review team'}
                  </span>
                </span>

                <button
                  type="submit"
                  className={styles.submitBtn}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={17} aria-hidden="true" />
                      <span>{isAr ? 'جاري الإرسال...' : 'Submitting...'}</span>
                    </>
                  ) : (
                    <span>{isAr ? 'إرسال البلاغ الآن' : 'Submit Report Now'}</span>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
