import 'server-only';

import { checkBotId } from 'botid/server';
import { NextResponse } from 'next/server';

export async function rejectVerifiedBot(): Promise<NextResponse | null> {
  const verification = await checkBotId();
  if (!verification.isBot) return null;

  console.warn(JSON.stringify({ event: 'botid_block' }));
  return NextResponse.json(
    { error: 'Automated requests are not accepted for this action.' },
    {
      status: 403,
      headers: { 'Cache-Control': 'no-store' },
    }
  );
}
