import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi, verifyCsrfRequest } from '@/server/middleware/security';
import { createCloudinarySignedUpload } from '@/server/services/cloudinary.service';
import { ValidationError } from '@/server/validators';

export async function POST(req: NextRequest) {
  const authResult = await requireAdminApi();
  if (!authResult.authorized) {
    return authResult.response;
  }

  const csrfValid = await verifyCsrfRequest(req);
  if (!csrfValid) {
    return NextResponse.json({ error: 'Invalid security token.' }, { status: 403 });
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
