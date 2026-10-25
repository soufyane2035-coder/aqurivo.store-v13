import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi, verifyCsrfRequest, checkRateLimit } from '@/server/middleware/security';
import {
  createEditorialDraft,
  getEditorialKeyStatus,
  listEditorialDrafts,
  listEditorialModels,
  markEditorialDraftReviewed,
  reviseEditorialDraft,
  saveEditorialKeys,
} from '@/server/services/editorial-agent.service';

export const dynamic = 'force-dynamic';

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  });
}

export async function GET(req: NextRequest) {
  const guard = await requireAdminApi();
  if (!guard.authorized) return guard.response;
  try {
    const keyStatus = await getEditorialKeyStatus();
    if (req.nextUrl.searchParams.get('keys') === '1') return json({ keyStatus });
    return json({ drafts: await listEditorialDrafts(), keyStatus });
  } catch {
    return json({ error: 'Unable to load editorial drafts and key status.' }, 500);
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireAdminApi();
  if (!guard.authorized) return guard.response;
  if (!(await verifyCsrfRequest(req))) {
    return json({ error: 'Invalid security token.' }, 403);
  }
  const length = Number(req.headers.get('content-length') || 0);
  if (length > 64_000) return json({ error: 'Request body is too large.' }, 413);

  try {
    const raw = await req.text();
    if (Buffer.byteLength(raw, 'utf8') > 64_000) {
      return json({ error: 'Request body is too large.' }, 413);
    }
    const body = JSON.parse(raw) as Record<string, unknown>;
    if (body.action === 'create' || body.action === 'revise' || body.action === 'list_models') {
      const maxRequests = body.action === 'list_models' ? 40 : 20;
      const scope = body.action === 'list_models' ? 'editorial_agent_models' : 'editorial_agent';
      const rate = await checkRateLimit(`${scope}:${guard.session.uid}`, maxRequests, 60 * 60 * 1000);
      if (rate.unavailable) return json({ error: 'Editorial tools are temporarily unavailable.' }, 503);
      if (!rate.allowed) return json({ error: 'Too many research requests. Try again later.' }, 429);
    }

    if (body.action === 'save_keys') {
      const providerKeys =
        body.providerKeys && typeof body.providerKeys === 'object'
          ? body.providerKeys as Record<string, string[]>
          : {};
      const toolKeys =
        body.toolKeys && typeof body.toolKeys === 'object'
          ? body.toolKeys as Record<string, string[]>
          : {};
      await saveEditorialKeys({
        providerKeys,
        toolKeys,
        remove: Array.isArray(body.remove)
          ? body.remove.filter((item): item is string => typeof item === 'string').slice(0, 60)
          : [],
      });
      return json({ keyStatus: await getEditorialKeyStatus() });
    }

    if (body.action === 'list_models') {
      const models = await listEditorialModels(body.provider, body.keyId);
      return json({ models });
    }

    if (body.action === 'create') {
      const draft = await createEditorialDraft({
        kind: body.kind as 'product' | 'guide',
        sourceUrl: String(body.sourceUrl || ''),
        provider: body.provider,
        model: body.model,
        prompt: typeof body.prompt === 'string' ? body.prompt : undefined,
      });
      return json({ draft }, 201);
    }

    if (body.action === 'revise') {
      const draft = await reviseEditorialDraft(
        String(body.id || ''),
        String(body.feedback || ''),
        body.provider,
        body.model
      );
      return json({ draft });
    }

    if (body.action === 'review') {
      const draft = await markEditorialDraftReviewed(
        String(body.id || ''),
        String(body.content || '')
      );
      return json({ draft });
    }

    return json({ error: 'Unknown editorial action.' }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Editorial request failed.';
    return json({ error: message.slice(0, 300) }, 400);
  }
}
