import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireAdminApi, verifyCsrfRequest } from '@/server/middleware/security';
import {
  type CanopyConfig,
  type CanopyRotationStrategy,
  addCanopyKeysAdmin,
  checkAllCanopyKeysAdmin,
  checkSingleCanopyKeyAdmin,
  deleteCanopyKeyAdmin,
  getCanopyConfig,
  saveCanopyConfig,
  toggleCanopyKeyAdmin,
  updateCanopyStrategyAdmin,
} from '@/server/services/canopy.service';

export const dynamic = 'force-dynamic';

export async function GET() {
  const guard = await requireAdminApi();
  if (!guard.authorized) return guard.response;

  try {
    const config = await getCanopyConfig();
    return NextResponse.json({ config });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'تعذر تحميل إعدادات مفاتيح Canopy API.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireAdminApi();
  if (!guard.authorized) return guard.response;

  const csrfValid = await verifyCsrfRequest(req);
  if (!csrfValid) {
    return NextResponse.json({ error: 'Invalid security token.' }, { status: 403 });
  }

  try {
    const body = (await req.json()) as {
      action?:
        | 'add'
        | 'delete'
        | 'toggle'
        | 'check_one'
        | 'check_all'
        | 'update_strategy'
        | 'sync_from_client';
      rawKeysInput?: string;
      customLabel?: string;
      keyId?: string;
      enabled?: boolean;
      rotationStrategy?: CanopyRotationStrategy;
      activeKeyId?: string;
      clientConfig?: CanopyConfig;
    };

    const action = body.action;

    if (action === 'add') {
      const result = await addCanopyKeysAdmin({
        rawKeysInput: String(body.rawKeysInput || ''),
        customLabel: body.customLabel ? String(body.customLabel) : undefined,
      });
      revalidatePath('/admin/settings');
      return NextResponse.json(result);
    }

    if (action === 'delete') {
      if (!body.keyId) {
        return NextResponse.json({ error: 'معرف المفتاح مطلوب للحذف.' }, { status: 400 });
      }
      const config = await deleteCanopyKeyAdmin(String(body.keyId));
      revalidatePath('/admin/settings');
      return NextResponse.json({ config });
    }

    if (action === 'toggle') {
      if (!body.keyId) {
        return NextResponse.json({ error: 'معرف المفتاح مطلوب.' }, { status: 400 });
      }
      const config = await toggleCanopyKeyAdmin(String(body.keyId), Boolean(body.enabled));
      revalidatePath('/admin/settings');
      return NextResponse.json({ config });
    }

    if (action === 'check_one') {
      if (!body.keyId) {
        return NextResponse.json({ error: 'معرف المفتاح مطلوب للفحص.' }, { status: 400 });
      }
      const result = await checkSingleCanopyKeyAdmin(String(body.keyId));
      revalidatePath('/admin/settings');
      return NextResponse.json(result);
    }

    if (action === 'check_all') {
      const result = await checkAllCanopyKeysAdmin();
      revalidatePath('/admin/settings');
      return NextResponse.json(result);
    }

    if (action === 'update_strategy') {
      const config = await updateCanopyStrategyAdmin({
        rotationStrategy: body.rotationStrategy,
        activeKeyId: body.activeKeyId,
      });
      revalidatePath('/admin/settings');
      return NextResponse.json({ config });
    }

    if (action === 'sync_from_client' && body.clientConfig) {
      const config = await saveCanopyConfig(
        body.clientConfig,
        body.clientConfig.keys.length === 0
      );
      revalidatePath('/admin/settings');
      return NextResponse.json({ config });
    }

    return NextResponse.json({ error: 'عملية غير معروفة.' }, { status: 400 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'حدث خطأ أثناء إدارة مفاتيح Canopy API.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
