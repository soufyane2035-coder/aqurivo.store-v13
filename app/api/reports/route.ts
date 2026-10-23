import { NextRequest, NextResponse } from 'next/server';
import {
  checkRateLimit,
  getClientIpFromHeaders,
  hashClientIpDaily,
  requireAdminApi,
  verifyCsrfRequest,
} from '@/server/middleware/security';
import {
  countNewReportsAdmin,
  createReportServer,
  listReportsAdmin,
  updateReportStatusAdmin,
} from '@/server/repositories/reports.repo';
import { sanitizePlainText, ValidationError } from '@/server/validators';
import type { ReportStatus } from '@/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;

    // 1. Silent Honeypot check: reject bot submissions without false positives
    const honeypotVal =
      typeof body.client_hp_verify === 'string'
        ? body.client_hp_verify
        : typeof body.honeypot === 'string'
          ? body.honeypot
          : '';
    if (honeypotVal.trim().length > 0) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    // 2. Hash IP (never store raw IP) & enforce 20 reports per IP per hour
    const rawIp = await getClientIpFromHeaders();
    const ipHash = hashClientIpDaily(rawIp);

    const rate = checkRateLimit(`reports_hourly:${ipHash}`, 20, 60 * 60 * 1000);
    if (!rate.allowed) {
      const isEn = body.locale === 'en';
      return NextResponse.json(
        {
          error: isEn
            ? 'You have reached the hourly limit of reports. Please try again later.'
            : 'لقد وصلت للحد الأقصى من البلاغات في الساعة. يرجى المحاولة لاحقاً.',
        },
        { status: 429 }
      );
    }

    // 3. Validate & persist in Firestore collection `reports`
    const created = await createReportServer(body, ipHash);

    // 4. Return non-sensitive response
    return NextResponse.json(
      {
        ok: true,
        type: created.type,
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json(
        { error: err.message, field: err.field },
        { status: 400 }
      );
    }
    return NextResponse.json(
      {
        error:
          'تعذر إرسال البلاغ في الوقت الحالي. يرجى المحاولة مرة أخرى بعد قليل.',
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const guard = await requireAdminApi();
  if (!guard.authorized) return guard.response;

  const { searchParams } = new URL(req.url);
  if (searchParams.get('countOnly') === '1') {
    const newCount = await countNewReportsAdmin();
    return NextResponse.json({ newCount });
  }

  const reports = await listReportsAdmin();
  const newCount = reports.filter((r) => r.status === 'new').length;
  return NextResponse.json({ reports, newCount });
}

export async function PATCH(req: NextRequest) {
  const guard = await requireAdminApi();
  if (!guard.authorized) return guard.response;

  const csrfValid = await verifyCsrfRequest(req);
  if (!csrfValid) {
    return NextResponse.json(
      { error: 'Invalid security token.' },
      { status: 403 }
    );
  }

  try {
    const body = (await req.json()) as {
      reportId?: string;
      status?: ReportStatus;
    };
    const reportId = sanitizePlainText(body.reportId, 128);
    const status = body.status;

    if (!reportId) {
      return NextResponse.json(
        { error: 'Report ID is required.' },
        { status: 400 }
      );
    }
    if (
      status !== 'new' &&
      status !== 'in_progress' &&
      status !== 'resolved'
    ) {
      return NextResponse.json(
        { error: 'Invalid status value.' },
        { status: 400 }
      );
    }

    await updateReportStatusAdmin(reportId, status);
    return NextResponse.json({ updated: true, reportId, status });
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : 'Unable to update report status.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
