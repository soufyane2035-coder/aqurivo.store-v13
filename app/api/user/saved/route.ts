import { NextRequest, NextResponse } from 'next/server';
import {
  getServerSession,
  SESSION_COOKIE_NAME,
  verifyCsrfRequest,
} from '@/server/middleware/security';
import {
  deleteUserAccount,
  getUserSavedIds,
  updateUserSavedIds,
} from '@/server/repositories/users.repo';

export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ authenticated: false, savedIds: [] });
  }

  const savedIds = await getUserSavedIds(session.uid);
  return NextResponse.json({
    authenticated: true,
    savedIds,
  });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Sign in required to sync saved items.' }, { status: 401 });
  }

  const csrfValid = await verifyCsrfRequest(req);
  if (!csrfValid) {
    return NextResponse.json({ error: 'Invalid security token.' }, { status: 403 });
  }

  try {
    const body = (await req.json()) as { savedIds?: unknown };
    const updated = await updateUserSavedIds(session.uid, body.savedIds);
    return NextResponse.json({ savedIds: updated });
  } catch {
    return NextResponse.json({ error: 'Unable to update saved items.' }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  }

  const csrfValid = await verifyCsrfRequest(req);
  if (!csrfValid) {
    return NextResponse.json({ error: 'Invalid security token.' }, { status: 403 });
  }

  try {
    await deleteUserAccount(session.uid);
    const response = NextResponse.json({ deleted: true });
    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  } catch {
    return NextResponse.json({ error: 'Unable to delete account right now.' }, { status: 500 });
  }
}
