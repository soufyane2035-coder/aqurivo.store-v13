import 'server-only';
import { randomBytes } from 'crypto';
import fs from 'fs';
import path from 'path';
import { cookies, headers } from 'next/headers';
import { loadServerEnv } from './env';
import { tursoFirestoreAdapter } from '../database/turso-firestore-adapter';

const SOUFSHOP_PROJECT_ID =
  process.env.FIREBASE_ADMIN_PROJECT_ID ||
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
  'aqurivostor';
const SOUFSHOP_RTDB_URL =
  process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ||
  'https://aqurivostor-default-rtdb.firebaseio.com';
const SOUFSHOP_FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${SOUFSHOP_PROJECT_ID}/databases/(default)/documents`;

const KNOWN_DB_PATHS = [
  path.join('/tmp', 'aqurivostor-db.json'),
  path.join(process.cwd(), 'server', 'data', 'aqurivostor-data.json'),
];
const TMP_TOKEN_PATH = path.join('/tmp', 'aqurivostor-idtoken.txt');
const TMP_REFRESH_TOKEN_PATH = path.join('/tmp', 'aqurivostor-rtoken.txt');

const CLOUD_FETCH_TIMEOUT_MS = 3500;
const CLOUD_WRITE_TIMEOUT_MS = 8000;
const COLLECTION_CACHE_TTL_MS = 60 * 1000; // 60 seconds (with instant on-demand revalidation on admin changes)
const inFlightRefreshes: Record<
  string,
  Promise<Record<string, Record<string, unknown>> | null> | undefined
> = {};

export function invalidateCollectionCache(collectionName?: string): void {
  if (collectionName) {
    delete collectionCacheTimestamps[collectionName];
    delete inFlightRefreshes[collectionName];
  } else {
    for (const key of Object.keys(collectionCacheTimestamps)) {
      delete collectionCacheTimestamps[key];
    }
    for (const key of Object.keys(inFlightRefreshes)) {
      delete inFlightRefreshes[key];
    }
  }

  try {
    if (collectionName) {
      void import('next/cache')
        .then(({ revalidateTag, revalidatePath }) => {
          revalidateTag(collectionName);
          revalidatePath('/', 'layout');
        })
        .catch(() => undefined);
    }
  } catch {
    // Ignore outside request context
  }
}

export type CloudDocumentData = Record<string, unknown>;

export interface CloudDocSnapshot {
  id: string;
  exists: boolean;
  data: () => CloudDocumentData | undefined;
}

export interface CloudQuerySnapshot {
  empty: boolean;
  docs: Array<{
    id: string;
    exists: boolean;
    data: () => CloudDocumentData;
  }>;
}

export interface CloudDocumentReference {
  readonly id: string;
  readonly collectionPath?: string;
  get: () => Promise<CloudDocSnapshot>;
  set: (data: object, options?: { merge?: boolean }) => Promise<void>;
  update: (data: object) => Promise<void>;
  delete: () => Promise<void>;
}

export interface CloudCollectionQuery {
  doc: (docId?: string) => CloudDocumentReference;
  add: (data: object) => Promise<CloudDocumentReference>;
  where: (field: string, op: string, value: unknown) => CloudCollectionQuery;
  orderBy: (field: string, dir?: 'asc' | 'desc') => CloudCollectionQuery;
  limit: (n: number) => CloudCollectionQuery;
  get: () => Promise<CloudQuerySnapshot>;
}

export interface CloudBatch {
  set: (
    ref: CloudDocumentReference,
    data: object,
    options?: { merge?: boolean }
  ) => void;
  update: (ref: CloudDocumentReference, data: object) => void;
  delete: (ref: CloudDocumentReference) => void;
  commit: () => Promise<void>;
}

export interface CloudFirestoreAdapter {
  collection: (name: string) => CloudCollectionQuery;
  batch: () => CloudBatch;
}

export interface CloudAuthAdapter {
  verifyIdToken: (
    idToken: string,
    checkRevoked?: boolean
  ) => Promise<{ uid: string; email?: string; email_verified?: boolean }>;
  verifySessionCookie: (
    sessionCookie: string,
    checkRevoked?: boolean
  ) => Promise<{ uid: string; email?: string; email_verified?: boolean }>;
  deleteUser: (uid: string) => Promise<void>;
}

type CollectionStore = Record<string, Record<string, Record<string, unknown>>>;

let cachedFirebaseIdToken: string | null = null;
let cachedFirebaseRefreshToken: string | null = null;
let inMemoryStore: CollectionStore | null = null;
const collectionCacheTimestamps: Record<string, number> = {};

function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = CLOUD_FETCH_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, {
    ...init,
    signal: controller.signal,
  }).finally(() => clearTimeout(timer));
}

function isJwtTokenFresh(token: string | null): boolean {
  if (!token) return false;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf8')
    ) as { exp?: number };
    if (!payload.exp) return true;
    // Consider valid if at least 90 seconds remain before expiry
    return payload.exp * 1000 - Date.now() > 90_000;
  } catch {
    return false;
  }
}

export function setServerFirebaseIdToken(idToken: string): void {
  if (!idToken) return;
  cachedFirebaseIdToken = idToken;
  try {
    fs.writeFileSync(TMP_TOKEN_PATH, idToken, 'utf8');
  } catch {
    // Ignore write error in serverless read-only environments
  }
}

export function setServerFirebaseRefreshToken(refreshToken: string): void {
  if (!refreshToken) return;
  cachedFirebaseRefreshToken = refreshToken;
  try {
    fs.writeFileSync(TMP_REFRESH_TOKEN_PATH, refreshToken, 'utf8');
  } catch {
    // Ignore write error in serverless read-only environments
  }
}

async function tryRecoverTokensFromRequestContext(): Promise<void> {
  try {
    const hdrs = await headers();
    const fbIdToken = hdrs.get('x-firebase-id-token')?.trim();
    if (fbIdToken && isJwtTokenFresh(fbIdToken)) {
      setServerFirebaseIdToken(fbIdToken);
    }
    const fbRefreshToken = hdrs.get('x-firebase-refresh-token')?.trim();
    if (fbRefreshToken && fbRefreshToken.length > 16) {
      setServerFirebaseRefreshToken(fbRefreshToken);
    }
    const csrfHeader = hdrs.get('x-csrf-token')?.trim();
    if (csrfHeader && csrfHeader.startsWith('v1.')) {
      const parts = csrfHeader.split('.');
      if (parts.length === 3) {
        const parsed = JSON.parse(
          Buffer.from(parts[1], 'base64url').toString('utf8')
        ) as { rt?: string };
        if (parsed.rt && typeof parsed.rt === 'string') {
          setServerFirebaseRefreshToken(parsed.rt);
        }
      }
    }
  } catch {
    // Outside request context
  }

  try {
    const cookieStore = await cookies();
    for (const cookieName of ['souf_session', 'souf_csrf']) {
      const val = cookieStore.get(cookieName)?.value;
      if (val && val.startsWith('v1.')) {
        const parts = val.split('.');
        if (parts.length === 3) {
          const parsed = JSON.parse(
            Buffer.from(parts[1], 'base64url').toString('utf8')
          ) as { rt?: string };
          if (parsed.rt && typeof parsed.rt === 'string') {
            setServerFirebaseRefreshToken(parsed.rt);
            break;
          }
        }
      }
    }
  } catch {
    // Outside request context
  }
}

export function getServerFirebaseRefreshToken(): string | null {
  if (cachedFirebaseRefreshToken) return cachedFirebaseRefreshToken;
  try {
    if (fs.existsSync(TMP_REFRESH_TOKEN_PATH)) {
      const rt = fs.readFileSync(TMP_REFRESH_TOKEN_PATH, 'utf8').trim();
      if (rt) {
        cachedFirebaseRefreshToken = rt;
        return rt;
      }
    }
  } catch {
    // Ignore read error
  }
  return null;
}

export function getServerFirebaseIdToken(): string | null {
  if (cachedFirebaseIdToken && isJwtTokenFresh(cachedFirebaseIdToken)) {
    return cachedFirebaseIdToken;
  }
  try {
    if (fs.existsSync(TMP_TOKEN_PATH)) {
      const token = fs.readFileSync(TMP_TOKEN_PATH, 'utf8').trim();
      if (token && isJwtTokenFresh(token)) {
        cachedFirebaseIdToken = token;
        return token;
      }
    }
  } catch {
    // Ignore read error
  }
  return null;
}

export async function getValidServerFirebaseIdToken(): Promise<string | null> {
  await tryRecoverTokensFromRequestContext();

  const current = getServerFirebaseIdToken();
  if (current && isJwtTokenFresh(current)) {
    return current;
  }

  const refreshToken = getServerFirebaseRefreshToken();
  const env = loadServerEnv();
  if (refreshToken && env.firebaseClientApiKey) {
    try {
      const res = await fetchWithTimeout(
        `https://securetoken.googleapis.com/v1/token?key=${encodeURIComponent(
          env.firebaseClientApiKey
        )}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`,
          cache: 'no-store',
        },
        4000
      );
      if (res.ok) {
        const data = (await res.json()) as {
          id_token?: string;
          refresh_token?: string;
        };
        if (data.id_token) {
          setServerFirebaseIdToken(data.id_token);
          if (data.refresh_token) {
            setServerFirebaseRefreshToken(data.refresh_token);
          }
          return data.id_token;
        }
      }
    } catch {
      // Fall back if token exchange fails
    }
  }

  return null;
}

function mergeCloudCollectionIntoMirror(
  store: CollectionStore,
  collectionName: string,
  cloudCol: Record<string, Record<string, unknown>>
): void {
  if (!store[collectionName]) {
    store[collectionName] = {};
  }
  const localCol = store[collectionName];
  for (const [docId, cloudDoc] of Object.entries(cloudCol)) {
    const existingLocal = localCol[docId];
    if (existingLocal) {
      const localUpdated = String(existingLocal.updatedAt || existingLocal.createdAt || '');
      const cloudUpdated = String(cloudDoc.updatedAt || cloudDoc.createdAt || '');
      if (localUpdated && cloudUpdated && localUpdated > cloudUpdated) {
        continue;
      }
    }
    localCol[docId] = cloudDoc;
  }
}

function readLocalMirror(): CollectionStore {
  if (inMemoryStore) {
    return inMemoryStore;
  }

  const mergedStore: CollectionStore = {};

  for (const filePath of KNOWN_DB_PATHS) {
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          for (const [colName, colDocs] of Object.entries(parsed as CollectionStore)) {
            if (colDocs && typeof colDocs === 'object') {
              mergeCloudCollectionIntoMirror(mergedStore, colName, colDocs);
            }
          }
        }
      }
    } catch {
      // Continue to next path
    }
  }

  inMemoryStore = mergedStore;
  return inMemoryStore;
}

function writeLocalMirror(store: CollectionStore): void {
  inMemoryStore = store;
  const serialized = JSON.stringify(store, null, 2);

  for (const filePath of KNOWN_DB_PATHS) {
    try {
      fs.writeFileSync(filePath, serialized, 'utf8');
    } catch {
      // Ignore write errors on read-only mounts
    }
  }
}

/**
 * Firestore REST Value serialization & deserialization
 */
interface FirestoreRestValue {
  nullValue?: null;
  booleanValue?: boolean;
  integerValue?: string;
  doubleValue?: number;
  stringValue?: string;
  arrayValue?: { values?: FirestoreRestValue[] };
  mapValue?: { fields?: Record<string, FirestoreRestValue> };
}

function toFirestoreValue(val: unknown): FirestoreRestValue {
  if (val === null || val === undefined) {
    return { nullValue: null };
  }
  if (typeof val === 'boolean') {
    return { booleanValue: val };
  }
  if (typeof val === 'number') {
    if (!Number.isFinite(val)) return { nullValue: null };
    return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  }
  if (typeof val === 'string') {
    return { stringValue: val };
  }
  if (Array.isArray(val)) {
    return {
      arrayValue: {
        values: val.map((item) => toFirestoreValue(item)),
      },
    };
  }
  if (typeof val === 'object') {
    const fields: Record<string, FirestoreRestValue> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      if (v !== undefined) {
        fields[k] = toFirestoreValue(v);
      }
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function fromFirestoreValue(val: FirestoreRestValue | undefined): unknown {
  if (!val) return null;
  if ('nullValue' in val) return null;
  if (typeof val.booleanValue === 'boolean') return val.booleanValue;
  if (typeof val.integerValue === 'string') return Number(val.integerValue);
  if (typeof val.doubleValue === 'number') return val.doubleValue;
  if (typeof val.stringValue === 'string') return val.stringValue;
  if (val.arrayValue) {
    return (val.arrayValue.values || []).map((v) => fromFirestoreValue(v));
  }
  if (val.mapValue) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val.mapValue.fields || {})) {
      out[k] = fromFirestoreValue(v);
    }
    return out;
  }
  return null;
}

function toFirestoreDocument(record: Record<string, unknown>): {
  fields: Record<string, FirestoreRestValue>;
} {
  const fields: Record<string, FirestoreRestValue> = {};
  for (const [k, v] of Object.entries(record)) {
    if (v !== undefined) {
      fields[k] = toFirestoreValue(v);
    }
  }
  return { fields };
}

function fromFirestoreDocument(doc: {
  name?: string;
  fields?: Record<string, FirestoreRestValue>;
}): { id: string; data: Record<string, unknown> } | null {
  if (!doc || !doc.fields) return null;
  const parts = (doc.name || '').split('/');
  const id = parts[parts.length - 1] || '';
  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(doc.fields)) {
    data[k] = fromFirestoreValue(v);
  }
  if (id && !data.id) {
    data.id = id;
  }
  return { id, data };
}

/**
 * Cloud sync helpers (Cloud Firestore REST + Realtime Database)
 */
async function writeDocToSoufshopCloud(
  collectionName: string,
  docId: string,
  record: Record<string, unknown>
): Promise<{ firestoreOk: boolean; rtdbOk: boolean }> {
  let token = await getValidServerFirebaseIdToken();
  const env = loadServerEnv();
  collectionCacheTimestamps[collectionName] = Date.now();

  let rtdbOk = false;
  let firestoreOk = false;

  // 1. Write to Cloud Firestore REST (`aqurivostor`)
  const firestoreUrl = `${SOUFSHOP_FIRESTORE_BASE_URL}/${encodeURIComponent(collectionName)}/${encodeURIComponent(docId)}?key=${encodeURIComponent(env.firebaseClientApiKey)}`;
  const firestoreBody = JSON.stringify(toFirestoreDocument(record));

  const tryFirestorePatch = async (
    bearerToken: string | null
  ): Promise<{ ok: boolean; status: number }> => {
    const hdrs: Record<string, string> = { 'Content-Type': 'application/json' };
    if (bearerToken) {
      hdrs.Authorization = `Bearer ${bearerToken}`;
    }
    try {
      const res = await fetchWithTimeout(
        firestoreUrl,
        {
          method: 'PATCH',
          headers: hdrs,
          body: firestoreBody,
          cache: 'no-store',
        },
        CLOUD_WRITE_TIMEOUT_MS
      );
      return { ok: res.ok, status: res.status };
    } catch {
      return { ok: false, status: 0 };
    }
  };

  if (token) {
    const firstAttempt = await tryFirestorePatch(token);
    if (firstAttempt.ok) {
      firestoreOk = true;
    } else if (firstAttempt.status === 401 || firstAttempt.status === 403) {
      cachedFirebaseIdToken = null;
      const refreshedToken = await getValidServerFirebaseIdToken();
      if (refreshedToken && refreshedToken !== token) {
        token = refreshedToken;
        const retryAttempt = await tryFirestorePatch(token);
        if (retryAttempt.ok) {
          firestoreOk = true;
        }
      }
    }
  }

  if (!firestoreOk) {
    const fallbackAttempt = await tryFirestorePatch(null);
    if (fallbackAttempt.ok) {
      firestoreOk = true;
    }
  }

  // 2. Write to Firebase Realtime Database (only for store data, skipped for high-frequency clicks)
  if (collectionName !== 'clicks') {
    const rtdbBase = `${SOUFSHOP_RTDB_URL}/${encodeURIComponent(collectionName)}/${encodeURIComponent(docId)}.json`;
    const rtdbUrls = token
      ? [`${rtdbBase}?auth=${encodeURIComponent(token)}`, rtdbBase]
      : [rtdbBase];

    for (const url of rtdbUrls) {
      try {
        const res = await fetchWithTimeout(
          url,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(record),
            cache: 'no-store',
          },
          CLOUD_WRITE_TIMEOUT_MS
        );
        if (res.ok) {
          rtdbOk = true;
          break;
        }
      } catch {
        // Try next endpoint
      }
    }
  }

  return { firestoreOk, rtdbOk };
}

async function deleteDocFromSoufshopCloud(
  collectionName: string,
  docId: string
): Promise<void> {
  const token = await getValidServerFirebaseIdToken();
  const env = loadServerEnv();
  collectionCacheTimestamps[collectionName] = Date.now();

  // 1. Delete from Realtime Database
  const rtdbBase = `${SOUFSHOP_RTDB_URL}/${encodeURIComponent(collectionName)}/${encodeURIComponent(docId)}.json`;
  const rtdbUrls = token
    ? [`${rtdbBase}?auth=${encodeURIComponent(token)}`, rtdbBase]
    : [rtdbBase];

  for (const url of rtdbUrls) {
    try {
      const res = await fetchWithTimeout(
        url,
        { method: 'DELETE', cache: 'no-store' },
        CLOUD_WRITE_TIMEOUT_MS
      );
      if (res.ok) break;
    } catch {
      // Ignore
    }
  }

  // 2. Delete from Cloud Firestore REST
  const firestoreUrl = `${SOUFSHOP_FIRESTORE_BASE_URL}/${encodeURIComponent(collectionName)}/${encodeURIComponent(docId)}?key=${encodeURIComponent(env.firebaseClientApiKey)}`;
  const headerAttempts: Array<Record<string, string>> = token
    ? [{ Authorization: `Bearer ${token}` }, {}]
    : [{}];

  for (const hdrs of headerAttempts) {
    try {
      const res = await fetchWithTimeout(
        firestoreUrl,
        {
          method: 'DELETE',
          headers: hdrs,
          cache: 'no-store',
        },
        CLOUD_WRITE_TIMEOUT_MS
      );
      if (res.ok) break;
    } catch {
      // Ignore
    }
  }
}

/**
 * Public structuredQuery filters matching firestore.rules so unauthenticated
 * serverless instances can still read published documents from Cloud Firestore.
 */
const PUBLIC_FIRESTORE_QUERY_FILTERS: Record<
  string,
  { fieldPath: string; value: FirestoreRestValue }
> = {
  products: { fieldPath: 'status', value: { stringValue: 'published' } },
  articles: { fieldPath: 'status', value: { stringValue: 'published' } },
  categories: { fieldPath: 'isActive', value: { booleanValue: true } },
  sources: { fieldPath: 'isActive', value: { booleanValue: true } },
  testimonials: { fieldPath: 'approved', value: { booleanValue: true } },
  reviews: { fieldPath: 'approved', value: { booleanValue: true } },
};

async function fetchFirestorePublicFilteredCollection(
  collectionName: string,
  apiKey: string
): Promise<Record<string, Record<string, unknown>> | null> {
  if (collectionName === 'settings') {
    try {
      const res = await fetchWithTimeout(
        `${SOUFSHOP_FIRESTORE_BASE_URL}/settings/public?key=${encodeURIComponent(apiKey)}`,
        { method: 'GET', next: { revalidate: 300, tags: ['settings'] } }
      );
      if (res.ok) {
        const rawDoc = (await res.json()) as {
          name?: string;
          fields?: Record<string, FirestoreRestValue>;
        };
        const parsed = fromFirestoreDocument(rawDoc);
        if (parsed && parsed.id) {
          return { [parsed.id]: parsed.data };
        }
      }
    } catch {
      // Ignore
    }
    return null;
  }

  const ruleFilter = PUBLIC_FIRESTORE_QUERY_FILTERS[collectionName];
  if (!ruleFilter) return null;

  try {
    const runQueryUrl = `${SOUFSHOP_FIRESTORE_BASE_URL}:runQuery?key=${encodeURIComponent(apiKey)}`;
    const res = await fetchWithTimeout(runQueryUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: collectionName }],
          where: {
            fieldFilter: {
              field: { fieldPath: ruleFilter.fieldPath },
              op: 'EQUAL',
              value: ruleFilter.value,
            },
          },
          limit: 200,
        },
      }),
      next: { revalidate: 60, tags: [collectionName] },
    });

    if (res.ok) {
      const rows = (await res.json()) as Array<{
        document?: {
          name?: string;
          fields?: Record<string, FirestoreRestValue>;
        };
      }>;
      if (Array.isArray(rows)) {
        const map: Record<string, Record<string, unknown>> = {};
        for (const row of rows) {
          if (row.document) {
            const parsed = fromFirestoreDocument(row.document);
            if (parsed && parsed.id) {
              map[parsed.id] = parsed.data;
            }
          }
        }
        return map;
      }
    }
  } catch {
    // Ignore
  }

  return null;
}

async function fetchSingleDocFromFirestoreCloud(
  collectionName: string,
  docId: string
): Promise<Record<string, unknown> | null> {
  const token = await getValidServerFirebaseIdToken();
  const env = loadServerEnv();
  const firestoreUrl = `${SOUFSHOP_FIRESTORE_BASE_URL}/${encodeURIComponent(
    collectionName
  )}/${encodeURIComponent(docId)}?key=${encodeURIComponent(env.firebaseClientApiKey)}`;

  const headerAttempts: Array<Record<string, string>> = token
    ? [{ Authorization: `Bearer ${token}` }, {}]
    : [{}];

  for (const hdrs of headerAttempts) {
    try {
      const res = await fetchWithTimeout(firestoreUrl, {
        method: 'GET',
        headers: hdrs,
        next: { revalidate: 86400, tags: [`${collectionName}_${docId}`, collectionName] },
      });
      if (res.ok) {
        const rawDoc = (await res.json()) as {
          name?: string;
          fields?: Record<string, FirestoreRestValue>;
        };
        const parsed = fromFirestoreDocument(rawDoc);
        if (parsed && parsed.id) {
          return parsed.data;
        }
      }
    } catch {
      // Try next header
    }
  }
  return null;
}

async function performCloudCollectionFetch(
  collectionName: string
): Promise<Record<string, Record<string, unknown>> | null> {
  let token = await getValidServerFirebaseIdToken();
  const env = loadServerEnv();
  const combinedMap: Record<string, Record<string, unknown>> = {};
  let anySuccess = false;

  // 1. Primary Source of Truth: Cloud Firestore REST API (full collection list if admin token available)
  const firestoreUrl = `${SOUFSHOP_FIRESTORE_BASE_URL}/${encodeURIComponent(collectionName)}?pageSize=200&key=${encodeURIComponent(env.firebaseClientApiKey)}`;

  if (token) {
    try {
      let res = await fetchWithTimeout(firestoreUrl, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
        next: { revalidate: 86400, tags: [collectionName] },
      });

      if (res.status === 401 || res.status === 403) {
        cachedFirebaseIdToken = null;
        const refreshed = await getValidServerFirebaseIdToken();
        if (refreshed && refreshed !== token) {
          token = refreshed;
          res = await fetchWithTimeout(firestoreUrl, {
            method: 'GET',
            headers: { Authorization: `Bearer ${token}` },
            next: { revalidate: 86400, tags: [collectionName] },
          });
        }
      }

      if (res.ok) {
        const payload = (await res.json()) as {
          documents?: Array<{
            name?: string;
            fields?: Record<string, FirestoreRestValue>;
          }>;
        };
        if (Array.isArray(payload.documents)) {
          for (const rawDoc of payload.documents) {
            const parsed = fromFirestoreDocument(rawDoc);
            if (parsed && parsed.id) {
              combinedMap[parsed.id] = parsed.data;
            }
          }
        }
        anySuccess = true;
      }
    } catch {
      // Fall through to public structuredQuery
    }
  }

  // 2. Public Firestore structuredQuery fallback (succeeds even without admin token!)
  if (!anySuccess) {
    const publicFirestoreMap = await fetchFirestorePublicFilteredCollection(
      collectionName,
      env.firebaseClientApiKey
    );
    if (publicFirestoreMap !== null) {
      for (const [docId, docData] of Object.entries(publicFirestoreMap)) {
        combinedMap[docId] = docData;
      }
      anySuccess = true;
    }
  }

  // 3. Only fallback to Firebase Realtime Database if Firestore returned nothing
  if (!anySuccess) {
    const rtdbBase = `${SOUFSHOP_RTDB_URL}/${encodeURIComponent(collectionName)}.json`;
    const rtdbUrls = token
      ? [`${rtdbBase}?auth=${encodeURIComponent(token)}`, rtdbBase]
      : [rtdbBase];

    for (const url of rtdbUrls) {
      try {
        const res = await fetchWithTimeout(url, {
          method: 'GET',
          next: { revalidate: 300, tags: [collectionName] },
        });
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data === 'object' && !('error' in data)) {
            for (const [docId, rtdbDoc] of Object.entries(
              data as Record<string, Record<string, unknown>>
            )) {
              if (!rtdbDoc || typeof rtdbDoc !== 'object') continue;
              const existing = combinedMap[docId];
              if (!existing) {
                combinedMap[docId] = rtdbDoc;
              } else {
                const existingUpdated = String(existing.updatedAt || existing.createdAt || '');
                const rtdbUpdated = String(rtdbDoc.updatedAt || rtdbDoc.createdAt || '');
                if (rtdbUpdated && existingUpdated && rtdbUpdated > existingUpdated) {
                  combinedMap[docId] = rtdbDoc;
                }
              }
            }
            anySuccess = true;
          }
          break;
        }
      } catch {
        // Fall through
      }
    }
  }

  if (anySuccess) {
    collectionCacheTimestamps[collectionName] = Date.now();
    return combinedMap;
  }

  return null;
}

async function fetchCollectionFromSoufshopCloud(
  collectionName: string
): Promise<Record<string, Record<string, unknown>> | null> {
  const now = Date.now();
  const lastFetched = collectionCacheTimestamps[collectionName] || 0;
  const store = readLocalMirror();
  const cachedCollection = store[collectionName];

  // If local store has verified documents and is within TTL, return immediately
  if (
    cachedCollection &&
    Object.keys(cachedCollection).length > 0 &&
    lastFetched > 0 &&
    now - lastFetched < COLLECTION_CACHE_TTL_MS
  ) {
    return cachedCollection;
  }

  // Deduplicate concurrent cloud refreshes and AWAIT the result so cold starts
  // on serverless instances never return stale build-time JSON data
  if (!inFlightRefreshes[collectionName]) {
    inFlightRefreshes[collectionName] = performCloudCollectionFetch(collectionName)
      .then((cloudCol) => {
        if (cloudCol !== null && Object.keys(cloudCol).length > 0) {
          mergeCloudCollectionIntoMirror(store, collectionName, cloudCol);
          writeLocalMirror(store);
        }
        return store[collectionName] || cloudCol;
      })
      .catch(() => store[collectionName] || null)
      .finally(() => {
        delete inFlightRefreshes[collectionName];
      });
  }

  return inFlightRefreshes[collectionName]!;
}

export class CloudSyncedDocRef {
  public readonly id: string;
  private readonly collectionName: string;

  constructor(collectionName: string, docId?: string) {
    this.collectionName = collectionName;
    this.id = docId || randomBytes(10).toString('hex');
  }

  get collectionPath(): string {
    return this.collectionName;
  }

  async get(): Promise<CloudDocSnapshot> {
    const store = readLocalMirror();
    const col = store[this.collectionName] || {};
    let record = col[this.id];

    // Check memory mirror first; if not present, fetch ONLY this specific document directly from Firestore
    if (!record) {
      const directDoc = await fetchSingleDocFromFirestoreCloud(
        this.collectionName,
        this.id
      );
      if (directDoc) {
        if (!store[this.collectionName]) {
          store[this.collectionName] = {};
        }
        store[this.collectionName][this.id] = directDoc;
        inMemoryStore = store;
        record = directDoc;
      }
    }

    return {
      id: this.id,
      exists: Boolean(record),
      data: () => (record ? { ...record } : undefined),
    };
  }

  async set(data: object, options?: { merge?: boolean }) {
    const record = data as Record<string, unknown>;
    const store = readLocalMirror();
    if (!store[this.collectionName]) {
      store[this.collectionName] = {};
    }
    const existing = store[this.collectionName][this.id] || {};
    const merged = options?.merge
      ? { ...existing, ...record, id: this.id }
      : { ...record, id: this.id };
    store[this.collectionName][this.id] = merged;

    if (this.collectionName === 'clicks') {
      // For high-frequency clicks: update memory and send to cloud asynchronously without blocking or disk writes
      void writeDocToSoufshopCloud(this.collectionName, this.id, merged);
      return;
    }

    writeLocalMirror(store);
    invalidateCollectionCache(this.collectionName);
    await writeDocToSoufshopCloud(this.collectionName, this.id, merged);
  }

  async update(data: object) {
    const record = data as Record<string, unknown>;
    const store = readLocalMirror();
    if (!store[this.collectionName]) {
      store[this.collectionName] = {};
    }
    const existing = store[this.collectionName][this.id] || {};
    const merged = { ...existing, ...record, id: this.id };
    store[this.collectionName][this.id] = merged;

    if (this.collectionName === 'clicks') {
      void writeDocToSoufshopCloud(this.collectionName, this.id, merged);
      return;
    }

    writeLocalMirror(store);
    invalidateCollectionCache(this.collectionName);
    await writeDocToSoufshopCloud(this.collectionName, this.id, merged);
  }

  async delete() {
    const store = readLocalMirror();
    if (store[this.collectionName] && store[this.collectionName][this.id]) {
      delete store[this.collectionName][this.id];
      writeLocalMirror(store);
    }
    invalidateCollectionCache(this.collectionName);
    await deleteDocFromSoufshopCloud(this.collectionName, this.id);
  }
}

export async function purgeCollectionFromMirror(
  collectionName: string
): Promise<number> {
  const store = readLocalMirror();
  const existingDocs = store[collectionName]
    ? Object.keys(store[collectionName])
    : [];
  const count = existingDocs.length;

  store[collectionName] = {};
  writeLocalMirror(store);
  collectionCacheTimestamps[collectionName] = Date.now();

  for (const docId of existingDocs) {
    void deleteDocFromSoufshopCloud(collectionName, docId);
  }

  return count;
}

interface FilterClause {
  field: string;
  op: string;
  value: unknown;
}

export class CloudSyncedCollectionQuery {
  private readonly collectionName: string;
  private readonly filters: FilterClause[];
  private orderField: string | null;
  private orderDir: 'asc' | 'desc';
  private maxLimit: number | null;

  constructor(
    collectionName: string,
    filters: FilterClause[] = [],
    orderField: string | null = null,
    orderDir: 'asc' | 'desc' = 'asc',
    maxLimit: number | null = null
  ) {
    this.collectionName = collectionName;
    this.filters = filters;
    this.orderField = orderField;
    this.orderDir = orderDir;
    this.maxLimit = maxLimit;
  }

  doc(docId?: string) {
    return new CloudSyncedDocRef(this.collectionName, docId);
  }

  async add(data: object) {
    const ref = new CloudSyncedDocRef(this.collectionName);
    await ref.set(data);
    return ref;
  }

  where(field: string, op: string, value: unknown) {
    return new CloudSyncedCollectionQuery(
      this.collectionName,
      [...this.filters, { field, op, value }],
      this.orderField,
      this.orderDir,
      this.maxLimit
    );
  }

  orderBy(field: string, dir: 'asc' | 'desc' = 'asc') {
    return new CloudSyncedCollectionQuery(
      this.collectionName,
      this.filters,
      field,
      dir,
      this.maxLimit
    );
  }

  limit(n: number) {
    return new CloudSyncedCollectionQuery(
      this.collectionName,
      this.filters,
      this.orderField,
      this.orderDir,
      n
    );
  }

  async get(): Promise<CloudQuerySnapshot> {
    const store = readLocalMirror();
    const cloudCol = await fetchCollectionFromSoufshopCloud(this.collectionName);
    if (cloudCol !== null && Object.keys(cloudCol).length > 0) {
      mergeCloudCollectionIntoMirror(store, this.collectionName, cloudCol);
    }

    const col = store[this.collectionName] || {};
    let entries = Object.entries(col).map(([id, data]) => ({
      id,
      exists: true,
      data: () => ({ ...data }),
      _raw: data,
    }));

    for (const f of this.filters) {
      if (f.op === '==') {
        entries = entries.filter((item) => item._raw[f.field] === f.value);
      }
    }

    if (this.orderField) {
      const field = this.orderField;
      const dir = this.orderDir;
      entries.sort((a, b) => {
        const va = String(a._raw[field] ?? '');
        const vb = String(b._raw[field] ?? '');
        return dir === 'desc' ? vb.localeCompare(va) : va.localeCompare(vb);
      });
    }

    if (this.maxLimit !== null && this.maxLimit > 0) {
      entries = entries.slice(0, this.maxLimit);
    }

    return {
      empty: entries.length === 0,
      docs: entries,
    };
  }
}

const soufshopCloudAdapter: CloudFirestoreAdapter = {
  collection(name: string) {
    return new CloudSyncedCollectionQuery(name);
  },
  batch() {
    const ops: Array<() => Promise<void>> = [];
    return {
      set(
        ref: CloudDocumentReference,
        data: object,
        options?: { merge?: boolean }
      ) {
        ops.push(() => ref.set(data, options));
      },
      update(ref: CloudDocumentReference, data: object) {
        ops.push(() => ref.update(data));
      },
      delete(ref: CloudDocumentReference) {
        ops.push(() => ref.delete());
      },
      async commit() {
        for (const op of ops) {
          await op();
        }
      },
    };
  },
};

export function getCloudFallbackDb(): CloudFirestoreAdapter {
  return soufshopCloudAdapter;
}

export function getAdminDb(): CloudFirestoreAdapter {
  const serverUsesTurso = process.env.DATA_STORE === 'turso';
  const clientUsesTurso = process.env.NEXT_PUBLIC_DATA_STORE === 'turso';
  if (serverUsesTurso !== clientUsesTurso) {
    throw new Error(
      'DATA_STORE and NEXT_PUBLIC_DATA_STORE must both be set to "turso" to enable Turso.'
    );
  }
  if (serverUsesTurso) {
    return tursoFirestoreAdapter;
  }
  return soufshopCloudAdapter;
}

const cloudAuthAdapter: CloudAuthAdapter = {
  async verifyIdToken(idToken: string) {
    const env = loadServerEnv();
    const apiKey = env.firebaseClientApiKey;
    if (!apiKey || !idToken) {
      throw new Error('Missing API key or token for verification');
    }
    const res = await fetchWithTimeout(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
        cache: 'no-store',
      },
      5000
    );
    if (!res.ok) {
      throw new Error('Failed to verify token with identity provider');
    }
    const data = (await res.json()) as {
      users?: Array<{
        localId: string;
        email?: string;
        emailVerified?: boolean;
      }>;
    };
    const user = data.users?.[0];
    if (!user || !user.localId) {
      throw new Error('User not found in verified token response');
    }
    return {
      uid: user.localId,
      email: user.email,
      email_verified: Boolean(user.emailVerified),
    };
  },
  async verifySessionCookie(_sessionCookie: string) {
    throw new Error('Session cookie verification not supported in REST mode');
  },
  async deleteUser(_uid: string) {
    // no-op
  },
};

export function getAdminAuth(): CloudAuthAdapter | null {
  return cloudAuthAdapter;
}
