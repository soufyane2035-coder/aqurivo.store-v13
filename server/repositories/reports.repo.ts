import 'server-only';
import fs from 'fs';
import path from 'path';
import { getAdminDb } from '@/server/config/firebase-admin';
import { sanitizeEmail, sanitizePlainText, ValidationError } from '@/server/validators';
import type { Locale, ReportReason, ReportRecord, ReportStatus, ReportType } from '@/types';

const COLLECTION = 'reports';
const FALLBACK_FILE = path.join(process.cwd(), 'server', 'data', 'reports-fallback.json');
const AQURIVO_DATA_FILE = path.join(process.cwd(), 'server', 'data', 'aqurivostor-data.json');
const TMP_DATA_FILE = path.join('/tmp', 'aqurivostor-db.json');

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

function readFallbackReports(): ReportRecord[] {
  try {
    ensureFallbackDir();
    if (fs.existsSync(FALLBACK_FILE)) {
      const raw = fs.readFileSync(FALLBACK_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed as ReportRecord[];
      }
    }
  } catch {
    // Ignore
  }
  return [];
}

function writeFallbackReports(reports: ReportRecord[]): void {
  try {
    ensureFallbackDir();
    fs.writeFileSync(FALLBACK_FILE, JSON.stringify(reports, null, 2), 'utf-8');
  } catch {
    // Ignore
  }
}

function syncReportToLocalStore(record: ReportRecord): void {
  // 1. Write to reports-fallback.json
  const list = readFallbackReports();
  const exists = list.some((r) => r.id === record.id);
  if (!exists) {
    list.unshift(record);
  } else {
    const idx = list.findIndex((r) => r.id === record.id);
    if (idx !== -1) list[idx] = record;
  }
  writeFallbackReports(list);

  // 2. Also write directly to aqurivostor-data.json and /tmp mirror
  for (const filePath of [AQURIVO_DATA_FILE, TMP_DATA_FILE]) {
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(raw) as Record<string, any>;
        if (parsed && typeof parsed === 'object') {
          if (!parsed.reports || typeof parsed.reports !== 'object') {
            parsed.reports = {};
          }
          parsed.reports[record.id] = { ...record };
          fs.writeFileSync(filePath, JSON.stringify(parsed, null, 2), 'utf-8');
        }
      }
    } catch {
      // Ignore
    }
  }
}

const VALID_PRODUCT_REASONS: ReportReason[] = [
  'broken_link',
  'price_mismatch',
  'wrong_info',
  'unavailable',
  'other',
];

const REASON_ALIASES: Record<string, ReportReason> = {
  broken_link: 'broken_link',
  'الرابط لا يعمل': 'broken_link',
  'link is not working': 'broken_link',
  price_mismatch: 'price_mismatch',
  'السعر مختلف': 'price_mismatch',
  'price is different': 'price_mismatch',
  wrong_info: 'wrong_info',
  'معلومات خاطئة': 'wrong_info',
  'incorrect information': 'wrong_info',
  unavailable: 'unavailable',
  'المنتج غير متوفر': 'unavailable',
  'غير متوفر': 'unavailable',
  'product is unavailable': 'unavailable',
  other: 'other',
  'أخرى': 'other',
  order_issue: 'order_issue',
  'مشكلة في طلبي': 'order_issue',
  'issue with my order': 'order_issue',
};

export function normalizeReportReason(rawReason: unknown, type: ReportType): ReportReason {
  if (type === 'order_issue') {
    return 'order_issue';
  }
  const key = typeof rawReason === 'string' ? rawReason.trim().toLowerCase() : '';
  const mapped = REASON_ALIASES[key] || REASON_ALIASES[typeof rawReason === 'string' ? rawReason.trim() : ''];
  if (mapped && VALID_PRODUCT_REASONS.includes(mapped)) {
    return mapped;
  }
  throw new ValidationError('يرجى اختيار نوع المشكلة بشكل صحيح.', 'reason');
}

export interface CreateReportInput {
  type?: unknown;
  reason?: unknown;
  productSlug?: unknown;
  productName?: unknown;
  email?: unknown;
  message?: unknown;
  orderRef?: unknown;
  locale?: unknown;
}

export async function createReportServer(
  input: CreateReportInput,
  ipHash: string
): Promise<{ id: string; type: ReportType; status: ReportStatus; createdAt: string }> {
  const rawType = typeof input.type === 'string' ? input.type.trim() : '';
  if (rawType !== 'product_issue' && rawType !== 'order_issue') {
    throw new ValidationError('يرجى تحديد نوع البلاغ.', 'type');
  }
  const type: ReportType = rawType;
  const reason: ReportReason = normalizeReportReason(input.reason, type);

  const email = sanitizeEmail(input.email);
  if (!email) {
    throw new ValidationError('يرجى إدخال بريد إلكتروني صحيح للتواصل.', 'email');
  }

  const rawMessage = typeof input.message === 'string' ? input.message.trim() : '';
  if (rawMessage.length < 10) {
    throw new ValidationError('يرجى كتابة وصف للمشكلة لا يقل عن 10 أحرف.', 'message');
  }
  if (rawMessage.length > 1000) {
    throw new ValidationError('وصف المشكلة يجب ألا يتجاوز 1000 حرف.', 'message');
  }
  const message = sanitizePlainText(rawMessage, 1000);
  if (message.length < 10) {
    throw new ValidationError('يرجى كتابة وصف للمشكلة لا يقل عن 10 أحرف.', 'message');
  }

  const productSlug = sanitizePlainText(input.productSlug, 160);
  const productName = sanitizePlainText(input.productName, 220);
  const orderRef =
    type === 'order_issue' ? sanitizePlainText(input.orderRef, 120) : '';
  const locale: Locale = input.locale === 'en' ? 'en' : 'ar';

  const createdAt = new Date().toISOString();
  const id = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const recordToStore: ReportRecord = {
    id,
    type,
    reason,
    productSlug,
    productName,
    email,
    message,
    orderRef,
    locale,
    status: 'new' as ReportStatus,
    createdAt,
  };

  // 1. Save to local stores (fallback file, aqurivostor-data.json, tmp) immediately
  syncReportToLocalStore(recordToStore);

  // 2. Synchronize to Firestore asynchronously (non-blocking so visitor request never hangs)
  const db = getAdminDb();
  if (db) {
    try {
      const docRef = db.collection(COLLECTION).doc(id);
      void docRef.set({
        type,
        reason,
        productSlug,
        productName,
        email,
        message,
        orderRef,
        locale,
        status: 'new',
        createdAt,
        ipHash,
      }).catch((err) => {
        console.warn('[AQURIVO Reports Repo] Background Firestore write skipped/stored locally:', err);
      });
    } catch {
      // Ignore background sync errors
    }
  }

  return {
    id,
    type,
    status: 'new',
    createdAt,
  };
}

export async function listReportsAdmin(): Promise<ReportRecord[]> {
  const map = new Map<string, ReportRecord>();

  // 1. Read from reports-fallback.json
  const fallbackList = readFallbackReports();
  for (const item of fallbackList) {
    if (item && item.id) {
      map.set(item.id, item);
    }
  }

  // 2. Read from aqurivostor-data.json and /tmp mirror
  for (const filePath of [AQURIVO_DATA_FILE, TMP_DATA_FILE]) {
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.reports === 'object' && parsed.reports !== null) {
          for (const [id, val] of Object.entries(parsed.reports)) {
            if (val && typeof val === 'object' && !map.has(id)) {
              map.set(id, val as ReportRecord);
            }
          }
        }
      }
    } catch {
      // Ignore read error
    }
  }

  // 3. Read from Cloud Firestore adapter
  try {
    const db = getAdminDb();
    if (db) {
      const snap = await db
        .collection(COLLECTION)
        .orderBy('createdAt', 'desc')
        .limit(200)
        .get();

      for (const doc of snap.docs) {
        const data = doc.data() as Record<string, unknown>;
        const type: ReportType =
          data.type === 'order_issue' ? 'order_issue' : 'product_issue';
        let reason: ReportReason = 'other';
        try {
          reason = normalizeReportReason(data.reason, type);
        } catch {
          reason = type === 'order_issue' ? 'order_issue' : 'other';
        }
        const status: ReportStatus =
          data.status === 'in_progress' || data.status === 'resolved'
            ? data.status
            : 'new';

        const record: ReportRecord = {
          id: doc.id,
          type,
          reason,
          productSlug: String(data.productSlug || ''),
          productName: String(data.productName || ''),
          email: String(data.email || ''),
          message: String(data.message || ''),
          orderRef: String(data.orderRef || ''),
          locale: data.locale === 'en' ? 'en' : 'ar',
          status,
          createdAt: String(data.createdAt || new Date().toISOString()),
        };

        if (!map.has(record.id)) {
          map.set(record.id, record);
        }
      }
    }
  } catch {
    // If cloud adapter fails, the local map already has all records
  }

  const merged = Array.from(map.values());
  merged.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return merged;
}

export async function countNewReportsAdmin(): Promise<number> {
  const reports = await listReportsAdmin();
  return reports.filter((r) => r.status === 'new').length;
}

export interface ProductWarningStats {
  brokenLinkCount: number;
  unavailableCount: number;
  totalCriticalCount: number;
  hasWarning: boolean;
}

export function computeProductWarningMap(
  reports: ReportRecord[]
): Record<string, ProductWarningStats> {
  const map: Record<string, ProductWarningStats> = {};

  for (const r of reports) {
    const key = (r.productSlug || r.productName || '').trim().toLowerCase();
    if (!key) continue;

    if (!map[key]) {
      map[key] = {
        brokenLinkCount: 0,
        unavailableCount: 0,
        totalCriticalCount: 0,
        hasWarning: false,
      };
    }

    if (r.reason === 'broken_link') {
      map[key].brokenLinkCount += 1;
      map[key].totalCriticalCount += 1;
    } else if (r.reason === 'unavailable') {
      map[key].unavailableCount += 1;
      map[key].totalCriticalCount += 1;
    }

    if (
      map[key].brokenLinkCount >= 3 ||
      map[key].unavailableCount >= 3 ||
      map[key].totalCriticalCount >= 3
    ) {
      map[key].hasWarning = true;
    }
  }

  return map;
}

export async function updateReportStatusAdmin(
  reportId: string,
  status: ReportStatus
): Promise<void> {
  if (status !== 'new' && status !== 'in_progress' && status !== 'resolved') {
    throw new ValidationError('Invalid report status.', 'status');
  }

  // 1. Update local fallback list
  const localList = readFallbackReports();
  const updatedLocal = localList.map((r) => (r.id === reportId ? { ...r, status } : r));
  writeFallbackReports(updatedLocal);

  // 2. Update aqurivostor-data.json and /tmp mirror
  for (const filePath of [AQURIVO_DATA_FILE, TMP_DATA_FILE]) {
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.reports === 'object' && parsed.reports !== null) {
          if (parsed.reports[reportId]) {
            parsed.reports[reportId].status = status;
            fs.writeFileSync(filePath, JSON.stringify(parsed, null, 2), 'utf-8');
          }
        }
      }
    } catch {
      // Ignore
    }
  }

  // 3. Update Firestore in background
  const db = getAdminDb();
  if (db) {
    try {
      void db.collection(COLLECTION).doc(reportId).update({ status }).catch(() => undefined);
    } catch {
      // Ignore
    }
  }
}
