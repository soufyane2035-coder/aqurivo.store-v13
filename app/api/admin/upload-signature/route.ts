import { NextRequest, NextResponse } from 'next/server';
import {
  checkRateLimit,
  getClientIpFromHeaders,
  hashClientIpDaily,
  rateLimitResponseHeaders,
  requireAdminApi,
  verifyCsrfRequest,
} from '@/server/middleware/security';
import { rejectVerifiedBot } from '@/server/middleware/botid';
import { createCloudinarySignedUpload } from '@/server/services/cloudinary.service';
import { ValidationError } from '@/server/validators';

export async function POST(req: NextRequest) {
  const botResponse = await rejectVerifiedBot();
  if (botResponse) return botResponse;

  const authResult = await requireAdminApi();
  if (!authResult.authorized) {
    return authResult.response;
  }

  const csrfValid = await verifyCsrfRequest(req);
  if (!csrfValid) {
    return NextResponse.json({ error: 'Invalid security token.' }, { status: 403 });
  }

  const rawIp = await getClientIpFromHeaders();
  const ipHash = hashClientIpDaily(rawIp);
  const rate = await checkRateLimit(`upload_signature:${ipHash}`, 30, 60 * 60 * 1000);
  if (rate.unavailable) {
    return NextResponse.json(
      { error: 'Upload signing is temporarily unavailable.' },
      { status: 503, headers: rateLimitResponseHeaders(rate) }
    );
  }
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Too many image upload requests. Please try again later.' },
      { status: 429, headers: rateLimitResponseHeaders(rate) }
    );
  }

  try {
    const body = await req.json();
    const result = createCloudinarySignedUpload(body);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message, field: err.field }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Unable to prepare image upload signature.' },
      { status: 500 }
    );
  }
}
