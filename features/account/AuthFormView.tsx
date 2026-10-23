'use client';

import React, { useEffect, useId, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
} from 'lucide-react';
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
} from 'firebase/auth';
import {
  createGoogleProvider,
  getFirebaseClientAuth,
  isFirebaseClientConfigured,
} from '@/lib/firebase-client';
import { useI18n } from '@/i18n/I18nProvider';
import { useSaved } from '@/features/saved/SavedProvider';
import { SiteHeader } from '@/components/sections/SiteHeader';
import { SiteFooter } from '@/components/sections/SiteFooter';
import { SignatureMotif } from '@/components/ui/SignatureMotif';
import { Button } from '@/components/ui/Button';
import styles from './AuthFormView.module.css';

interface AuthFormViewProps {
  mode: 'login' | 'register';
}

function GoogleIcon() {
  return (
    <svg
      className={styles.googleIcon}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="#EA4335"
        d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"
      />
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
      />
      <path
        fill="#FBBC05"
        d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3 0-.8.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 10.8 0 12.5s.7 2.8 1.9 5.2l3.7-2.9z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 17C3.7 20.7 7.5 24 12 24z"
      />
    </svg>
  );
}

export function AuthFormView({ mode }: AuthFormViewProps) {
  const { locale } = useI18n();
  const isAr = locale === 'ar';
  const { user, refreshSession } = useSaved();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const emailId = useId();
  const passwordId = useId();
  const confirmPasswordId = useId();
  const rememberMeId = useId();

  const clientReady = isFirebaseClientConfigured();

  const getRedirectDestination = () => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const nextPath = params.get('next');
      if (nextPath && nextPath.startsWith('/') && !nextPath.startsWith('//')) {
        return nextPath;
      }
    }
    return '/';
  };

  useEffect(() => {
    if (user) {
      router.replace(getRedirectDestination());
    }
  }, [user, router]);

  // Compute password strength for registration
  const passwordStrength = React.useMemo(() => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password) || /[\u0600-\u06FF]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    return score;
  }, [password]);

  const strengthLabels = isAr
    ? ['ضعيفة جداً', 'مقبولة', 'جيدة', 'قوية وممتازة']
    : ['Very weak', 'Fair', 'Good', 'Strong'];

  const strengthColors = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981'];

  const exchangeTokenForSession = async (idToken: string, refreshToken?: string) => {
    try {
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, refreshToken, rememberMe }),
      });
      if (res.ok) {
        const data = (await res.json()) as { csrfToken?: string };
        if (data.csrfToken) {
          try {
            window.sessionStorage.setItem('soufshop_session_token', data.csrfToken);
          } catch {
            // Ignore sessionStorage errors
          }
        }
      }
    } catch {
      // Even if cookie exchange fails, Firebase client state is active
    }
    await refreshSession();
    router.replace(getRedirectDestination());
  };

  const handleForgotPassword = async () => {
    setErrorMessage('');
    setInfoMessage('');
    if (!email.trim()) {
      setErrorMessage(
        isAr
          ? 'يرجى كتابة بريدك الإلكتروني في الحقل أولاً لإرسال رابط استعادة كلمة المرور.'
          : 'Please enter your email address in the field first to receive the reset link.'
      );
      return;
    }

    const auth = getFirebaseClientAuth();
    if (!auth) return;

    setIsResettingPassword(true);
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
          ? 'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني. تفقد صندوق الوارد والبريد غير الهام (Spam).'
          : 'Password reset link sent to your email. Please check your inbox and spam folder.'
      );
    } catch {
      setErrorMessage(
        isAr
          ? 'تعذر إرسال الرابط حالياً. تأكد من صحة البريد الإلكتروني أو حاول بعد قليل.'
          : 'Could not send reset email. Please ensure the email is correct and try again.'
      );
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setInfoMessage('');

    if (mode === 'register') {
      if (password !== confirmPassword) {
        setErrorMessage(
          isAr
            ? 'كلمتا المرور غير متطابقتين. يرجى التأكد وإعادة المحاولة.'
            : 'Passwords do not match. Please verify and try again.'
        );
        return;
      }

      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail || !normalizedEmail.includes('@')) {
        setErrorMessage(
          isAr
            ? 'يرجى إدخال بريد إلكتروني صالح.'
            : 'Please enter a valid email address.'
        );
        return;
      }
    }

    const auth = getFirebaseClientAuth();
    if (!auth) {
      setErrorMessage(
        isAr
          ? 'خدمة تسجيل الدخول قيد الإعداد حالياً. يمكنك حفظ المنتجات على جهازك مباشرة دون حساب.'
          : 'Sign-in is currently being set up. You can save items directly on your device without an account.'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const credential =
        mode === 'register'
          ? await createUserWithEmailAndPassword(auth, email.trim(), password)
          : await signInWithEmailAndPassword(auth, email.trim(), password);
      const idToken = await credential.user.getIdToken();
      await exchangeTokenForSession(idToken, credential.user.refreshToken);
    } catch (err) {
      const code =
        err && typeof err === 'object' && 'code' in err ? String(err.code) : '';
      if (code === 'auth/email-already-in-use') {
        setErrorMessage(
          isAr
            ? 'هذا البريد الإلكتروني مسجل بالفعل. انتقل إلى صفحة تسجيل الدخول.'
            : 'This email is already registered. Please sign in instead.'
        );
      } else if (code === 'auth/wrong-password' || code === 'auth/user-not-found' || code === 'auth/invalid-credential') {
        setErrorMessage(
          isAr
            ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة. يرجى التحقق أو استخدام استعادة كلمة المرور.'
            : 'Incorrect email or password. Please verify or use Forgot Password.'
        );
      } else if (code === 'auth/weak-password') {
        setErrorMessage(
          isAr
            ? 'كلمة المرور ضعيفة جداً. يجب أن تتكون من 8 أحرف على الأقل.'
            : 'Password is too weak. Must be at least 8 characters.'
        );
      } else if (code === 'auth/operation-not-allowed') {
        setErrorMessage(
          isAr
            ? 'يرجى تفعيل الدخول بالبريد وكلمة المرور من قسم Sign-in method في لوحة تحكم Firebase.'
            : 'Please enable Email/Password sign-in in your Firebase Console.'
        );
      } else {
        setErrorMessage(
          isAr
            ? 'يرجى التأكد من صحة البريد الإلكتروني وكلمة المرور والمحاولة مرة أخرى.'
            : 'Please verify your credentials and try again.'
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage('');
    setInfoMessage('');
    const auth = getFirebaseClientAuth();
    if (!auth) {
      setErrorMessage(
        isAr
          ? 'خدمة تسجيل الدخول قيد الإعداد حالياً. يمكنك حفظ المنتجات على جهازك مباشرة دون حساب.'
          : 'Sign-in is currently being set up. You can save items directly on your device without an account.'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const provider = createGoogleProvider();
      const credential = await signInWithPopup(auth, provider);
      const idToken = await credential.user.getIdToken();
      await exchangeTokenForSession(idToken, credential.user.refreshToken);
    } catch (err) {
      const code =
        err && typeof err === 'object' && 'code' in err ? String(err.code) : '';
      if (code === 'auth/unauthorized-domain') {
        setErrorMessage(
          isAr
            ? 'يرجى إضافة نطاق المعاينة الحالي في قسم Authorized domains داخل إعدادات Firebase Authentication.'
            : 'Please add the current preview domain to Authorized domains in Firebase Authentication settings.'
        );
      } else {
        setErrorMessage(
          isAr
            ? 'لم تكتمل عملية الدخول عبر Google. يمكنك المحاولة مرة أخرى أو استخدام البريد وكلمة المرور.'
            : 'Google sign-in was cancelled or could not be completed. Please try again.'
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const BackIcon = isAr ? ArrowRight : ArrowLeft;

  return (
    <div className={styles.pageShell}>
      <SiteHeader />

      <main id="main-content" className={`siteContainer ${styles.main}`}>
        <section className={styles.authCard}>
          <div className={styles.headerRow}>
            <SignatureMotif
              index="01"
              label={
                mode === 'login'
                  ? isAr
                    ? 'تسجيل الدخول'
                    : 'Sign In'
                  : isAr
                    ? 'إنشاء حساب اختياري'
                    : 'Optional Account'
              }
            />
            <Link href={`/${locale}`} className={styles.backLink}>
              <BackIcon size={14} aria-hidden="true" />
              <span>{isAr ? 'العودة للرئيسية' : 'Back to Home'}</span>
            </Link>
          </div>

          <h1 className={styles.title}>
            {mode === 'login'
              ? isAr
                ? 'مرحباً بعودتك إلى AQURIVO'
                : 'Welcome back to AQURIVO'
              : isAr
                ? 'احفظ مختاراتك عبر جميع أجهزتك'
                : 'Sync your saved picks across devices'}
          </h1>

          <p className={styles.subtitle}>
            {isAr
              ? 'إنشاء الحساب اختياري تماماً؛ يمكنك دائماً التصفح والشراء وحفظ المفضلة على جهازك دون تسجيل.'
              : 'Accounts are completely optional. You can always browse, shop, and save items locally without signing in.'}
          </p>

          <Button
            type="button"
            variant="secondary"
            fullWidth
            onClick={handleGoogleSignIn}
            disabled={isSubmitting || !clientReady}
            className={styles.googleBtn}
          >
            <GoogleIcon />
            <span>{isAr ? 'المتابعة باستخدام Google' : 'Continue with Google'}</span>
          </Button>

          <div className={styles.divider}>
            <span>{isAr ? 'أو عبر البريد الإلكتروني' : 'or with email'}</span>
          </div>

          <form onSubmit={handleEmailSubmit} className={styles.form}>
            {/* Email Field */}
            <div className={styles.fieldGroup}>
              <label htmlFor={emailId} className={styles.fieldLabel}>
                {isAr ? 'البريد الإلكتروني' : 'Email address'}
              </label>
              <div className={styles.inputWrapper}>
                <span className={styles.inputLeadingIcon} aria-hidden="true">
                  <Mail size={17} />
                </span>
                <input
                  id={emailId}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={isAr ? 'name@example.com' : 'name@example.com'}
                  required
                  autoComplete="email"
                  className={`${styles.inputField} ${styles.inputFieldNoEndIcon}`}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className={styles.fieldGroup}>
              <div className={styles.fieldLabelRow}>
                <label htmlFor={passwordId} className={styles.fieldLabel}>
                  {isAr ? 'كلمة المرور' : 'Password'}
                </label>
                {mode === 'login' && (
                  <Link
                    href={`/${locale}/reset-password`}
                    className={styles.forgotLink}
                  >
                    {isAr ? 'نسيت كلمة المرور؟' : 'Forgot password?'}
                  </Link>
                )}
              </div>
              <div className={styles.inputWrapper}>
                <span className={styles.inputLeadingIcon} aria-hidden="true">
                  <Lock size={17} />
                </span>
                <input
                  id={passwordId}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  className={styles.inputField}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className={styles.togglePassBtn}
                  aria-label={
                    showPassword
                      ? isAr
                        ? 'إخفاء كلمة المرور'
                        : 'Hide password'
                      : isAr
                        ? 'إظهار كلمة المرور'
                        : 'Show password'
                  }
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Password strength meter for register mode */}
              {mode === 'register' && password.length > 0 && (
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

            {/* Confirm Password Field (Only on Register) */}
            {mode === 'register' && (
              <div className={styles.fieldGroup}>
                <label htmlFor={confirmPasswordId} className={styles.fieldLabel}>
                  {isAr ? 'تأكيد كلمة المرور' : 'Confirm password'}
                </label>
                <div className={styles.inputWrapper}>
                  <span className={styles.inputLeadingIcon} aria-hidden="true">
                    <Lock size={17} />
                  </span>
                  <input
                    id={confirmPasswordId}
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
            )}

            {/* Remember Me Option */}
            <div className={styles.optionsRow}>
              <label htmlFor={rememberMeId} className={styles.rememberLabel}>
                <input
                  id={rememberMeId}
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className={styles.checkboxInput}
                />
                <span>{isAr ? 'تذكر بيانات تسجيل دخولي' : 'Remember me on this device'}</span>
              </label>
            </div>

            {errorMessage && (
              <p className={styles.errorBanner} role="alert">
                {errorMessage}
              </p>
            )}

            {infoMessage && (
              <p className={styles.infoBanner} role="status">
                <CheckCircle2 size={16} aria-hidden="true" />
                <span>{infoMessage}</span>
              </p>
            )}

            <Button
              type="submit"
              fullWidth
              isLoading={isSubmitting}
              className={styles.submitBtn}
            >
              {mode === 'login'
                ? isAr
                  ? 'تسجيل الدخول'
                  : 'Sign In'
                : isAr
                  ? 'إنشاء الحساب'
                  : 'Create Account'}
            </Button>

            <p className={styles.termsText}>
              {isAr ? (
                <>
                  بالمتابعة، فإنك توافق على{' '}
                  <Link href={`/${locale}/terms`} className={styles.termsLink}>
                    شروط الاستخدام
                  </Link>{' '}
                  و{' '}
                  <Link href={`/${locale}/privacy`} className={styles.termsLink}>
                    سياسة الخصوصية
                  </Link>
                  .
                </>
              ) : (
                <>
                  By continuing, you agree to our{' '}
                  <Link href={`/${locale}/terms`} className={styles.termsLink}>
                    Terms of Use
                  </Link>{' '}
                  and{' '}
                  <Link href={`/${locale}/privacy`} className={styles.termsLink}>
                    Privacy Policy
                  </Link>
                  .
                </>
              )}
            </p>
          </form>

          <div className={styles.switchFooter}>
            {mode === 'login' ? (
              <p>
                {isAr ? 'ليس لديك حساب؟ ' : "Don't have an account? "}
                <Link href={`/${locale}/register`} className={styles.switchLink}>
                  {isAr ? 'أنشئ حساباً الآن' : 'Create one'}
                </Link>
              </p>
            ) : (
              <p>
                {isAr ? 'لديك حساب بالفعل؟ ' : 'Already have an account? '}
                <Link href={`/${locale}/login`} className={styles.switchLink}>
                  {isAr ? 'سجّل الدخول' : 'Sign in'}
                </Link>
              </p>
            )}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
