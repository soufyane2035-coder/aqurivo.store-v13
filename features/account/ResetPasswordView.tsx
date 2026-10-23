'use client';

import React, { Suspense, useEffect, useId, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  ShieldCheck,
} from 'lucide-react';
import {
  confirmPasswordReset,
  sendPasswordResetEmail,
  verifyPasswordResetCode,
} from 'firebase/auth';
import {
  getFirebaseClientAuth,
  isFirebaseClientConfigured,
} from '@/lib/firebase-client';
import { useI18n } from '@/i18n/I18nProvider';
import { SiteHeader } from '@/components/sections/SiteHeader';
import { SiteFooter } from '@/components/sections/SiteFooter';
import { SignatureMotif } from '@/components/ui/SignatureMotif';
import { Button } from '@/components/ui/Button';
import styles from './ResetPasswordView.module.css';

function calculatePasswordStrength(pass: string): number {
  if (!pass) return 0;
  let score = 0;
  if (pass.length >= 8) score += 1;
  if (pass.length >= 12) score += 1;
  if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1;
  if (/[0-9]/.test(pass) || /[^A-Za-z0-9]/.test(pass)) score += 1;
  return Math.min(4, Math.max(1, score));
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale } = useI18n();
  const isAr = locale === 'ar';

  const rawCode =
    searchParams.get('oobCode') ||
    searchParams.get('code') ||
    searchParams.get('token') ||
    '';

  const [activeCode, setActiveCode] = useState<string>(rawCode);
  const [email, setEmail] = useState<string>('');
  const [targetAccountEmail, setTargetAccountEmail] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

  const [isVerifyingCode, setIsVerifyingCode] = useState<boolean>(Boolean(rawCode));
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [infoMessage, setInfoMessage] = useState<string>('');
  const [isSuccessCompleted, setIsSuccessCompleted] = useState<boolean>(false);

  const emailFieldId = useId();
  const newPasswordFieldId = useId();
  const confirmPasswordFieldId = useId();

  const passwordStrength = calculatePasswordStrength(newPassword);
  const strengthLabels = isAr
    ? ['ضعيفة', 'مقبولة', 'جيدة', 'قوية جداً']
    : ['Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = ['#e11d48', '#f59e0b', '#10b981', '#059669'];

  // Verify code on mount if present
  useEffect(() => {
    if (!activeCode) {
      setIsVerifyingCode(false);
      return;
    }

    let isMounted = true;
    const auth = getFirebaseClientAuth();
    if (!auth) {
      setIsVerifyingCode(false);
      return;
    }

    setIsVerifyingCode(true);
    setErrorMessage('');

    verifyPasswordResetCode(auth, activeCode)
      .then((accountEmail) => {
        if (!isMounted) return;
        setTargetAccountEmail(accountEmail);
        setIsVerifyingCode(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setIsVerifyingCode(false);
        const code =
          err && typeof err === 'object' && 'code' in err ? String(err.code) : '';
        if (code === 'auth/expired-action-code') {
          setErrorMessage(
            isAr
              ? 'رابط إعادة التعيين منتهي الصلاحية. يمكنك طلب رابط جديد بالأسفل.'
              : 'The reset link has expired. You can request a fresh link below.'
          );
        } else {
          setErrorMessage(
            isAr
              ? 'رابط إعادة التعيين غير صالح أو تم استخدامه بالفعل.'
              : 'The reset link is invalid or has already been used.'
          );
        }
      });

    return () => {
      isMounted = false;
    };
  }, [activeCode, isAr]);

  // Handle requesting a new reset link
  const handleRequestResetLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setInfoMessage('');

    if (!email.trim()) {
      setErrorMessage(
        isAr
          ? 'يرجى إدخال عنوان بريدك الإلكتروني.'
          : 'Please enter your email address.'
      );
      return;
    }

    const auth = getFirebaseClientAuth();
    if (!auth) {
      setErrorMessage(
        isAr
          ? 'خدمة الحسابات قيد التهيئة حالياً. يرجى المحاولة بعد لحظات.'
          : 'Authentication service is initializing. Please try again in a moment.'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const origin =
        typeof window !== 'undefined' ? window.location.origin : 'https://aqurivo.store';
      const resetUrl = `${origin}/${locale}/reset-password`;

      await sendPasswordResetEmail(auth, email.trim(), {
        url: resetUrl,
        handleCodeInApp: true,
      });

      setInfoMessage(
        isAr
          ? `تم إرسال رابط الأمان إلى ${email.trim()}. تفقد صندوق الوارد والبريد غير الهام (Spam).`
          : `Security link sent to ${email.trim()}. Please check your inbox and spam folder.`
      );
    } catch {
      setErrorMessage(
        isAr
          ? 'تعذر إرسال الرابط حالياً. يرجى التحقق من صحة البريد والمحاولة مرة أخرى.'
          : 'Could not send reset email. Please ensure the email is correct and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle setting new password with verified code
  const handleConfirmNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setInfoMessage('');

    if (newPassword.length < 8) {
      setErrorMessage(
        isAr
          ? 'يجب أن تتكون كلمة المرور الجديدة من 8 أحرف على الأقل.'
          : 'New password must be at least 8 characters long.'
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage(
        isAr
          ? 'كلمتا المرور غير متطابقتين. يرجى التأكد وإعادة المحاولة.'
          : 'Passwords do not match. Please verify and try again.'
      );
      return;
    }

    const auth = getFirebaseClientAuth();
    if (!auth || !activeCode) {
      setErrorMessage(
        isAr
          ? 'رمز التحقق غير متوفر أو منتهي الصلاحية.'
          : 'Verification code is missing or expired.'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await confirmPasswordReset(auth, activeCode, newPassword);
      setIsSuccessCompleted(true);
    } catch (err) {
      const code =
        err && typeof err === 'object' && 'code' in err ? String(err.code) : '';
      if (code === 'auth/weak-password') {
        setErrorMessage(
          isAr
            ? 'كلمة المرور ضعيفة جداً. يرجى استخدام مزيج من الأحرف والأرقام والرموز.'
            : 'Password is too weak. Please use a combination of letters, numbers, and symbols.'
        );
      } else if (code === 'auth/expired-action-code') {
        setErrorMessage(
          isAr
            ? 'انتهت صلاحية هذا الرابط. يرجى طلب رابط جديد.'
            : 'This link has expired. Please request a new one.'
        );
      } else {
        setErrorMessage(
          isAr
            ? 'تعذر تحديث كلمة المرور. يرجى إعادة المحاولة أو طلب رابط جديد.'
            : 'Failed to update password. Please try again or request a new link.'
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.pageShell}>
      <SiteHeader />

      <main className={styles.main}>
        <section className={styles.card} aria-labelledby="reset-title">
          {/* Header row */}
          <div className={styles.headerRow}>
            <Link href={`/${locale}/login`} className={styles.backLink}>
              {isAr ? (
                <>
                  <ArrowRight size={14} aria-hidden="true" />
                  <span>العودة لتسجيل الدخول</span>
                </>
              ) : (
                <>
                  <ArrowLeft size={14} aria-hidden="true" />
                  <span>Back to Sign In</span>
                </>
              )}
            </Link>

            <span className={styles.brandBadge}>
              <SignatureMotif label="AQURIVO" />
            </span>
          </div>

          {/* Mode 1: Verifying Code Spinner */}
          {isVerifyingCode && (
            <div className={styles.loadingBox}>
              <div className={styles.loadingSpinner} aria-hidden="true" />
              <p className={styles.subtitle}>
                {isAr
                  ? 'جاري التحقق من أمان وصلاحية رابط إعادة التعيين...'
                  : 'Verifying security and validity of reset link...'}
              </p>
            </div>
          )}

          {/* Mode 2: Password Changed Successfully! */}
          {!isVerifyingCode && isSuccessCompleted && (
            <div className={styles.completedCard}>
              <div className={styles.successIconWrapper}>
                <Check size={32} aria-hidden="true" />
              </div>
              <div className={styles.titleArea}>
                <h1 id="reset-title" className={styles.title}>
                  {isAr ? 'تم تحديث كلمة المرور بنجاح!' : 'Password Updated!'}
                </h1>
                <p className={styles.subtitle}>
                  {isAr
                    ? 'أصبح حسابك آمناً الآن بكلمة المرور الجديدة. يمكنك المتابعة لتسجيل الدخول مباشرة.'
                    : 'Your account is now secured with your new password. You can proceed to sign in directly.'}
                </p>
              </div>

              <Button
                fullWidth
                onClick={() => router.push(`/${locale}/login`)}
                className={styles.submitBtn}
              >
                {isAr ? 'تسجيل الدخول الآن' : 'Sign In Now'}
              </Button>
            </div>
          )}

          {/* Mode 3: Set New Password (Valid Code Available) */}
          {!isVerifyingCode && !isSuccessCompleted && activeCode && targetAccountEmail && (
            <>
              <div className={styles.titleArea}>
                <h1 id="reset-title" className={styles.title}>
                  {isAr ? 'إنشاء كلمة مرور جديدة' : 'Set New Password'}
                </h1>
                <p className={styles.subtitle}>
                  {isAr
                    ? 'اختر كلمة مرور قوية لحماية حسابك والوصول إلى كافة ميزات AQURIVO.'
                    : 'Choose a strong password to protect your account and access all AQURIVO features.'}
                </p>
              </div>

              <div className={styles.targetAccountBadge}>
                <ShieldCheck size={16} aria-hidden="true" style={{ color: 'var(--color-accent-primary)' }} />
                <span>
                  {isAr ? 'الحساب: ' : 'Account: '}
                  <strong>{targetAccountEmail}</strong>
                </span>
              </div>

              <form onSubmit={handleConfirmNewPassword} className={styles.form} noValidate>
                {/* New Password */}
                <div className={styles.fieldGroup}>
                  <label htmlFor={newPasswordFieldId} className={styles.fieldLabel}>
                    {isAr ? 'كلمة المرور الجديدة' : 'New password'}
                  </label>
                  <div className={styles.inputWrapper}>
                    <span className={styles.inputLeadingIcon} aria-hidden="true">
                      <Lock size={17} />
                    </span>
                    <input
                      id={newPasswordFieldId}
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={8}
                      autoComplete="new-password"
                      className={styles.inputField}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((prev) => !prev)}
                      className={styles.togglePassBtn}
                      aria-label={
                        showNewPassword
                          ? isAr
                            ? 'إخفاء كلمة المرور'
                            : 'Hide password'
                          : isAr
                            ? 'إظهار كلمة المرور'
                            : 'Show password'
                      }
                    >
                      {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  {newPassword.length > 0 && (
                    <div className={styles.strengthMeter}>
                      <div className={styles.strengthBarTrack}>
                        {[1, 2, 3, 4].map((seg) => (
                          <span
                            key={seg}
                            className={styles.strengthBarSegment}
                            style={{
                              backgroundColor:
                                passwordStrength >= seg
                                  ? strengthColors[passwordStrength - 1]
                                  : undefined,
                            }}
                          />
                        ))}
                      </div>
                      <span className={styles.strengthText}>
                        {isAr ? 'مستوى القوة: ' : 'Strength: '}
                        {strengthLabels[Math.max(0, passwordStrength - 1)]}
                      </span>
                    </div>
                  )}
                </div>

                {/* Confirm New Password */}
                <div className={styles.fieldGroup}>
                  <label htmlFor={confirmPasswordFieldId} className={styles.fieldLabel}>
                    {isAr ? 'تأكيد كلمة المرور الجديدة' : 'Confirm new password'}
                  </label>
                  <div className={styles.inputWrapper}>
                    <span className={styles.inputLeadingIcon} aria-hidden="true">
                      <Lock size={17} />
                    </span>
                    <input
                      id={confirmPasswordFieldId}
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={8}
                      autoComplete="new-password"
                      className={styles.inputField}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className={styles.togglePassBtn}
                      aria-label={
                        showConfirmPassword
                          ? isAr
                            ? 'إخفاء تأكيد كلمة المرور'
                            : 'Hide confirm password'
                          : isAr
                            ? 'إظهار تأكيد كلمة المرور'
                            : 'Show confirm password'
                      }
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {errorMessage && (
                  <p className={styles.errorBanner} role="alert">
                    <AlertCircle size={16} aria-hidden="true" style={{ flexShrink: 0 }} />
                    <span>{errorMessage}</span>
                  </p>
                )}

                <Button
                  type="submit"
                  fullWidth
                  isLoading={isSubmitting}
                  className={styles.submitBtn}
                >
                  {isAr ? 'حفظ كلمة المرور الجديدة' : 'Save New Password'}
                </Button>
              </form>
            </>
          )}

          {/* Mode 4: Request Reset Link (No Code, or Invalid/Expired Code) */}
          {!isVerifyingCode && !isSuccessCompleted && (!activeCode || !targetAccountEmail) && (
            <>
              <div className={styles.titleArea}>
                <h1 id="reset-title" className={styles.title}>
                  {isAr ? 'استعادة كلمة المرور' : 'Reset Password'}
                </h1>
                <p className={styles.subtitle}>
                  {isAr
                    ? 'أدخل عنوان بريدك الإلكتروني المسجل وسنرسل لك رابطاً آمناً لاختيار كلمة مرور جديدة.'
                    : 'Enter your registered email address and we will send you a secure link to reset your password.'}
                </p>
              </div>

              {errorMessage && (
                <p className={styles.errorBanner} role="alert">
                  <AlertCircle size={16} aria-hidden="true" style={{ flexShrink: 0 }} />
                  <span>{errorMessage}</span>
                </p>
              )}

              {infoMessage && (
                <p className={styles.infoBanner} role="status">
                  <CheckCircle2 size={16} aria-hidden="true" style={{ flexShrink: 0 }} />
                  <span>{infoMessage}</span>
                </p>
              )}

              <form onSubmit={handleRequestResetLink} className={styles.form} noValidate>
                <div className={styles.fieldGroup}>
                  <label htmlFor={emailFieldId} className={styles.fieldLabel}>
                    {isAr ? 'البريد الإلكتروني المسجل' : 'Registered email address'}
                  </label>
                  <div className={styles.inputWrapper}>
                    <span className={styles.inputLeadingIcon} aria-hidden="true">
                      <Mail size={17} />
                    </span>
                    <input
                      id={emailFieldId}
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      required
                      autoComplete="email"
                      className={styles.inputField}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  fullWidth
                  isLoading={isSubmitting}
                  className={styles.submitBtn}
                >
                  {isAr ? 'إرسال رابط إعادة التعيين' : 'Send Reset Link'}
                </Button>
              </form>

              <div className={styles.footerLinks}>
                <span>{isAr ? 'تذكرت كلمة المرور؟' : 'Remembered your password?'}</span>
                <Link href={`/${locale}/login`} className={styles.footerLink}>
                  {isAr ? 'سجّل الدخول' : 'Sign in'}
                </Link>
              </div>
            </>
          )}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

export function ResetPasswordView() {
  return (
    <Suspense
      fallback={
        <div className={styles.pageShell}>
          <SiteHeader />
          <main className={styles.main}>
            <div className={styles.card}>
              <div className={styles.loadingBox}>
                <div className={styles.loadingSpinner} aria-hidden="true" />
              </div>
            </div>
          </main>
          <SiteFooter />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
