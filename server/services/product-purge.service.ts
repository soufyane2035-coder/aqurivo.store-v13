import 'server-only';
import fs from 'fs';
import path from 'path';
import { randomBytes } from 'crypto';
import { deleteAllProductsAdmin, listAllProductsAdmin } from '@/server/repositories/products.repo';
import { sendAdminPurgeVerificationEmail } from './mailer.service';
import { loadServerEnv } from '@/server/config/env';

interface ActivePurgeRequest {
  token: string;
  code: string;
  adminEmail: string;
  productsCount: number;
  createdAt: number;
  expiresAt: number;
  failedAttempts?: number;
}

const PURGE_FILE_PATH = path.join('/tmp', 'aqurivostor-purge-request.json');
const PURGE_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes

let inMemoryPurgeRequest: ActivePurgeRequest | null = null;

function loadPurgeRequest(): ActivePurgeRequest | null {
  if (inMemoryPurgeRequest && Date.now() < inMemoryPurgeRequest.expiresAt) {
    return inMemoryPurgeRequest;
  }
  try {
    if (fs.existsSync(PURGE_FILE_PATH)) {
      const raw = fs.readFileSync(PURGE_FILE_PATH, 'utf8');
      const parsed = JSON.parse(raw) as ActivePurgeRequest;
      if (parsed && parsed.expiresAt && Date.now() < parsed.expiresAt) {
        inMemoryPurgeRequest = parsed;
        return parsed;
      }
    }
  } catch {
    // Ignore read errors
  }
  return null;
}

function savePurgeRequest(req: ActivePurgeRequest): void {
  inMemoryPurgeRequest = req;
  try {
    fs.writeFileSync(PURGE_FILE_PATH, JSON.stringify(req, null, 2), 'utf8');
  } catch {
    // Ignore file write errors on ephemeral systems
  }
}

function clearPurgeRequest(): void {
  inMemoryPurgeRequest = null;
  try {
    if (fs.existsSync(PURGE_FILE_PATH)) {
      fs.unlinkSync(PURGE_FILE_PATH);
    }
  } catch {
    // Ignore
  }
}

export async function requestAllProductsPurge(params: {
  adminEmail: string;
  requestIp?: string;
}): Promise<{
  success: boolean;
  adminEmail: string;
  productsCount: number;
  expiresAt: number;
  error?: string;
}> {
  const products = await listAllProductsAdmin();
  const productsCount = products.length;

  if (productsCount === 0) {
    return {
      success: false,
      adminEmail: params.adminEmail,
      productsCount: 0,
      expiresAt: Date.now(),
      error: 'الكتالوج فارغ بالفعل، لا توجد منتجات لحذفها.',
    };
  }

  // Generate 6-digit numeric verification code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  // Generate high-entropy hex token for the direct URL link
  const token = randomBytes(24).toString('hex');
  const now = Date.now();
  const expiresAt = now + PURGE_EXPIRY_MS;

  const targetEmail = (params.adminEmail || 'aqurivo@gmail.com').trim().toLowerCase();

  const env = loadServerEnv();
  const baseUrl = env.siteUrl || 'https://aqurivo.store';
  const confirmationUrl = `${baseUrl}/admin/products?confirm_purge_token=${encodeURIComponent(
    token
  )}&confirm_purge_code=${encodeURIComponent(code)}`;

  const activeReq: ActivePurgeRequest = {
    token,
    code,
    adminEmail: targetEmail,
    productsCount,
    createdAt: now,
    expiresAt,
    failedAttempts: 0,
  };

  savePurgeRequest(activeReq);

  const emailRes = await sendAdminPurgeVerificationEmail({
    adminEmail: targetEmail,
    verificationCode: code,
    confirmationUrl,
    productsCount,
    requestIp: params.requestIp,
    expiresInMinutes: 15,
  });

  if (!emailRes.sent) {
    console.warn('[PurgeService] Email sending notification failed:', emailRes.reason);
  }

  return {
    success: true,
    adminEmail: targetEmail,
    productsCount,
    expiresAt,
  };
}

export async function executeAllProductsPurge(params: {
  token?: string;
  code?: string;
}): Promise<{
  success: boolean;
  purgedCount: number;
  error?: string;
}> {
  const active = loadPurgeRequest();

  if (!active) {
    return {
      success: false,
      purgedCount: 0,
      error: 'انتهت صلاحية طلب الحذف أو لم يتم تقديم طلب مسبق. يرجى إعادة الطلب مجدداً.',
    };
  }

  const inputToken = (params.token || '').trim();
  const inputCode = (params.code || '').trim().replace(/\D/g, '');

  let isMatch = false;

  // Match either the direct signed URL token OR the 6-digit verification code
  if (inputToken && inputToken === active.token) {
    isMatch = true;
  } else if (inputCode && inputCode === active.code) {
    isMatch = true;
  }

  if (!isMatch) {
    const attempts = (active.failedAttempts || 0) + 1;
    active.failedAttempts = attempts;
    savePurgeRequest(active);

    if (attempts >= 3) {
      clearPurgeRequest();
      return {
        success: false,
        purgedCount: 0,
        error: 'تم تجاوز الحد الأقصى للمحاولات الخاطئة (3 محاولات). تم إبطال طلب الحذف تماماً لأسباب أمنية.',
      };
    }

    return {
      success: false,
      purgedCount: 0,
      error: `رمز التحقق غير صحيح. متبقي ${3 - attempts} محاولات قبل إلغاء الطلب نهائياً.`,
    };
  }

  const purgedCount = await deleteAllProductsAdmin();
  clearPurgeRequest();

  return {
    success: true,
    purgedCount,
  };
}

export function getActivePurgeStatus(): {
  hasActiveRequest: boolean;
  adminEmail?: string;
  productsCount?: number;
  expiresAt?: number;
} {
  const active = loadPurgeRequest();
  if (!active) return { hasActiveRequest: false };
  return {
    hasActiveRequest: true,
    adminEmail: active.adminEmail,
    productsCount: active.productsCount,
    expiresAt: active.expiresAt,
  };
}
