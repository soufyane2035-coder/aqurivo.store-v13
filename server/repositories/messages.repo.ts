import 'server-only';
import fs from 'fs';
import path from 'path';
import { getAdminDb } from '@/server/config/firebase-admin';
import type { ContactMessage } from '@/types';
import { validateContactInput } from '@/server/validators';

const COLLECTION = 'messages';
const FALLBACK_FILE = path.join(process.cwd(), 'server', 'data', 'messages-fallback.json');

function ensureFallbackDir() {
  try {
    const dir = path.dirname(FALLBACK_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch {
    // Ignore
  }
}

function readFallbackMessages(): ContactMessage[] {
  try {
    ensureFallbackDir();
    if (fs.existsSync(FALLBACK_FILE)) {
      const raw = fs.readFileSync(FALLBACK_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed as ContactMessage[];
      }
    }
  } catch {
    // Ignore
  }
  return [];
}

function writeFallbackMessages(messages: ContactMessage[]): void {
  try {
    ensureFallbackDir();
    fs.writeFileSync(FALLBACK_FILE, JSON.stringify(messages, null, 2), 'utf-8');
  } catch {
    // Ignore
  }
}

export async function createContactMessage(input: unknown): Promise<ContactMessage> {
  const validated = validateContactInput(input);
  const now = new Date().toISOString();
  const id = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const record: ContactMessage = {
    id,
    ...validated,
    isRead: false,
    createdAt: now,
  };

  // 1. Save to local fallback file immediately
  const localList = readFallbackMessages();
  localList.unshift(record);
  writeFallbackMessages(localList);

  // 2. Try saving to Firestore if configured
  const db = getAdminDb();
  if (db) {
    try {
      const docRef = db.collection(COLLECTION).doc(id);
      await docRef.set({
        ...validated,
        isRead: false,
        createdAt: now,
      });
    } catch (err) {
      console.warn('[AQURIVO Messages Repo] Firestore write failed, stored in local fallback:', err);
    }
  }

  return record;
}

export async function listMessagesAdmin(): Promise<ContactMessage[]> {
  const localList = readFallbackMessages();
  const db = getAdminDb();

  if (!db) {
    return localList.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  try {
    const snap = await db.collection(COLLECTION).orderBy('createdAt', 'desc').limit(200).get();
    const firestoreList: ContactMessage[] = snap.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<ContactMessage, 'id'>),
    }));

    // Merge and deduplicate by id
    const map = new Map<string, ContactMessage>();
    for (const item of [...firestoreList, ...localList]) {
      if (item && item.id && !map.has(item.id)) {
        map.set(item.id, item);
      }
    }

    const merged = Array.from(map.values());
    merged.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return merged;
  } catch {
    return localList.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

export async function markMessageReadAdmin(messageId: string, isRead = true): Promise<void> {
  // Update local fallback
  const localList = readFallbackMessages();
  const updatedLocal = localList.map((m) => (m.id === messageId ? { ...m, isRead } : m));
  writeFallbackMessages(updatedLocal);

  const db = getAdminDb();
  if (db) {
    try {
      await db.collection(COLLECTION).doc(messageId).update({ isRead });
    } catch {
      // Ignore if doc only exists in local fallback
    }
  }
}

export async function deleteMessageAdmin(messageId: string): Promise<void> {
  // Delete from local fallback
  const localList = readFallbackMessages();
  const filteredLocal = localList.filter((m) => m.id !== messageId);
  writeFallbackMessages(filteredLocal);

  const db = getAdminDb();
  if (db) {
    try {
      await db.collection(COLLECTION).doc(messageId).delete();
    } catch {
      // Ignore
    }
  }
}
