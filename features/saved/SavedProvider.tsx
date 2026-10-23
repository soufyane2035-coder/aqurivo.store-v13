'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import {
  getFirebaseClientAnalytics,
  getFirebaseClientApp,
  getFirebaseClientAuth,
} from '@/lib/firebase-client';
import { useToast } from '@/components/ui/Toast';
import { useI18n } from '@/i18n/I18nProvider';
import { recordVisitorInteraction } from '@/lib/productSearch';

export interface AuthenticatedUser {
  email: string;
  role: string;
}

interface SavedContextValue {
  savedIds: string[];
  recentlyViewedIds: string[];
  isSaved: (productId: string) => boolean;
  toggleSave: (productId: string) => void;
  recordProductView: (productId: string, currentPrice?: number | null) => void;
  priceHistoryMap: Record<string, number>;
  authenticatedEmail: string | null;
  user: AuthenticatedUser | null;
  authLoading: boolean;
  csrfToken: string | null;
  refreshSession: () => Promise<void>;
  signOutUser: () => Promise<void>;
}

const SavedContext = createContext<SavedContextValue | null>(null);

const SAVED_STORAGE_KEY = 'soufshop_saved_ids';
const RECENT_STORAGE_KEY = 'soufshop_recent_ids';
const PRICE_SNAPSHOT_KEY = 'soufshop_price_snapshots';
const SESSION_TOKEN_STORAGE_KEY = 'soufshop_session_token';
const DEFAULT_ADMIN_EMAILS = [
  'aqurivo@gmail.com',
  'contact@aqurivo.store',
  'support@aqurivo.store',
  'soufshop.online@gmail.com',
  'soufyane2035@gmail.com',
  'souftoolsai@gmail.com',
];

export function SavedProvider({ children }: { children: React.ReactNode }) {
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>([]);
  const [priceHistoryMap, setPriceHistoryMap] = useState<Record<string, number>>({});
  const [authenticatedEmail, setAuthenticatedEmail] = useState<string | null>(null);
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const rawSaved = window.localStorage.getItem(SAVED_STORAGE_KEY);
        if (rawSaved) {
          const parsed = JSON.parse(rawSaved);
          if (Array.isArray(parsed)) setSavedIds(parsed.filter((x) => typeof x === 'string'));
        }
        const rawRecent = window.localStorage.getItem(RECENT_STORAGE_KEY);
        if (rawRecent) {
          const parsed = JSON.parse(rawRecent);
          if (Array.isArray(parsed)) setRecentlyViewedIds(parsed.filter((x) => typeof x === 'string'));
        }
        const rawPrice = window.localStorage.getItem(PRICE_SNAPSHOT_KEY);
        if (rawPrice) {
          const parsed = JSON.parse(rawPrice);
          if (parsed && typeof parsed === 'object') setPriceHistoryMap(parsed);
        }
        const rawToken = window.sessionStorage.getItem(SESSION_TOKEN_STORAGE_KEY);
        if (rawToken) setCsrfToken(rawToken);
      } catch {}
    });
  }, []);

  const { showToast } = useToast();
  const { messages } = useI18n();

  const syncWithServer = useCallback(async (localIds: string[], token: string | null) => {
    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers['x-csrf-token'] = token;
      }

      const res = await fetch('/api/user/saved', {
        method: 'GET',
        headers,
      });
      if (!res.ok) return;
      const data = (await res.json()) as { authenticated: boolean; savedIds: string[] };
      if (!data.authenticated) return;

      const merged = Array.from(new Set([...data.savedIds, ...localIds])).slice(0, 100);
      setSavedIds(merged);
      try {
        window.localStorage.setItem(SAVED_STORAGE_KEY, JSON.stringify(merged));
      } catch {
        // Ignore localStorage quota errors
      }

      if (token && merged.length !== data.savedIds.length) {
        await fetch('/api/user/saved', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-csrf-token': token,
          },
          body: JSON.stringify({ savedIds: merged }),
        });
      }
    } catch {
      // Offline or unconfigured backend fallback to local storage
    }
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const auth = getFirebaseClientAuth();
      const currentFirebaseUser = auth?.currentUser;

      if (currentFirebaseUser && currentFirebaseUser.email) {
        const normalizedEmail = currentFirebaseUser.email.trim().toLowerCase();
        const fallbackRole = DEFAULT_ADMIN_EMAILS.includes(normalizedEmail)
          ? 'admin'
          : 'visitor';

        setAuthenticatedEmail(normalizedEmail);
        setUser({ email: normalizedEmail, role: fallbackRole });

        try {
          const idToken = await currentFirebaseUser.getIdToken();
          const res = await fetch('/api/auth/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              idToken,
              refreshToken: currentFirebaseUser.refreshToken,
            }),
          });

          if (res.ok) {
            const data = (await res.json()) as {
              authenticated: boolean;
              user: AuthenticatedUser | null;
              csrfToken: string;
            };
            if (data.csrfToken) {
              setCsrfToken(data.csrfToken);
              try {
                window.sessionStorage.setItem(SESSION_TOKEN_STORAGE_KEY, data.csrfToken);
              } catch {
                // Ignore sessionStorage errors
              }
            }
            if (data.user) {
              setUser(data.user);
              setAuthenticatedEmail(data.user.email);
            }

            let currentLocal: string[] = [];
            try {
              const raw = window.localStorage.getItem(SAVED_STORAGE_KEY);
              if (raw) currentLocal = JSON.parse(raw);
            } catch {
              currentLocal = [];
            }
            await syncWithServer(currentLocal, data.csrfToken);
          }
        } catch {
          // Keep Firebase client user active even if server round-trip fails
        }
        return;
      }

      let storedToken: string | null = null;
      try {
        storedToken = window.sessionStorage.getItem(SESSION_TOKEN_STORAGE_KEY);
      } catch {
        storedToken = null;
      }

      const hasSessionCookie =
        typeof document !== 'undefined' &&
        document.cookie
          .split(';')
          .some((cookie) => cookie.trim().startsWith('souf_session='));

      if (!storedToken && !hasSessionCookie) {
        setCsrfToken(null);
        setAuthenticatedEmail(null);
        setUser(null);
        return;
      }

      const headers: Record<string, string> = {};
      if (storedToken) {
        headers['x-csrf-token'] = storedToken;
      }

      const res = await fetch('/api/auth/session', {
        method: 'GET',
        headers,
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        authenticated: boolean;
        user: AuthenticatedUser | null;
        csrfToken: string;
      };
      setCsrfToken(data.csrfToken || null);
      setAuthenticatedEmail(data.user?.email || null);
      setUser(data.user || null);

      let currentLocal: string[] = [];
      try {
        const raw = window.localStorage.getItem(SAVED_STORAGE_KEY);
        if (raw) currentLocal = JSON.parse(raw);
      } catch {
        currentLocal = [];
      }

      if (data.authenticated) {
        await syncWithServer(currentLocal, data.csrfToken);
      }
    } catch {
      // Ignore network errors on initial check
    }
  }, [syncWithServer]);

  const signOutUser = useCallback(async () => {
    const auth = getFirebaseClientAuth();
    if (auth) {
      try {
        await firebaseSignOut(auth);
      } catch {
        // Ignore client sign-out error
      }
    }

    try {
      window.sessionStorage.removeItem(SESSION_TOKEN_STORAGE_KEY);
    } catch {
      // Ignore storage error
    }

    if (csrfToken) {
      try {
        await fetch('/api/auth/session', {
          method: 'DELETE',
          headers: {
            'x-csrf-token': csrfToken,
          },
        });
      } catch {
        // Ignore network error on sign-out
      }
    }

    setCsrfToken(null);
    setUser(null);
    setAuthenticatedEmail(null);
  }, [csrfToken]);

  useEffect(() => {
    let isMounted = true;
    getFirebaseClientApp();
    void getFirebaseClientAnalytics();

    const auth = getFirebaseClientAuth();
    if (!auth) {
      const initVisitor = async () => {
        await refreshSession();
        if (isMounted) setAuthLoading(false);
      };
      void initVisitor();
      return () => {
        isMounted = false;
      };
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!isMounted) return;
      if (firebaseUser && firebaseUser.email) {
        const normalizedEmail = firebaseUser.email.trim().toLowerCase();
        const role = DEFAULT_ADMIN_EMAILS.includes(normalizedEmail) ? 'admin' : 'visitor';
        setAuthenticatedEmail(normalizedEmail);
        setUser({ email: normalizedEmail, role });
        setAuthLoading(false);
        await refreshSession();
      } else {
        await refreshSession();
        if (isMounted) setAuthLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [refreshSession]);

  const isSaved = useCallback(
    (productId: string) => savedIds.includes(productId),
    [savedIds]
  );

  const toggleSave = useCallback(
    (productId: string) => {
      if (typeof productId !== 'string' || !productId.trim()) return;
      const exists = savedIds.includes(productId);
      const next = exists
        ? savedIds.filter((id) => id !== productId)
        : [productId, ...savedIds].slice(0, 100);

      setSavedIds(next);

      try {
        window.localStorage.setItem(SAVED_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage write errors
      }

      recordVisitorInteraction({ productId, action: exists ? 'unsave' : 'save' });

      showToast(
        exists ? messages.product.removedToast : messages.product.savedToast,
        'info'
      );

      if (authenticatedEmail && csrfToken) {
        void fetch('/api/user/saved', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-csrf-token': csrfToken,
          },
          body: JSON.stringify({ savedIds: next }),
        });
      }
    },
    [
      authenticatedEmail,
      csrfToken,
      messages.product.removedToast,
      messages.product.savedToast,
      savedIds,
      showToast,
    ]
  );

  const recordProductView = useCallback(
    (productId: string, currentPrice?: number | null) => {
      if (typeof productId !== 'string' || !productId.trim()) return;

      recordVisitorInteraction({
        productId,
        priceAmount: currentPrice,
        action: 'view',
      });

      setRecentlyViewedIds((prev) => {
        const next = [productId, ...prev.filter((id) => id !== productId)].slice(0, 12);
        try {
          window.localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(next));
        } catch {
          // Ignore storage write errors
        }
        return next;
      });

      if (typeof currentPrice === 'number' && currentPrice > 0) {
        setPriceHistoryMap((prev) => {
          if (prev[productId] === currentPrice) return prev;
          const next = { ...prev, [productId]: currentPrice };
          try {
            window.localStorage.setItem(PRICE_SNAPSHOT_KEY, JSON.stringify(next));
          } catch {
            // Ignore storage write errors
          }
          return next;
        });
      }
    },
    []
  );

  return (
    <SavedContext.Provider
      value={{
        savedIds,
        recentlyViewedIds,
        isSaved,
        toggleSave,
        recordProductView,
        priceHistoryMap,
        authenticatedEmail,
        user,
        authLoading,
        csrfToken,
        refreshSession,
        signOutUser,
      }}
    >
      {children}
    </SavedContext.Provider>
  );
}

export function useSaved(): SavedContextValue {
  const context = useContext(SavedContext);
  if (!context) {
    throw new Error('useSaved must be used within a SavedProvider');
  }
  return context;
}
