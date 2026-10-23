'use client';

import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAnalytics, isSupported as isAnalyticsSupported, type Analytics } from 'firebase/analytics';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';
import {
  deleteDoc,
  doc,
  getFirestore,
  setDoc,
  type Firestore,
} from 'firebase/firestore';
import {
  getDatabase,
  ref as dbRef,
  remove as dbRemove,
  set as dbSet,
  type Database,
} from 'firebase/database';

export const SOUFSHOP_FIREBASE_CONFIG = {
  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    'AIzaSyDD5A_yLJwkXlRG3OPbJAaVrBz1XfZGYus',
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    'aqurivostor.firebaseapp.com',
  databaseURL:
    process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ||
    'https://aqurivostor-default-rtdb.firebaseio.com',
  projectId:
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    'aqurivostor',
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    'aqurivostor.firebasestorage.app',
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ||
    '187704789306',
  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ||
    '1:187704789306:web:7a9260f2b470c715d66803',
  measurementId:
    process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ||
    'G-JLZ4LSN2TZ',
};

export function isFirebaseClientConfigured(): boolean {
  return Boolean(
    SOUFSHOP_FIREBASE_CONFIG.apiKey &&
      SOUFSHOP_FIREBASE_CONFIG.authDomain &&
      SOUFSHOP_FIREBASE_CONFIG.projectId &&
      SOUFSHOP_FIREBASE_CONFIG.appId
  );
}

let clientApp: FirebaseApp | null = null;
let clientAnalytics: Analytics | null = null;
let clientFirestore: Firestore | null = null;
let clientDatabase: Database | null = null;

export function getFirebaseClientApp(): FirebaseApp | null {
  if (!isFirebaseClientConfigured()) {
    return null;
  }

  if (!clientApp) {
    const existing = getApps();
    clientApp = existing.length > 0 ? existing[0] : initializeApp(SOUFSHOP_FIREBASE_CONFIG);
  }

  return clientApp;
}

export function getFirebaseClientAuth(): Auth | null {
  const app = getFirebaseClientApp();
  if (!app) return null;
  return getAuth(app);
}

export function getFirebaseClientFirestore(): Firestore | null {
  const app = getFirebaseClientApp();
  if (!app) return null;
  if (!clientFirestore) {
    clientFirestore = getFirestore(app);
  }
  return clientFirestore;
}

function isTursoDataStoreSelected(): boolean {
  return process.env.NEXT_PUBLIC_DATA_STORE === 'turso';
}

export function getFirebaseClientDatabase(): Database | null {
  const app = getFirebaseClientApp();
  if (!app) return null;
  if (!clientDatabase) {
    clientDatabase = getDatabase(app);
  }
  return clientDatabase;
}

const FB_REFRESH_TOKEN_STORAGE_KEY = 'soufshop_fb_rtoken';

export function getFirebaseRefreshToken(): string | null {
  try {
    const auth = getFirebaseClientAuth();
    const rt = auth?.currentUser?.refreshToken;
    if (rt) {
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(FB_REFRESH_TOKEN_STORAGE_KEY, rt);
        } catch {
          // Ignore storage error
        }
      }
      return rt;
    }
    if (typeof window !== 'undefined') {
      return window.localStorage.getItem(FB_REFRESH_TOKEN_STORAGE_KEY);
    }
  } catch {
    // Ignore
  }
  return null;
}

/**
 * Returns a fresh Firebase ID token for the currently signed-in user so server
 * routes in stateless serverless environments (Netlify / Vercel) can authenticate
 * writes against Firebase Realtime Database and Cloud Firestore.
 */
export async function getFreshFirebaseIdToken(): Promise<string | null> {
  try {
    const auth = getFirebaseClientAuth();
    if (auth && !auth.currentUser && typeof auth.authStateReady === 'function') {
      await Promise.race([
        auth.authStateReady(),
        new Promise<void>((resolve) => setTimeout(resolve, 2500)),
      ]);
    }
    const currentUser = auth?.currentUser;
    if (currentUser) {
      if (currentUser.refreshToken && typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(FB_REFRESH_TOKEN_STORAGE_KEY, currentUser.refreshToken);
        } catch {
          // Ignore storage error
        }
      }
      const token = await Promise.race([
        currentUser.getIdToken(),
        new Promise<string | null>((resolve) => setTimeout(() => resolve(null), 4000)),
      ]);
      if (token) return token;
    }

    // Fallback: exchange stored refreshToken via Google SecureToken API if IndexedDB auth is still warming up
    const storedRefreshToken = getFirebaseRefreshToken();
    if (storedRefreshToken && SOUFSHOP_FIREBASE_CONFIG.apiKey) {
      const res = await fetch(
        `https://securetoken.googleapis.com/v1/token?key=${encodeURIComponent(
          SOUFSHOP_FIREBASE_CONFIG.apiKey
        )}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(storedRefreshToken)}`,
        }
      );
      if (res.ok) {
        const data = (await res.json()) as { id_token?: string; refresh_token?: string };
        if (data.refresh_token && typeof window !== 'undefined') {
          try {
            window.localStorage.setItem(FB_REFRESH_TOKEN_STORAGE_KEY, data.refresh_token);
          } catch {
            // Ignore
          }
        }
        if (data.id_token) return data.id_token;
      }
    }

    return null;
  } catch {
    return null;
  }
}

function toClientFirestoreValue(val: unknown): Record<string, unknown> {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    if (Number.isInteger(val)) return { integerValue: String(val) };
    return { doubleValue: val };
  }
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map((item) => toClientFirestoreValue(item)) } };
  }
  if (typeof val === 'object') {
    const fields: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      if (v !== undefined) {
        fields[k] = toClientFirestoreValue(v);
      }
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function fromClientFirestoreValue(val: Record<string, unknown> | undefined): unknown {
  if (!val) return null;
  if ('nullValue' in val) return null;
  if ('booleanValue' in val) return Boolean(val.booleanValue);
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue' in val) return Number(val.doubleValue);
  if ('stringValue' in val) return String(val.stringValue);
  if ('timestampValue' in val) return String(val.timestampValue);
  if ('arrayValue' in val) {
    const arr = (val.arrayValue as { values?: Record<string, unknown>[] })?.values;
    return Array.isArray(arr) ? arr.map((item) => fromClientFirestoreValue(item)) : [];
  }
  if ('mapValue' in val) {
    const fields = (val.mapValue as { fields?: Record<string, Record<string, unknown>> })?.fields;
    if (!fields) return {};
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(fields)) {
      out[k] = fromClientFirestoreValue(v);
    }
    return out;
  }
  return null;
}

/**
 * Synchronizes a document directly from the authenticated admin browser session
 * to both Cloud Firestore and Firebase Realtime Database (`aqurivostor`).
 */
export async function syncAdminDocumentToFirebaseClient(
  collectionName: string,
  docId: string,
  data: object
): Promise<void> {
  if (!docId) return;
  const cleanPayload = JSON.parse(JSON.stringify(data)) as Record<string, unknown>;

  if (isTursoDataStoreSelected()) {
    try {
      const rtdb = getFirebaseClientDatabase();
      if (rtdb) {
        await Promise.race([
          dbSet(dbRef(rtdb, `${collectionName}/${docId}`), cleanPayload),
          new Promise<void>((resolve) => setTimeout(resolve, 5000)),
        ]);
      }
    } catch {
      // Preserve the existing best-effort Realtime Database mirror behavior.
    }
    return;
  }

  const tasks: Promise<unknown>[] = [];

  try {
    const firestore = getFirebaseClientFirestore();
    if (firestore) {
      tasks.push(
        setDoc(doc(firestore, collectionName, docId), cleanPayload).catch(() => undefined)
      );
    } else {
      // Fallback to REST only when SDK firestore is unavailable
      tasks.push(
        (async () => {
          try {
            const idToken = await getFreshFirebaseIdToken();
            if (!idToken) return;
            const fields: Record<string, unknown> = {};
            for (const [k, v] of Object.entries(cleanPayload)) {
              if (v !== undefined) {
                fields[k] = toClientFirestoreValue(v);
              }
            }
            const projectId = SOUFSHOP_FIREBASE_CONFIG.projectId || 'aqurivostor';
            const fsUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${encodeURIComponent(
              collectionName
            )}/${encodeURIComponent(docId)}`;
            await fetch(fsUrl, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${idToken}`,
              },
              body: JSON.stringify({ fields }),
            });
          } catch {
            // Ignore REST fallback error
          }
        })()
      );
    }
  } catch {
    // Ignore client Firestore init error
  }

  try {
    const rtdb = getFirebaseClientDatabase();
    if (rtdb) {
      tasks.push(
        dbSet(dbRef(rtdb, `${collectionName}/${docId}`), cleanPayload).catch(() => undefined)
      );
    }
  } catch {
    // Ignore client RTDB init error
  }

  await Promise.race([
    Promise.all(tasks),
    new Promise<void>((resolve) => setTimeout(resolve, 5000)),
  ]);
}

/**
 * Deletes a document directly from both Cloud Firestore and Firebase Realtime Database.
 */
export async function deleteAdminDocumentFromFirebaseClient(
  collectionName: string,
  docId: string
): Promise<void> {
  if (!docId) return;
  if (isTursoDataStoreSelected()) {
    try {
      const rtdb = getFirebaseClientDatabase();
      if (rtdb) {
        await Promise.race([
          dbRemove(dbRef(rtdb, `${collectionName}/${docId}`)),
          new Promise<void>((resolve) => setTimeout(resolve, 5000)),
        ]);
      }
    } catch {
      // Preserve the existing best-effort Realtime Database mirror behavior.
    }
    return;
  }

  const tasks: Promise<unknown>[] = [];

  try {
    const firestore = getFirebaseClientFirestore();
    if (firestore) {
      tasks.push(deleteDoc(doc(firestore, collectionName, docId)).catch(() => undefined));
    }
  } catch {
    // Ignore
  }

  try {
    const rtdb = getFirebaseClientDatabase();
    if (rtdb) {
      tasks.push(dbRemove(dbRef(rtdb, `${collectionName}/${docId}`)).catch(() => undefined));
    }
  } catch {
    // Ignore
  }

  tasks.push(
    (async () => {
      try {
        const idToken = await getFreshFirebaseIdToken();
        if (!idToken) return;
        const projectId = SOUFSHOP_FIREBASE_CONFIG.projectId || 'aqurivostor';
        const fsUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${encodeURIComponent(
          collectionName
        )}/${encodeURIComponent(docId)}`;
        await fetch(fsUrl, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });
      } catch {
        // Ignore REST delete error
      }
    })()
  );

  await Promise.race([
    Promise.all(tasks),
    new Promise<void>((resolve) => setTimeout(resolve, 5000)),
  ]);
}

/**
 * Reads a single document directly from Cloud Firestore REST API using the admin's fresh ID token.
 */
export async function fetchAdminDocumentFromFirebaseClient<T>(
  collectionName: string,
  docId: string
): Promise<T | null> {
  if (isTursoDataStoreSelected()) return null;

  try {
    const idToken = await getFreshFirebaseIdToken();
    if (!idToken) return null;
    const projectId = SOUFSHOP_FIREBASE_CONFIG.projectId || 'aqurivostor';
    const fsUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${encodeURIComponent(
      collectionName
    )}/${encodeURIComponent(docId)}`;
    const res = await fetch(fsUrl, {
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const docItem = (await res.json()) as {
      name?: string;
      fields?: Record<string, Record<string, unknown>>;
    };
    if (!docItem || !docItem.fields) return null;
    const parsed: Record<string, unknown> = { id: docId };
    for (const [k, v] of Object.entries(docItem.fields)) {
      parsed[k] = fromClientFirestoreValue(v);
    }
    return parsed as T;
  } catch {
    return null;
  }
}

/**
 * Reads a collection directly from Cloud Firestore using the admin's fresh ID token
 * so the admin UI always displays all cloud documents even after a serverless cold start.
 */
export async function fetchAdminCollectionFromFirebaseClient<T extends { id: string }>(
  collectionName: string
): Promise<T[] | null> {
  if (isTursoDataStoreSelected()) return null;

  try {
    const idToken = await getFreshFirebaseIdToken();
    if (!idToken) return null;
    const projectId = SOUFSHOP_FIREBASE_CONFIG.projectId || 'aqurivostor';
    const fsUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${encodeURIComponent(
      collectionName
    )}?pageSize=200`;
    const res = await fetch(fsUrl, {
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      documents?: Array<{ name: string; fields?: Record<string, Record<string, unknown>> }>;
    };
    if (!Array.isArray(data.documents)) return [];
    const items: T[] = [];
    for (const docItem of data.documents) {
      const parts = docItem.name.split('/');
      const docId = parts[parts.length - 1];
      const fields = docItem.fields ?? {};
      const parsed: Record<string, unknown> = { id: docId };
      for (const [k, v] of Object.entries(fields)) {
        parsed[k] = fromClientFirestoreValue(v);
      }
      if (!parsed.id) parsed.id = docId;
      items.push(parsed as T);
    }
    return items;
  } catch {
    return null;
  }
}

export async function getFirebaseClientAnalytics(): Promise<Analytics | null> {
  if (typeof window === 'undefined') return null;
  const app = getFirebaseClientApp();
  if (!app) return null;

  if (clientAnalytics) return clientAnalytics;

  try {
    const supported = await isAnalyticsSupported();
    if (supported) {
      clientAnalytics = getAnalytics(app);
      return clientAnalytics;
    }
  } catch {
    // Ignore analytics initialization errors in restricted browsers
  }
  return null;
}

export function createGoogleProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return provider;
}
