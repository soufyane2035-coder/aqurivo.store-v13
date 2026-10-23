import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi, verifyCsrfRequest } from '@/server/middleware/security';
import {
  deleteMessageAdmin,
  markMessageReadAdmin,
} from '@/server/repositories/messages.repo';
import { sanitizePlainText } from '@/server/validators';

export async function PATCH(req: NextRequest) {
  const guard = await requireAdminApi();
  if (!guard.authorized) return guard.response;

  const csrfValid = await verifyCsrfRequest(req);
  if (!csrfValid) {
    return NextResponse.json({ error: 'Invalid security token.' }, { status: 403 });
  }

  try {
    const body = (await req.json()) as { messageId?: string; isRead?: boolean };
    const messageId = sanitizePlainText(body.messageId, 128);
    if (!messageId) {
      return NextResponse.json({ error: 'Message ID is required.' }, { status: 400 });
    }
    await markMessageReadAdmin(messageId, Boolean(body.isRead));
    return NextResponse.json({ updated: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unable to update message.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const guard = await requireAdminApi();
  if (!guard.authorized) return guard.response;

  const csrfValid = await verifyCsrfRequest(req);
  if (!csrfValid) {
    return NextResponse.json({ error: 'Invalid security token.' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = sanitizePlainText(searchParams.get('id'), 128);
    if (!id) {
      return NextResponse.json({ error: 'Message ID is required.' }, { status: 400 });
    }
    await deleteMessageAdmin(id);
    return NextResponse.json({ deleted: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unable to delete message.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
