import 'server-only';
import { getAdminAuth, getAdminDb } from '@/server/config/firebase-admin';
import { loadServerEnv } from '@/server/config/env';
import { sanitizePlainText } from '@/server/validators';

const COLLECTION = 'users';

export interface UserProfileRecord {
  uid: string;
  email: string;
  role: 'admin' | 'visitor';
  savedProductIds: string[];
  createdAt: string;
  lastLoginAt: string;
}

export async function syncUserProfileOnLogin(params: {
  uid: string;
  email: string;
  emailVerified: boolean;
}): Promise<UserProfileRecord> {
  const db = getAdminDb();
  const env = loadServerEnv();
  const normalizedEmail = params.email.trim().toLowerCase();
  const isAdmin = env.adminEmails.includes(normalizedEmail);
  const role: 'admin' | 'visitor' = isAdmin ? 'admin' : 'visitor';
  const now = new Date().toISOString();

  if (!db) {
    return {
      uid: params.uid,
      email: normalizedEmail,
      role,
      savedProductIds: [],
      createdAt: now,
      lastLoginAt: now,
    };
  }

  const docRef = db.collection(COLLECTION).doc(params.uid);
  const existing = await docRef.get();
  const existingData = existing.exists ? (existing.data() as Partial<UserProfileRecord>) : null;

  const record: UserProfileRecord = {
    uid: params.uid,
    email: normalizedEmail,
    role,
    savedProductIds: Array.isArray(existingData?.savedProductIds)
      ? existingData.savedProductIds.slice(0, 100)
      : [],
    createdAt: existingData?.createdAt || now,
    lastLoginAt: now,
  };

  await docRef.set(record, { merge: true });
  return record;
}

export async function getUserSavedIds(uid: string): Promise<string[]> {
  const db = getAdminDb();
  if (!db) return [];

  const doc = await db.collection(COLLECTION).doc(uid).get();
  if (!doc.exists) return [];
  const data = doc.data() as Partial<UserProfileRecord>;
  return Array.isArray(data.savedProductIds) ? data.savedProductIds : [];
}

export async function updateUserSavedIds(uid: string, productIds: unknown): Promise<string[]> {
  const db = getAdminDb();
  if (!db) return [];

  const sanitizedIds = Array.isArray(productIds)
    ? Array.from(
        new Set(
          productIds
            .slice(0, 100)
            .map((id) => sanitizePlainText(id, 128))
            .filter(Boolean)
        )
      )
    : [];

  await db.collection(COLLECTION).doc(uid).set(
    {
      savedProductIds: sanitizedIds,
      lastLoginAt: new Date().toISOString(),
    },
    { merge: true }
  );

  return sanitizedIds;
}

export async function deleteUserAccount(uid: string): Promise<void> {
  const db = getAdminDb();
  const auth = getAdminAuth();

  if (db) {
    await db.collection(COLLECTION).doc(uid).delete();
  }
  if (auth) {
    try {
      await auth.deleteUser(uid);
    } catch {
      // User may already be removed from Auth
    }
  }
}

export async function listUsersAdmin(): Promise<UserProfileRecord[]> {
  const db = getAdminDb();
  if (!db) return [];

  const snap = await db.collection(COLLECTION).orderBy('lastLoginAt', 'desc').limit(200).get();
  return snap.docs.map((doc) => doc.data() as unknown as UserProfileRecord);
}
