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
  signOut,
  signInWithPopup,
  updateProfile,
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

const AUTH_OPERATION_TIMEOUT_MS = 20_000;
const AUTH_SUCCESS_DISPLAY_MS = 1_200;

function withAuthTimeout<T>(operation: Promise<T>): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(Object.assign(new Error('Authentication request timed out.'), { code: 'auth/timeout' }));
    }, AUTH_OPERATION_TIMEOUT_MS);
  });

  return Promise.race([operation, timeout]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
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

function LoginBagCharacter({
  isAr,
  isSuccess,
}: {
  isAr: boolean;
  isSuccess: boolean;
}) {
  return (
    <div
      className={styles.characterMotion}
      dir={isAr ? 'rtl' : 'ltr'}
      aria-hidden="true"
    >
      <svg
        className={`${styles.character} ${isSuccess ? styles.characterSuccess : ''}`}
        viewBox="0 0 300 340"
        focusable="false"
      >
        <ellipse className={styles.characterGround} cx="151" cy="318" rx="102" ry="13" />
        <g className={styles.characterWalk}>
          <path
            className={styles.characterLegBack}
            d="M119 227 113 282l-17 27c-3 5 1 10 7 10h34c5 0 9-4 9-9l-5-52 10-31z"
            fill="var(--color-text-primary)"
          />
          <path
            className={styles.characterLegFront}
            d="m151 229 9 55-5 23c-1 6 3 10 9 10h39c6 0 9-6 5-11l-23-27-1-55z"
            fill="var(--color-text-primary)"
          />
          <path
            d="M101 307c-10 2-17 7-17 12 0 4 5 6 13 6h39c7 0 12-4 12-10v-8z"
            fill="var(--color-accent-primary)"
          />
          <path
            d="M158 307h42c10 0 17 5 17 11 0 5-5 7-13 7h-40c-8 0-13-4-13-10z"
            fill="var(--color-accent-primary)"
          />
          <path
            d="M103 144c7-13 19-20 39-20h19c22 0 36 13 40 36l7 62c1 10-6 19-16 20l-72 7c-11 1-20-7-21-18l-3-54c-1-13 1-24 7-33z"
            fill="var(--color-accent-primary)"
          />
          <path
            d="m117 143 26 18 28-19-6-21h-37z"
            fill="var(--color-bg-elevated)"
            opacity=".94"
          />
          <path
            d="M126 107h32v29c0 10-7 17-16 17s-16-7-16-17z"
            fill="#d7a47f"
          />
          <circle cx="142" cy="79" r="39" fill="#e5b995" />
          <path
            d="M103 78c-3-31 13-51 39-51 23 0 40 17 39 44-8-4-14-12-17-20-12 13-31 19-57 18z"
            fill="var(--color-text-primary)"
          />
          <path
            d="M110 75c-7 22-4 43 7 54-17-3-26-18-25-38 0-11 7-22 18-26z"
            fill="var(--color-text-primary)"
          />
          <circle cx="129" cy="84" r="2.7" fill="#141817" />
          <circle cx="155" cy="84" r="2.7" fill="#141817" />
          <path
            d="M132 100c6 5 14 5 20 0"
            fill="none"
            stroke="#9c5e50"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            className={styles.characterRestingArm}
            d="M187 151c15 6 24 20 30 39l7 22c2 6-1 12-7 14s-12-1-14-7l-12-27-19-15z"
            fill="#e5b995"
          />
          <path
            className={styles.characterPointingArm}
            d="M185 151c17 3 28-3 41-15l23-21c4-4 10-4 14 0s4 10 0 14l-25 26c-16 17-35 22-56 16z"
            fill="#e5b995"
          />
          <path
            d="M105 150c-15 5-24 16-28 33l-8 30c-2 7 2 13 8 14 6 2 12-2 14-8l13-27 17-14z"
            fill="#e5b995"
          />
          <g className={styles.characterBag}>
            <path
              d="m190 190 17-15c12-10 26-9 36 1l14 14"
              fill="none"
              stroke="var(--color-accent-primary)"
              strokeWidth="7"
              strokeLinecap="round"
            />
            <path
              d="M197 194h63l-5 66c-1 8-7 13-15 13h-38c-8 0-14-6-14-14z"
              fill="var(--color-bg-elevated)"
              stroke="var(--color-accent-border)"
              strokeWidth="3"
            />
            <path
              d="M213 195v-7c0-9 7-16 16-16s16 7 16 16v7"
              fill="none"
              stroke="var(--color-accent-primary)"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <rect
              x="222"
              y="221"
              width="14"
              height="16"
              rx="3"
              fill="var(--color-accent-primary)"
            />
            <circle cx="229" cy="229" r="2" fill="var(--color-text-on-accent)" />
          </g>
        </g>
      </svg>
    </div>
  );
}

export function AuthFormView({ mode }: AuthFormViewProps) {
  const { locale } = useI18n();
  const isAr = locale === 'ar';
  const { user, refreshSession } = useSaved();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [sessionExchangeFailed, setSessionExchangeFailed] = useState(false);
  const [adminAccessDenied, setAdminAccessDenied] = useState(false);
  const [infoMessage, setInfoMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isAuthSuccess, setIsAuthSuccess] = useState(false);
  const [isFormFocused, setIsFormFocused] = useState(false);

  const firstNameId = useId();
  const lastNameId = useId();
  const emailId = useId();
  const passwordId = useId();
  const confirmPasswordId = useId();
  const rememberMeId = useId();

  const clientReady = isFirebaseClientConfigured();

  const isAdminDestinationRequested = () => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const nextPath = params.get('next');
      return Boolean(
        nextPath &&
          nextPath.startsWith('/') &&
          !nextPath.startsWith('//') &&
          (nextPath === '/admin' || nextPath.startsWith('/admin/'))
      );
    }
    return false;
  };

  useEffect(() => {
    if (!user || isSubmitting || sessionExchangeFailed || adminAccessDenied) return;
    if (isAdminDestinationRequested() && user.role !== 'admin') {
      setAdminAccessDenied(true);
      setErrorMessage(
        isAr
          ? 'تم تسجيل الدخول، لكن لا يمكن لهذا الحساب الوصول إلى الصفحة المطلوبة.'
          : 'You are signed in, but this account cannot access the requested page.'
      );
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const nextPath = params.get('next');
    const destination =
      nextPath && nextPath.startsWith('/') && !nextPath.startsWith('//')
        ? nextPath
        : user.role === 'admin'
          ? '/admin'
          : '/';
    router.replace(destination);
  }, [user, isSubmitting, sessionExchangeFailed, adminAccessDenied, isAr, router]);

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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AUTH_OPERATION_TIMEOUT_MS);
    try {
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, refreshToken, rememberMe }),
        signal: controller.signal,
      });
      const data = (await res.json()) as {
        authenticated?: boolean;
        csrfToken?: string;
        user?: { role?: 'admin' | 'visitor' };
      };
      if (!res.ok || !data.authenticated || !data.csrfToken) {
        throw new Error('Server session could not be created.');
      }

      try {
        window.sessionStorage.setItem('soufshop_session_token', data.csrfToken);
      } catch {
        // The HTTP-only session cookie remains authoritative.
      }

      setSessionExchangeFailed(false);
      await withAuthTimeout(refreshSession());
      if (isAdminDestinationRequested() && data.user?.role !== 'admin') {
        setAdminAccessDenied(true);
        setErrorMessage(
          isAr
            ? 'تم تسجيل الدخول، لكن لا يمكن لهذا الحساب الوصول إلى الصفحة المطلوبة.'
            : 'You are signed in, but this account cannot access the requested page.'
        );
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const nextPath = params.get('next');
      const destination =
        nextPath && nextPath.startsWith('/') && !nextPath.startsWith('//')
          ? nextPath
          : data.user?.role === 'admin'
            ? '/admin'
            : '/';
      setIsAuthSuccess(true);
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, AUTH_SUCCESS_DISPLAY_MS);
      });
      router.replace(destination);
    } catch {
      setSessionExchangeFailed(true);
      try {
        const auth = getFirebaseClientAuth();
        if (auth) await withAuthTimeout(signOut(auth));
      } catch (signOutError) {
        console.error('Unable to clear Firebase client state after session failure.', signOutError);
      }
      try {
        window.sessionStorage.removeItem('soufshop_session_token');
      } catch {
        // Ignore sessionStorage errors.
      }
      await withAuthTimeout(refreshSession()).catch(() => undefined);
      setErrorMessage(
        isAr
          ? 'تعذر إنشاء جلسة آمنة. لم يكتمل تسجيل الدخول؛ يرجى المحاولة مرة أخرى.'
          : 'A secure session could not be created. Sign-in was not completed; please try again.'
      );
    } finally {
      clearTimeout(timeoutId);
    }
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
    setSessionExchangeFailed(false);
    setAdminAccessDenied(false);

    if (mode === 'register') {
      if (!firstName.trim() || !lastName.trim()) {
        setErrorMessage(
          isAr
            ? 'يرجى إدخال الاسم الأول واسم العائلة.'
            : 'Please enter your first and last name.'
        );
        return;
      }

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
          ? await withAuthTimeout(createUserWithEmailAndPassword(auth, email.trim(), password))
          : await withAuthTimeout(signInWithEmailAndPassword(auth, email.trim(), password));

      if (mode === 'register') {
        try {
          await withAuthTimeout(
            updateProfile(credential.user, {
              displayName: `${firstName.trim()} ${lastName.trim()}`,
            })
          );
        } catch (profileError) {
          console.error('Unable to save the new account display name.', profileError);
          setInfoMessage(
            isAr
              ? 'تم إنشاء الحساب، لكن تعذر حفظ الاسم في الملف الشخصي.'
              : 'Your account was created, but its display name could not be saved.'
          );
        }
      }

      const idToken = await withAuthTimeout(credential.user.getIdToken());
      await exchangeTokenForSession(idToken, credential.user.refreshToken);
    } catch (err) {
      const code =
        err && typeof err === 'object' && 'code' in err ? String(err.code) : '';
      if (code === 'auth/timeout') {
        setErrorMessage(
          isAr
            ? 'استغرق اتصال تسجيل الدخول وقتاً طويلاً ولم يكتمل. تحقق من اتصال الإنترنت أو حجب Firebase، ثم حاول مجدداً.'
            : 'Sign-in timed out before Firebase responded. Check your connection or Firebase access, then try again.'
        );
      } else if (code === 'auth/network-request-failed') {
        setErrorMessage(
          isAr
            ? 'تعذر الاتصال بخدمة Firebase. تحقق من الشبكة أو مانع الإعلانات/جدار الحماية ثم حاول مجدداً.'
            : 'Could not reach Firebase. Check your network, ad blocker, or firewall and try again.'
        );
      } else if (code === 'auth/invalid-api-key') {
        setErrorMessage(
          isAr
            ? 'مفتاح Firebase Web API غير صالح. راجع NEXT_PUBLIC_FIREBASE_API_KEY في إعدادات الموقع.'
            : 'The Firebase Web API key is invalid. Check NEXT_PUBLIC_FIREBASE_API_KEY in the site environment.'
        );
      } else if (code === 'auth/operation-not-allowed') {
        setErrorMessage(
          isAr
            ? 'تسجيل الدخول بالبريد وكلمة المرور غير مفعّل في Firebase Authentication.'
            : 'Email/password sign-in is disabled in Firebase Authentication.'
        );
      } else if (code === 'auth/email-already-in-use') {
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
    setSessionExchangeFailed(false);
    setAdminAccessDenied(false);
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
      const credential = await withAuthTimeout(signInWithPopup(auth, provider));
      const idToken = await withAuthTimeout(credential.user.getIdToken());
      await exchangeTokenForSession(idToken, credential.user.refreshToken);
    } catch (err) {
      const code =
        err && typeof err === 'object' && 'code' in err ? String(err.code) : '';
      if (code === 'auth/timeout') {
        setErrorMessage(
          isAr
            ? 'انتهت مهلة تسجيل الدخول عبر Google قبل اكتماله. تحقق من اتصال Firebase والنوافذ المنبثقة ثم حاول مجدداً.'
            : 'Google sign-in timed out before completing. Check Firebase connectivity and popup access, then try again.'
        );
      } else if (code === 'auth/unauthorized-domain') {
        setErrorMessage(
          isAr
            ? 'يرجى إضافة نطاق المعاينة الحالي في قسم Authorized domains داخل إعدادات Firebase Authentication.'
            : 'Please add the current preview domain to Authorized domains in Firebase Authentication settings.'
        );
      } else if (code === 'auth/operation-not-allowed') {
        setErrorMessage(
          isAr
            ? 'تسجيل الدخول عبر Google غير مفعّل في Firebase Authentication. فعّل مزوّد Google من إعدادات Sign-in method.'
            : 'Google sign-in is disabled in Firebase Authentication. Enable the Google provider under Sign-in method.'
        );
      } else if (code === 'auth/popup-blocked') {
        setErrorMessage(
          isAr
            ? 'حظر المتصفح نافذة Google المنبثقة. اسمح بالنوافذ المنبثقة لهذا الموقع ثم حاول مرة أخرى.'
            : 'Your browser blocked the Google sign-in popup. Allow popups for this site and try again.'
        );
      } else if (code === 'auth/popup-closed-by-user') {
        setErrorMessage(
          isAr
            ? 'أُغلقت نافذة Google قبل اكتمال تسجيل الدخول.'
            : 'The Google sign-in window was closed before sign-in completed.'
        );
      } else if (code === 'auth/cancelled-popup-request') {
        setErrorMessage(
          isAr
            ? 'يوجد طلب تسجيل دخول عبر Google قيد التنفيذ. انتظر لحظات ثم حاول مرة أخرى.'
            : 'A Google sign-in popup is already in progress. Wait a moment and try again.'
        );
      } else if (code === 'auth/invalid-api-key') {
        setErrorMessage(
          isAr
            ? 'مفتاح Firebase Web API غير صالح. راجع إعداد NEXT_PUBLIC_FIREBASE_API_KEY في بيئة الموقع.'
            : 'The Firebase Web API key is invalid. Check NEXT_PUBLIC_FIREBASE_API_KEY in the site environment.'
        );
      } else if (code === 'auth/network-request-failed') {
        setErrorMessage(
          isAr
            ? 'تعذر الاتصال بخدمة Google/Firebase. تحقق من اتصال الشبكة أو مانع الإعلانات ثم أعد المحاولة.'
            : 'Could not reach Google/Firebase. Check your network or ad blocker and try again.'
        );
      } else if (code === 'auth/account-exists-with-different-credential') {
        setErrorMessage(
          isAr
            ? 'هذا البريد مسجل بطريقة دخول أخرى. سجّل الدخول بالطريقة الأصلية ثم اربط حساب Google.'
            : 'This email is registered with another sign-in method. Use that method first, then link Google.'
        );
      } else {
        setErrorMessage(
          isAr
            ? `تعذر إكمال تسجيل الدخول عبر Google (${code || 'خطأ غير معروف'}). استخدم رمز الخطأ لتحديد إعداد Firebase المطلوب.`
            : `Google sign-in could not be completed (${code || 'unknown error'}). Use this code to identify the Firebase setting to check.`
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

      <main
        id="main-content"
        className={`siteContainer ${styles.main} ${styles.authMain} ${isAuthSuccess ? styles.authSuccess : ''}`}
      >
        <div className={`${styles.characterScene} ${isFormFocused ? styles.characterFocused : ''}`}>
          <div className={styles.characterAura} />
          <LoginBagCharacter isAr={isAr} isSuccess={isAuthSuccess} />
          <span className={styles.characterSparkle} aria-hidden="true">
            ✦
          </span>
        </div>

        <section className={styles.authCard}>
          {isAuthSuccess ? (
            <div className={styles.successCard} role="status" aria-live="polite" aria-atomic="true">
              <span className={styles.successIcon}>
                <CheckCircle2 size={30} aria-hidden="true" />
              </span>
              <h1 className={styles.successTitle}>
                {mode === 'register'
                  ? isAr
                    ? 'تم إنشاء الحساب بنجاح'
                    : 'Your account is ready'
                  : isAr
                    ? 'تم تسجيل الدخول بنجاح'
                    : 'You’re signed in'}
              </h1>
              <p className={styles.successMessage}>
                {infoMessage ||
                  (mode === 'register'
                    ? isAr
                      ? 'تم تجهيز حسابك. ستجد مختاراتك المحفوظة هنا.'
                      : 'Your account is ready. Your saved picks are waiting here.'
                    : isAr
                      ? 'مرحباً بعودتك. نجهّز مختاراتك الآن.'
                      : 'Welcome back. Your curated picks are ready.')}
              </p>
            </div>
          ) : (
            <>
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

          <form
            onSubmit={handleEmailSubmit}
            className={styles.form}
            onFocusCapture={() => setIsFormFocused(true)}
            onBlurCapture={(event) => {
              const nextTarget = event.relatedTarget;
              if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
                setIsFormFocused(false);
              }
            }}
          >
            {mode === 'register' && (
              <div className={styles.nameFields}>
                <div className={styles.fieldGroup}>
                  <label htmlFor={firstNameId} className={styles.fieldLabel}>
                    {isAr ? 'الاسم الأول' : 'First name'}
                  </label>
                  <input
                    id={firstNameId}
                    type="text"
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    placeholder={isAr ? 'اسمك' : 'Your name'}
                    required
                    maxLength={60}
                    autoComplete="given-name"
                    className={`${styles.inputField} ${styles.inputFieldNoEndIcon}`}
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label htmlFor={lastNameId} className={styles.fieldLabel}>
                    {isAr ? 'اسم العائلة' : 'Last name'}
                  </label>
                  <input
                    id={lastNameId}
                    type="text"
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    placeholder={isAr ? 'اسم العائلة' : 'Family name'}
                    required
                    maxLength={60}
                    autoComplete="family-name"
                    className={`${styles.inputField} ${styles.inputFieldNoEndIcon}`}
                  />
                </div>
              </div>
            )}

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
            </>
          )}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
