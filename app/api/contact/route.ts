import { NextRequest, NextResponse } from 'next/server';
import {
  checkRateLimit,
  getClientIpFromHeaders,
  hashClientIpDaily,
} from '@/server/middleware/security';
import { createContactMessage } from '@/server/repositories/messages.repo';
import { validateContactInput, ValidationError } from '@/server/validators';
import {
  sendContactNotification,
  sendContactAutoReply,
} from '@/server/services/mailer.service';

export async function POST(req: NextRequest) {
  const rawIp = await getClientIpFromHeaders();
  const ipHash = hashClientIpDaily(rawIp);

  // Strict rate limit: max 5 contact submissions per 15 minutes per IP hash
  const rate = checkRateLimit(`contact_form:${ipHash}`, 5, 15 * 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json(
      {
        error:
          'You have sent several messages recently. Please wait a few minutes before sending another.',
      },
      { status: 429 }
    );
  }

  try {
    const rawBody = (await req.json()) as Record<string, unknown>;

    // Anti-spam Honeypot check: if hidden "websiteUrl" field is filled, silently accept
    if (typeof rawBody.websiteUrl === 'string' && rawBody.websiteUrl.trim().length > 0) {
      return NextResponse.json({ sent: true });
    }

    const validated = validateContactInput(rawBody);

    // 1. Attempt database persistence
    let savedRecord = null;
    try {
      savedRecord = await createContactMessage(validated);
    } catch (dbErr) {
      console.warn('[AQURIVO Contact API] Database save skipped or failed:', dbErr);
    }

    // 2. Dispatch real-time SMTP notifications (team alert + customer auto-reply)
    const emailPayload = {
      senderName: validated.senderName,
      senderEmail: validated.senderEmail,
      subject: validated.subject,
      message: validated.message,
      createdAt: savedRecord?.createdAt || new Date().toISOString(),
    };

    // Non-blocking email dispatch so visitor gets instant response
    void (async () => {
      try {
        await Promise.allSettled([
          sendContactNotification(emailPayload),
          sendContactAutoReply(emailPayload),
        ]);
      } catch (mailErr) {
        console.error('[AQURIVO Contact API] Mail dispatch background error:', mailErr);
      }
    })();

    return NextResponse.json({ sent: true });
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message, field: err.field }, { status: 400 });
    }
    return NextResponse.json(
      {
        error:
          'We could not deliver your message right now. Please reach us directly via email (support@aqurivo.store) or WhatsApp (+212 684 063908).',
      },
      { status: 503 }
    );
  }
}
