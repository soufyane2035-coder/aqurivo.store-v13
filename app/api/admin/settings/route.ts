import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi, verifyCsrfRequest } from '@/server/middleware/security';
import { updateSiteSettingsAdmin } from '@/server/repositories/settings.repo';
import { ValidationError } from '@/server/validators';

export async function PUT(req: NextRequest) {
  const guard = await requireAdminApi();
  if (!guard.authorized) return guard.response;

  const csrfValid = await verifyCsrfRequest(req);
  if (!csrfValid) {
    return NextResponse.json({ error: 'Invalid security token.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const settings = await updateSiteSettingsAdmin(body);
    return NextResponse.json({ settings });
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message, field: err.field }, { status: 400 });
    }
    const msg = err instanceof Error ? err.message : 'Unable to save site settings.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
